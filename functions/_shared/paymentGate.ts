// ============================================================
// 付款闸门守卫 —— 把三单匹配判定接到真实写入路径上
// ============================================================
// 【为什么要有这个文件】
// V3.17.9 曾把「超差阻断付款」标为已修复，实际只是让
// /api/three-way-match/create 返回了一个 blocked 字段，
// 而那个端点前端从未调用，三个付款页面也没有任何一处读它。
// 「闸门造好了、没人接线」在业务上等于没有闸门。
// 本文件负责把线接上：只要发生「付款动作」，先在服务端判定、再决定是否放行。
//
// 【为什么闸门放在服务端而不是界面】
// 判断一个管控是否真的存在，判据是「绕开界面还成不成立」。
// 界面拦截可以被绕过（直接调接口、旧版本前端、脚本），服务端拦截不能。
// 因此这里拦的是服务端写入路径；界面另外展示原因，只为让人看懂为什么被拦。
//
// 【为什么不用 request.json() 而是先 clone】
// Cloudflare Workers 的请求体只能读一次。父子的通用写入框架
// （_shared/parentChild.ts 的 pcCreate/pcUpdate）内部会自己读 body，
// 若此处抢先读完，框架拿到的会是空对象 —— 表现为「表单存进去全是空的」，
// 且不会报错。所以必须先 clone()，读克隆体做判定，原请求体保持未消费。
import { json } from './auth';
// ★ V3.45.0：累计超付校验需要金额统一舍入，沿用 money.ts 单一来源（不另造 round2）。
import { roundAmount } from './money';
import { evaluateThreeWayMatch, recordThreeWayMatch, type TwmCheck } from './threeWayMatch';
import { getAppStateValue } from './appState';

/** 付款计划中与闸门相关的字段（均为前端 camelCase 命名） */
export interface GatePlanFields {
  purchaseOrderNo?: string | null;
  invoiceNo?: string | null;
  totalAmount?: number;
  paidAmount?: number;
  advanceAmount?: number;
  status?: string | null;
}

export interface GateResult {
  /** 非 null 时应直接 return 给客户端（已被拦截） */
  blocked: Response | null;
  /** 判定详情（放行时也返回，便于调用方写审计或记录） */
  check: TwmCheck;
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * P1-B：今天所在会计期间（东八区日历日，不依赖服务器时区，避免跨 UTC 取错月/季）。
 * fin_budgets.period 有两种粒度：'YYYY-MM'（月）与 'YYYY-Qn'（季），取数口径须与之一致。
 */
function localPeriod(now = new Date()): { ym: string; quarter: string } {
  const shifted = new Date(now.getTime() + 8 * 3600 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const ym = `${y}-${String(m).padStart(2, '0')}`;
  const quarter = `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  return { ym, quarter };
}

/** 预算 period（'YYYY-MM' 或 'YYYY-Qn'）是否覆盖给定「当前月 YYYY-MM」（月精确匹配 / 季看该月是否落在季内） */
function periodCoversYM(period: string, ym: string): boolean {
  const p = String(period || '').trim().toUpperCase();
  if (/^\d{4}-\d{2}$/.test(p)) return p.toLowerCase() === ym;
  if (/^\d{4}-Q[1-4]$/.test(p)) {
    const py = p.slice(0, 4);
    const q = Number(p.slice(5));
    const m = Number(ym.slice(5, 7));
    return ym.slice(0, 4) === py && Math.floor((m - 1) / 3) + 1 === q;
  }
  return false;
}

/** 该预算 period 对应的「记账期间集合」（月=自身；季=该季 3 个月），用于已发生额按同口径过滤；无法识别则返回空 */
function periodsOfBudget(period: string): string[] {
  const p = String(period || '').trim().toUpperCase();
  if (/^\d{4}-\d{2}$/.test(p)) return [p.toLowerCase()];
  if (/^\d{4}-Q[1-4]$/.test(p)) {
    const y = p.slice(0, 4);
    const q = Number(p.slice(5));
    const start = (q - 1) * 3 + 1;
    return [0, 1, 2].map((i) => `${y}-${String(start + i).padStart(2, '0')}`);
  }
  return [];
}

/** 状态归一：把 status 转成小写字符串，容忍 null / 空格 / 大小写差异 */
const normStatus = (v: any): string => String(v ?? '').trim().toLowerCase();

/**
 * 判定一次付款计划写入是否属于「付款动作」。
 *
 * 这个判断很关键：PUT /api/fin-payment-plans/:id 既用于「付款」，
 * 也用于「改个备注」「改个到期日」。
 * 如果对所有 PUT 一律拦截，日常编辑会被无关的匹配结论挡住，
 * 用户很快会要求把这功能关掉 —— 那就等于闸门失效。
 * 因此只在真正扣钱的动作上拦：
 *   · 状态变为 paid（已付款）
 *   · 已付金额增加（逐期付款）
 */
export function isPaymentAction(
  existing: { status?: any; paid_amount?: any } | null,
  incoming: GatePlanFields,
): boolean {
  const oldStatus = normStatus(existing?.status);
  const newStatus = incoming.status === undefined ? oldStatus : normStatus(incoming.status);
  if (newStatus === 'paid' && oldStatus !== 'paid') return true;

  const oldPaid = num(existing?.paid_amount);
  // 未传 paidAmount 时视为不变
  const newPaid = incoming.paidAmount === undefined ? oldPaid : num(incoming.paidAmount);
  if (newPaid > oldPaid) return true;

  return false;
}

/**
 * 执行付款闸门判定。
 * @param isPayment 本次写入是否属于付款动作（由 isPaymentAction 判断后传入）
 */
export async function guardPayment(
  db: any,
  user: any,
  plan: GatePlanFields,
  isPayment: boolean,
  /** 本次要付的金额；不传则取计划总额 */
  payAmountOverride?: number,
): Promise<GateResult> {
  const payAmount =
    payAmountOverride !== undefined ? num(payAmountOverride) : num(plan.totalAmount);

  const input = {
    poNo: plan.purchaseOrderNo,
    invoiceNo: plan.invoiceNo,
    payAmount,
    advanceAmount: num(plan.advanceAmount),
  };

  const check = await evaluateThreeWayMatch(db, user.org_id, input);

  if (!isPayment) return { blocked: null, check };

  // 无论放行还是拦截都留档：将来追溯时，「当时判定通过」和「当时判定不通过」
  // 是同等重要的两条信息。
  await recordThreeWayMatch(db, user.org_id, { id: user.id, name: user.name }, input, check);

  if (check.ok) return { blocked: null, check };

  // 422 而非 409：前端 financeStore 对 409 有统一覆盖文案（会把原因冲掉），
  // 422 能原样把中文原因带到界面上。
  return {
    blocked: json(
      {
        error: check.message,
        code: `THREE_WAY_MATCH_${check.code}`,
        threeWayMatch: check.detail,
      },
      422,
    ),
    check,
  };
}

/**
 * 预算闸门（决策 B）——把「预算占用」接进已有付款闸门。
 *
 * 【为什么只接「项目维度」】
 * 付款计划(fin_payment_plans)只带 purchase_order_no / dept_id，本身不带成本中心 / 项目；
 * 预算的「成本中心 / 科目」维度在付款侧没有可对账的字段，若硬拦会误伤正常付款，
 * 故那两类维度仅保留预算页监控，不在付款动作上拦截。
 * 唯一现成的付款→预算对接链是：付款.purchase_order_no → 采购单.project_no → 项目.id，
 * 对到预算 dimension='project' 的子项。无对接链 / 无该项目预算时一律放行（不误拦）。
 *
 * 【安全阀】
 * super_admin 超预算仍放行（detail 标记 overriddenBy），避免挡住紧急付款；其余角色超预算 422 不写库。
 *
 * 预算数据来自 financeExtensionStore 的持久化键 ssa-erp-finance-ext（app_state），
 * 与预算控制页(BudgetControl)的项目维度监控口径一致。
 */
export async function guardBudget(
  db: any,
  user: any,
  plan: GatePlanFields,
  delta: number,
): Promise<{ blocked: Response | null; detail?: any }> {
  const isSuper = String(user?.role || '') === 'super_admin';
  const poNo = plan.purchaseOrderNo;
  if (!poNo) return { blocked: null };

  const po = await db
    .prepare('SELECT project_no FROM purchase_orders WHERE org_id = ? AND order_no = ?')
    .bind(user.org_id, poNo)
    .first();
  if (!po || !po.project_no) return { blocked: null };

  const proj = await db
    .prepare('SELECT id FROM projects WHERE org_id = ? AND project_no = ?')
    .bind(user.org_id, po.project_no)
    .first();
  if (!proj) return { blocked: null };

  // ★ V3.46.0 第2批②：预算权威源从 app_state 迁到关系表 fin_budgets。
  //   原实现从 app_state 读 `parsed?.state?.budgets`，问题有三：
  //     ① 任何登录用户可 PUT /api/state/ssa-erp-finance-ext 改预算 → 无权限概念；
  //     ② 改预算不经任何审计；
  //     ③ `catch { budgets = [] }` → 键损坏/格式变更即**静默全额放行**（fail-open）。
  //   现在优先读关系表；表内无该预算时回退旧键（迁移期安全网）；
  //   查询异常按 fail-closed 处理（拦住），宁可误拦也不可让管控失效。
  let b: any = null;
  let degradedBudget = false;
  // P1-B：预算口径必须「按期间取数」。原 SQL 无 period 过滤 + LIMIT 1，会在
  //   多期预算并存时**取到任意一行**（哪条排在前就是哪条），单期预算与跨期实际
  //   发生额错位比较，长期必然误判「超预算」。现在：优先取「当前期间」的预算行，
  //   若该期间没设预算，再回退取该项目的其他预算（保持迁移期兼容，不误拦）。
  const nowPeriod = localPeriod();
  try {
    const row: any = await db
      .prepare(
        `SELECT id, period, ref_id AS refId, ref_name AS refName, amount
           FROM fin_budgets
          WHERE org_id = ? AND dimension = 'project' AND ref_id = ? AND period = ?
          LIMIT 1`
      )
      .bind(user.org_id, proj.id, nowPeriod.ym)
      .first();
    b = row || null;
    if (!b) {
      // 当前期间没设预算 → 回退取该项目任意一条预算（不区分期间，迁移期安全网）
      const anyRow: any = await db
        .prepare(
          `SELECT id, period, ref_id AS refId, ref_name AS refName, amount
             FROM fin_budgets
            WHERE org_id = ? AND dimension = 'project' AND ref_id = ?
            LIMIT 1`
        )
        .bind(user.org_id, proj.id)
        .first();
      b = anyRow || null;
    }
    if (!b) {
      // 回退：旧 app_state 键（首次部署后新表尚未回填到该预算时）
      const raw = await getAppStateValue(db, user.org_id, 'ssa-erp-finance-ext');
      if (raw) {
        try {
          const parsed: any = JSON.parse(raw);
          const budgets: any[] = parsed?.state?.budgets || [];
          b = budgets.find((x: any) => x.dimension === 'project' && String(x.refId) === String(proj.id)) || null;
        } catch { /* 旧键解析失败即视为无预算 */ }
      }
    }
  } catch (e: any) {
    degradedBudget = true;
    console.error('[guardBudget] 读取预算失败，按超预算拦截（fail-closed）：', e?.message || e);
    return {
      blocked: new Response(JSON.stringify({
        error: '预算数据读取失败，出于安全已阻止本次付款，请稍后重试或联系管理员',
        code: 'BUDGET_LOOKUP_FAILED',
      }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
      detail: { projectNo: po.project_no, degraded: true },
    };
  }
  if (!b || !Number.isFinite(Number(b.amount))) return { blocked: null, detail: { degradedBudget } };

  // ★ P1-B 根治两处：
  //   ① 原 SQL `WHERE org_id = ? AND project_id = ?` 引用了 voucher_items 的 org_id ——
  //      但迁移 0068 里 voucher_items 表**没有 org_id 列**（只有 voucher_id/…/project_id/ledger_book）。
  //      这条查询在生产会 `no such column: org_id` → 被下方 catch 吞掉 → actual 恒为 0，
  //      预算闸门因此**从未真正累计过已发生额**（与 P0「预算闸门造好没接线」同源）。
  //      现改为 JOIN vouchers 头表（org_id / period 都在头表上），按项目维度正确取数。
  //   ② 口径对齐：已发生额只统计**与预算同一期间**的凭证（预算是 2026-07 的单期预算，
  //      却拿跨全期累计去比，长期必然误判超预算）。预算 period 为月/季，展开成记账期间集合过滤。
  const budgetPeriods = periodsOfBudget(String(b.period || ''));
  let actual = 0;
  let degraded = false;
  try {
    if (budgetPeriods.length > 0) {
      // 有明确期间 → 只累计该期间（与预算口径一致）
      const ph = budgetPeriods.map(() => '?').join(',');
      const agg: any = await db
        .prepare(
          `SELECT COALESCE(SUM(vi.debit), 0) AS actual
             FROM voucher_items vi
             JOIN vouchers v ON v.id = vi.voucher_id
            WHERE v.org_id = ? AND vi.project_id = ? AND v.period IN (${ph})`
        )
        .bind(user.org_id, proj.id, ...budgetPeriods)
        .first();
      actual = agg ? Number(agg.actual) : 0;
    } else {
      // 预算 period 无法识别（脏数据）→ 退回「按当前项目全部凭证」但**仍需正确 JOIN**，
      //   同时标记 degraded 供排障（不再让 org_id 缺列把查询打挂）。
      degraded = true;
      const agg: any = await db
        .prepare(
          `SELECT COALESCE(SUM(vi.debit), 0) AS actual
             FROM voucher_items vi
             JOIN vouchers v ON v.id = vi.voucher_id
            WHERE v.org_id = ? AND vi.project_id = ?`
        )
        .bind(user.org_id, proj.id)
        .first();
      actual = agg ? Number(agg.actual) : 0;
    }
  } catch (e: any) {
    // P1-B：已发生额查询失败改 **fail-closed**。原实现按 0 放行（fail-open 后门）——
    //   一旦统计口径查询失败，闸门就静默全额放行，等于「以为有预算管控、其实没有」。
    //   预算校验属硬管控，读不到已发生额时宁可拦住（503 提示管理员），不能放行。
    degraded = true;
    console.error('[guardBudget] 预算已发生额查询失败，按超预算拦截（fail-closed）：', e?.message || e);
    return {
      blocked: new Response(JSON.stringify({
        error: '预算已发生额读取失败，出于安全已阻止本次付款，请稍后重试或联系管理员',
        code: 'BUDGET_ACTUAL_LOOKUP_FAILED',
      }), { status: 503, headers: { 'Content-Type': 'application/json' } }),
      detail: { projectNo: po.project_no, degraded: true },
    };
  }
  const after = actual + delta;

  const detail = {
    projectNo: po.project_no,
    budgetId: b.id,
    budgetName: b.refName || po.project_no,
    budgetAmount: Number(b.amount),
    actual,
    delta,
    degraded,
    after,
  };

  if (after <= Number(b.amount)) return { blocked: null, detail };

  if (isSuper) {
    return { blocked: null, detail: { ...detail, overriddenBy: 'super_admin' } };
  }

  return {
    blocked: json(
      {
        error: `本次付款将使项目「${b.refName || po.project_no}」超预算：预算 ${Number(b.amount)}，已发生 ${actual}，本次 ${delta}，合计 ${after}`,
        code: 'BUDGET_EXCEEDED',
        budget: detail,
      },
      422,
    ),
    detail,
  };
}

/** 把「请求体里的新值」与「库中现值」合成一张完整计划（未传的字段以库中为准） */
function mergePlan(
  incoming: GatePlanFields,
  existing: Partial<GatePlanFields> & { purchase_order_no?: any; invoice_no?: any; total_amount?: any; advance_amount?: any; paid_amount?: any; status?: any } | null,
): GatePlanFields {
  const e: any = existing || {};
  return {
    purchaseOrderNo: incoming.purchaseOrderNo ?? e.purchase_order_no ?? e.purchaseOrderNo ?? null,
    invoiceNo: incoming.invoiceNo ?? e.invoice_no ?? e.invoiceNo ?? null,
    totalAmount: incoming.totalAmount ?? num(e.total_amount ?? e.totalAmount),
    paidAmount: incoming.paidAmount ?? num(e.paid_amount ?? e.paidAmount),
    advanceAmount: incoming.advanceAmount ?? num(e.advance_amount ?? e.advanceAmount),
    status: incoming.status ?? e.status ?? null,
  };
}

/**
 * 面向「一行付款计划」的统一守卫 —— 自动判断是否付款动作、自动算本次付款金额。
 *
 * 为什么要有这个函数：付款计划存在**四个**写入点
 *   ① POST /api/fin-payment-plans
 *   ② PUT  /api/fin-payment-plans/:id
 *   ③ POST /api/entities/finPaymentPlan         ← 通用实体路由，等价的后门
 *   ④ PUT  /api/entities/finPaymentPlan/:id     ← 同上
 * 如果四处各写一遍判断条件，迟早会写歪一处，而「写歪的那一处」就是绕过通道。
 * 因此四个点统一调用本函数，判定逻辑只有一份。
 *
 * @param existing 库中现值；创建场景传 null
 * @returns 非 null 时应直接 return 给客户端（已被拦截）
 */
export async function guardPaymentRow(
  db: any,
  user: any,
  incoming: GatePlanFields,
  existing: any | null,
  /** 创建场景下是否视为付款动作（导入历史数据等场景可传 false） */
  treatCreateAsPayment = true,
): Promise<Response | null> {
  const isPayment = existing ? isPaymentAction(existing, incoming) : treatCreateAsPayment;
  if (!isPayment) return null;

  const merged = mergePlan(incoming, existing);
  const oldPaid = num(existing?.paid_amount ?? existing?.paidAmount);
  const total = num(merged.totalAmount);
  const newPaid = incoming.paidAmount === undefined ? oldPaid : num(incoming.paidAmount);
  const delta = existing
    ? newPaid > oldPaid
      ? newPaid - oldPaid
      : Math.max(0, total - oldPaid)
    : total;

  const { blocked } = await guardPayment(db, user, merged, true, delta);
  if (blocked) return blocked;

  // ★ V3.45.0 补「累计超付」校验（对标 SAP F030 按发票校验未清金额、金蝶/用友付款核销）：
  //   guardPayment 里的 OVER_INVOICE 判定只比**本次付款额**与发票总额
  //   （`payAmount > invoiceTotal×(1+tol)`），是**单次上限、不累计历史已付**。
  //   后果：同一张发票拆成 3 张付款计划各付 100%（合计 300% 发票额），
  //   三次都能通过校验 —— 真实资金损失且系统无从发现。
  //   现在按发票号汇总**所有付款计划的已付额**（含本次增量），超过发票总额即 422。
  const overRes = await guardCumulativeOverpay(db, user, merged, incoming, existing);
  if (overRes) return overRes;

  // 决策 B：预算闸门（项目维度硬拦 + 超管安全阀）
  const budgetRes = await guardBudget(db, user, merged, delta);
  return budgetRes.blocked;
}

/** 付款计划表名（按发票号汇总已付额用）。与 finConfig 的 parentCols 保持同一张表。 */
const PLAN_TABLE = 'fin_payment_plans';

/**
 * ★ V3.45.0 累计超付校验。
 * 按 invoice_no 汇总该发票下所有付款计划的 paid_amount（含本次将要写入的增量），
 * 超过 fin_invoices.total_amount（容差同三单匹配口径）即拒绝。
 *
 * 为什么必须做：单次校验防不住"拆单重复付"，而拆单是业务里的常见操作
 * （一笔款分几次付、分批结算），恰恰是重复付款最常见的成因。
 *
 * @returns 非 null 时应直接 return 给客户端（已被拦截）
 */
async function guardCumulativeOverpay(
  db: any,
  user: any,
  merged: any,
  incoming: GatePlanFields,
  existing: any | null,
): Promise<Response | null> {
  const invoiceNo = String(merged.invoiceNo || merged.invoice_no || '').trim();
  if (!invoiceNo) return null; // 无发票关联的付款计划不在本校验范围（无凭据可对）

  // ① 取该发票的含税总额
  let invoiceTotal = 0;
  try {
    const inv: any = await db
      .prepare(`SELECT total_amount FROM fin_invoices WHERE org_id = ? AND invoice_no = ? LIMIT 1`)
      .bind(user.org_id, invoiceNo)
      .first();
    if (!inv) return null; // 查无此票是**合法**情况（无凭据可对，归三单匹配拦截）→ 放行
    invoiceTotal = num((inv as any).total_amount);
  } catch (e: any) {
    // ★ V3.49.0 R5 fail-open 收口：区分「查无此票(合法放行)」与「查询本身故障(拦截)」。
    //   原实现无论哪种都 `return null` 放行 —— 注释却写「与 guardBudget 同策略」，
    //   但 guardBudget 真实口径是 **fail-closed**（读不到就 503 拦）。累计超付属硬管控，
    //   查询故障时静默放行 = 拆分成多笔小额绕过闸门的后门，故改为 fail-closed。
    console.error('[guardCumulativeOverpay] 发票金额查询故障，按校验失败拦截（fail-closed）：', e?.message || e);
    return new Response(JSON.stringify({
      error: '累计付款校验取数失败，出于安全已阻止本次付款，请稍后重试或联系管理员',
      code: 'CUMULATIVE_LOOKUP_FAILED',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  if (!(invoiceTotal > 0)) return null;

  // ② 汇总该发票下所有付款计划的已付额（排除本条，避免与本次增量重复计）
  const id = (existing as any)?.id;
  let sumRow: any;
  try {
    sumRow = await db
      .prepare(
        `SELECT IFNULL(SUM(paid_amount), 0) AS paid
           FROM ${PLAN_TABLE}
          WHERE org_id = ? AND invoice_no = ?${id ? ' AND id != ?' : ''}`,
      )
      .bind(...(id ? [user.org_id, invoiceNo, id] : [user.org_id, invoiceNo]))
      .first();
  } catch (e: any) {
    // ★ V3.49.0 R5 fail-open 收口：已付额汇总「查询故障」不得静默放行。
    //   读不到"别人已付了多少"就放行本次 = 拆分成多笔小额可反复绕过累计上限（真超付后门）。
    //   与上方发票查询、guardBudget 同一 fail-closed 口径：故障即拦截（503），宁可误拦不可失控。
    //   注意「查得到但 SUM=0」是合法（无已付记录），不走这里；只有查询本身抛错才进 catch。
    console.error('[guardCumulativeOverpay] 已付额汇总查询故障，按校验失败拦截（fail-closed）：', e?.message || e);
    return new Response(JSON.stringify({
      error: '累计付款校验取数失败，出于安全已阻止本次付款，请稍后重试或联系管理员',
      code: 'CUMULATIVE_LOOKUP_FAILED',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  const othersPaid = num(sumRow?.paid);

  // ③ 本次这一条最终会变成多少已付
  const thisPaid = incoming.paidAmount === undefined
    ? num((existing as any)?.paid_amount ?? (existing as any)?.paidAmount)
    : num(incoming.paidAmount);

  const cumulative = roundAmount(othersPaid + thisPaid);
  // 容差沿用三单匹配的 1% 口径（同一业务、同一容忍度，避免两处标准不一）
  const cap = roundAmount(invoiceTotal * 1.01);
  if (cumulative > cap) {
    return new Response(JSON.stringify({
      error: `累计付款将达 ¥${cumulative.toFixed(2)}，超过发票 ${invoiceNo} 的含税金额 ¥${invoiceTotal.toFixed(2)}，已拦截以防重复付款`,
      code: 'CUMULATIVE_OVERPAY',
      invoiceNo,
      invoiceTotal: roundAmount(invoiceTotal),
      alreadyPaid: roundAmount(othersPaid),
      thisPayment: roundAmount(thisPaid),
      cumulative,
    }), { status: 422, headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}

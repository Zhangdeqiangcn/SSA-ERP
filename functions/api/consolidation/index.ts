// POST /api/consolidation — 执行合并（多账簿 / 集团两种范围）
// GET  /api/consolidation — 取最近一次合并结果
//
// ── C2 合并报表引擎（V3.13.0）────────────────────────────────────
// 设计（第一性原理）：
//   合并报表的本质 = 「把若干会计主体（账簿 / 组织）的凭证按科目汇总，
//   再抵消它们之间的内部往来与内部交易」。难点只有三件：
//     ① 范围界定（哪些账簿 / 哪些组织纳入合并）
//     ② 内部交易抵消（母子公司之间的应收应付、收入成本要抵掉，否则虚增）
//     ③ 折算（不同本位币要统一到合并本位币）—— V3.13.0 先支持单币种，
//        多币种折算列为后续（fx_rates 已有，待接入）。
//
// 两种 scope：
//   · 'books'：同一组织内跨账簿合并（法定账套 + 管理账套 → 一套合并账）。
//              这是本轮门禁可端到端验证的路径（单组织即可构造多账簿）。
//   · 'group'：集团跨组织合并，按 consolidation_groups.member_org_ids 取成员，
//              需校验当前用户所属组织是成员之一（越单组织读取的显式权限闸门）。
//
// 权限：本端点做的是"跨组织/跨账簿读取"，RLS 不再适用（RLS 只管单组织行级）。
//       权限由本处显式校验：books 限本组织；group 限"用户组织 ∈ 成员列表 或 特权角色"。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { roundAmount } from '../../_shared/money';

interface AccountAgg {
  code: string;
  name: string;
  debit: number;
  credit: number;
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = env.DB;
  const body = await request.json().catch(() => ({}));
  const scope: string = body.scope || 'books';
  const period: string | undefined = body.period || undefined;
  const groupId: string | undefined = body.groupId || undefined;
  // ★ V3.113.3 P0-2：可选的账簿白名单（ledger_code 数组，如 ['0000','1000']）。
  //   不传 = 该范围内全部账簿（保持旧行为）；传了 = 只合并指定账簿。
  const ledgerBooks: string[] = Array.isArray(body.ledgerBooks)
    ? body.ledgerBooks.map((x: any) => String(x ?? '').trim()).filter(Boolean)
    : [];

  if (scope !== 'books' && scope !== 'group') {
    return json({ error: 'scope 仅支持 books / group' }, 400);
  }

  // ── 1) 解析纳入合并的组织集合 ──────────────────────────────────
  let orgIds: string[] = [];
  let groupRowId = 'SELF';
  let baseCurrency = 'CNY';

  if (scope === 'books') {
    // 同组织跨账簿：组织集合只有当前组织，账簿不限（含全部 ledger_book）
    orgIds = [user.org_id];
  } else {
    // 集团跨组织：从合并范围取成员
    const grp = groupId
      ? await db.prepare(`SELECT * FROM consolidation_groups WHERE id = ? AND org_id = ?`)
          .bind(groupId, user.org_id).first()
      : await db.prepare(`SELECT * FROM consolidation_groups WHERE org_id = ? ORDER BY created_at DESC LIMIT 1`)
          .bind(user.org_id).first();
    if (!grp) return json({ error: '未找到合并范围' }, 404);
    let members: string[] = [];
    try { members = JSON.parse(grp.member_org_ids || '[]'); } catch { members = []; }
    // 权限闸门：当前用户组织必须是成员，或特权角色
    const privileged = user.role === 'super_admin' || user.role === 'admin';
    if (!privileged && !members.includes(user.org_id)) {
      return json({ error: '无权合并该范围（当前组织不在成员列表）' }, 403);
    }
    if (members.length === 0) members = [grp.org_id];
    orgIds = members;
    groupRowId = grp.id;
    baseCurrency = grp.base_currency || 'CNY';
  }

  // ── 2) 按科目汇总借贷（跨组织/跨账簿）──────────────────────────
  // ★ V3.113.3 P0-2 修法（两处同时改，缺一不可）：
  //   ① 汇总维度加 ledger_book → 法定账套(0000) 与管理账套(1000) 的同一科目**分列**，
  //      不再被压进同一行相加成「两套账混算」的金额。
  //   ② 科目名取凭证行上的 ledger_book（voucher_items 与 vouchers 都有该列），
  //      并用 v.ledger_book 兜底（历史行可能只在凭证头上有账簿）。
  const placeholders = orgIds.map(() => '?').join(',');
  const ledgerFilter = ledgerBooks.length
    ? ` AND COALESCE(vi.ledger_book, v.ledger_book) IN (${ledgerBooks.map(() => '?').join(',')})`
    : '';
  const aggSql = `
    SELECT COALESCE(vi.ledger_book, v.ledger_book, '0000') AS ledger_book,
           vi.account_code AS code, vi.account_name AS name,
           COALESCE(SUM(vi.debit), 0) AS total_debit,
           COALESCE(SUM(vi.credit), 0) AS total_credit
    FROM voucher_items vi
    JOIN vouchers v ON vi.voucher_id = v.id
    WHERE v.org_id IN (${placeholders})
      ${period ? 'AND (? IS NULL OR v.period = ?)' : ''}
      ${ledgerFilter}
    GROUP BY COALESCE(vi.ledger_book, v.ledger_book, '0000'), vi.account_code, vi.account_name
  `;
  const aggParams: any[] = [...orgIds];
  if (period) { aggParams.push(period, period); }
  if (ledgerBooks.length) { aggParams.push(...ledgerBooks); }
  const aggRows = await db.prepare(aggSql).bind(...aggParams).all();

  // 账簿代码 → 账簿名称（用于结果里标注「法定账套/管理账套」，便于人工核对口径）
  const ledgerNames = new Map<string, string>();
  try {
    const lb = await db.prepare(
      `SELECT ledger_code, name, type FROM ledger_books WHERE org_id = ?`
    ).bind(user.org_id).all();
    for (const r of (lb.results || [])) {
      ledgerNames.set(String(r.ledger_code), `${r.name || r.ledger_code}${r.type ? `（${r.type}）` : ''}`);
    }
  } catch {
    // ledger_books 表不可用时不阻断合并（账簿名缺失只影响可读性，不影响金额）
  }

  // ★ V3.113.3 P0-2：accounts 的键改为「账簿|科目」，同科目在不同账簿**各占一行**，
  //   不再被压进同一行相加成「两套账混算」的金额。
  const accounts = new Map<string, AccountAgg>();
  const accountLedger = new Map<string, string>();
  for (const r of (aggRows.results || [])) {
    const lb = String(r.ledger_book || '0000');
    const code = String(r.code);
    const key = `${lb}|${code}`;
    accounts.set(key, {
      code,
      name: String(r.name || ''),
      debit: num(r.total_debit),
      credit: num(r.total_credit),
    });
    accountLedger.set(key, lb);
  }

  // ── 3) 内部交易抵消（按 elimination_rules）──────────────────────
  // ★ P0-2 关键修正：抵消只在**同一账簿内**进行。
  //   原因：应收/应付的内部往来抵消，前提是「这笔应收在 A 账套、那笔应付也在 A 账套」
  //   （同一套账的内部往来才需要抵）。若跨账簿抵消，会出现「法定账套的应收」
  //   抵掉「管理账套的应付」——两套口径不同、金额未必对应，抵出来的是假平。
  const rules = await db.prepare(`SELECT * FROM elimination_rules WHERE org_id = ?`)
    .bind(user.org_id).all();
  const eliminations: any[] = [];
  // 涉及的账簿集合（只在该集合内两两抵消）
  const bookSet = [...new Set([...accountLedger.values()])];
  for (const rule of (rules.results || [])) {
    for (const lb of bookSet) {
      const rec = accounts.get(`${lb}|${String(rule.receivable_account)}`);
      const pay = accounts.get(`${lb}|${String(rule.payable_account)}`);
      if (!rec || !pay) continue;
      // 应收：借方余额为正才可能被抵消；应付：贷方余额为正
      const recBal = rec.debit - rec.credit;
      const payBal = pay.credit - pay.debit;
      const elim = Math.min(Math.max(recBal, 0), Math.max(payBal, 0));
      if (elim <= 0) continue;
      // 同时压减应收(借)与应付(贷)
      rec.debit -= elim;
      pay.credit -= elim;
      eliminations.push({
        ruleCode: String(rule.code),
        ruleName: String(rule.name),
        ledgerBook: lb,
        ledgerBookName: ledgerNames.get(lb) || lb,
        receivableAccount: String(rule.receivable_account),
        payableAccount: String(rule.payable_account),
        amount: roundAmount(elim),
      });
    }
  }

  // ── 4) 组装合并试算平衡表 ─────────────────────────────────────
  // ending = debit - credit（原始净变动，符号依赖科目方向）
  // · 资产/费用（1xxx/5xxx）：借方余额为正
  // · 负债/权益/收入（2xxx/3xxx/4xxx）：贷方余额为负（取绝对值后显示为正）
  // ★ P0-2：每行带 ledgerBook / ledgerBookName，前端可按账簿分组展示，口径可见、可核对。
  const trialBalance = [...accounts.entries()]
    .map(([key, a]) => {
      const raw = roundAmount(a.debit - a.credit);
      // 对贷方正常科目取绝对值，使报表显示一致
      const codePrefix = String(a.code).slice(0, 1);
      const creditNormal = ['2', '3', '4'].includes(codePrefix);
      const ending = creditNormal ? Math.abs(raw) : raw;
      const lb = accountLedger.get(key) || '0000';
      return {
        code: a.code,
        name: a.name,
        ledgerBook: lb,
        ledgerBookName: ledgerNames.get(lb) || lb,
        debit: roundAmount(a.debit),
        credit: roundAmount(a.credit),
        ending,
      };
    })
    .sort((x, y) => (x.ledgerBook === y.ledgerBook
      ? x.code.localeCompare(y.code)
      : x.ledgerBook.localeCompare(y.ledgerBook)));

  const totals = {
    debit: roundAmount(trialBalance.reduce((s, a) => s + a.debit, 0)),
    credit: roundAmount(trialBalance.reduce((s, a) => s + a.credit, 0)),
  };

  const result = {
    scope,
    period: period || null,
    baseCurrency,
    orgIds,
    // ★ P0-2：账簿维度显式落在结果里（本次实际纳入了哪些账簿、各账簿叫什么），
    //   快照入库后可复盘「当时是按哪套口径合的」，避免口径不可追溯。
    ledgerBooks: [...new Set([...accountLedger.values()])].sort().map((code) => ({
      code,
      name: ledgerNames.get(code) || code,
    })),
    ledgerBooksFilter: ledgerBooks,
    trialBalance,
    eliminations,
    totals,
    generatedAt: new Date().toISOString(),
  };

  // ── 5) 落库合并结果快照 ───────────────────────────────────────
  const runId = uid('con');
  const now = new Date().toISOString();
  try {
    await db.prepare(
      `INSERT INTO consolidation_runs (id, org_id, group_id, scope, period, base_currency, generated_at, result_json, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      runId, user.org_id, groupRowId, scope, period || null, baseCurrency, now,
      JSON.stringify(result), now, now, user.id, user.name
    ).run();
  } catch (e: any) {
    return errorResponse(e, '保存合并结果');
  }

  return json({ runId, ...result }, 201);
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId') || undefined;
  const period = url.searchParams.get('period') || undefined;

  let sql = `SELECT * FROM consolidation_runs WHERE org_id = ?`;
  const params: any[] = [user.org_id];
  if (groupId) { sql += ` AND group_id = ?`; params.push(groupId); }
  if (period) { sql += ` AND period = ?`; params.push(period); }
  sql += ` ORDER BY generated_at DESC LIMIT 1`;

  const row = await env.DB.prepare(sql).bind(...params).first();
  if (!row) return json({ error: '暂无合并结果，请先执行合并' }, 404);

  let result: any = {};
  try { result = JSON.parse(row.result_json || '{}'); } catch { result = {}; }
  return json({ runId: row.id, ...result }, 200);
}

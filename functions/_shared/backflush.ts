/**
 * 生产倒冲发料（backflush）—— 服务端权威实现
 * ==================================================================
 * V3.20.0 修复对标差距 13「生产倒冲发料」。
 *
 * ── 之前是什么状态（先说清楚「为什么这不是新功能，而是补一个洞」）──
 * 系统里从来**没有**「完工自动按 BOM 扣原料」这回事，只有两条互不相干的手工通路：
 *   ① 「生成领料出库」→ 生成 pick 出库单 → postOutbound 扣库存（这条是对的）；
 *   ② 「生成成品入库」→ 只回写工单 + 生成成品入库单，**对原料零动作**。
 * 于是只要没人记得点第①步，成品就凭空入了库：原料账不动、材料成本不进工单，
 * 两个账本同时错，而界面上一切「正常」。重复制造模块里那个已经叫 backflush 的报工，
 * 也只是把数字累加进台账（repetitiveMfgStore.reportProduction），同样不扣账。
 *
 * ── 为什么放在服务端（判据：绕开界面还成不成立）──────────────────
 * 界面上的「领料」按钮可以绕过（直接调接口改状态、批量导入、第三方集成）。
 * 因此本模块挂在 work-orders 的 PUT 上，由「状态首次进入 completed」触发，
 * 绕开界面亦生效。前端只负责「把完工这件事提交上去」，不再自己算料。
 *
 * ── 复用现成实现，不重造轮子 ──────────────────────────────────
 * 库存扣减**不在这里重写**，直接调 functions/_shared/inventoryPosting.postOutbound：
 *   · 权威扣减 inventory_records + materials（两账本）；
 *   · 超发按强哥 2026-09-20 拍板「两维度统一夹 0」；
 *   · 自动生成出库凭证（借 5001 生产成本 / 贷 1403 原材料）+ 序列号流转。
 * 本模块只负责「算要扣什么、扣多少」，以及「谁来保证不会被扣两次」。
 *
 * ── 幂等（这是最容易出事的地方）────────────────────────────────
 * 靠 work_orders.inventory_posted（迁移 0076 新增）守卫：
 *   · 只有在真正扣账成功后才置 1；
 *   · 已置 1 直接返回 ALREADY_POSTED，不再扣第二次。
 * 触发点本身也做了收窄：只在「状态从非 completed 变为 completed」那一次调用，
 * 避免每次编辑已完工工单（改备注之类）都重跑一遍倒冲。
 *
 * ── 与手工领料的关系（刻意设计，不是漏考虑）─────────────────────
 * 领料应耗用量 = BOM 展开量 × 实际完工数量 × (1 + 废品率)
 * 本次倒冲量   = 应耗用量 − 该工单该物料**已手工领用**的数量
 * 即：人工已经领过的部分不重复扣，只补差额。这样「先领料再完工」与
 * 「直接完工」两条路径得到的原料总耗用完全一致。
 * 若差额 ≤ 0（手工领够了），记 outcome='covered' 并把该行标出来，不扣账也不报错
 * —— 这是正常业务，不是异常。
 *
 * ── 刻意不做的事（改动前请先读完）──────────────────────────────
 * ① **无 BOM 不倒冲、也绝不阻断完工**：倒冲是「补账」动作，不能变成「完工的门槛」。
 *    缺 BOM 时返回 NO_BOM 并写审计，由人工走领料出库。把补账做成阻断，
 *    结果一定是有人把这个功能关掉（比从来没做过更糟）。
 * ② **不做负库存校验**：沿用 postOutbound 既定策略（超发夹 0，不报错）。
 *    原因见 inventoryPosting.ts 文件头——改成「拒绝」会让「BOM 用量略大于库存」
 *    这种常见情形把完工直接卡死，而那本是异常、应由人工冲正。
 * ③ **不改 work_order_pickings 的唯一键**：见迁移 0076 说明。
 * ④ **不处理单位换算**：BOM 单位与库存单位不一致时本模块直接用 BOM 单位数量扣减。
 *    现状是两者都由人工在物料主数据里对齐，未经换算的扣减口径与手工领料路径
 *    完全一致（手工领料也是照搬 BOM 的 quantity 与 unit）。改换算属于独立议题。
 *
 * ── 与前端 WorkOrderDetail.explodeBOM 的口径关系（坑 ㉛）──────────
 * 「BOM 展开」这件事现在有两处实现（前端给界面看、这里给扣账用）。
 * 两处的**规则必须逐条一致**，否则会出现「界面说领 100、系统扣了 120」：
 *   · 有子件 → 递归子件，子件的用量基数 = 本行用量 × (1 + 废品率)；
 *   · 有 child_product_code → 递归那个产品的 BOM；
 *   · source === 'phantom'（虚项）→ **本身不领料**，只透传展开其子件
 *     （与 BOMDetail.tsx 的领料清单口径一致：`.filter(item => item.source !== 'phantom')`）；
 *   · 其余 → 叶子物料，按物料编码聚合多行用量。
 * 本次已同步把前端 explodeBOM 改成同一套规则（原来是「有子件递归、否则一律当叶子」，
 * 会把虚项当物料领，与 BOM 详情页的领料清单对不上）。
 */
import { postOutbound } from './inventoryPosting';
import { writeAudit } from './auditLog';
import { writeVoucher } from './voucherWriter';
import { roundAmount } from './money';
// V3.61.0 P0-1：期末结账守卫（倒冲领料）。appState.ts 零 import，不构成循环依赖。
import { isPeriodClosed } from './appState';

const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, '');

/** 数量保留 4 位小数：BOM 用量带废品率乘法会产生 0.30000000000000004 这类浮点噪音 */
const q4 = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;

/** 原料仓：与前端 productionStore.issueMaterials 保持一致（wh-001 / 原材料仓） */
const RAW_WAREHOUSE_ID = 'wh-001';
const RAW_WAREHOUSE_NAME = '原材料仓';

/** BOM 展开深度上限：防 A 用 B、B 用 A 的循环引用把递归打穿 */
const MAX_BOM_DEPTH = 12;

export type BackflushCode =
  | 'POSTED'           // 已倒冲扣料（至少一行）
  | 'ALREADY_POSTED'   // 幂等命中：本工单已倒冲过
  | 'NOT_COMPLETED'    // 工单不是已完工状态，不倒冲
  | 'NO_BOM'           // 找不到 BOM（不扣任何料，需人工领料）
  | 'NO_ITEMS'         // BOM 展开后没有任何可领料的叶子物料
  | 'NO_REMAINDER'     // 应耗用已被手工领料全部覆盖，无需补扣
  | 'NO_MATERIAL';     // BOM 里的料号在物料主数据中找不到，全部无法扣减

export interface BackflushLine {
  materialId: string | null;
  materialCode: string;
  materialName: string;
  unit: string;
  /** BOM 展开后的应耗用量（已计入废品率、已乘实际完工数量） */
  requiredQty: number;
  /** 该工单该物料已手工领用的数量 */
  issuedQty: number;
  /** 本次实际倒冲扣减的数量 */
  backflushQty: number;
  /**
   * 该行的处置结论：
   *  · posted           已倒冲扣账
   *  · covered          应耗用已被手工领料覆盖，本次不扣（正常业务）
   *  · missing_material 物料主数据中找不到该料号，无法扣减（数据问题，要提醒）
   *  · phantom_skipped  虚项，本身不领料（只透传展开其子件）
   *  · expanded         引用子装配，已展开为其子件（本身不领料）
   *  · missing_bom      引用子装配但找不到子装配清单 —— **用量被跳过**，需人工确认
   */
  outcome: 'posted' | 'covered' | 'missing_material' | 'phantom_skipped' | 'expanded' | 'missing_bom';
}

export interface BackflushResult {
  posted: boolean;
  code: BackflushCode;
  /** 面向用户的中文说明（前端可直接展示，不需要再自己组织话术） */
  message: string;
  lines: BackflushLine[];
  /** 本次倒冲结转的材料成本合计（元） */
  totalCost: number;
  /** 倒冲生成的出库单号（未扣账则为空） */
  outboundNo?: string;
}

/** 内部：展开用的聚合容器，按物料编码聚合（同一料号出现在多处时合并用量） */
interface AccEntry {
  materialCode: string;
  materialName: string;
  unit: string;
  qty: number;
}

/**
 * 递归展开一棵 BOM：把「多层结构 + 子装配引用 + 虚项」折算成
 * 「一组叶子物料 + 各自的应耗用量」。
 *
 * @param itemsByParent 已按 parent_item_id 分组的明细行（'__root__' 为顶层）
 * @param bomByProduct  子装配解析器：productCode → 该产品的顶层明细行（找不到返回 undefined）
 * @param key           当前要展开的父键
 * @param qtyPer        本层用量基数（父行用量 × (1+废品率)）
 * @param acc           聚合结果（按物料编码）
 * @param depth         当前深度（防循环）
 * @param phantomLines  虚项留痕（本身不领料，但要能解释「为什么清单里少了一行」）
 */
function expandLevel(
  itemsByParent: Map<string, any[]>,
  bomByProduct: (code: string) => any[] | undefined,
  key: string,
  qtyPer: number,
  acc: Map<string, AccEntry>,
  depth: number,
  phantomLines: BackflushLine[]
): void {
  if (depth > MAX_BOM_DEPTH) return;
  const rows = itemsByParent.get(key);
  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    const rowId = String(row.id || '');
    const baseQty = (Number(row.quantity) || 0) * qtyPer;
    const withScrap = baseQty * (1 + (Number(row.scrap_rate) || 0) / 100);
    const hasChildren = rowId !== '' && (itemsByParent.get(rowId)?.length || 0) > 0;
    const childCode = row.child_product_code ? String(row.child_product_code) : '';
    const isPhantom = String(row.source || '') === 'phantom';

    // ① 有下级子件：递归（用量基数 = 本行用量 × (1+废品率)，与前端 explodeBOM 一致）
    if (hasChildren) {
      expandLevel(itemsByParent, bomByProduct, rowId, withScrap, acc, depth + 1, phantomLines);
      continue;
    }

    // ② 引用了子装配产品：递归该产品的 BOM
    if (childCode) {
      const childItems = bomByProduct(childCode);
      if (childItems && childItems.length > 0) {
        const childMap = groupByParent(childItems);
        expandLevel(childMap, bomByProduct, '__root__', withScrap, acc, depth + 1, phantomLines);
        // 留一行说明「这一行本身不领料，已经展开成它的子件了」。
        // 不留的话，用户在倒冲明细里看不到这个料号会以为系统漏了它。
        phantomLines.push({
          materialId: row.material_id || null,
          materialCode: String(row.material_code || childCode),
          materialName: String(row.material_name || ''),
          unit: String(row.unit || ''),
          requiredQty: q4(withScrap),
          issuedQty: 0,
          backflushQty: 0,
          outcome: 'expanded',
        });
        continue;
      }
      // 子装配 BOM 找不到：**这部分用量会被跳过**，必须显式留痕而不是当成叶子扣料
      // （那个料号在物料主数据里往往也不存在，硬当叶子扣只会扣出一个 0）。
      // 单独用 missing_bom 与 phantom 区分开 —— 「虚项不领料」是设计，
      // 「子装配清单缺失」是数据缺陷，两者混用会让真正的问题被当成正常现象。
      phantomLines.push({
        materialId: row.material_id || null,
        materialCode: String(row.material_code || childCode),
        materialName: String(row.material_name || ''),
        unit: String(row.unit || ''),
        requiredQty: q4(withScrap),
        issuedQty: 0,
        backflushQty: 0,
        outcome: 'missing_bom',
      });
      continue;
    }

    // ③ 虚项且没有下级：虚项本身不领料（与 BOMDetail 领料清单口径一致）
    if (isPhantom) {
      phantomLines.push({
        materialId: row.material_id || null,
        materialCode: String(row.material_code || ''),
        materialName: String(row.material_name || ''),
        unit: String(row.unit || ''),
        requiredQty: q4(withScrap),
        issuedQty: 0,
        backflushQty: 0,
        outcome: 'phantom_skipped',
      });
      continue;
    }

    // ④ 叶子物料：按物料编码聚合
    const code = String(row.material_code || '');
    if (!code) continue;
    const existing = acc.get(code);
    if (existing) {
      existing.qty += withScrap;
    } else {
      acc.set(code, {
        materialCode: code,
        materialName: String(row.material_name || ''),
        unit: String(row.unit || ''),
        qty: withScrap,
      });
    }
  }
}

/** 把明细行按 parent_item_id 分组（顶层归到 '__root__'） */
function groupByParent(items: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const it of items) {
    const key = it.parent_item_id ? String(it.parent_item_id) : '__root__';
    const arr = map.get(key);
    if (arr) arr.push(it);
    else map.set(key, [it]);
  }
  return map;
}

/**
 * 找这张工单该用哪张 BOM。三级回退，顺序即优先级：
 *   ① 工单显式指定的 bom_id（最可信）
 *   ② 工单上的 bom_no（单据上是编号）
 *   ③ 按产成品的 product_code 找已发布版本（工单常只填产品）
 * 找不到返回 null —— 调用方据此返回 NO_BOM，不阻断完工。
 */
async function resolveBomHeader(db: any, orgId: string, wo: any): Promise<any | null> {
  if (wo.bom_id) {
    const byId = await db
      .prepare(`SELECT * FROM bom_headers WHERE id = ? AND org_id = ?`)
      .bind(wo.bom_id, orgId)
      .first();
    if (byId) return byId;
  }
  if (wo.bom_no) {
    const byNo = await db
      .prepare(`SELECT * FROM bom_headers WHERE org_id = ? AND bom_no = ? LIMIT 1`)
      .bind(orgId, wo.bom_no)
      .first();
    if (byNo) return byNo;
  }
  if (wo.product_code) {
    // 优先已发布；其次任意版本（工单已开工却只有草稿 BOM 是现实情况，不该因此不扣料）
    const released = await db
      .prepare(
        `SELECT * FROM bom_headers WHERE org_id = ? AND product_code = ? AND status = 'released'
          ORDER BY created_at DESC LIMIT 1`
      )
      .bind(orgId, wo.product_code)
      .first();
    if (released) return released;
    const anyBom = await db
      .prepare(
        `SELECT * FROM bom_headers WHERE org_id = ? AND product_code = ? ORDER BY created_at DESC LIMIT 1`
      )
      .bind(orgId, wo.product_code)
      .first();
    if (anyBom) return anyBom;
  }
  return null;
}

/** 取一张 BOM 的全部明细行（明细表无 org_id，靠 bom_id 从属表头，此处调用方已校验归属） */
async function loadBomItems(db: any, bomId: string): Promise<any[]> {
  const res = await db
    .prepare(`SELECT * FROM bom_items WHERE bom_id = ? ORDER BY level, sequence`)
    .bind(bomId)
    .all();
  return res.results || [];
}

/**
 * 工单完工倒冲：按 BOM 展开应耗用 → 减去已手工领用 → 对差额扣账。
 *
 * @param db      D1 绑定
 * @param orgId   组织（一律用 user.org_id，不接受外部传入）
 * @param user    当前用户（写审计与 created_by/updated_by）
 * @param woId    工单 id
 */
export async function backflushWorkOrder(
  db: any,
  orgId: string,
  user: any,
  woId: string
): Promise<BackflushResult> {
  const empty = (code: BackflushCode, message: string): BackflushResult => ({
    posted: false,
    code,
    message,
    lines: [],
    totalCost: 0,
  });

  const wo = await db
    .prepare(
      `    SELECT id, org_id, order_no, status, product_code, product_name, bom_id, bom_no,
              planned_quantity, completed_quantity, qualified_quantity, inventory_posted, actual_end_date, actual_labor_cost
         FROM work_orders WHERE id = ? AND org_id = ?`
    )
    .bind(woId, orgId)
    .first();
  if (!wo) return empty('NOT_COMPLETED', '工单不存在，未执行倒冲。');
  if (wo.status !== 'completed') return empty('NOT_COMPLETED', '工单尚未完工，未执行倒冲。');
  // V3.58.0 F-19 说明：幂等抢占不在函数开头做（那样 NO_BOM/NO_MATERIAL/NO_ITEMS 等
  // 「未实际扣料」的早退路径也会误把工单标记为已倒冲，破坏 28 号守护语义「无 BOM 时
  // 工单保持未倒冲、可人工补领料」）。抢占在「确认有实际扣料目标 toPost 非空」之后、
  // 建出库单之前执行，且失败回滚。详见下方 toPost.length > 0 分支。

  // 完工数量口径：优先合格数量（报废品不该消耗正常料，与完工入库口径一致），
  // 缺失时退回完工数量，再退回计划数量 —— 与前端 completeWorkOrder 的取值顺序一致。
  const doneQty =
    Number(wo.qualified_quantity) > 0
      ? Number(wo.qualified_quantity)
      : Number(wo.completed_quantity) > 0
        ? Number(wo.completed_quantity)
        : Number(wo.planned_quantity) || 0;
  if (doneQty <= 0) {
    return empty('NO_ITEMS', `工单 ${wo.order_no} 的完工数量为 0，无可倒冲的用料。`);
  }

  const header = await resolveBomHeader(db, orgId, wo);
  if (!header) {
    return empty(
      'NO_BOM',
      `工单 ${wo.order_no} 未找到物料清单（BOM），未执行倒冲。请补充 BOM 后手工生成领料出库。`
    );
  }

  // ── 展开 BOM（含子件递归、子装配引用、虚项透传）────────────────────
  const rootItems = await loadBomItems(db, header.id);
  if (rootItems.length === 0) {
    return empty('NO_ITEMS', `物料清单 ${header.bom_no} 没有明细行，未执行倒冲。`);
  }

  // 子装配解析缓存：productCode → 该产品的明细行（同一子装配被多处引用时只查一次）。
  // ⚠️ 必须**逐层预取到没有新的引用为止**，不能只预取一层：
  //    expandLevel 是同步递归（为了保持与前端同一套纯函数规则），无法在里面发查询。
  //    若只预取一层，第三层往后的 child_product_code 会解析不到，那部分用量会被
  //    当成「子装配 BOM 缺失」静默跳过 —— 少扣料且不报错，正是最难发现的那类缺陷。
  const childCache = new Map<string, any[]>();
  const bomByProduct = (code: string): any[] | undefined => childCache.get(code);
  const resolveChildBom = async (code: string): Promise<any[]> => {
    const childHeader = await db
      .prepare(
        `SELECT id FROM bom_headers WHERE org_id = ? AND product_code = ?
          ORDER BY (status = 'released') DESC, created_at DESC LIMIT 1`
      )
      .bind(orgId, code)
      .first();
    return childHeader ? await loadBomItems(db, childHeader.id) : [];
  };
  const codesOf = (rows: any[]): string[] =>
    rows.map((r) => (r.child_product_code ? String(r.child_product_code) : '')).filter(Boolean);

  let frontier: string[] = Array.from(new Set(codesOf(rootItems)));
  for (let depth = 1; depth <= MAX_BOM_DEPTH && frontier.length > 0; depth += 1) {
    const nextCodes: string[] = [];
    for (const code of frontier) {
      if (childCache.has(code)) {
        // 已解析过的产品不再重查，但它的下级仍要参与收敛判断（引用已被登记过，不会重复入队）
        continue;
      }
      const items = await resolveChildBom(code);
      childCache.set(code, items);
      nextCodes.push(...codesOf(items));
    }
    frontier = Array.from(new Set(nextCodes)).filter((c) => !childCache.has(c));
  }

  const acc = new Map<string, AccEntry>();
  // 实际扣减/覆盖的明细行与「说明性」行分开放：
  // 说明性行（虚项、子装配展开、子装配清单缺失）是在展开过程中产生的，
  // 若与实扣行混着 push，界面表格里会先出现一堆「没扣的」行，再出现真正扣了的行，
  // 读起来像「系统什么都没扣」。故最后统一按「实扣在前、说明在后」拼接。
  const accLines: BackflushLine[] = [];
  const notes: BackflushLine[] = [];
  expandLevel(groupByParent(rootItems), bomByProduct, '__root__', doneQty, acc, 1, notes);

  if (acc.size === 0) {
    return {
      posted: false,
      code: 'NO_ITEMS',
      message: `物料清单 ${header.bom_no} 展开后没有可领料的子件，未执行倒冲。`,
      lines: notes,
      totalCost: 0,
    };
  }

  // ── 逐项算差额：应耗用 − 已手工领用 ────────────────────────────────
  const toPost: any[] = [];
  let missing = 0;
  for (const entry of acc.values()) {
    const requiredQty = q4(entry.qty);
    const mat = await db
      .prepare(`SELECT id, code, name, unit, current_stock FROM materials WHERE org_id = ? AND code = ? LIMIT 1`)
      .bind(orgId, entry.materialCode)
      .first();

    // 已手工领用数量：优先按 material_id 匹配（领料记录以 id 为准），
    // 历史数据里 material_id 可能为空，再用料号兜一层。
    const issuedRow = await db
      .prepare(
        `SELECT COALESCE(SUM(quantity), 0) AS qty FROM work_order_pickings
          WHERE org_id = ? AND work_order_id = ?
            AND (material_id = ? OR (material_id IS NULL AND material_code = ?))`
      )
      .bind(orgId, woId, mat ? mat.id : '', entry.materialCode)
      .first();
    const issuedQty = q4(Number(issuedRow?.qty) || 0);
    const backflushQty = q4(requiredQty - issuedQty);

    if (!mat) {
      missing += 1;
      accLines.push({
        materialId: null,
        materialCode: entry.materialCode,
        materialName: entry.materialName,
        unit: entry.unit,
        requiredQty,
        issuedQty,
        backflushQty: 0,
        outcome: 'missing_material',
      });
      continue;
    }

    if (backflushQty <= 0) {
      accLines.push({
        materialId: mat.id,
        materialCode: entry.materialCode,
        materialName: mat.name || entry.materialName,
        unit: mat.unit || entry.unit,
        requiredQty,
        issuedQty,
        backflushQty: 0,
        outcome: 'covered',
      });
      continue;
    }

    accLines.push({
      materialId: mat.id,
      materialCode: entry.materialCode,
      materialName: mat.name || entry.materialName,
      unit: mat.unit || entry.unit,
      requiredQty,
      issuedQty,
      backflushQty,
      outcome: 'posted',
    });
    toPost.push({
      materialId: mat.id,
      materialCode: entry.materialCode,
      materialName: mat.name || entry.materialName,
      unit: mat.unit || entry.unit,
      quantity: backflushQty,
    });
  }

  // 界面展示顺序：实扣行在前（用户最关心「到底扣了哪些」），说明性行在后。
  const lines: BackflushLine[] = [...accLines, ...notes];

  if (toPost.length === 0) {
    // 有料但都被手工领料覆盖 → 正常业务；全是找不到物料 → 是数据问题，要提醒
    if (missing > 0 && missing === acc.size) {
      return {
        posted: false,
        code: 'NO_MATERIAL',
        message: `物料清单 ${header.bom_no} 里的料号在物料主数据中都不存在（${missing} 项），未执行倒冲。请先补建物料。`,
        lines,
        totalCost: 0,
      };
    }
    return {
      posted: false,
      code: 'NO_REMAINDER',
      message: `工单 ${wo.order_no} 的应耗用已由手工领料全部覆盖，无需倒冲。`,
      lines,
      totalCost: 0,
    };
  }

  // V3.58.0 修复 F-19：确认有实际扣料目标（toPost 非空）后才做条件 UPDATE 抢占，
  // 杜绝并发双扣。早退路径（NO_BOM/NO_MATERIAL/NO_ITEMS/NO_REMAINDER）保持
  // 「未扣料、工单 inventory_posted 保持 0」，不破坏 28 号守护语义。
  if (toPost.length > 0) {
    // ★ V3.61.0 P0-1：期末结账守卫（倒冲会生成领料出库单 + 5001 凭证）
    //   守卫必须在抢占之前：倒冲的失败分支只回滚标志并返回 posted:false，
    //   若靠 postOutbound 抛错会被吞掉、变成「工单显示已扣料但实际没扣」的假成功。
    const _bfPeriod = String((wo as any)?.start_date || (wo as any)?.order_date || '').slice(0, 7);
    if (_bfPeriod && await isPeriodClosed(db, orgId, _bfPeriod)) {
      return {
        posted: false,
        reason: 'PERIOD_CLOSED',
        message: `工单 ${(wo as any)?.order_no || ''} 所属会计期间 ${_bfPeriod} 已结账，禁止倒冲领料（请先反结账或调整工单日期）`,
      } as any;
    }
    const _bfClaim = await db
      .prepare(`UPDATE work_orders SET inventory_posted = 1 WHERE id = ? AND org_id = ? AND inventory_posted = 0`)
      .bind(woId, orgId).run();
    if (((_bfClaim as any)?.meta?.changes ?? 0) === 0) {
      return {
        posted: true,
        code: 'ALREADY_POSTED',
        message: '本工单已由并发请求完成倒冲发料，未重复扣料。',
        lines,
        totalCost: 0,
      };
    }
    // 抢占成功；若下方出库过账失败会回滚 work_orders.inventory_posted=0（见 601 行注释），可重试
  }

  // ── 生成倒冲出库单并过账（复用权威扣减路径，不自己写库存）────────────
  const stamp = Date.now();
  const outboundNo = `OUT-WO-BF-${wo.order_no}-${stamp}`;
  const outboundId = `out-wo-bf-${stamp}`;
  const outboundDate = String(wo.actual_end_date || '').slice(0, 10) || nowIso().slice(0, 10);

  // 单据落库先于过账：保证「有库存变动就有单据」，反向（扣了账却没单据）无法追溯。
  await db
    .prepare(
      `INSERT INTO outbound_orders (id, org_id, dept_id, outbound_no, type, source_no, customer_id, customer_name,
        vendor_id, vendor_name, status, warehouse_id, warehouse_name, operator, outbound_date, remarks, picker,
        created_at, updated_at, created_by, updated_by, inventory_posted, cogs_posted)
        VALUES (?, ?, ?, ?, 'pick', ?, NULL, NULL, NULL, NULL, 'completed', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, 0)`
    )
    .bind(
      outboundId,
      orgId,
      user.department || null,
      outboundNo,
      wo.order_no || null,
      RAW_WAREHOUSE_ID,
      RAW_WAREHOUSE_NAME,
      user.name || null,
      outboundDate,
      `生产倒冲发料（完工自动扣料）- 工单 ${wo.order_no} - ${wo.product_name || ''}`,
      nowIso(),
      nowIso(),
      user.name || null,
      user.name || null
    )
    .run();

  // ★ V3.62.0 边界⑤ D-11：出库单行改为**整批原子写入**（db.batch），
  //   消除「逐项 .run() 中途失败 → 已写行残留、其余未写」的半状态（中途失败会重复扣料/漏扣）。
  //   单批上限 99 条（D1 batch 限制），超出退化为逐条（保留旧行为，规避上限）。
  const ooiStmts: any[] = [];
  for (const it of toPost) {
    ooiStmts.push(
      db
        .prepare(
          `INSERT INTO outbound_order_items (id, outbound_order_id, material_id, material_code, material_name,
            specification, unit, quantity, batch_no, location_id, location_name, unit_cost, cost_amount, serial_nos, hu_id)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, 0, 0, NULL, NULL)`
        )
        .bind(
          'ooi-' + crypto.randomUUID(),
          outboundId,
          it.materialId,
          it.materialCode,
          it.materialName,
          it.unit || null,
          it.quantity
        )
    );
  }
  if (ooiStmts.length <= 99) {
    await db.batch(ooiStmts);
  } else {
    for (const s of ooiStmts) await s.run();
  }

  let totalCost = 0;
  try {
    const { enrichedItems } = await postOutbound(db, orgId, user, {
      items: toPost,
      warehouseId: RAW_WAREHOUSE_ID,
      warehouseName: RAW_WAREHOUSE_NAME,
      outboundDate,
      type: 'pick',
      outboundNo,
      operator: user.name,
    });
    totalCost = roundAmount(
      (enrichedItems || []).reduce((s: number, it: any) => s + (Number(it.costAmount) || 0), 0)
    );
    await db.prepare(`UPDATE outbound_orders SET inventory_posted = 1, cogs_posted = 1 WHERE id = ?`).bind(outboundId).run();
  } catch (e) {
    // 过账失败：把刚建的单据标成取消（不留在「已完成但没扣账」的中间态），
    // 并**不**置 work_orders.inventory_posted，下次完工动作还能重试。
    // V3.58.0 F-19：同时回滚上方抢占的 work_orders.inventory_posted=0，
    // 让下一次完工动作可重新抢占（否则抢占标志卡 1，后续完工永远返回 ALREADY_POSTED）。
    console.error('[backflush-post] failed', e);
    await db
      .prepare(`UPDATE outbound_orders SET status = 'cancelled', remarks = remarks || '（过账失败已作废）' WHERE id = ?`)
      .bind(outboundId)
      .run()
      .catch(() => null);
    await db
      .prepare(`UPDATE work_orders SET inventory_posted = 0 WHERE id = ? AND org_id = ?`)
      .bind(woId, orgId)
      .run()
      .catch(() => null);
    return {
      posted: false,
      code: 'NO_MATERIAL',
      message: `工单 ${wo.order_no} 倒冲过账失败（已作废出库单 ${outboundNo}），请查看服务端日志后手工处理。`,
      lines,
      totalCost: 0,
    };
  }

  // ★ V3.60.0 P1-2：归集生产工单实际人工成本进生产成本
  //   工单 actual_labor_cost > 0 时，生成凭证 借 5001 生产成本 / 贷 2211 应付职工薪酬。
  //   仅当该字段 > 0 才生成（缺省 0 时无行为变化，不破坏旧流程）；
  //   按 source+source_no(工单id) 幂等，重跑倒冲不会双记。失败非阻断、仅留痕。
  try {
    const laborCost = roundAmount(Number(wo.actual_labor_cost) || 0);
    if (laborCost > 0) {
      const laborEx = await db
        .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'labor' AND source_no = ?`)
        .bind(orgId, `LABOR-${woId}`)
        .first();
      if (!laborEx) {
        await writeVoucher(db, orgId, user, {
          voucherNo: `LABOR-${wo.order_no || woId}`,
          voucherType: '转',
          date: outboundDate,
          period: (outboundDate || '').slice(0, 7),
          description: `工单人工成本归集 ${wo.order_no || woId}`,
          source: 'labor',
          sourceNo: `LABOR-${woId}`,
          status: 'posted',
          totalDebit: laborCost,
          totalCredit: laborCost,
          items: [
            { summary: `归集人工成本 ${wo.order_no || woId}`, accountCode: '5001', accountName: '生产成本', debit: laborCost, credit: 0 },
            { summary: `应付职工薪酬 ${wo.order_no || woId}`, accountCode: '2211', accountName: '应付职工薪酬', debit: 0, credit: laborCost },
          ],
        });
      }
    }
  } catch (e: any) {
    console.error('[backflush-labor] 人工成本归集失败（非阻断，可重试）：', e?.message || e);
  }

  // ── 留痕：工单标记已倒冲 + 领料台账写入倒冲份额 ─────────────────────
  await db
    .prepare(`UPDATE work_orders SET inventory_posted = 1, backflush_outbound_no = ?, updated_at = ? WHERE id = ? AND org_id = ?`)
    .bind(outboundNo, nowIso(), woId, orgId)
    .run();

  // ★ V3.62.0 边界⑤ D-11：领料台账行改为**整批原子写入**（db.batch），
  //   消除「逐项 .run() 中途失败 → 部分物料已记、其余未记」的半状态。
  const wopStmts: any[] = [];
  for (const it of toPost) {
    // UPSERT：同一工单同一物料可能已有手工领料行（唯一键 org_id+work_order_id+material_id），
    // 累加到同一行，并把「其中倒冲了多少」单独记在 backflush_quantity 上（迁移 0076 说明）。
    wopStmts.push(
      db
        .prepare(
          `INSERT INTO work_order_pickings (id, org_id, work_order_id, work_order_no, material_id, material_code,
            material_name, unit, quantity, outbound_no, issued_at, created_at, updated_at, created_by, updated_by,
            backflush_quantity, backflush_outbound_no)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(org_id, work_order_id, material_id) DO UPDATE SET
              quantity = quantity + excluded.quantity,
              backflush_quantity = COALESCE(backflush_quantity, 0) + excluded.backflush_quantity,
              backflush_outbound_no = excluded.backflush_outbound_no,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by`
        )
        .bind(
          'wop-bf-' + crypto.randomUUID(),
          orgId,
          woId,
          wo.order_no || null,
          it.materialId,
          it.materialCode,
          it.materialName,
          it.unit || null,
          it.quantity,
          outboundNo,
          outboundDate,
          nowIso(),
          nowIso(),
          user.name || null,
          user.name || null,
          it.quantity,
          outboundNo
        )
    );
  }
  if (wopStmts.length <= 99) {
    await db.batch(wopStmts);
  } else {
    for (const s of wopStmts) await s.run();
  }

  await writeAudit(db, {
    orgId,
    actor: { id: user.id, name: user.name },
    entity: 'work_orders',
    entityId: woId,
    action: 'backflush',
    summary:
      `工单 ${wo.order_no} 完工倒冲发料：${toPost.length} 种物料、` +
      `材料成本 ${totalCost} 元（出库单 ${outboundNo}，完工数量 ${doneQty}）`,
  });

  return {
    posted: true,
    code: 'POSTED',
    message:
      `工单 ${wo.order_no} 已按物料清单倒冲发料：${toPost.length} 种原料、` +
      `材料成本 ${totalCost} 元（出库单 ${outboundNo}）。`,
    lines,
    totalCost,
    outboundNo,
  };
}

/**
 * 供前端查询当前工单的倒冲状态（不做任何写入）。
 * 用途：工单详情页显示「原料是否已倒冲、扣了哪些、出库单号」，
 * 让「倒冲」这件事在界面上是看得见的，而不是只在服务端悄悄发生。
 */
export async function getBackflushStatus(db: any, orgId: string, woId: string) {
  const wo = await db
    .prepare(`SELECT inventory_posted, backflush_outbound_no FROM work_orders WHERE id = ? AND org_id = ?`)
    .bind(woId, orgId)
    .first();
  const rows = await db
    .prepare(
      `SELECT material_id, material_code, material_name, unit, quantity,
              COALESCE(backflush_quantity, 0) AS backflush_quantity, outbound_no, backflush_outbound_no, issued_at
         FROM work_order_pickings WHERE org_id = ? AND work_order_id = ? ORDER BY created_at`
    )
    .bind(orgId, woId)
    .all();
  return {
    inventoryPosted: !!(wo && wo.inventory_posted),
    backflushOutboundNo: (wo && wo.backflush_outbound_no) || '',
    lines: (rows.results || []).map((r: any) => ({
      materialId: r.material_id,
      materialCode: r.material_code,
      materialName: r.material_name,
      unit: r.unit,
      issuedQty: Number(r.quantity) || 0,
      backflushQty: Number(r.backflush_quantity) || 0,
      outboundNo: r.outbound_no || '',
      backflushOutboundNo: r.backflush_outbound_no || '',
      issuedAt: r.issued_at || '',
    })),
  };
}

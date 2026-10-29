// 单据上下游关联 · 纯逻辑模块（V3.113.0 新增）
// 本文件不 import 任何 store，便于单元测试直接复用、不被 30 个 store 的副作用拖垮。
// 真实数据（每种单据的 store / 上下游关系 / 路由）由 relations.ts 在运行时填充进这里的空表。
//
// 关键设计（零侵入现有筛选/筛选用具）：
//   下游单号数据库没存，是"反向查谁以本单为来源"算出来的。withRelatedDocNos 给每一行预计算
//   upstreamNo/upstreamDocs/downstreamNo/downstreamDocs 四个字段，使它们"真实存在于数据行上"，
//   从而 DataTable.hiddenColumns 能隐藏、meta.searchable 能进筛选条、applyColumnFilters 能筛。

import { DOC_SOURCES } from './docSources';
export { DOC_SOURCES };

/** 单条关联引用（用于详情页/列表单元格渲染可点击链接） */
export interface RelatedDocRef {
  /** 目标单据类型（对应 DOC_RELATIONS / DOC_ROUTES / DOC_SOURCES 的 key） */
  type: string;
  /** 目标单据编号 */
  no: string;
}

/** 某单据类型的上下游关系登记 */
export interface DocRelation {
  /** 本单据的编号字段名（默认 'no'） */
  numberField?: string;
  /** 上游：本单据上记录"来源单号"的字段名 + 该字段指向的目标单据类型（简单单值场景） */
  upstream?: { field: string; target: string };
  /** 上游：动态解析（部分单据指向谁取决于自身 type / 用 id 而非编号）。返回数组以支持多来源 */
  upstreamResolver?: (row: any) => RelatedDocRef[];
  /** 下游：由本单据生成的下级单据（反向：目标单据的 linkField 等于本单某字段）。
   *  matchField 指定"用本单哪个字段去比"（默认 numberField 即编号）；
   *  当子单的关联字段存的是本单 id（如 sourceRequestIds）时，须显式 matchField:'id'。 */
  downstream?: Array<{ target: string; linkField: string; matchField?: string }>;
  /**
   * 同源关联单据（V3.115.0 新增）。
   *
   * 解决的问题：部分单据之间在数据模型上**没有直接字段相连**，只共享同一个上游。
   *   例：入库单只存 sourceNo=采购订单号，发票只存 purchaseOrderNo=采购订单号，
   *   「这张入库单对应的发票」在两表里都没有对方的号 —— 硬按字段映射必然查不到。
   *   但业务上它们确实是一伙的（同一采购订单下的收货与开票），用户就是要在入库单列表
   *   里看到这张单的发票状态。
   *
   * 解法：由本类型自行给出「同源单据」解析函数（通常按共同上游单号去反查目标单据），
   *   结果并入 downstreamDocs —— 列头仍是真实单据名（采购发票 / 付款计划…），
   *   在「明细是什么单就写什么单」的口径下与普通下游单据无差别。
   * 注意：不写函数即表示该单据没有同源关联需求，不做任何推断。
   */
  siblingResolver?: (row: any) => RelatedDocRef[];
  /**
   * siblingResolver 可能返回的目标单据类型清单（V3.115.0）。
   *
   * 为什么要单独声明：siblingResolver 是函数，运行时才能知道它查哪些表，
   *   而 useEnsureRelatedStores 需要在**挂载时**就把这些数据源的 store 拉起来。
   *   不声明 → 发票/付款计划的 store 没 hydrate → 兄弟单据永远查不到（列恒为空）。
   * 列出即可，不需要精确到字段；多列几个无害，漏列则关联失效。
   */
  siblingTargets?: string[];
  /**
   * 上游目标类型清单（V3.115.0）。
   * 与 siblingTargets 同理：upstreamResolver 是函数，静态看不出它指向哪些单据，
   * 而列表需要**稳定地把「来源单据」列摆出来**（哪怕当前数据解析不到目标，也要让用户
   * 看见"这里本该有一张采购发票"）。不声明则只按实际数据生成，数据一断列就消失。
   */
  upstreamTargets?: string[];
  /**
   * 本单据类型专属的状态字典（V3.116.0 新增）。
   *
   * 为什么需要：全站 statusConfig 是通用字典，同一个 key 在不同业务域含义并不相同 ——
   *   issued 在库存域是「已发料」，在供应商门户的开票申请里是「已开票」；
   *   received 在仓储域是「已收货」，在开票申请里是「已收票」。
   *   若一律走通用字典，供应商看到的状态就是错的（把他的发票说成"已发料"）。
   *
   * 用法：仅在**本类型语义与通用字典冲突**时声明；未声明的 key 自动回退通用字典，
   *   所以只需列出有歧义的那几个，不必把整张字典抄一遍。
   * 优先级：本表 > statusConfig 模块前缀键（inv_/pp_） > statusConfig 通用键 > 原始值。
   */
  statusLabels?: Record<string, DocStatusLabel>;
}

/** 类型专属状态标签（label 为中文短标签，color 取 MUI 语义色） */
export interface DocStatusLabel {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * 按「目标单据类型 + 某字段等于某值」反查单号（V3.115.0 新增）。
 * 供 relations.ts 书写 siblingResolver 时复用：一行代码即可把"同属某采购订单的发票"捞出来。
 * 字段值为数组时（如 receiptInboundNos）按包含匹配。
 */
export function docsByField(
  type: string,
  field: string,
  value: unknown
): RelatedDocRef[] {
  const src = DOC_SOURCES[type];
  if (!src || value == null || value === '') return [];
  let docs: unknown;
  try {
    docs = src.getDocs();
  } catch {
    return [];
  }
  if (!Array.isArray(docs)) return [];
  const key = String(value);
  const out: RelatedDocRef[] = [];
  for (const d of docs as Record<string, any>[]) {
    const v = d?.[field];
    if (v == null) continue;
    const hit = Array.isArray(v)
      ? v.map(String).includes(key)
      : String(v) === key;
    if (hit) out.push({ type, no: String(d[src.numberField]) });
  }
  return out;
}

/**
 * 单据类型 → 中文名（V3.114.0 新增）
 * 用途：关联列不再统一叫「上游单号 / 下游单号」，而是直接以实际单据类型命名
 *      （入库单、采购发票、付款计划…）—— 明细是什么单，列头就写什么单。
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  // 采购域
  purchaseRequest: '采购申请',
  purchaseOrder: '采购订单',
  purchaseReturn: '采购退货单',
  sourceList: '货源清单',
  infoRecord: '采购信息记录',
  frameworkAgreement: '框架协议',
  // 价格域
  priceInquiry: '询价单',
  priceComparison: '比价单',
  priceApproval: '价格审批单',
  priceList: '价目表',
  // 销售域
  salesOpportunity: '销售机会',
  salesQuotation: '销售报价单',
  salesOrder: '销售订单',
  salesLogistics: '发运单',
  salesInvoice: '销售发票',
  salesReturn: '销售退货单',
  salesContract: '销售合同',
  tripartySales: '三⽅贸易单',
  project: '项目',
  // 仓储域
  inbound: '入库单',
  outbound: '出库单',
  checkTask: '盘点任务',
  stockTransfer: '调拨单',
  inventoryAdjustment: '库存调整单',
  waveRfid: '波次单',
  batch: '批次',
  serialHU: '序列号/搬运单元',
  consignmentStock: '寄售库存',
  finishedGoodsInbound: '成品入库单',
  // 质量域
  inspectionNotice: '检验通知单',
  inspectionTask: '检验任务',
  unqualified: '不合格品单',
  pdca: 'PDCA 单',
  lot: '检验批次',
  eightD: '8D 报告',
  inspectionStandard: '检验标准',
  fmea: 'FMEA',
  labEquipment: '实验设备',
  // 生产域
  workOrder: '生产工单',
  processRoute: '工艺路线',
  subcontract: '委外订单',
  repetitiveMfg: '重复制造期间',
  ecn: '工程变更单',
  productionVersion: '生产版本',
  sopPlan: 'SOP 计划',
  // 财务域
  finInvoice: '采购发票',
  receivable: '应收单',
  payable: '应付单',
  cashMgmt: '资金流水',
  voucher: '记账凭证',
  paymentPlan: '付款计划',
  // 供应商门户（V3.116.0）
  vendorStatement: '供应商对账单',
  vendorInvoiceRequest: '开票申请',
  // 主数据
  vendor: '供应商',
  material: '物料',
  customer: '客户',
};

/** 取单据类型中文名；未登记的类型回退为原始 key（不编造名称） */
export function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type;
}

/** 各单据类型 → 上下游关系登记表（由 relations.ts 运行时填充） */
export const DOC_RELATIONS: Record<string, DocRelation> = {};

/** 各单据类型 → 详情页路由（由 relations.ts 运行时填充） */
export const DOC_ROUTES: Record<string, (id: string) => string> = {};

// ─────────────────────────────────────────────────────────────
// 关系源数据版本签名（V3.113.1）
// 背景：store 未水合时先用前端 mock 初始值算关联，水合完成后若不重算，
//       详情页会残留"基于 mock 的失效单号"，点击 resolveRoute 解析不到 → 死链。
// 方案：给每个关系源的数据数组分配稳定版本号（数组引用被替换 → 版本号变化），
//       签名变化即代表关联数据已更新，驱动详情页重算上下游。
// 纯逻辑实现（不依赖 React / store），便于单测。
// ─────────────────────────────────────────────────────────────

/** 数据数组引用 → 稳定版本号（同一引用恒定同号，被替换后换号） */
const sourceVersionMap = new WeakMap<object, number>();
let sourceVersionSeq = 0;

function versionOf(value: unknown): number {
  if (value == null || typeof value !== 'object') return 0;
  const hit = sourceVersionMap.get(value as object);
  if (hit != null) return hit;
  const next = ++sourceVersionSeq;
  sourceVersionMap.set(value as object, next);
  return next;
}

/**
 * 取一组关系源类型的数据版本签名。
 * @param types 需要纳入的类型（一般为本单类型 + 其上下游目标类型）
 * @returns 字符串签名；签名变化 ⇔ 关联源数据被替换（水合/刷新）
 */
export function getSourcesSignature(types: string[]): string {
  let sig = '';
  for (const t of types) {
    const src = DOC_SOURCES[t];
    if (!src) continue;
    let docs: unknown;
    try {
      docs = src.getDocs();
    } catch {
      docs = null;
    }
    sig += `${t}:${versionOf(docs)};`;
  }
  return sig;
}

/** 把「单据编号」解析成「详情页路由」；找不到则返回 '#' */
export function resolveRoute(type: string, no: string): string {
  const src = DOC_SOURCES[type];
  const id = src
    ? (src.getDocs().find((d) => String(d[src.numberField]) === String(no)) as Record<string, any> | undefined)?.id
    : undefined;
  const route = DOC_ROUTES[type];
  if (route && id != null) return route(String(id));
  return '#';
}

// ─────────────────────────────────────────────────────────────
// 弱语义来源单号 → 目标单据类型推断（V3.113.2）
// 背景：财务域部分字段（如资金流水的 relatedDoc）是"自由文本单号"，
//       前缀混用（INV-/PO-/SI-/FR-），无法从字段名直接得知目标类型。
//       本函数按前缀推断候选类型，并且**必须能在该类型的真实数据里查到该单号**，
//       否则返回空数组 —— 宁可不给链接，也不给点不动的死链。
// ─────────────────────────────────────────────────────────────

/** 自由文本单号前缀 → 候选目标单据类型（按优先级排列） */
const PREFIX_TARGETS: Array<{ prefix: string; types: string[] }> = [
  { prefix: 'INV', types: ['finInvoice', 'salesInvoice'] },
  { prefix: 'SI', types: ['salesInvoice'] },
  { prefix: 'FP', types: ['salesInvoice'] },
  { prefix: 'PO', types: ['purchaseOrder'] },
  { prefix: 'PI', types: ['finInvoice'] },
  { prefix: 'AR', types: ['receivable'] },
  { prefix: 'AP', types: ['payable'] },
  { prefix: 'SO', types: ['salesOrder'] },
  { prefix: 'IN', types: ['inbound'] },
  { prefix: 'OUT', types: ['outbound'] },
];

/**
 * 推断自由文本单号指向的目标单据类型，并校验该单号在目标源里真实存在。
 * @returns 命中且能解析出路由的引用；无命中返回空数组（避免死链）
 */
export function inferRelatedRefByNo(no: string | null | undefined): RelatedDocRef[] {
  const raw = String(no ?? '').trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  for (const rule of PREFIX_TARGETS) {
    if (!upper.startsWith(rule.prefix)) continue;
    for (const type of rule.types) {
      const src = DOC_SOURCES[type];
      if (!src) continue;
      const hit = src.getDocs().find((d) => String(d[src.numberField]) === raw);
      if (!hit) continue;
      // 必须能解析出真实路由，否则是死链 → 跳过
      if (resolveRoute(type, raw) === '#') continue;
      return [{ type, no: raw }];
    }
  }
  return [];
}

/**
 * 存在性校验过滤器：只保留「目标单号在目标类型的数据源里真实存在、且能解析出路由」的引用。
 *
 * 背景（V3.113.2 实测）：财务域的来源单号并非都指向同一套编号体系 ——
 *   - 应付/应收存的是业务发票号（PI-* / SI-*），与发票表（INV-*）不同源；
 *   - 凭证从扁平分录派生时 sourceNo 存的是**凭证号自身**（V-PP-* / V-*）。
 * 若按映射表"盲指"，点开必然是死链。故统一用本函数兜底：
 * 解析不出真实目标的引用一律丢弃 —— 宁可少给一个链接，也不给点不动的假链接。
 */
export function pickExistingRefs(candidates: RelatedDocRef[]): RelatedDocRef[] {
  const out: RelatedDocRef[] = [];
  for (const c of candidates) {
    if (!c || !c.type || !c.no) continue;
    const src = DOC_SOURCES[c.type];
    if (!src) continue;
    const hit = src.getDocs().find((d) => String(d[src.numberField]) === String(c.no));
    if (!hit) continue;
    if (resolveRoute(c.type, String(c.no)) === '#') continue;
    out.push(c);
  }
  return out;
}

/**
 * 给数据行批量预计算上下游关联单号。
 * 返回原行 + 4 个增强字段：upstreamNo / upstreamDocs / downstreamNo / downstreamDocs。
 */
export function withRelatedDocNos<T extends Record<string, any>>(
  docType: string,
  rows: T[]
): Array<
  T & {
    upstreamNo: string;
    upstreamDocs: RelatedDocRef[];
    downstreamNo: string;
    downstreamDocs: RelatedDocRef[];
  }
> {
  const rel = DOC_RELATIONS[docType];
  const numberField = rel?.numberField ?? 'no';
  const downTargets = rel?.downstream ?? [];

  return rows.map((row) => {
    // 上游
    let upstreamDocs: RelatedDocRef[] = [];
    if (rel?.upstreamResolver) {
      try {
        upstreamDocs = rel.upstreamResolver(row) ?? [];
      } catch {
        upstreamDocs = [];
      }
    } else if (rel?.upstream) {
      const v = row[rel.upstream.field];
      if (v != null && v !== '') upstreamDocs = [{ type: rel.upstream.target, no: String(v) }];
    }

    // 下游（反向查：目标单据的 linkField 等于本单的某字段；linkField 可能是数组）
    const downstreamDocs: RelatedDocRef[] = [];
    // V3.117.0：同一张下游单可能被多条规则命中 —— 典型是 RELS 里同时登记了
    //   { linkField:'inspectionTaskId', matchField:'id' } 与 { linkField:'inspectionTaskNo' }，
    //   种子数据两个字段都填了，于是同一张 NCR 被推入两次，列表里显示成
    //   「NCR-20240511-001,NCR-20240511-001」。
    //   这里按 type+单号 去重（而不是删掉某条规则），因为两种匹配方式都必须保留：
    //   历史数据可能只填了 id、新数据可能只填了单号，删任一都会漏单。
    const seenDown = new Set<string>();
    for (const d of downTargets) {
      const src = DOC_SOURCES[d.target];
      if (!src) continue;
      const childDocs = src.getDocs();
      if (!Array.isArray(childDocs)) continue;
      const myRef = row[d.matchField ?? numberField];
      if (myRef == null) continue;
      for (const c of childDocs) {
        const linkVal = c[d.linkField];
        if (linkVal == null) continue;
        const matches = Array.isArray(linkVal)
          ? linkVal.map(String).includes(String(myRef))
          : String(linkVal) === String(myRef);
        if (!matches) continue;
        const no = String(c[src.numberField]);
        const key = `${d.target}|${no}`;
        if (seenDown.has(key)) continue;
        seenDown.add(key);
        downstreamDocs.push({ type: d.target, no });
      }
    }

    // 同源关联单据（V3.115.0）：走共同上游反查出来的兄弟单据，并入 downstreamDocs。
    // 去重理由：某些单据既是下游又是同源（如采购订单的发票既是 downstream 又可能被
    // siblingResolver 再捞一次），重复渲染会让同一个单号在列里出现两遍。
    if (rel?.siblingResolver) {
      try {
        for (const ref of rel.siblingResolver(row) ?? []) {
          if (!ref?.type || !ref?.no) continue;
          const no = String(ref.no);
          if (downstreamDocs.some((d) => d.type === ref.type && String(d.no) === no)) continue;
          downstreamDocs.push({ type: ref.type, no });
        }
      } catch {
        /* 同源解析失败不影响主体关联 */
      }
    }

    return {
      ...row,
      upstreamNo: upstreamDocs.map((x) => x.no).join(','),
      upstreamDocs,
      downstreamNo: downstreamDocs.map((x) => x.no).join(','),
      downstreamDocs,
    };
  });
}

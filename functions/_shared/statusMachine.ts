// 单据状态机（V3.17.4 · 缺陷台账 #9「单据状态机」服务端硬拦）
//
// 为什么要有这个文件：
//   全系统 20+ 类单据，后端 PUT 一律把 status 当普通字段「只存不校验」。
//   于是任何绕过界面的写入——直接调接口、批量修改、Excel 导入、第三方集成、
//   未来的智能助手——都能把一张「已完成」的单据改回「草稿」，
//   把一张「已过账」的凭证改回「草稿」，账实就此不符，
//   而且往往到月结 / 年审才被发现。这里把它下沉为服务端强制闸门。
//
// ★ 设计原则：只锁「实质完结态」，非完结态之间自由流转——刻意的「宽松」是为了**零误伤**。
//   侦察确认前端存在大量既有的自由流转：
//     · 采购订单「编辑保存」会把已有订单打回 created（src/pages/Purchase/OrderForm.tsx）
//     · 销售订单「编辑保存」会把已有订单打回 draft（src/pages/Sales/SalesOrderForm.tsx）
//     · 批量修改 / Excel 导入可写任意状态（OrderList / InboundList / OutboundList）
//   若做「完整白名单」逐条枚举合法跃迁，上述每一条都会被误杀，线上直接报错。
//   而台账 #9 的真正痛点是「已完成 / 已过账被退回草稿」这类**破坏终态**的操作。
//   因此策略定为：**非完结态自由流转（兼容现状），完结态一旦进入不可回退（堵住痛点）**。
//
// ★ 刻意不做的事（都是踩过的坑，改动前请先读完）：
//   ① 不做「跳级校验」（例如 created 不能直接到 received）：
//      收货回写本来就是 created → received（未必经过 sent / confirmed），
//      一刀切会把正常的收货 / 确认流程全部拒掉。
//   ② 不拦截「状态不变」的请求（to === from）：整单保存时前端会原样回传当前状态，
//      这不是流转，必须放行，否则任何编辑保存都会 400。
//   ③ 不拦截「不携带 status」的请求：部分接口只改明细不改状态。
//   ④ 不做「删除」拦截：删除是另一套语义，已由各接口自身的审计与业务判断处理。

export type DocType =
  | 'purchase_order'
  | 'sales_order'
  | 'work_order'
  | 'inbound_order'
  | 'outbound_order'
  | 'stock_transfer'
  | 'voucher';

interface StatusRule {
  /** 单据中文名（报错文案用） */
  label: string;
  /** 合法状态全集；不在其中的目标状态一律 400 */
  all: string[];
  /**
   * 锁定态 → 允许的去向（**不含自身**；to === from 由「状态不变」规则自动放行）。
   * 未列入 locked 的状态视为「非锁定态」，可自由流转到 all 中的任意状态。
   * 空数组（[]）= 完全锁定，进入后不可再变。
   */
  locked: Record<string, string[]>;
  /** 状态中文名（报错文案用，缺省回退为原始值） */
  labels: Record<string, string>;
}

const RULES: Record<DocType, StatusRule> = {
  // 采购订单：已收货 = 库存已过账，不可回退（只可继续结案）；已关闭 / 已取消完全锁定
  purchase_order: {
    label: '采购订单',
    all: ['created', 'sent', 'vendorConfirmed', 'confirmed', 'partial', 'received', 'closed', 'cancelled'],
    locked: { received: ['closed'], closed: [], cancelled: [] },
    labels: {
      created: '已创建', sent: '已发送', vendorConfirmed: '供应商已确认', confirmed: '已确认',
      partial: '部分收货', received: '已收货', closed: '已关闭', cancelled: '已取消',
    },
  },
  // 销售订单：已全发货（货已出）不可回退（只可继续完成）；已完成 / 已取消完全锁定
  sales_order: {
    label: '销售订单',
    all: ['draft', 'confirmed', 'in_production', 'partial_shipped', 'fully_shipped', 'completed', 'cancelled'],
    locked: { fully_shipped: ['completed'], completed: [], cancelled: [] },
    labels: {
      draft: '草稿', confirmed: '已确认', in_production: '生产中', partial_shipped: '部分发货',
      fully_shipped: '已全发货', completed: '已完成', cancelled: '已取消',
    },
  },
  // 工单：已完工不可回退（只可继续关闭）；已关闭完全锁定
  work_order: {
    label: '工单',
    all: ['draft', 'released', 'in_progress', 'completed', 'closed'],
    locked: { completed: ['closed'], closed: [] },
    labels: { draft: '草稿', released: '已下达', in_progress: '生产中', completed: '已完工', closed: '已关闭' },
  },
  // 入库单：已完成 = 库存已入库，不可回退；已取消完全锁定
  inbound_order: {
    label: '入库单',
    all: ['pending', 'processing', 'completed', 'cancelled'],
    locked: { completed: [], cancelled: [] },
    labels: { pending: '待处理', processing: '处理中', completed: '已完成', cancelled: '已取消' },
  },
  // 出库单：已完成 = 库存已扣减 / 成本已结转，不可回退；已取消完全锁定
  outbound_order: {
    label: '出库单',
    all: ['pending', 'processing', 'picking', 'picked', 'packed', 'shipped', 'completed', 'cancelled'],
    locked: { completed: [], cancelled: [] },
    labels: {
      pending: '待处理', processing: '处理中', picking: '拣货中', picked: '已拣货',
      packed: '已装箱', shipped: '已发货', completed: '已完成', cancelled: '已取消',
    },
  },
  // ★ V3.45.0 第3批新增：库存调拨单（对标报告 S-05）。
  //   此前 DocType 联合类型里**没有** stock_transfer ⇒ 调拨单状态可被任意赋值
  //   （包括直接置 completed 而不触发任何过账），等于没有状态管控。
  //   规则设计：completed 与 cancelled 为锁定态 —— 调拨已完成即意味着两仓数字已变动，
  //   不可再回退（要改只能反向再做一张调拨单，对标 SAP：不删除已过账移动类型，只能反向过账）。
  stock_transfer: {
    label: '转储单',
    all: ['draft', 'pending', 'in_transit', 'completed', 'cancelled'],
    locked: { completed: [], cancelled: [] },
    labels: {
      draft: '草稿', pending: '待处理', in_transit: '在途',
      completed: '已完成', cancelled: '已取消',
    },
  },
  // 凭证：已过账不可回退为草稿 / 已审核（只能红冲）；已红冲完全锁定
  voucher: {
    label: '记账凭证',
    all: ['draft', 'reviewed', 'posted', 'reversed'],
    locked: { posted: ['reversed'], reversed: [] },
    labels: { draft: '草稿', reviewed: '已审核', posted: '已过账', reversed: '已红冲' },
  },
};

/**
 * 校验一次状态流转是否合法。
 *
 * @param docType    单据类型
 * @param fromStatus 库中当前状态（existing.status）
 * @param body       请求体；读取 body.status 作为目标状态
 * @returns null 表示放行；非 null 为可直接 return 的 400 错误响应（调用方需自行 json(..., 400)）
 */
export function guardStatusTransition(
  docType: DocType,
  fromStatus: unknown,
  body: any
): { response: any } | null {
  const rule = RULES[docType];
  if (!rule) return null;

  // 未携带状态：只改明细不改状态，放行
  if (!body || body.status === undefined || body.status === null) return null;

  const from = String(fromStatus ?? '');
  const to = String(body.status);

  // 状态未变：不是流转（整单保存会原样回传当前状态），放行
  if (to === from) return null;

  const nameOf = (s: string) => rule.labels[s] || s;

  // ① 目标状态必须是该单据的合法值
  if (!rule.all.includes(to)) {
    return {
      response: {
        error: `${rule.label}的状态值「${to}」不合法`,
        code: 'INVALID_STATUS',
      },
    };
  }

  // ② 已进入锁定态（实质完结）的单据，不允许回退
  const allowed = rule.locked[from];
  if (allowed && !allowed.includes(to)) {
    const hint = allowed.length > 0
      ? `仅可继续流转为「${allowed.map(nameOf).join('、')}」`
      : '该状态不可再变更';
    return {
      response: {
        error: `${rule.label}当前为「${nameOf(from)}」，不能改为「${nameOf(to)}」（${hint}）`,
        code: 'STATUS_LOCKED',
        from,
        to,
      },
    };
  }

  return null;
}

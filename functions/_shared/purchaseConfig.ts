// 采购域父子表配置（C1 · V3.11.0）
//
// 两份配置驱动四个端点：
//   · PURCHASE_REQUEST_PC → /api/purchase-requests        （申请 + items）
//   · VENDOR_QUOTE_PC     → /api/purchase-requests/:id/quotes（报价 + items）
//                           以及 /api/vendor-quotes/:id（单条读写）
// 实际 CRUD 逻辑全在 `_shared/parentChild.ts`（通用父子表助手），本文件只描述形状。
//
// ── 列名来源（硬纪律）────────────────────────────────────────────
// 全部列名由 `src/types/purchase.ts` 的
//   PurchaseRequest (extends BaseEntity) / PurchaseRequestItem /
//   VendorQuote / QuoteItem
// 逐一反推为 snake_case，**不按「采购申请应该长什么样」推断**。
// 这条纪律来自 0053 的教训（按会计常识推列名 → 表与前端契约全对不上）。
//
// 迁移前已用脚本逐字段比对生产库真实数据 vs 前端类型（非目测），
// 结论见 migrations/0058_purchase_domain.sql 文件头。
//
// ── ★ 本域的核心判断：两个切片，两种命运 ────────────────────────
// 本 store 的 Blob 里原本有三个切片，处理方式各不相同：
//   · purchaseOrders   —— V2.75.x 已直连 D1，本轮**不碰**（store 的
//     partialize 早已不写它，Blob 里现在也确实没有它）。
//   · purchaseRequests —— 迁 D1。有 15 处写入调用点、34 个消费方。
//   · vendorQuotes     —— 迁 D1。**零写入调用点**，但**有 2 条真实报价**。
//
// ★★ vendorQuotes 与销售域 marketData 的对照（最该记住的一条）：
//   V3.9.0 销售域有个 `marketData` 切片被**刻意不迁**，判据三条同时成立：
//     (a) 零 CRUD 调用点  (b) 仅一个只读消费方  (c) 本质是报表种子常量
//   `vendorQuotes` 看似满足 (a)(b)，但 **(c) 完全不成立** ——
//   生产库里是 2 条真实供应商报价（带 unitPrice / amount 逐行明细），
//   是「供应商比价」业务的唯一数据载体。
//   → **判据不是「像不像上一个不迁的先例」，而是「这份数据空了会怎样」。**
//     这是把一次经验变成可复用规则的唯一正确方式。
//
// ── nested 处理：一个刻意的例外 ─────────────────────────────────
// `PurchaseRequest.approvalRecords: ApprovalRecord[]` 是**对象数组**，
// 按前面几个域的直觉应该建子表。本域**刻意不建**，走父表 JSON 文本列：
//   1. 实测生产库 5 条申请中该字段**一条都没有**（全 undefined）→
//      现在建表只会得到空壳；
//   2. 它的用途是「详情页整体读出的审批留痕」，
//      这个用途 JSON 文本 100% 覆盖；
//   3. 审批记录的权威来源是 approval_flows 体系，这里只是冗余展示。
// 若将来需要「按审批人/时间做 SQL 统计」，再单独建表 ——
// 届时数据已真实存在，迁移有内容可搬，不会白建一张空表。
//
// ★ 与「字符串数组走 JSON 列」的区别要说清：那条规则针对的是
//   「无 id、无属性的字符串列表」（fields / interestProducts）。
//   这里是**对象数组**，走 JSON 列是「暂时够用」，不是「本质上就该如此」。
//   两者的区别在于**将来会不会需要按内部字段查询**。
//
// ★ 另需注意：父表 JSON 列的编解码用的是 `toJsonText` / `parseJsonArray`，
//   它们对**数组**是原样 JSON.stringify / JSON.parse，对象数组能正常工作；
//   只有当值**不是数组**时才会退化成 `[]`。而子表的 `toJsonValue` 是为
//   「单个对象」（conditions / skipRule / escalation）准备的 ——
//   本域没有这种字段，所以**不需要动 parentChild.ts**。
import type { ParentChildConfig } from './parentChild';

/**
 * 采购申请：父 purchase_requests + 子 purchase_request_items
 *
 * ★ noCamel 取 `requestNo`：UNIQUE 约束落在业务单号上
 *   （PR20240501001 这种），撞号提示里必须显示人看得懂的单号。
 *   对比审批流域取的是 `module`（那里的业务标识就是 module）。
 *   **规则：取「撞了之后人用来辨认记录的那个字段」，不是主键本身。**
 *
 * ★★ 这个约束由 `migrations/0060_purchase_unique_index.sql` 建立。
 *    0058 建表时**漏了它**，而本文件与 parentChild 的 409 分支都假定它存在 ——
 *    结果是「重复单号能建出第二条、不报错」。这是「写配置时按应该有的样子
 *    写注释、却没回去核对迁移」造成的，教训与 0053 同源。
 *    若将来再加新父表，请同步确认**唯一约束真的在迁移里建了**。 */
export const PURCHASE_REQUEST_PC: ParentChildConfig = {
  parentTable: 'purchase_requests',
  module: 'purchase-request', // P0-1：专设模块，buyer 在 BUILTIN_ROLE_OPS 已全权（避免误拒合法采购员）
  children: [
    {
      childTable: 'purchase_request_items',
      childFkCol: 'request_id',
      childField: 'items',
      childCols: [
        // ★ PurchaseRequestItem **自带 id** → parentChild 的
        //   `item.id ? String(item.id) : uid('ci')` 会直接用前端 id，
        //   不会另生成。这与 QuoteItem（无 id）是两种情形。
        ['material_id', 'materialId'],
        ['material_code', 'materialCode'],
        ['material_name', 'materialName'],
        ['specification', 'specification'],
        ['unit', 'unit'],
        ['quantity', 'quantity'],
        ['estimated_price', 'estimatedPrice'],
        ['estimated_amount', 'estimatedAmount'],
        ['delivery_date', 'deliveryDate'],
        ['remarks', 'remarks'],
      ],
      // 明细顺序：前端未提供显式序号，按插入顺序（seq 由回填时写入行号）。
      // 不按 quantity/amount 排 —— 那会把用户录入的顺序打乱。
      childOrder: 'seq ASC',
    },
  ],
  parentCols: [
    ['request_no', 'requestNo'],
    ['title', 'title'],
    ['applicant', 'applicant'],
    ['department', 'department'],
    ['type', 'type'],
    ['priority', 'priority'],
    ['reason', 'reason'],
    // ★ 这些可选字段实测在真实数据里一条都没出现，但**必须登记**：
    //   用户一旦填写备注、或从 MRP 生成申请（带 sourceType/sourceNo），
    //   未登记的字段会被父表 pickCols **静默丢弃且返回 201 成功**。
    //   「现在没数据就不登记」是本轮最容易犯的错 —— 判据是
    //   「前端契约里有没有这个字段」，不是「库里现在有没有值」。
    ['remarks', 'remarks'],
    ['expected_date', 'expectedDate'],
    // V3.102.0 申请日期：表头「期望日期」改为「申请日期」（提交时自动拉取当天），
    // 期望交货语义已由明细行 delivery_date 接管，expected_date 保留供历史数据与下游读取
    ['application_date', 'applicationDate'],
    ['status', 'status'],
    ['total_amount', 'totalAmount'],
    ['current_step', 'currentStep'],
    ['project_no', 'projectNo'],
    ['project_name', 'projectName'],
    ['source_type', 'sourceType'],
    ['source_no', 'sourceNo'],
    ['source_name', 'sourceName'],
    // V3.94.0 归属采购员（由物料分类「采购员」责任自动归集，驱动通知与按姓名筛选）
    ['buyer_ids', 'buyerIds'],
    ['buyer_names', 'buyerNames'],
    // BaseEntity 四件套
    ['created_at', 'createdAt'],
    ['updated_at', 'updatedAt'],
    ['created_by', 'createdBy'],
    ['updated_by', 'updatedBy'],
  ],
  // 对象数组与对象走父表 JSON 文本列（见文件头「nested 处理」）。
  // toJsonText 对数组原样序列化，对象数组没问题；parseJsonArray 读回数组。
  jsonCols: [
    ['approval_records', 'approvalRecords'], // ApprovalRecord[]（对象数组）
    ['custom_fields', 'customFields'],       // Record<string, unknown>（对象）
  ],
  label: '采购申请',
  noSnake: 'request_no',
  noCamel: 'requestNo',
  // V3.93.0：采购申请接入服务端权威取号（此前单号由前端扫本地已有编号取最大号加一，
  // 多终端并发必撞号）。规则为 PR-YYYYMMDD-4位流水，与采购订单同款。
  noDocType: 'PR',
};

/**
 * 供应商报价：父 vendor_quotes + 子 vendor_quote_items
 *
 * ★ QuoteItem **没有 id 字段**（`src/types/purchase.ts` 的 QuoteItem
 *   只有 materialId / materialName / quantity / unitPrice / amount）→
 *   子表主键由 parentChild 的 `uid('ci')` 生成。
 *   这与 PurchaseRequestItem（有 id）是**同一助手内的两种分支**，
 *   无需额外配置，助手已处理好。
 *
 * ★ RLS 登记为 `'all'`（公司级公共信息）：报价是**比价用的公共信息**，
 *   采购员与审批人都要看全部报价才能比出最低价（同财务账目属性）。
 *   对比 purchase_requests 是 `'own'`（个人提报的单据）。
 *   **同一业务域内的两张表权限值不同 —— 必须逐张按业务语义定。**
 */
export const VENDOR_QUOTE_PC: ParentChildConfig = {
  parentTable: 'vendor_quotes',
  module: 'purchase', // P0-1：与 API_TO_MODULE['vendor-quotes']='purchase' 一致，buyer 已有 purchase 写权
  children: [
    {
      childTable: 'vendor_quote_items',
      childFkCol: 'quote_id',
      childField: 'items',
      childCols: [
        ['material_id', 'materialId'],
        ['material_name', 'materialName'],
        ['quantity', 'quantity'],
        ['unit_price', 'unitPrice'],
        ['amount', 'amount'],
      ],
      childOrder: 'seq ASC',
    },
  ],
  parentCols: [
    ['request_id', 'requestId'],
    ['vendor_id', 'vendorId'],
    ['vendor_name', 'vendorName'],
    ['total_amount', 'totalAmount'],
    ['valid_until', 'validUntil'],
    ['remarks', 'remarks'],
    ['submitted_at', 'submittedAt'],
    ['created_at', 'createdAt'],
    ['updated_at', 'updatedAt'],
  ],
  label: '供应商报价',
  // VendorQuote 契约里没有单号概念，用 vendorName + 有效期组合也没有意义；
  // 撞主键（同一报价 id 重复）时提示供应商名是最可辨认的。
  noSnake: 'vendor_name',
  noCamel: 'vendorName',
};

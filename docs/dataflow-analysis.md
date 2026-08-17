# SSA ERP 跨模块数据流与上下关联分析

> 版本：V2.6 基线 | 编制日期：2026-07-07
> 目的：验证各功能模块之间的上下游关系与数据流转字段/状态衔接是否正确，定位一致性接缝风险。

---

## 1. 两条主价值链

### 1.1 采购主链（供→存→财）
```
采购申请 PurchaseRequest
  ├─(审批通过)─→ 询价单 PriceInquiry ─→ 供应商报价 VendorQuotation
  │                └─→ 比价单 PriceComparison ─→ 价格审批 PriceApproval ─→ 价目表 PriceListItem
  └─(生成订单)─→ 采购订单 PurchaseOrder
                    ├─→ 报检单 InspectionNotice ─→ 检验任务 InspectionTask
                    │       ├─(合格)─→ 入库单 InboundOrder
                    │       └─(不合格)─→ 不合格品 UnqualifiedItem
                    ├─→ 入库单 InboundOrder
                    ├─→ 发票 Invoice (purchaseOrderNo)
                    └─→ 付款计划 PaymentPlan (purchaseOrderNo / invoiceNo)
```

### 1.2 销售/生产主链（销→产→存→财）
```
意向客户 Prospect ─→ 销售订单 SalesOrder
                    ├─→ 采购申请 / 采购订单（外购料）
                    ├─→ BOM (sourceOrderNo) ─→ 生产工单 WorkOrder
                    │       ├─→ MRP 建议 (mrp) ─→ 采购申请/工单
                    │       ├─→ 工艺路线 ProcessRoute
                    │       ├─→ 领料出库 OutboundOrder (sourceNo=orderNo)
                    │       └─→ 检验任务 InspectionTask (workOrderNo)
                    ├─→ 物流发货 Shipment (salesOrderNo) ─→ 发票 Invoice
                    └─→ 项目 Project (projectNo 贯穿)
```

---

## 2. 字段级衔接映射（已核对类型定义）

| 上游 → 下游 | 上游字段 | 下游字段 | 衔接状态 |
|---|---|---|---|
| 采购申请→订单 | `requestNo` / `id` | `PurchaseOrder.requestId` | ✅ OrderForm 手工带参 |
| 采购申请→询价 | `requestNo` | `PriceInquiryItem.sourceRequestNo` | ✅ |
| 询价→报价 | `inquiryNo` | `VendorQuotation.inquiryNo` | ⚠️ 页面读 mock，非 store |
| 比价→审批 | `comparisonNo` | `PriceApproval.comparisonNo` | ⚠️ 读 mock |
| 审批→价目表 | `approvalNo` | `PriceListItem.sourceApprovalNo` | ⚠️ 读 mock |
| 订单→入库 | `orderNo` | `InboundOrder.sourceNo?` | ⚠️ 可选未强制，手工录入 |
| 订单→发票 | `orderNo` | `Invoice.purchaseOrderNo` | ✅ 外键存在 |
| 订单→付款 | `orderNo` | `PaymentPlan.purchaseOrderNo` | ✅ 外键存在 |
| 发票→付款 | `invoiceNo` | `PaymentPlan.invoiceNo` | ✅ 外键存在 |
| SO→BOM | `orderNo` | `BOMHeader.sourceOrderNo` | ✅ 一键生成 |
| SO→工单 | `orderNo` | `SalesOrder.linkedWorkOrders` | ✅ 反向关联 |
| 工单→检验 | `orderNo` | `InspectionTask.workOrderNo` | ✅ |
| 工单→出库 | `orderNo` | `OutboundOrder.sourceNo?` | ⚠️ 可选 |
| SO→物流 | `orderNo` | `Shipment.salesOrderNo` | ✅ |
| 全链 | `materialCode` | 各 item 均带 | ✅ 主数据键 |
| 全链 | `projectNo` | 申请/订单/工单/检验/物流/项目核算 | ✅ 项目维度贯通 |

---

## 3. 数据流转正确性判定

### 3.1 正确流转（已验证可闭环）
- 采购申请 → 订单（requestId 贯通）
- 销售订单 → BOM → 工单 → 出库/检验（编号贯通）
- 销售订单 → 物流 → 发票（编号贯通）
- 项目维度 projectNo 在 6 类单据间贯通（V2.6 已加）
- 价格链 询价→比价→审批→价目表（业务闭环，但数据在 mock）

### 3.2 半自动/手工衔接（需人工介入）
- 采购申请审批通过 → 订单：靠 OrderForm 手工选申请带参，非自动生成
- 报检 → 入库：靠 InboundForm 手工录入，Inventory/报检页读 flowData mock，彼此不联动
- MRP 建议 → 采购申请/工单：MRPPlan 基于 mock 运算，未与真实 `materialStore.currentStock` / `warehouseStore.inventoryRecords` 联动

### 3.3 一致性接缝风险（重点回归项）
1. **影子数据中心 `flowData.ts`**：`inspectionNotices`、`vendorApplications`、`vendorOrderConfirms`、`deliveryShipments`、`finishedGoodsInbounds` 等跨模块流转数据都在此，与正式 store 平行，是最大一致性黑洞。
2. **供应商审批分裂**：`ApprovalQueue` 读 `vendorApplications`（独立 mock），审批通过不会同步 `vendorStore.vendors`，门户与采购侧看不到。
3. **财务无 store**：全部 7 个财务页读 `finance.ts` mock，无法持久化、无法跨会话联动；发票.purchaseOrderNo 等外键指向的订单若被删改，财务侧不感知。
4. **列表/详情读 mock 而非 store**（共 19+ 页面）：物料分类、入库单列表、库存、检验标准、BOM 详情/成本、工艺路线、价目表、价格审批、不合格品、PDCA、报检、项目、市场分析、供应商门户等。这些页面写入走 store 但列表读 mock，存在"同实体两份数据"风险。

---

## 4. 上下关联模块测试要点（来自测试大纲映射）

| 上游模块 | 下游模块 | 关联键 | 测试重点 |
|---|---|---|---|
| 物料 | 采购/库存/BOM/生产 | materialCode | 物料删除后下游引用一致性 |
| 供应商 | 采购/价格/库存/财务 | vendorId | 供应商拉黑后能否继续下单 |
| 采购申请 | 询价/订单 | requestNo | 申请审批后能否生成订单 |
| 价格审批 | 价目表 | approvalNo | 价目表自动更新 |
| 采购订单 | 入库/发票/付款 | orderNo | 三单匹配（升级补） |
| 销售订单 | BOM/工单/物流/发票/项目 | orderNo/projectNo | 全链编号贯通 |
| 生产工单 | 出库/检验 | orderNo | 领料/报工衔接 |
| 入库 | 库存/发票 | inboundNo/orderNo | 入库即更新库存（联动缺失） |
| 检验 | 不合格品/PDCA | taskNo | 不合格触发 PDCA |
| 发票 | 付款 | invoiceNo | 付款计划核销 |

---

## 5. 结论与升级前置要求

- **数据流转框架正确**：编号/外键体系完整，主价值链可手工闭环。
- **核心短板是"store 化不全 + 自动流转缺失"**：19+ 页面读 mock、财务无 store、跨模块多为可视化而非自动过账。
- **升级优先级建议**：
  1. 先把"读 mock 的关键页面"迁到 store（尤其财务、库存、价格审批/价目表），消除一致性黑洞；
  2. 再把"手工衔接"升级为"事件驱动自动流转"（如入库即更新库存、审批通过即生成下游单）；
  3. 最后补齐竞品对标能力（批次/库龄/信用/三单匹配/现金流/产能/抽样/报表自定义）。

> 注：本分析文档与 `docs/test-plan.md`、`docs/competitive-gap-plan.md` 配套使用。

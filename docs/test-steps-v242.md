# SSA ERP V2.42 手动走查步骤（B7 · 门户更多单据回写）

**版本**：V2.42（2026-08-10）　**模块**：供应商门户更多单据回写主 ERP（发货通知 → ASN 在途预告 / 质量问题单 → NCR / 对账单 → 往来对账 Reconciliation）（P1 第七役）
**专项 E2E**：`e2e/v63-b7-portal-writeback-more.spec.ts`（8 用例全绿：B7-1a / B7-1b / B7-2a / B7-2b / B7-3a / B7-3b / B7-3c / B7-5）
**全量回归**：48 spec / 206 用例
**对标**：SAP ASN 收货预告（Advanced Shipping Notification）→ 入库预告单 `type:'asn'` 不立即过账库存，仅预告；SAP 质量通知（QM 供应商投诉）→ NCR `source:'vendor'` 来源追溯；SAP 供应商往来对账（FBL1N / 往来清账）→ `Reconciliation` 幂等 upsert。

---

## 0. 准备
- 启动系统：项目根目录 `ssa-erp` 下运行 `npm run dev`，浏览器打开 `http://localhost:3000`。
- 重要：走查前先按 F12 → Application → Local/Session Storage → `Clear` 后刷新，确保从干净种子数据开始。
- 门户统一身份源（`vendorPortalIdentity.ts`，登录 code → 主数据供应商唯一权威）：`V001`→`ven-001`、`V002`→`ven-002`、`V-NEW`→`ven-001`。门户页均走 `getVendorPortalIdentity()`，不再硬编码 `ven-001`。
- 本版关键种子：
  - 供应商 `ven-001` 上海宝钢（正常，门户演示主体）。
  - 发货通知单种子：门户「发货物流管理」页可建发货通知（关联采购订单号 / 物流公司 / 运单号 / 发货日期 / 物料行）。
  - 质量问题单种子：门户「质量问题」页可建质量反馈（物料编码 / 物料名称 / 批次号 / 不合格数量 / 问题描述）。
  - 对账单 `vs-001`（`statementNo:'VS20240531001'`，`vendorId:'ven-001'`，`status:'confirmed'`，`items[0].amount:124500`，`vendorConfirmedAt:'2024-06-02 10:00:00'`）。

---

## 一、B7-1 门户发货通知 → 主 ERP ASN 在途预告回写
**机制**：门户 `DeliveryShipment.handleSubmit` 在 `addDeliveryShipment` 落本地 flowStore 之外，额外调用 `warehouseStore.addInboundOrder` 生成 ASN 预告单 `{ type:'asn', status:'in_transit', asnShipmentNo }`。`postInboundToInventory` **仅当 `status==='completed'` 才过账库存/财务**，故 `in_transit` 的 ASN 预告完全安全——不碰库存、不碰财务，仅作在途预告。幂等守卫：`asnShipmentNo` 已存在则不重复追加。

**路径**：供应商协同门户 → 发货物流管理（`/vendor-portal/orders/shipment`，以 `V001` 登录）

### B7-1a 单次提交仅生成一条 ASN，状态 in_transit，vendor 匹配
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 1.1 | 以 `V001` 登录，进入发货物流管理，点「新建发货通知」(`data-testid="new-shipment-btn"`) | 对话框打开 |
| 1.2 | 填关联采购订单号、物流公司、运单号、发货日期、物料编码等必填项 | 表单可提交 |
| 1.3 | 点「提交」(`data-testid="submit-shipment-btn"`) | 发货通知落库；同时主 ERP `inboundOrders` 新增 1 条 `type:'asn'`、`status:'in_transit'`、`vendorId` 与门户主体（`ven-001`）一致 |
| 1.4 | 查 `inboundOrders` 中 `asnShipmentNo` 匹配该发货单的 ASN | 恰好 1 条，无重复 |

### B7-1b 多单据各生成独立 ASN，全部 in_transit，幂等无重复
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 1.5 | 连续提交 2 张不同运单号的发货通知 | 各自生成 1 条独立 ASN（共 2 条），状态均 `in_transit` |
| 1.6 | 对其中一张重复提交（同 `asnShipmentNo`） | 幂等守卫生效，不新增第 3 条 ASN |

> ✅ 判定：发货在途预告安全落地，不影响库存账与财务账；重复提交受幂等保护。

---

## 二、B7-2 门户质量问题单 → 主 ERP 不合格品(NCR) 回写
**机制**：门户 `VendorQualityPage.handleIssueSave` 调用 `qualityStore.addVendorQualityIssue(issue)`，幂等建 NCR `{ source:'vendor', portalIssueId: issue.id, vendorReported:true, ... }`。`UnqualifiedItem.source` 枚举扩展为 `inspection / customer_complaint / internal_audit / vendor`。门户经 `getVendorPortalIdentity()` 取登录供应商身份。

**路径**：供应商协同门户 → 质量问题（`/vendor-portal/quality/issues`，以 `V001` 登录）

### B7-2a 质量问题单 → NCR 回写（source=vendor / portalIssueId 双向追溯）
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 2.1 | 以 `V001` 登录，进入质量问题页，点「新建」(`data-testid="vendor-quality-issue-new"`) | 表单打开 |
| 2.2 | 填物料编码、物料名称、批次号、不合格数量、问题描述等必填项 | 表单可提交 |
| 2.3 | 点「提交」(`data-testid="vendor-quality-issue-submit"`) | 主 ERP `unqualifiedItems` 新增 1 条 NCR，`source==='vendor'`、`portalIssueId` 等于门户问题单 id、`vendorReported===true` |

### B7-2b NCR 回写幂等（同一 portalIssueId 重复回写仅一条）
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 2.4 | 对 2.3 的同一门户问题单再次提交 | `addVendorQualityIssue` 幂等守卫（`some(x => x.portalIssueId === issue.id)`）生效，`unqualifiedItems` 中该 `portalIssueId` 仅 1 条 NCR |

> ✅ 判定：门户质量反馈可双向追溯到主 ERP NCR，且重复提交不产生脏数据。

---

## 三、B7-3 门户对账单 → 主 ERP 往来对账(Reconciliation) 回写
**机制**：`financeStore.addReconciliation / confirmReconciliation` 幂等 upsert 往来对账（`statementNo + vendorId` 唯一，已 `confirmed` 不重复）。门户 `VendorFinancePage`「确认对账」按钮回写主 ERP。

**路径**：供应商协同门户 → 财务对账（`/vendor-portal/finance/statements`，以 `V001` 登录）

### B7-3a 确认对账 → Reconciliation 回写（金额/状态/周期正确）
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 3.1 | 运行期将 `vs-001` 置 `status:'sent'`（`updateVendorStatement('vs-001',{status:'sent'})`） | 对账单进入待确认态 |
| 3.2 | 进入财务对账页，点该行「确认对账」(`data-testid="vendor-statement-confirm"`) | 主 ERP `reconciliations` 新增 / 更新 1 条，`statementNo:'VS20240531001'`、`vendorId:'ven-001'`、`amount`=行项目合计（124500）、`status:'confirmed'`、`confirmedAt` 有值 |

### B7-3b 往来对账回写幂等（同 statementNo+vendorId 重复确认仅一条）
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 3.3 | 再次对 `vs-001` 点「确认对账」 | 幂等 upsert，`reconciliations` 中 `(VS20240531001, ven-001)` 仅 1 条，状态保持 `confirmed` |

### B7-3c UI 端到端（点击按钮 → 主 ERP 回写）
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 3.4 | 同 3.1 准备后，真实点击「确认对账」按钮 | 按钮点击经 `confirmReconciliation` 写回主 ERP，断言 `reconciliations` 含该笔且 `status==='confirmed'` |

> ✅ 判定：门户对账确认事件驱动回写主 ERP 往来对账，金额/周期/状态一致；重复确认零污染。

---

## 四、B7-5 门户全链路无白屏（含 T1/T2/T3 三个新页面 + 既有门户页）
**路径**：依次访问 `/vendor-portal/orders/shipment`、`/vendor-portal/quality/issues`、`/vendor-portal/finance/statements` 及 B5/B6 既有门户页
| 步骤 | 操作 | 预期结果 |
|---|---|---|
| 4.1 | 以 `V001` 遍历上述门户路由 | 各页标题（`h1-h6`）正常渲染，无 `pageerror`、无整页白屏 |

> ✅ 判定：B7 三处新门户页 + 既有门户页全链路稳定，无运行期崩溃。

---

## 五、顺带修复（本版关键 bug）
- **`DeliveryShipment.tsx` 预存崩溃**：`NewShipmentDialog` 内使用了 `<IconButton>` 组件，但 `@mui/material` 的 import 块仅导入了图标名（`@mui/icons-material`），未导入 `IconButton` 组件本身。因该对话框常驻挂载（仅隐藏），页面一加载即抛 `IconButton is not defined` ReferenceError → 整个发货页白屏，连带阻断 B7-T1 全部 E2E。
- **修复**：在 `:3-10` 的 `@mui/material` import 块中加入 `IconButton`。修复后 `vite build` 通过、v63 8/8 全绿。

---

## 六、回归关注点
- B7 三单据回写（发货 ASN 预告 / 质量 NCR / 对账 Reconciliation）全部事件驱动 + 幂等，且统一身份源 `getVendorPortalIdentity()` 取代硬编码。
- ASN 在途预告级联安全：仅 `completed` 入库单过账库存/财务，`in_transit` 预告零副作用。
- 全量 E2E 48 spec / 206 用例：v63 8/8 全绿；其余专项（v49–v62）保持绿灯。
- 顺带修复 `DeliveryShipment.tsx` 的 `IconButton` 漏导入，消除发货页白屏。

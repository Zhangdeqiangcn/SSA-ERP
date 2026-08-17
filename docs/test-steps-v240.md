# SSA ERP V2.40 手动走查步骤（B5 · 门户回写主流程）

**版本**：V2.40（2026-08-05）　**模块**：供应商门户 → 主 ERP 回写 + 统一身份源（P1 第五役）
**专项 E2E**：`e2e/v61-b5-portal-writeback.spec.ts`（7 用例全绿）
**全量回归**：46 spec / 192 用例（v31 菜单定制用例在完整跑序中偶发 flake，单跑全绿，与 B5 无关）

---

## 0. 准备
- 启动系统：项目根目录 `ssa-erp` 下运行 `npm run dev`，浏览器打开 `http://localhost:3000`。
- 重要：走查前先按 F12 → Application → Local/Session Storage → `Clear` 后刷新，确保从干净种子数据开始（种子：PO `po-002` pending、`voc-002` 待确认、询价 `inq-001` + 报价 `vq-001`、供应商 `ven-001` 上海宝钢 / `ven-002` 浙江温州紧固件）。
- 门户登录身份映射（统一身份源）：登录 code `V001`→`ven-001`、`V002`→`ven-002`、`V-NEW`→`ven-001`。

## 一、B5-1 订单确认回写主 ERP
### 1.1 门户确认订单（UI）
- 进入 **供应商协同门户 → 订单确认**（路径 `/vendor-portal/orders/confirm`），以 `V001` 登录。
- 在 `po-002` 行点「更多」(MoreVert) → **确认订单**，填写交期/备注后提交。
- 预期：PO `po-002` 状态回写为 `vendorConfirmed`（已确认）；门户侧 `voc-002` 置 `confirmed`。
- 再次打开同一订单确认 → 因已终态，**幂等不重复回写**（无重复记录/无二次覆盖）。

### 1.2 主系统核验
- 主系统 **采购管理 → 采购订单**，查 `po-002`：`vendorConfirmed` 标记为真、显示供应商确认交期/备注。

## 二、B5-2 报价回写主 ERP
- 进入 **供应商协同门户 → 在线报价**（路径 `/vendor-portal/quotation`），`V001` 登录，对询价 `inq-001` 提交报价。
- 预期：
  - 提交后页面出现 `data-testid="quotation-submit-result"` 成功提示（不再是 `alert` 弹窗）。
  - `priceStore` 写入供应商报价单；关联的询价单 `inq-001` 推进为 `quotation_received` 状态并回写报价单号。
  - 同供应商 + 同询价单**重复提交**走 `updateVendorQuotation` 幂等更新，**不新增**报价记录（种子 `vq-001` 被更新而非重复）。

## 三、B5-3 资料变更回写（主数据治理 + 双向闭环）
### 3.1 门户提交待审资料
- 进入 **供应商协同门户 → 资料管理**（路径 `/vendor-portal/profile`），`V001` 登录，修改联系电话后保存。
- 预期：页面顶部出现 `data-testid="profile-pending-banner"` 待审提示；改动写入 `vendor.profilePending` 待审区，**不直接覆主档**。

### 3.2 甲方审核并入主数据
- 主系统 **供应商 → 供应商列表**（路径 `/vendor/list`），`ven-001` 行点「更多」→ **审核通过并并入**（按钮 `approve-profile-ven-001`）。
- 预期：待审字段经 `reviewVendorProfilePending` 并入主数据供应商主档；`profilePending` 清空；门户再次查看资料显示已并入的新值。

## 四、B5-4 统一门户身份源
- 以 `V002` 登录门户，进入 **质量协同**（`/vendor-portal/quality/issues`）或 **对账**（`/vendor-portal/finance/statements`）。
- 预期：页面标题区 `data-testid="portal-current-vendor"` 显示 **浙江温州紧固件有限公司**（映射 `ven-002`），**不是** 上海宝钢；证明门户身份统一收敛到主数据供应商，消除硬编码 `ven-001`。
- `V001` 登录则显示 **上海宝钢钢铁贸易有限公司**。

## 五、B5-5 门户全链路无白屏
- 依次访问门户各页：工作台 `/vendor-portal`、订单确认、在线报价、资料管理、质量协同、对账。
- 预期：每页 `h1–h6` 标题可见、无整页崩溃/空白。
- （注：此前 `ConfirmOrderDialog` 因 Hooks 顺序错误，打开「确认订单」对话框即整页白屏，本次已修复——B5-1 操作可正常弹窗提交。）

## 六、回归关注点
- 供应商门户 4 类操作（订单/报价/资料/身份）已全部收敛到主数据，无残留 `flowStore`/`localStorage` 数据岛。
- 全量 E2E 46 spec / 192 用例：v61 7/7 全绿；其余专项（v49–v60）保持绿灯。

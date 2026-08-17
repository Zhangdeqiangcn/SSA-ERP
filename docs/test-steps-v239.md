# SSA ERP V2.39 手动测试步骤（B4 · NCR 联动库存）

> 版本：V2.39（2026-08-05）｜模块：质量管理 · 不合格品(NCR) 处置联动库存与财务
> 前置：已 `npm run dev` 启动，访问 `/quality/unqualified`

## 一、背景与目标
B4 打通「不合格品处置 → 库存 → 财务」闭环：
- **报废(scrap)**：真实扣减库存 + 自动生成报废凭证（借 6602 管理费用 / 贷 1403 原材料[评估类=RAW] 或 1405 库存商品[其他评估类]），金额 = 缺陷数量 × 移动平均价。
- **其余处置**（返工 / 退货 / 让步接收 / 隔离 / 其他）：仅完成 NCR 状态闭环，不联动库存与凭证（更大联动留待后续版本）。
- 对标 SAP：报废损失进管理费用（现有科目表无 1901 待处理财产损溢 / 6711 营业外支出，取最贴近科目）。

## 二、手动测试清单

### TC1 报废联动库存与凭证（核心）
1. 进入「质量管理 → 不合格品」，找到 `NCR-20240511-001`（物料：螺栓 M10 / MAT202405010004，缺陷 100 件，状态：待处理）。
2. 点击该行「处置」按钮 → 选择「报废」→ 点击「确认执行：报废」。
3. 预期：
   - 顶部提示「已执行"报废"：…已联动库存扣减并生成报废凭证（借6602管理费用/贷1403原材料|1405库存商品）」。
   - 该行处置状态变为「已完成」。
4. 进入「仓储 → 出库单」，按类型筛选 `scrap`，应出现 `OUT-SCRAP-…` 出库单（数量 100，已记账）。
5. 进入「财务 → 凭证」，查 source=scrap 的凭证：
   - 借：6602 管理费用 = 100 × 移动均价
   - 贷：1403 原材料（该物料评估类 RAW）
   - 借贷平衡。

### TC2 报废幂等（重复处置无副作用）
1. 在 TC1 完成后，再次对该 NCR 点击「处置」——按钮已不可见（状态已完成），无法重复触发。
2. （若通过接口/再次触发）预期：返回 false，库存、出库单、凭证均不再变化。

### TC3 成品报废分流（FG 评估类 → 1405）
1. 新建一条不合格品，物料选成品（如 PRD-FRAME-001 / PRD-CABINET-001，评估类 FG），缺陷数 3。
2. 处置选「报废」。
3. 预期凭证贷方位为 **1405 库存商品**（非 1403），借贷平衡；成品库存扣减 3。

### TC4 非报废处置仅状态闭环
1. 新建/选择一条不合格品，处置选「返工」或「让步接收」等非报废方式。
2. 预期：NCR 状态变「已完成」，但**不生成** scrap 出库单、**不生成**报废凭证、库存不变。

## 三、自动回归（E2E）
- 专项：`e2e/v60-b4-ncr-inventory.spec.ts`（5 用例全绿）
  - B4-1 报废联动：库存扣减 + 凭证(借6602/贷1403)平衡 + 状态闭环
  - B4-2 报废幂等：不重复扣库存/出库/凭证
  - B4-3 FG 报废分流：贷 1405 库存商品
  - B4-4 非报废处置仅状态闭环
  - B4-5 UI 全链路：页面操作 → 报废 → 库存+凭证反馈
- 全量回归：跑 `node node_modules/playwright/cli.js test`（45 spec / 185 用例，全绿）。

## 四、涉及改动文件
- `src/types/warehouse.ts`：`OutboundType` 加 `'scrap'`
- `src/types/finance.ts`：`VoucherSource` 加 `'scrap'`
- `src/types/quality.ts`：`UnqualifiedItem` 加 `linkedOutboundNo?` / `actualDisposition?`
- `src/stores/warehouseStore.ts`：`postOutboundCost` 加 scrap 凭证分支（借6602/贷1403|1405）
- `src/stores/qualityStore.ts`：新增 `disposeUnqualified`（幂等 + 报废联动库存/凭证）
- `src/pages/Quality/UnqualifiedList.tsx`：处置弹窗 `onSubmit` 接实 `disposeUnqualified`
- `src/mocks/data/material.ts`：mat-004 补 `valuationClass:'RAW'` + 移动均价/金额
- `src/mocks/data/quality.ts`：uq-001 绑定真实物料 mat-004（pending）
- 版本四处同步：`src/version.ts` / `package.json` → V2.39.0；MEMORY.md 沿革追加

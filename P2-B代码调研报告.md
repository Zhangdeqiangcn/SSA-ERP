# P2-B 合规与智能化 · 代码真实完成度审计报告

> 调研日期：2026-08-31 ｜ 基线：V2.56 对标整改（§九 9.4，14 项）｜ 现状版本：V2.71.0
> 方法：Explore 子代理对 `src/` + `functions/api/` 全量源码审计（看实现，非看文档声称）。
> 架构前提：双数据通道——DEV/本地/E2E 100% 浏览器内 mock（MSW + `@/mocks/data`），生产通道 = `functions/api/*` + D1。判定"是否真完成"分两层：前端是否接通真实逻辑、后端 `functions/api` 是否有真实实现。

## 一、核心结论（与 P2-A 相反的分布）

P2-A 是"前端大量已实现、后端三岛缺口"；**P2-B 恰恰反过来**：

- **"智能"侧（ChatBI / AI Agent / 异常预警 / OCR）后端 `functions/api` 已是真实实现，且前端已 `fetch` 真实端点接通**——MSW 未拦截这些端点，属生产可用。
- **"合规"侧（RLS 字段级、数电票核验、审计落库展示、开放 API 网关）是真实度洼地**：或为前端壳、或后端是 mock、或未接通真实端点。
- **D1（SQLite）本身不支持 RLS 行级策略**，当前多租户仅靠 `WHERE org_id=?` 应用层过滤；"RLS 真下沉"需建 functions 层权限中间件，非纯前端可解。

## 二、8 主题逐项审计

| # | 主题 | 前端现状 | 后端现状 | 是否接通 | 档位 |
|---|------|----------|----------|----------|------|
| 1 | RLS 行级安全 (P2-28) | `SecureField` 角色×模块×字段掩码；`passDataPermission` 组织行过滤；`DataPermissionTab`。SecureField 仅 2 处真用（销/采单价），`passDataPermission` 仅 `WorkOrderList` 消费 | 各函数靠 `WHERE org_id=?` 应用层隔离；**无独立 RLS/行级策略** | 仅前端脱敏+应用层过滤，未下沉 D1 | 🟡部分 |
| 2 | 真 ChatBI (P2-02) | `ChatBI.tsx` `fetch('/api/chatbi/analyze')`，**无** MOCK_RESPONSES | `chatbi/index.ts` 真查 D1（7 类 query+4 图表），org 隔离 | ✅ 真接通（仅生产态） | ✅真完成 |
| 3 | AI Agent (P2-01) | `AIAssistant.tsx` `fetch('/api/ai/chat')`，用真实模型配置 | `ai/chat.ts` 真转发 OpenAI 兼容端点（KV 读密钥） | ✅ 真接通（需用户配 Key） | ✅真完成 |
| 4 | 异常预警 (P2-05) | `AlertMonitor.tsx` `fetch('/api/alerts')` | `alerts/index.ts` 真算 6 类（低库存/逾期PO/SO/临期/信用超额/待审批），D1 实查 | ✅ 真接通（仅生产态） | ✅真完成 |
| 5 | 发票 OCR | `InvoiceOcr.tsx` `fetch('/api/ocr/recognize')`，无前端正则回退 | `ocr/recognize.ts` 用 tesseract.js（真 OCR 库）+正则抽取；**Worker 端 tesseract 运行可行性待验证** | ✅ 接通（依赖 Worker 能跑） | 🟡部分 |
| 6 | 数电票核验 | `InvoiceVerification.tsx` 调 `/api/tax-gateway/verify` | `verify.ts` 仅 `mockVerifyInvoice`；`etopliveVerifyInvoice` 是 TODO→返回 mock | 接通但后端是假 | 🔴壳 |
| 6b | 审计日志 | `ServerAuditTab` 读本地 `auditStore`（localStorage），**不调** `/api/audit/logs` | `audit/index.ts` 真查 D1 `audit_logs`（org 隔离）；仅 verify 写库 | 后端真·前端未接通 | 🟡部分 |
| 7a | 多币种 (P2-27) | `financeExtensionStore` 汇率表+`ExchangeRate` 页+`getExchangeRate/convertCurrency` 广泛用于发票/账龄/支付计划/期末调汇 | 无币种换算逻辑（仅随行存储） | 前端真·后端未做 | 🟡部分 |
| 7b | 开放 API (P2-21) | `IntegrationHub`：OpenAPI 目录（静态 `API_REGISTRY` 文档）+ Webhook（`triggerWebhook` 真发起浏览器 fetch 外呼） | 无 `functions/api` 服务端网关 | Webhook 真发；目录壳 | 🟡部分 |
| 7c | BI 集成 (P2-19) | 仅内部 ChatBI+报表中心，无外部 BI 嵌入 | 无 | — | 🟡部分/⬜ |
| 8 | 帮助体系 (P2-29) | `manual.tsx` 第 745 行起「智能增强模块(P2)」章已含 P2-11/06/17/15/26/04/24 | — | — | ✅确认（本轮已补） |

## 三、14 项真实度总览（按落地难度/价值分层）

**A. 后端已真 · 前端已接通（生产可用，无需补强）**
ChatBI、AI Agent、异常预警四类引擎、OCR（链路真，Worker 运行待验）。属"已真完成"。

**B. 后端已真 · 前端待接通（纯前端快赢）**
- **审计日志**：后端 `audit/index.ts` 真查 D1，但前端读本地 localStorage 未消费 → 改接 `/api/audit/logs` 即真。**合规追溯价值高。**

**C. 前后端都假 / 壳（需立项接第三方）**
- 数电票核验（纯 mock，需 etoplive/lskj 密钥）、OpenAPI 目录（仅静态文档）、BI 外部集成（无）。

**D. 需建后端深水区（非纯前端）**
- 数电票真实第三方核验、RLS 真下沉 D1（建 functions 层权限中间件）、多币种后端换算（D1 按汇率重算本位币）、开放 API 服务端网关（鉴权/限流/Webhook 服务端分发）。

**E. 纯前端快赢清单（A 组式，零回归，不碰 D1）**
1. **RLS 字段级扩面**：SecureField 从 2 处扩到采购价/销售价/客户信用/供应商账期等真实字段 + 列表列级隐藏。
2. **审计日志接通**：ServerAuditTab 改读 `/api/audit/logs`（后端已真），DEV/离线回退本地 auditStore。
3. **ChatBI/预警离线 store 同源重算回退**（目前 DEV/离线走 404）。
4. **OCR 浏览器端化**：前端直接 tesseract.js 识别，绕开 Worker 运行风险，离线可用。
5. **BI 报表导出**：报表中心加 CSV/Excel 导出，闭合"BI 集成"外壳。

## 四、判定汇总

- ✅ 真完成（5 主题实质）：ChatBI、AI Agent、异常预警、帮助体系、OCR(链路)
- 🟡 部分（5 主题）：RLS 字段级、发票 OCR(Worker 待验)、审计日志(前端未接)、多币种、开放 API、BI 集成
- 🔴 壳（1 主题）：数电票核验
- ⬜ 未做：BI 外部集成实质、RLS 下沉 D1、多币种后端换算、开放 API 网关

> 与 P2-A 调研（17 真完成/8 部分/5 未做/2 壳）对比：P2-B 的"智能"项后端真实度更高，但"合规"项是洼地，且深水区（RLS 下沉/数电票/开放 API 网关/多币种后端）均非纯前端可解，需单独立项建后端。

## 五、加强优先级建议（供排计划参考）

1. **A 组纯前端快赢（推荐首批，零回归）**：RLS 字段级扩面 → 审计日志真接通 → OCR 浏览器端化（或 BI 报表导出）。
2. **B 组前端接通真实后端**：审计日志接 `/api/audit/logs`、ChatBI/预警离线回退。
3. **C/D 深水区（需立项建后端）**：数电票真实核验、RLS 下沉 D1、多币种后端换算、开放 API 网关——单独立项，不混入 A 组。

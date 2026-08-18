# SSA ERP — 版本沿革与关键设计

## 版本沿革

- **V2.55.25** (2026-08-18) — 将「使用说明书」接入系统设置（新增「帮助中心 → 使用说明书」入口直达 /help/manual）；新增说明书「版本更新记录」章节作为每次升版的变更登记处；版本铁律新增第 4 条（升版须同步更新说明书）
- **V2.55.24** (2026-08-18) — 顶部全局搜索框升级（覆盖全部 ~120 菜单页 + 键盘导航）+ 应用内详细使用说明书（/help/manual）；发布至 Cloudflare Pages
- **V2.55.23** (2026-08-17) — 19 环节端到端全链路模拟 + 应收页隐藏 bug 修复
  - **用户诉求**：「代替我模拟实际销售业务流程全过程（客户跟进→接单→合同→SO→评审→排产→MRP→PR→PO→ASN→物流→到货→检验→入库→生产→半成品/成品入库→出库→开票→收款），缺失主数据自己维护」。
  - **FlowSelfTest 全面重写**：`src/pages/Test/FlowSelfTest.tsx` 从 8 节点扩展为 **19 节点端到端自检面板**（/test/flow），每个节点带 `data-testid="flow-node-${key}"`，节点完成度直接读取各 store 真实状态。用真实主数据重建 `handleSeed`：mat-001（钢板 Q235B）/ mat-fg-001（重型钢结构焊接架 H1200）/ cus-001（华润建筑集团）/ ven-001（上海宝钢）/ wh-001~003 / std-001（钢材来料检验标准）。修正旧版 seed 的 `MAT-STEEL-001` 不存在、`status:'done'` 非法、`quantity/location` 非法字段等 bug。调用真实 store API（`addProspect/addSalesOrder/updateSalesOrder/addWorkOrder/addMrpRecommendation/addPurchaseRequest/addPurchaseOrder/addInboundOrder/addShipment/addInspectionTask/updateInboundOrder/completeWorkOrder/addOutboundOrder/addReceivable/updateReceivable`）。触发事件驱动回写：采购入库 completed → 库存过账+滚动移动均价+GR/IR 暂估凭证+PO 收货回写；生产完工 → 生产入库单+成品台账+生产成本凭证；销售出库 completed → 扣减库存+COGS 凭证+SO 发货回写；应收开票+收款 → 核销。
  - **真实代码缺陷修复**：`src/pages/Finance/ReceivableList.tsx:27-30` `AGING_OPTIONS` 数组第一个元素是**对象** `{value:'', label:'全部账龄'}`、后面混字符串 `['current','1-30',...]`，`.map((v) => ({value: v, label: v ? ...}))` 把对象当字符串处理，渲染 `<MenuItem>{o.label}</MenuItem>` 时把对象当 children，触发 React `Invalid prop children supplied to ForwardRef(MenuItem2)` 警告（被 ErrorBoundary 捕获但 console.error 不断）。修复：把第一个元素改为 `''` 字符串，使数组全为字符串，map 正确生成 `{value:'', label:'全部账龄'}`。此 bug 旧版 flow.spec.ts 因不访问应收页未暴露。
  - **Playwright 全链路 E2E**（`e2e/flow.spec.ts` 改写为 19 节点版，1.4m 绿）：清 localStorage → 关首次引导 → 一键填充 → 断言面板 19/19 → 刷新持久化 19/19 → 19 节点 `查看` 跳转（goBack 返回，无全量重载）→ 9 个业务页（合同/SO/PR/PO/入库/检验/成品入库/出库/应收）种子可见 → /sales/orders 刷新后 SO-DEMO- 仍在 → 零 pageerror/console.error。`playwright.config.ts` 整体超时 120s→300s（19 路由+9 业务页的真实成本）。
  - 踩坑：①首次运行（localStorage 空）会弹「欢迎使用 SSA ERP」引导向导对话框遮住面板，E2E 需在每次 page.goto 后调用 `dismissOnboarding` 点「跳过引导」（在 localStorage 设标记后不再出现）；②`page.goto('/test/flow')` 全量重载 dev server 每次 2~5s，19 次累计超时，改用 `page.goBack()`（react-router push 的 history）客户侧返回；③`/sales/orders` 刷新后表格行非同步渲染（统计卡立即出，行需 ~20s），对应断言 timeout 15s→30s。
  - 验证：`vite build` 通过（esbuild 不查类型，但运行期 E2E 覆盖）；Playwright `flow.spec.ts` 全绿，19/19 链路 + 9 业务页种子可见 + localStorage 持久化 + 零运行时错误。

- **V2.55.22** (2026-08-14) — 导航二次整合（分析与报表聚合 + 审批中心单入口）
  - **用户诉求**：「同类功能在不同导航位置、实现可归为一类的，请合并」。
  - **分析与报表聚合**：将「报表权限与订阅/经营驾驶舱/需求预测与补货/发票OCR与凭证/ChatBI对话分析/异常检测预警/价格趋势分析」7 个原散落在「财务与报表」分组内的分析类页面，整体上移新建独立分组「分析与报表」（统一放在侧栏底部）。
  - **审批中心单入口**：将「物料审批/供应商注册审批/采购审批/价格审批」4 个审批页面统一上移为独立分组「审批中心」置于主数据之上；新增「我的待办」作为统一入口（顶栏铃铛，点击聚合所有待审批单据 + 跳转各审批页）。
  - 改动：`Sidebar.tsx` 新增两个分组、删除原位置条目；`MainLayout.tsx` 顶栏铃铛接入 `useApprovalCenter` 聚合 unread 数；新增 `src/pages/Approval/TodoCenter.tsx`（聚合页）。
  - **导航整合（用户诉求）**：「低代码设计器+工作流引擎」实质为 OA 审批底座，统一命名为「OA流程定制」；合并侧栏「平台生态」分组与系统设置「审批与工作流」分组为单一「OA流程定制」分组（7 项：审批流程 / 工作流引擎 / 表单设计器 / 物料审批 / 物料评级 / 供应商评级 / 条件技术）。原平台生态其余能力：字段级权限 → 用户与权限；多语言 → 界面与体验；开放接口与Webhook + 第三方对接通道 + API接口文档 + 服务端与审计 → 集成与开发（改名消歧）；报表权限与订阅 → 数据与运维。
  - 改动：`Sidebar.tsx` 删除 `平台生态` 分组（含 5 子项+报表权限独立入口）；`Settings.tsx` 合并两组为 OA流程定制；`i18nStore.ts` + `I18nSettings.tsx` 注释统一改名为「OA流程定制」；`App.tsx` 注释同步。
  - **货源清单物料编码 + 联动**（用户诉求）：`SourceListPage.tsx` 列定义新增「物料编码」列（`materialCode`），筛选标签更新为「关键词（物料编码/名称/供应商）」；`sourceListStore.ts` 补联动 selector（`getActiveSourcesByVendor`/`getActiveSourcesByMaterial`/`isInValidity`/`getActiveSourcesFor`），`OrderForm` 从裸 `getState().items` 迁移到 `getActiveSourcesByVendor` 派生 selector，行为不变。
  - **详情打印通用化**（前轮沉淀）：`PrintEntity` 13 项（含 `customer`/`salesProject`/`warehouseOutbound`），`PRINT_FIELD_CATALOG` 补对应字段；新建 `DetailActions` 通用组件（`@/components/common/DetailActions`，props: `entity/record/onBack/onEdit/onDelete/extra[]/printable`），挂入 5 个详情页（Vendor/Customer/Material/SalesProject/WarehouseOutbound）。
  - 踩坑：删侧栏分组后 `Sidebar.tsx` 的 `Translate` import 成孤儿，需清理（vite 不查未用 import，会运行期白屏）；追加 `<Route>` 图标 import 用于「工作流引擎」Tab；5 详情页替换 actions 时需保留 `Stack` import（其他处仍用）。
  - 验证：`vite build` 通过（✓ built in 33s）；Playwright v76（vendor 详情打印）/ v77（5 详情批量）/ v78（货源清单物料编码+联动）/ v79（OA整合）全绿，0 pageerror。

- **V2.55.18** (2026-08-13) — 系统设置「归类重构」：28 个扁平 Tab → 7 分组导航 + 搜索
  - 重构 `src/pages/Settings/Settings.tsx`：弃用水平 `<Tabs>`/`<TabPanel>`/逐索引映射，改为「左侧分组导航（可滚动）+ 右侧选中内容 + 顶部搜索框 + 面包屑」两栏布局。
  - 数据模型 `SettingGroup{ id,label,icon, items: SettingItem{ id,label,icon, render() }[] }`，7 分组：企业基础 / 用户与权限 / 审批与工作流 / 界面与体验 / 供应链策略 / 集成与开发 / 数据与运维（覆盖原 28 项全部内容，无删减）。
  - 5 个「内联 Tab」内容（采购策略、通知设置、用户管理、角色权限、表单权限）改为闭包 render 函数，用户管理仍绑定父组件 `users`/`editUser`/`switchDialog` 状态与切换角色/编辑用户弹窗，行为不变。
  - 新增图标导入：Business / Palette / Inventory2 / Code / Backup / Search / ChevronRight（已校验 node_modules 存在）；移除不再使用的 `Tabs`/`Tab`/`TabPanel`。
  - 验证：`vite build --emptyOutDir false` 通过（`✓ built in 43.44s`，Settings chunk 177KB）；Playwright 冒烟（7 分组全渲染、28 项全可见、点击切换内容正确、搜索过滤正确、0 控制台/页面错误）。

- **V2.55.17** (2026-08-13) — 物料责任人「按角色跨页面自动显示」
  - 新增基础设施：`materialStore.getCategoryById(id)`（递归遍历分类树）；`userStore.getUserName(id)`。
  - 新增通用组件 `src/components/common/ResponsiblePersons.tsx`（`MaterialResponsiblePersons`）：入参 `categoryIds: string[]` + 可选 `roles?: UserRole[]`，内部按分类 `responsiblePersons`（role→用户id[]）解析、用 `getUserName` 转姓名，按 `CATEGORY_RESPONSIBLE_ROLES` 顺序渲染 Chip（停用用户标注「（停用）」）。
  - 注入点：`MaterialDetail` 增加「物料责任人」区块；`PurchaseForm`/`OrderForm` 明细表前聚合各行物料分类、显示采购员；`InboundForm`/`OutboundForm` 显示库管员；`Inventory` 增加「库管责任人」列；`InspectionTask` 显示 SQE/工艺工程师。
  - 数据模型沿用 V2.55.16 的 `MaterialCategory.responsiblePersons: Record<string,string[]>`（分类页维护，默认隐藏）。
  - 验证：tsc 仅余既有错误（与本次无关）；`vite build` 13144 模块转换通过；dev :3002 HTTP 200；各改动模块经 vite 按需转换均 200。
  - 注意：本仓库 `tsc --noEmit` 有大量**历史既有**类型错误（DataTable/MaterialLineItemsGrid 等），vite 用 esbuild 构建不跑 tsc，故这些错误不影响运行；新增代码未引入任何新 tsc 错误。

- **V2.55.16** (前一阶段) — 分类路径列移除(#690)、DataTable 导入支持 xlsx/xls 与模板下载(#691)、分类责任人员维护(按角色,默认隐藏)(#692)。

## 设计要点

- 责任人按「角色」识别：同一物料在不同职能（采购员/SQE/工艺/研发/生产/库管）可有不同责任人，分类页维护、业务页按页相关角色自动呈现。
- `CATEGORY_RESPONSIBLE_ROLES` 定义在 `src/pages/Material/CategoryList.tsx`（已 export），`ResponsiblePersons` 复用它做展示排序。
- 构建坑：vite 仅 esbuild，未定义引用/（TDZ）不会在构建期报错、运行期才白屏；新增组件后须实际访问页面验证。本次曾修复 OrderForm/InboundForm/OutboundForm 中「useMemo 引用声明前的 state」TDZ 问题。

## 部署与架构（线上化关键事实）

- **架构本质**：SSA ERP 是**纯前端 SPA**，无后端服务（无 express/server，依赖均为 react/mui/zustand 前端库；`src/mocks` + MSW 模拟 API）。业务数据经 Zustand `persist` 存**浏览器 localStorage**，每人/每设备各一份、互不共享。
- **最优上线方案**：Cloudflare Pages 静态托管（**永久免费、无限带宽**，半年零成本）。构建产物 `dist/`（vite 默认），CF 连 Git 自动部署（Build=`npm run build`、Output=`dist`）或「直接上传 dist」。已加 `public/_redirects`（`/* /index.html 200`）做 SPA 路由回退，刷新子页不 404。发布指南见 `DEPLOY.md`。
- **备选**：Oracle Cloud Always Free ARM（4核24G 永久免费）仅当需要真后端+数据库时再用；阿里云/腾讯云仅 1–3 月试用，不满足半年。
- **多人共享数据**才需升级后端：Oracle 免费机 / Supabase 免费库（Postgres + auth），届时把 Zustand persist 的 localStorage 改成调 API。
- 仓库已 `git init` 并提交（本地，未 push）；`.gitignore` 已排除 node_modules / .pw-* / dist 等；`npm run build` 生成 `dist/` 已验证可部署。

## 长期约定（用户明确要求）
- **升版必更新说明书**：用户要求「每次更新新版本后，都要更新使用说明书」。落地方式：① `src/content/manual.tsx` 内有「版本更新记录」章节，每次升版在该章节追加一条变更登记；② 新增功能须在「设置 → 帮助中心」「侧边栏」或 `src/config/searchIndex.ts` 补录入口；③ 版本铁律（src/version.ts）第 4 条已写入此约束。

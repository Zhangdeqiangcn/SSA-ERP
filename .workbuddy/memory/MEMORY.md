# SSA ERP — 版本沿革与关键设计

## 版本沿革

- **V2.55.21** (2026-08-14) — 导航整合（平台生态 → 系统设置）+ 货源清单物料编码 + 详情打印通用化
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

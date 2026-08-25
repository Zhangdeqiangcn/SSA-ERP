# Bug 描述：销售项目详情 / 出库单详情 白屏缺陷

> 整理日期：2026-08-24
> 模块：销售管理（Sales）· 仓储管理（Warehouse）
> 状态：已定位根因 + 已修复 + 已通过回归验证（待建事项归档）

---

## Bug #1 销售项目详情页白屏（ProjectDetail）

| 字段 | 内容 |
|------|------|
| 标题 | 销售项目详情页在「项目数据缺里程碑/异常数组字段」时整页白屏 |
| 模块 | 销售管理 → 项目 → 项目详情 |
| 页面/路由 | `/sales/projects/:id` → `src/pages/Sales/ProjectDetail.tsx` |
| 严重程度 | **高（High）** —— 整页不可用，用户无法查看任何项目详情 |
| 优先级 | **P0** |
| 是否阻断上线 | **是（修复前阻断）** |
| 影响范围 | 所有「从旧版本升级 / localStorage 残留历史脏数据」的项目对象（缺 `milestones` 或 `exceptions` 数组字段） |

### 复现环境
- 环境：Vite dev（`localhost:3002`），生产构建同逻辑
- 账号：任意已登录用户
- 版本：V2.56.x（修复前）

### 前置条件
- 销售 store（`useSalesStore`）中存在一个 `project` 对象，**其 `milestones` 或 `exceptions` 字段为 `undefined`**（典型来源：旧版数据迁移、localStorage 历史脏数据、第三方导入缺字段）

### 复现步骤
1. 构造一个缺 `milestones`/`exceptions` 字段的 Project 对象并写入销售 store
2. 通过菜单或列表点击进入该项目详情页 `/sales/projects/<id>`
3. 观察页面

### 实际结果
- 页面整片空白（白屏），控制台抛出未捕获异常：
  `Cannot read properties of undefined (reading 'filter')`
- 根因：`ProjectDetail.tsx` 第 43 行 `project.milestones.filter(...)` 直接访问数组方法，未对字段缺失做兜底；虽已有 `if (!project)` 的"项目是否存在"判断，但**未防御项目存在而内部字段缺失**的情况，异常沿 React 渲染树向上冒泡导致整页崩溃。

### 期望结果
- 即使项目数据不完整，也应渲染页面（缺失部分显示空态/占位），而非白屏。

### 修复方案（已落地）
- 在 `project` 存在判断之后，对内部数组字段加空值兜底：
  ```ts
  const milestones = project.milestones || [];
  const exceptions = project.exceptions || [];
  ```
- 后续所有 `project.milestones` / `project.exceptions` 引用统一替换为上述局部变量。
- 文件：`src/pages/Sales/ProjectDetail.tsx`

### 回归验证
- 注入缺 `milestones`/`exceptions` 的脏数据 Project 后访问详情页：正常渲染「暂无异常」「无里程碑」等兜底内容，**零控制台报错**（Playwright 实测通过）。
- `tsc --noEmit` 门禁 0 错误。

---

## Bug #2 出库单详情页白屏（OutboundDetail）

| 字段 | 内容 |
|------|------|
| 标题 | 出库单详情页白屏（历史版本缺数据防御 / 模块加载失败） |
| 模块 | 仓储管理 → 出库管理 → 出库单详情 |
| 页面/路由 | `/warehouse/outbound/:id` → `src/pages/Warehouse/OutboundDetail.tsx` |
| 严重程度 | **高（High）** —— 整页不可用 |
| 优先级 | **P0** |
| 是否阻断上线 | **是（修复前阻断）** |
| 影响范围 | 出库单详情访问 |

### 复现环境
- 环境：Vite dev / 生产构建
- 账号：任意已登录用户
- 版本：V2.56.x（修复前）

### 前置条件
- 进入任一出库单详情页（路由参数 `id` 对应 `outboundOrders` 中某条记录）

### 复现步骤
1. 进入「出库管理」列表，点击任意出库单进入详情
2. 观察页面

### 实际结果（修复前）
- 页面白屏。排查发现两类历史诱因：
  1. **数据防御不足**：对 `order.items` 等数组字段的访问在旧逻辑中缺少 `|| []` / `?.` 兜底，脏数据下抛异常。
  2. **模块加载失败**：旧版本曾因导入缺失/错误的具名导出导致整个路由模块加载失败 → 组件为 `undefined` → 整页白屏（当前版本已通过类型债清零 + 门禁修复，该诱因已消除）。

### 期望结果
- 出库单详情正常渲染；缺失字段显示占位而非崩溃。

### 修复方案（已落地）
- 当前工作区代码已具备 `if (!order)` 防御，且 `order.items` 统一以 `order.items || []` / `order.items?.length` 访问（可选链 + 空数组兜底），对字段缺失具备容错。
- 类型债清零（418→0）后，`OutboundDetail` 所在模块及所有依赖（DataTable、DetailActions 等）编译通过、无导入错误，模块可正常加载。
- 文件：`src/pages/Warehouse/OutboundDetail.tsx` + 依赖组件

### 回归验证
- 访问 4 条 mock 出库单详情（OUT20240512001 / OUT20240510001 / OUT20240601001 / OUT20240610001）：均正常渲染，**零控制台报错**（Playwright 实测通过）。
- `tsc --noEmit` 门禁 0 错误。

---

## 防回归措施
1. **代码层**：`ProjectDetail` 已加字段级 `|| []` 兜底（核心修复）；`OutboundDetail` 维持可选链防御。
2. **门禁层**：`build-with-gate.bat` 先跑 `tsc --noEmit`，类型错误非零即中断，**防止导入错误/类型不匹配引发的模块加载白屏再次漏出**。
3. **数据层建议**：销售/仓储 store 在 `addProject`/`addOutboundOrder` 等写入入口对必填数组字段做默认值归一化，从源头杜绝脏数据。
4. **测试层**：建议补充 E2E 用例——注入缺字段的脏数据后访问两个详情页，断言"页面渲染成功且无 pageerror"。

---

## 待办（请据此建事项并分配研发）
- [ ] 将 Bug #1、Bug #2 创建为测试/研发事项，关联需求「销售项目管理」「仓储出库管理」
- [ ] 研发补充写入层字段归一化（数据层防回归第 3 点）
- [ ] 测试补充脏数据 E2E 回归用例（防回归第 4 点）
- [ ] 验收后更新事项状态并通知产品/测试负责人

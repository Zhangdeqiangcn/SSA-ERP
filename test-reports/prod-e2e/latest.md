# SSA ERP 生产 E2E 报告

- **结论**：❌ 存在 7 条失败
- **目标环境**：https://ssa-erp.pages.dev
- **运行批次**：`260901080020`（隔离组织公司码 `E2E-260901080020`）
- **开始时间**：2026/9/1 16:00:20
- **耗时**：121.4 秒
- **断言汇总**：PASS 204 / FAIL 7 / WARN 2 / INFO 6（共 219）
- **HTTP 调用**：185 次，平均 656ms
- **数据清理**：尝试 12 项，成功 12 项

## 套件总览

| 套件 | 说明 | PASS | FAIL | WARN | INFO | 耗时 |
|---|---|---:|---:|---:|---:|---:|
| ✅ 01-auth | 认证与会话（注册/登录/会话/登出/拒绝路径） | 17 | 0 | 0 | 0 | 10.1s |
| ✅ 02-state-blob | app_state Blob 通道（写读往返/覆盖/删除/隔离） | 11 | 0 | 0 | 0 | 7.6s |
| ✅ 03-relational | 关系域读取护栏（10 域 GET/契约/鉴权/分页） | 25 | 0 | 0 | 0 | 10.4s |
| ✅ 04-vendor | 供应商 CRUD + 前端/网关同源（消除双数据源护栏） | 20 | 0 | 0 | 0 | 17.5s |
| ✅ 05-b2-islands | B2 三岛后端（序列号 FIFO/委外/工单领料） | 26 | 0 | 0 | 0 | 13.9s |
| ❌ 06-open-gateway | 开放 API 网关（Key/scope 护栏/5 资源/隔离） | 39 | 2 | 0 | 0 | 13.9s |
| ✅ 07-rls | RLS 行级安全（own/all/privileged/归属校验） | 20 | 0 | 0 | 1 | 16.0s |
| ⚠️ 08-fx | 多币种汇率（写入/upsert/校验/隔离/外部刷新） | 17 | 0 | 1 | 1 | 9.2s |
| ❌ 09-audit-match | 审计日志落库 + 三单匹配（一致/超差/校验） | 11 | 3 | 0 | 2 | 3.7s |
| ❌ 10-intelligence | 智能与合规端点探活（AI/ChatBI/预警/OCR/数电票） | 18 | 2 | 1 | 2 | 5.9s |

## ❌ 失败明细（需修复）

| 套件 | 断言 | 详情 |
|---|---|---|
| 06-open-gateway | 创建响应的 id 可在 Key 列表中查到（否则调用方无法吊销） | `响应 id=ak_78603b2c4eb44d6eb498e90f5fe1fa0a 库内 id=ak_b6ace7ca3ebe421e896780f912459ab7` |
| 06-open-gateway | PUT 不存在 id 返回 404（非 500） | `status=200 期望=404 body={"ok":true}` |
| 09-audit-match | POST /api/audit/logs 写入审计 | `status=500 期望=200 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class` |
| 09-audit-match | 审计写入返回 success + id | `id=undefined` |
| 09-audit-match | 刚写入的审计记录可被查到 | `最近 12 条中未找到` |
| 10-intelligence | GET /api/alerts 异常预警计算 | `status=500 期望=200 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class` |
| 10-intelligence | POST /api/ocr/recognize 未传图片返回 400 | `status=500 期望=400 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class` |

## ⚠️ 告警（不阻断，但需关注）

- **08-fx** · POST /api/fx/refresh 外部汇率源暂不可用 — 端点已正确返回 502（非 500 崩溃），属外部依赖问题
- **10-intelligence** · AI 对话未返回成功（大概率未配置模型或外部额度问题） — status=404 body={"success":false,"error":"模型配置未找到，请先在设置中配置AI模型"}

## 全部断言明细

### 01-auth · 认证与会话（注册/登录/会话/登出/拒绝路径）

- ✅ GET /api/auth/me 会话有效 — status=200
- ✅ me 返回当前用户且组织一致 — org_id=org_f0cc03a0923e4fe6a76af8adba00ec4a 期望=org_f0cc03a0923e4fe6a76af8adba00ec4a
- ✅ me 角色为 admin — 实际="admin" 期望="admin"
- ✅ GET /api/auth/me 无凭据拒绝 — status=401
- ✅ GET /api/auth/me 伪造 token 拒绝 — status=401
- ✅ 同公司码注册普通用户（manager） — username=e2e_buyer1_260901080020
- ✅ 同公司码归并至同一组织 org_id — 组织归并: 实际="org_f0cc03a0923e4fe6a76af8adba00ec4a" 期望="org_f0cc03a0923e4fe6a76af8adba00ec4a"
- ✅ 普通用户角色为 manager（非特权） — 实际="manager" 期望="manager"
- ✅ POST /api/auth/login 正确密码登录 — status=200
- ✅ 登录返回新会话 token — token=有
- ✅ POST /api/auth/login 错误密码拒绝 — status=401
- ✅ POST /api/auth/login 不存在用户拒绝 — status=401
- ✅ POST /api/auth/register 重复用户名拒绝 — status=409
- ✅ POST /api/auth/register 缺公司码拒绝 — status=400
- ✅ POST /api/auth/logout 登出 — status=200
- ✅ 登出后原会话失效 — status=401
- ✅ 登出其他会话不影响主会话 — status=200

### 02-state-blob · app_state Blob 通道（写读往返/覆盖/删除/隔离）

- ✅ GET /api/state/:key 未登录拒绝 — status=401
- ✅ 新键首次读为空 — status=404 value=null
- ✅ PUT /api/state/:key 写入 — status=200
- ✅ 写入返回 updated_at — updated_at=2026-09-01T08:00:34.983Z
- ✅ GET /api/state/:key 读回 — status=200
- ✅ Blob 写→读 往返内容完全一致 — 读回={"runId":"260901080020","nested":{"a":1,"b":[1,2,3]},"ts":1788249634361}
- ✅ 同键覆盖更新生效（非追加） — 读回={"runId":"260901080020","overwritten":true}
- ✅ 跨组织读不到同名 Blob 键（org 隔离生效） — status=404 value=null
- ✅ 隔离校验组织 org_id 与主组织不同 — other=org_cde272fc40754d128774787bace59bc8
- ✅ DELETE /api/state/:key 删除 — status=200
- ✅ 删除后读为空 — status=404

### 03-relational · 关系域读取护栏（10 域 GET/契约/鉴权/分页）

- ✅ GET /api/materials（物料）返回 200 — status=200 total=0
- ✅   └ materials 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/customers（客户）返回 200 — status=200 total=0
- ✅   └ customers 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/vendors（供应商主数据(vendor_master)）返回 200 — status=200 total=0
- ✅   └ vendors 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/purchase-orders（采购订单）返回 200 — status=200 total=0
- ✅   └ purchase-orders 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/sales-orders（销售订单）返回 200 — status=200 total=undefined
- ✅   └ sales-orders 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/inbound-orders（入库单）返回 200 — status=200 total=0
- ✅   └ inbound-orders 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/outbound-orders（出库单）返回 200 — status=200 total=0
- ✅   └ outbound-orders 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/work-orders（工单）返回 200 — status=200 total=undefined
- ✅   └ work-orders 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/vouchers（会计凭证）返回 200 — status=200 total=undefined
- ✅   └ vouchers 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ GET /api/inventory-records（库存流水）返回 200 — status=200 total=undefined
- ✅   └ inventory-records 列表契约 {data,total,page,pageSize} — data=0条 total=0 page=1/20
- ✅ 关系域可读性 10/10 — 域数: 实际=10 期望=10
- ✅ 未登录访问全部关系域被拒 10/10 — 全部 401
- ✅ 分页 pageSize=2 生效（返回条数 ≤ 2） — 返回=0 total=0
- ✅ 分页回显 page — 实际=1 期望=1
- ✅ GET /api/materials/:id 不存在返回 404（非 500） — status=404

### 04-vendor · 供应商 CRUD + 前端/网关同源（消除双数据源护栏）

- ✅ POST /api/vendors 创建供应商 — status=201
- ✅ 创建回显 code 一致 — 实际="E2EV260901080020" 期望="E2EV260901080020"
- ✅ 创建返回 createdBy 审计字段 — createdBy=user_4a57c2b0b744482fb560ac6d51859508
- ✅ GET /api/vendors/:id 详情 — status=200
- ✅ 详情 creditLimit 与创建一致 — 实际=1000000 期望=1000000
- ✅ 详情 name 与创建一致 — 实际="E2E 常驻套件供应商" 期望="E2E 常驻套件供应商"
- ✅ 新建供应商在列表中可见 — total=1
- ✅ PUT /api/vendors/:id 仅传单字段不报 500（回潮护栏） — status=200
- ✅ 局部更新后 creditLimit 生效 — 实际=88888 期望=88888
- ✅ 局部更新未清空 name（COALESCE 保留） — 实际="E2E 常驻套件供应商" 期望="E2E 常驻套件供应商"
- ✅ PUT /api/vendors/:id 扩展 JSON 列写入 — status=200
- ✅ 扩展列 customFields JSON 往返一致 — customFields={"e2eField":"e2eValue","n":42}
- ✅ GET /api/open/vendors 网关读取 — status=200
- ✅ 【同源】前端 POST 创建的供应商在网关可见 — 网关 code=E2EV260901080020
- ✅ 【同源】网关读到的 credit_limit 反映前端 PUT 结果 — 网关 credit_limit=88888 期望=88888
- ✅ PUT /api/open/vendors/:id 网关侧更新 — status=200
- ✅ 【反向同源】网关写入在前端路径立即可见 — creditLimit: 实际=77777 期望=77777
- ✅ DELETE /api/vendors/:id 删除 — status=200
- ✅ 删除后前端详情 404 — status=404
- ✅ 【同源】删除后网关侧同步消失 — 已消失

### 05-b2-islands · B2 三岛后端（序列号 FIFO/委外/工单领料）

- ✅ GET /api/serial-numbers 列表 — status=200
- ✅   └ 序列号列表契约 — data=0条 total=0 page=1/20
- ✅ 序列号主档创建 3 条 — 成功条数: 实际=3 期望=3
- ✅ POST /api/serial-numbers/consume FIFO 核销 2 个 — status=200
- ✅ 核销数量为 2 — 核销条数: 实际=2 期望=2
- ✅ 【FIFO 正确性】核销命中最早入库的 A(01-01)+B(02-02) — 实际核销=["SN-260901080020-A","SN-260901080020-B"] 期望含=["SN-260901080020-A","SN-260901080020-B"]
- ✅ 核销后在库仅剩 1 个 — 在库条数: 实际=1 期望=1
- ✅ 剩余在库者为入库最晚的 C(03-03) — 剩余=SN-260901080020-C
- ✅ 在库不足核销返回 409（不静默成功） — status=409 available=1 required=99
- ✅ 核销 qty=0 参数校验 400 — status=400
- ✅ GET /api/subcontracts 列表 — status=200
- ✅   └ 委外列表契约 — data=0条 total=0 page=1/20
- ✅ POST /api/subcontracts 创建委外单（含发料明细） — status=200
- ✅ 委外单回显 order_no — 实际="E2E-SUB-260901080020" 期望="E2E-SUB-260901080020"
- ✅ 委外单 qty 落库正确 — 实际=100 期望=100
- ✅ 委外单加工费落库正确 — 实际=3500 期望=3500
- ✅ GET /api/subcontracts/:id 详情 — status=200
- ✅ 委外发料明细 2 条随主单返回 — 明细条数=2
- ✅ PUT /api/subcontracts/:id 状态流转 — status=200
- ✅ GET /api/work-orders/picking 列表 — status=200
- ✅   └ 工单领料列表契约 — data=0条 total=0 page=1/20
- ✅ POST /api/work-orders/picking 创建领料记录 — status=200
- ✅ 领料数量落库正确 — 实际=20 期望=20
- ✅ 同工单同物料重复领料返回 409（幂等护栏） — status=409 既有 id=wop-90f44736-ec79-46b9-b325-9ccda0ab9f50
- ✅ GET /api/work-orders/picking/:id 详情 — status=200
- ✅ 三岛端点未登录全部拒绝 — 全部 401: 实际=3 期望=3

### 06-open-gateway · 开放 API 网关（Key/scope 护栏/5 资源/隔离）

- ✅ POST /api/open/keys 创建 read Key（201） — status=201
- ✅ read Key 返回明文 plainKey（仅此一次） — 前缀=sk_9fc…
- ✅ read Key scopes 回显 — 实际="read" 期望="read"
- ✅ POST /api/open/keys 创建 write Key（201） — status=201
- ✅ GET /api/open/keys 列表 — status=200
- ✅ 列表包含本轮创建的两个 Key — 本轮 Key 数=3
- ✅ 列表不泄露 key_hash / 明文 — 仅返回 id/label/scopes/revoked 等元数据
- ❌ 创建响应的 id 可在 Key 列表中查到（否则调用方无法吊销） — 响应 id=ak_78603b2c4eb44d6eb498e90f5fe1fa0a 库内 id=ak_b6ace7ca3ebe421e896780f912459ab7
- ✅ 无 Key 访问网关拒绝 401 — status=401
- ✅ 无效 Key 访问网关拒绝 401 — status=401
- ✅ read Key 可读 — status=200
- ✅ read Key 写入被拒 403（scope 护栏） — status=403
- ✅ write Key 天然可读（read ⊂ write） — status=200
- ✅ 非管理员创建 Key 被拒 403 — status=403
- ✅ 非管理员查看 Key 列表被拒 403 — status=403
- ✅ GET /api/open/materials 可读 — status=200 total=0
- ✅   └ materials 契约 {data,total,page,pageSize} — data=0
- ✅ GET /api/open/vendors 可读 — status=200 total=0
- ✅   └ vendors 契约 {data,total,page,pageSize} — data=0
- ✅ GET /api/open/customers 可读 — status=200 total=0
- ✅   └ customers 契约 {data,total,page,pageSize} — data=0
- ✅ GET /api/open/purchase-orders 可读 — status=200 total=0
- ✅   └ purchase-orders 契约 {data,total,page,pageSize} — data=0
- ✅ GET /api/open/sales-orders 可读 — status=200 total=0
- ✅   └ sales-orders 契约 {data,total,page,pageSize} — data=0
- ✅ 网关资源可读性 5/5 — 资源数: 实际=5 期望=5
- ✅ 不支持的资源返回 404 — status=404
- ✅ 404 提示列出可选资源清单 — error=不支持的资源，可选: materials, vendors, customers, purchase-orders, sales-orders
- ✅ POST /api/open/materials 网关创建（201） — status=201
- ✅ GET /api/open/materials/:id 详情 — status=200
- ✅ 网关创建内容落库正确（code） — 实际="E2E-GW-260901080020" 期望="E2E-GW-260901080020"
- ✅ PUT /api/open/materials/:id 网关更新 — status=200
- ✅ 网关更新生效 — 实际="E2E 网关物料（已改）" 期望="E2E 网关物料（已改）"
- ✅ 【同源】网关创建的物料在前端会话路径可见 — status=200
- ✅ DELETE /api/open/materials/:id 网关删除 — status=200
- ✅ 删除后网关详情 404 — status=404
- ❌ PUT 不存在 id 返回 404（非 500） — status=200 期望=404 body={"ok":true}
- ✅ DELETE /api/open/keys/:id 吊销 Key — status=200
- ✅ 吊销后该 Key 立即失效 401 — status=401
- ✅ 重复吊销幂等（200/404，非 500） — status=200
- ✅ 【组织隔离】本组织 Key 读不到他组织供应商 — 本组织 total=0

### 07-rls · RLS 行级安全（own/all/privileged/归属校验）

- ✅ 准备两个同组织非特权用户 — e2e_buyer1_260901080020(QA-采购部) / e2e_buyer2_260901080020(QA-采购二部)
- ✅ 两用户属同一组织 — b1=org_f0cc03a0923e4fe6a76af8adba00ec4a b2=org_f0cc03a0923e4fe6a76af8adba00ec4a
- ✅ buyer1 创建供应商 — status=201
- ✅ buyer2 创建供应商 — status=201
- ✅ 创建时自动填入 owner_id（归属本人） — ownerId=user_9453c7c8515d48ebb919e986169fbe97 期望=user_9453c7c8515d48ebb919e986169fbe97
- ✅ 【own】buyer1 能看到自己的供应商 — 可见 1 条
- ✅ 【own】buyer1 看不到 buyer2 的供应商 — 隔离生效
- ✅ 【own】buyer2 能看到自己的供应商 — 可见 1 条
- ✅ 【own】buyer2 看不到 buyer1 的供应商 — 隔离生效
- ✅ 【privileged】admin 同时看到两人的供应商 — admin 可见 2 条（含 b1=true b2=true）
- ✅ 【own】buyer1 读 buyer2 的供应商详情被拒 — status=403
- ✅ 【own】buyer1 更新 buyer2 的供应商被拒 — status=403
- ✅ 【own】buyer1 删除 buyer2 的供应商被拒 — status=403
- ✅ 越权尝试后 buyer2 的数据未被篡改 — creditLimit: 实际=200 期望=200
- ✅ 越权尝试后 buyer2 的数据仍存在 — status=200
- ✅ 【own】buyer1 更新自己的供应商成功 — status=200
- ✅ 【all】物料 对两个非特权用户可见总数一致（共享主数据） — b1=0 b2=0 admin=0
- ✅ 【all】工单 对两个非特权用户可见总数一致（共享主数据） — b1=undefined b2=undefined admin=undefined
- ✅ 【all】凭证 对两个非特权用户可见总数一致（共享主数据） — b1=undefined b2=undefined admin=undefined
- ✅ 【dept】三个部门档端点在非特权用户下均可查询 — 端点数: 实际=3 期望=3
- ℹ️ 【dept】过滤效果未做数据级验证 — 隔离组织内 inbound/outbound/inventory 无创建端点、为空表，无法构造跨部门数据；仅验证 SQL 可执行

### 08-fx · 多币种汇率（写入/upsert/校验/隔离/外部刷新）

- ✅ GET /api/fx 未登录拒绝 — status=401
- ✅ GET /api/fx?base=CNY 读取 — status=200
- ✅ 返回 data 数组契约 — type=object
- ✅ POST /api/fx 缺 quote 返回 400 — status=400
- ✅ POST /api/fx 缺 rate 返回 400 — status=400
- ✅ 汇率写入 3 条成功 — 成功条数: 实际=3 期望=3
- ✅ 读回包含写入的 3 个币种 — 读回币种=EUR,JPY,USD
- ✅ CNY→USD 汇率值精确往返 — rate: 实际=0.1392 期望=0.1392
- ✅ 汇率来源标记为 manual — 实际="manual" 期望="manual"
- ✅ 返回 updatedAt 时间戳 — updatedAt=2026-09-01T08:01:55.115Z
- ✅ POST /api/fx 同键重复写入 — status=200
- ✅ 同键 upsert 未产生重复行 — 行数: 实际=3 期望=3
- ✅ 同键 upsert 覆盖为新汇率 — rate: 实际=0.14 期望=0.14
- ✅ POST /api/fx 写入不同 base（USD→CNY） — status=200
- ✅ 不同 base 独立存储互不干扰 — USD base 行数=1
- ✅ 写入 USD base 未污染 CNY base — CNY 行数: 实际=3 期望=3
- ✅ 【组织隔离】他组织读不到本组织汇率 — 他组织可见=0 条
- ⚠️ POST /api/fx/refresh 外部汇率源暂不可用 — 端点已正确返回 502（非 500 崩溃），属外部依赖问题
- ℹ️ 汇率数据未清理 — fx_rates 无删除端点；数据仅存于本轮隔离组织，不影响真实业务组织

### 09-audit-match · 审计日志落库 + 三单匹配（一致/超差/校验）

- ✅ POST /api/audit/logs 未登录拒绝 — status=401
- ✅ POST /api/audit/logs 缺 entity 返回 400 — status=400
- ❌ POST /api/audit/logs 写入审计 — status=500 期望=200 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class
- ❌ 审计写入返回 success + id — id=undefined
- ✅ GET /api/audit 查询审计 — status=200
- ✅ 审计查询返回列表结构 — type=array(12)
- ❌ 刚写入的审计记录可被查到 — 最近 12 条中未找到
- ✅ POST /api/three-way-match/create 缺 poId 返回 400 — status=400
- ✅ 三单完全一致创建匹配单 — status=200
- ✅ 一致场景返回 success — {"success":true,"id":"twm-1788249724842-3loz"}
- ✅ 三单超差创建匹配单 — status=200
- ✅ 超差场景返回 success（差异由后端判定入库） — {"success":true,"id":"twm-1788249725435-k3g5"}
- ℹ️ 匹配判定结果未在响应中回显 — 端点仅返回 {success,id}，matchStatus(matched/discrepancy) 落库但不回显；如需断言判定值，需后端补回显字段
- ✅ 三单 0.5% 容差内创建（不应报错） — status=200
- ✅ POST /api/three-way-match/create 未登录拒绝 — status=401
- ℹ️ 三单匹配与审计记录未清理 — 两者均无删除端点；数据仅存于本轮隔离组织（E2E-260901080020），不影响真实业务组织

### 10-intelligence · 智能与合规端点探活（AI/ChatBI/预警/OCR/数电票）

- ✅ GET /api/alerts 未登录拒绝 — status=401
- ❌ GET /api/alerts 异常预警计算 — status=500 期望=200 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class
- ✅ GET /api/ai/models 未登录拒绝 — status=401
- ✅ GET /api/ai/models 端点真实存在（非 SPA 回退） — status=200 ct=application/json; charset=utf-8
- ✅ GET /api/ai/models 返回 200 — status=200
- ✅ POST /api/ai/models 缺必填字段返回 400 — status=400
- ✅ POST /api/ai/chat 未登录拒绝 — status=401
- ✅ POST /api/ai/chat 端点真实存在（非 SPA 回退） — status=404 ct=application/json; charset=utf-8
- ⚠️ AI 对话未返回成功（大概率未配置模型或外部额度问题） — status=404 body={"success":false,"error":"模型配置未找到，请先在设置中配置AI模型"}
- ✅ POST /api/chatbi 端点真实存在（非 SPA 回退） — status=200 ct=application/json; charset=utf-8
- ✅ POST /api/chatbi 缺 query 返回 400 — status=400
- ✅ ChatBI 查询成功返回 — {"title":"本月销售趋势","description":"2026年9月销售数据，共 0 笔订单","chartType":"bar","data":[{"label":"无数据","value":0,"orders":0}],"summary":"本月订单总额: 0.0
- ✅ POST /api/chatbi 未登录拒绝 — status=401
- ✅ GET /api/ocr/recognize 端点说明可用 — status=200
- ❌ POST /api/ocr/recognize 未传图片返回 400 — status=500 期望=400 body=<!DOCTYPE html>
<!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
<!--[if IE 7]>    <html class
- ✅ POST /api/ocr/recognize 未登录拒绝 — status=401
- ℹ️ 发票 OCR 识别精度未做断言 — 当前实现为文本正则解析（未接 OCR/大模型），精度类断言待模型对接后补充
- ✅ GET /api/tax-gateway/verify 端点说明可用 — status=200
- ✅ POST /api/tax-gateway/verify 空发票列表返回 400 — status=400
- ✅ POST /api/tax-gateway/verify 单张核验返回 200 — status=200
- ✅ 核验返回统计结构（data.total/valid/invalid/error） — total=1 results=1
- ℹ️ 数电票核验为桩实现（唯一确认桩） — functions/api/tax-gateway/verify.ts 为 mock + TODO，未对接真实税局接口；本断言仅护栏契约不回归
- ✅ POST /api/tax-gateway/verify 超 100 张返回 400（批量上限护栏） — status=400

---

> 本报告由 `npm run test:prod-e2e` 生成（`scripts/prod-e2e/`）。套件在生产环境创建时间戳隔离组织，跑完自动清理业务数据；`orgs`/`users` 无删除端点，会残留少量僵尸测试账号，不影响业务数据。
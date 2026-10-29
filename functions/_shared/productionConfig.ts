// 生产域父子表配置（C1 · V3.12.0）
//
// 本文件只描述**有嵌套的那个切片**（工艺路线）。同 store 的
// `mrpRecommendations` 是平表，走通用实体路由 `/api/entities/mrpRecommendation`
// （登记在 `_shared/entities.ts`），**不在这里、也不需要端点**。
//
// ── ★ 本域最容易搞错的一件事：它是「半迁移」状态 ──────────────────
// `useProductionStore` 有三个切片，但**只有两个还在 Blob 里**：
//   · workOrders        —— W1（V2.75.x）已直连 D1 `work_orders`，
//                          partialize 早已不写它。**本轮不碰。**
//   · processRoutes     —— 有嵌套（operations[]）→ 本配置，走 parentChild。
//   · mrpRecommendations—— 平表 → 通用实体路由。
// 若照着「生产域 3.7 KB / 消费方 25」就动手建工单表，会做出一张
// **与 work_orders 重复、且没有任何写入方**的死表。
//   → 记住：**「域有多大」和「域里还剩什么没迁」是两件事**，
//     后者只能读 store 的 `partialize` —— 那才是「现在还往 Blob 写什么」的唯一事实。
//
// ── 列名来源（硬纪律）────────────────────────────────────────────
// 全部列名由 `src/types/production.ts` 的
//   ProcessRoute (extends BaseEntity) / Operation
// 逐一反推为 snake_case，**不按「工艺路线应该长什么样」推断**。
// 这条纪律来自 0053 的教训（按会计常识推列名 → 表与前端契约全对不上，
// 而通用路由的 pickSnake 会静默丢弃未登记字段且返回 201）。
//
// ── 迁移前已用脚本逐字段比对（非目测）─────────────────────────────
// `scripts/_cmp_production.mjs` 结论：route-001 / route-002 与代码默认值
// **逐字段完全一致**（零用户改动），operations 行数 6 / 4。
// 因此不存在「拿默认值覆盖用户改动」的风险；但这不能反推成以后不用比对。
//
// ── skills 为什么是子表的 jsonCols、不建第三张表 ──────────────────
// `Operation.skills: string[]` 是子表**行内**的嵌套。
// 为它建表只会得到「每行一个技能名」的空壳（无 id、无属性、不参与 SQL 统计）。
// 判据是「将来会不会需要按内部字段做 SQL 统计」，不是「它是不是数组」。
// ★ 编解码统一走 `toJsonValue` / `parseJsonValue`（V3.11.0 起父子两端已统一，
//   不再有「父表 toJsonText 会把非数组压成 []」那个分叉）。
import type { ParentChildConfig } from './parentChild';

/**
 * 工艺路线：父 process_routes + 子 process_route_operations
 *
 * ★ noCamel 取 `routeNo`：UNIQUE 约束落在业务单号上（RT-2024-001 这种），
 *   撞号提示里必须显示人看得懂的编号。
 *   **规则：取「撞了之后人用来辨认记录的那个字段」，不是主键本身。**
 *
 * ★★ 与 0058 采购域不同：本轮的唯一约束 `uniq_process_routes_no`
 *    **在建表的同一个迁移（0061）里就建好了**，没有留到事后补。
 *    （0058 漏建 → 0060 才补，而本文件这类注释与 parentChild 的 409 分支
 *     都假定约束存在 → 分支永不触发。这个错不该再犯第三次。）
 */
export const PROCESS_ROUTE_PC: ParentChildConfig = {
  parentTable: 'process_routes',
  module: 'production', // P0-1：prod_leader 在 BUILTIN_ROLE_OPS 已有 production 写权限
  children: [
    {
      childTable: 'process_route_operations',
      childFkCol: 'route_id',
      // ★ 前端字段名是 `operations`，**不是** items。
      //   validate.ts 的 CHILD_BY_FIELD 必须同步登记这个名字，
      //   否则整层工序校验都不会执行（两道门，只开一道等于没开）。
      childField: 'operations',
      childCols: [
        // ★ Operation **自带 id**（op-001…）→ parentChild 的
        //   `item.id ? String(item.id) : uid('ci')` 会直接用前端 id。
        ['sequence', 'sequence'],
        ['operation_code', 'operationCode'],
        ['operation_name', 'operationName'],
        ['work_center', 'workCenter'],
        ['setup_time', 'setupTime'],
        ['run_time', 'runTime'],
        ['wait_time', 'waitTime'],
        ['description', 'description'],
      ],
      // ★ 排序用 `seq`（插入顺序）而不是 `sequence`（业务序号）：
      //   sequence 是 10/20/30 这种带间隔的编号，允许中间插工序；
      //   但「读回顺序」必须与「写入顺序」一致，否则编辑后工序会乱序。
      //   seq 由 parentChild 按数组下标写入，是唯一稳定的还原依据。
      childOrder: 'seq ASC',
      // 行内字符串数组 → JSON 文本列（见文件头）
      jsonCols: [['skills', 'skills']],
    },
  ],
  parentCols: [
    ['route_no', 'routeNo'],
    ['name', 'name'],
    ['product_code', 'productCode'],
    ['product_name', 'productName'],
    ['version', 'version'],
    ['status', 'status'],
    ['total_lead_time', 'totalLeadTime'],
    // BaseEntity 四件套
    ['created_at', 'createdAt'],
    ['updated_at', 'updatedAt'],
    ['created_by', 'createdBy'],
    ['updated_by', 'updatedBy'],
  ],
  label: '工艺路线',
  noSnake: 'route_no',
  noCamel: 'routeNo',
};

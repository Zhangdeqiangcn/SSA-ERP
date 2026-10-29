// 审批流域父子表配置（C1 · V3.10.0）
//
// 一张配置驱动 /api/approval-flows 两个端点，实际 CRUD 逻辑在
// `_shared/parentChild.ts`（通用父子表助手）。
//
// ── 列名来源 ────────────────────────────────────────────────────
// 全部列名由 `src/stores/approvalFlowStore.ts` 的 ApprovalFlowConfig /
// ApprovalNode / ConditionGroup / SkipRule / EscalationRule 接口反推
// （snake_case），**不按「审批流应该长什么样」推断**。
// 这条纪律来自 0053 的教训：按常识推断列名会让表与前端契约对不上，
// 而通用路由 pickSnake 会静默丢弃未登记字段、仍返回 201 成功。
//
// ── ★ 本域的新问题：子表行内也有嵌套 ────────────────────────────
// 前四个域里嵌套只在「父表带子数组」这一层。审批流不同：
// **每个节点（子表的一行）自己还带嵌套对象与字符串数组**。
//   · conditions      : ConditionGroup（对象：{ logic, conditions[] }，两层）
//   · skipRule        : SkipRule（对象：{ when: ConditionGroup, action }）
//   · escalation      : EscalationRule（对象：{ timeout, escalateTo, ... }）
//   · approverRoles   : UserRole[]（字符串数组）
//   · approverUserIds : string[]（字符串数组）
//   · fields          : string[]（该步骤可编辑的业务字段，字符串数组）
// 全部走**子表 JSON 文本列**（ChildSpec.jsonCols，本版新增能力）。
//
// 为什么不给它们建子表：
//   · conditions 里的 ApprovalCondition[] 是「条件组的内部结构」，
//     脱离所属节点没有任何意义，建表后每次读取都要按节点再聚合一次，
//     只是把 JSON 换了张表放，没有带来任何查询能力。
//   · fields 是「字段名列表」，建表会得到「每行一个字段名」的空壳。
//
// ── 为什么 status 与 enabled 必须如实存 ─────────────────────────
// 实测发现生产库里 13 条流程的 `status` 全是 'system'，而代码默认值里
// **没有这个字段** —— 它是 persist 的 migrate（v1→v2）补上的标志位。
// 这提醒一件事：`status` 决定流程是否生效（ACTIVE_STATUSES 白名单），
// 不能因为「看起来都是 system」就不存。存下来才能让
// draft / pending / published 三个自定义流程状态真实落地。
import type { ParentChildConfig } from './parentChild';

/**
 * 审批流：父 approval_flows + 子 approval_flow_nodes
 *
 * ★ 冲突提示字段的取舍（noSnake / noCamel 都取 `module`）：
 *   本域的 UNIQUE 约束实际落在 `id` 上，而 `id` 就是业务标识
 *   （默认流程 `sales_order`，自定义流程 `custom-1712345678-123`）。
 *   提示语里用哪个？
 *     · 用 `id`   → 自定义流程会显示 `custom-1712345678-123`，人看不懂；
 *     · 用 `module` → 显示 `sales_order` 或用户填的模块标识，可辨认。
 *   两者对默认流程恰好同值，对自定义流程 `module` 才是有意义的那一个。
 *   因此取 `module`：**提示的目标是「让人知道哪条记录撞了」，
 *   而不是「复述主键」**。`moduleLabel` 看似更友好，但自定义流程允许留空，
 *   空提示比编号更难用，故不取。
 */
export const APPROVAL_FLOW_PC: ParentChildConfig = {
  parentTable: 'approval_flows',
  // ★ V3.48.0 止血②：改为独立模块 'approval'（不再用 '*'）。审批流定义是「公司级公共配置」（RLS='all'），
  //   组织内业务运维角色可协作「改」，但「新建/删除」仍归管理员（BUILTIN_ROLE_OPS 里 approval 只授 read+update），
  //   纯只读角色保持锁死。此前用 '*' 做业务模块，把协作写误指向"只有特权角色"，
  //   打断了守护套件 21「同组织他人可改公共审批流」的既定语义（V3.47.0 引入 2 条回归），在此修回。
  module: 'approval',
  children: [
    {
      childTable: 'approval_flow_nodes',
      childFkCol: 'flow_id',
      childField: 'nodes',
      childCols: [
        // ★ 这里**刻意没有 `seq` 列**（第一版写过，已删）。
        //   原因：前端 ApprovalNode 契约里没有 seq 字段（只有 order），
        //   而 childCols 的取值逻辑是 `obj[camel]` —— 写 ['seq','seq']
        //   会永远取到 undefined、永远不写入，成为一条「表里有列、
        //   代码以为在用、实际恒定 0」的死列。更坏的是它会让
        //   childOrder 看起来像两级排序（seq ASC, node_order ASC），
        //   让后来的人误以为存在一个前端可控的次级顺序。
        //   节点的顺序号只有一个来源：node_order。
        ['name', 'name'],
        ['role', 'role'],
        ['role_name', 'roleName'],
        ['condition', 'condition'],
        ['timeout', 'timeout'],
        // ★ 前端字段名就是 `order`，而 order 是 SQL 保留字（ORDER BY），
        //   直接建列名会到处要加引号。因此列名取 node_order，camel 名保持 order
        //   —— 接口形状不变是硬要求，改的是存储形态。
        ['node_order', 'order'],
        ['approver_type', 'approverType'],
        ['mode', 'mode'],
        ['optional', 'optional'],
      ],
      // ★ 子表 JSON 列（本版新增能力）：这些字段是节点私有的嵌套结构/数组
      jsonCols: [
        ['conditions', 'conditions'],          // ConditionGroup 对象
        ['skip_rule', 'skipRule'],             // SkipRule 对象（当前数据未用，但用户可配）
        ['escalation', 'escalation'],          // EscalationRule 对象
        ['approver_roles', 'approverRoles'],   // UserRole[] 字符串数组
        ['approver_user_ids', 'approverUserIds'], // string[] 字符串数组
        ['fields', 'fields'],                  // string[] 字符串数组
      ],
      // 按节点顺序读回：审批步骤的先后本身就是业务语义，
      // 顺序错了「先财务后总经理」会变成「先总经理后财务」。
      childOrder: 'node_order ASC',
    },
  ],
  parentCols: [
    ['module', 'module'],
    ['module_label', 'moduleLabel'],
    ['enabled', 'enabled'],
    ['profile', 'profile'],
    ['status', 'status'],
    ['created_by', 'createdBy'],
    // ★ createdAt 必须登记（第一版漏了）——
    //   `addCustomFlow` 会 `createdAt: new Date().toISOString()`，
    //   若这里不登记，它既不写库也不回读：自定义流程建完、刷新页面，
    //   创建时间就变成 undefined。这与 V3.9.0 销售域「字段只进 jsonCols
    //   没进 parentCols」是同一类错误的另一副面孔 ——
    //   那次的根因是要求两处手动对齐，这次的根因是「凭印象挑字段」。
    //   核对方式：把 parentCols 与 ApprovalFlowConfig 的字段名逐个对上，
    //   而不是凭「哪些看起来重要」来写。
    ['created_at', 'createdAt'],
    ['approved_by', 'approvedBy'],
    ['approved_at', 'approvedAt'],
    ['description', 'description'],
  ],
  // 字符串数组：无 id、无属性、不参与 SQL 统计 → 父表 JSON 文本列
  jsonCols: [['visible_roles', 'visibleRoles']],
  label: '审批流',
  noSnake: 'module',
  noCamel: 'module',
};

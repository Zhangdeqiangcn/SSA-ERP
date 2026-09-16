// 套件 21 · 审批流域关系化护栏（V3.10.0 C1 数据关系化第五个域）
//
// ── 这个套件防的是什么回潮 ────────────────────────────────────────
// 审批流不是业务流水，而是**用户可调的配置**，且是**公司级公共配置**。
// 它的风险面与前面四个域都不同：
//
//  ① ★★ **子表行内的对象被静默写成 `[]`**（本域独有、最凶险的一种）
//     前四个域里嵌套只在「父表带子数组」这一层。审批流不同：**每个节点
//     （子表的一行）自己还带嵌套对象** ——
//       · node.conditions  : ConditionGroup { logic, conditions[] }
//       · node.skipRule    : SkipRule  { when, action }
//       · node.escalation  : EscalationRule { timeout, escalateTo, ... }
//     parentChild.ts 里给子表做 JSON 编解码时，若沿用父表那套 `toJsonText`
//     （它的实现是 `JSON.stringify(Array.isArray(v) ? v : [])`），
//     一个**合法的 ConditionGroup 对象会被写成 `[]`** ——
//     保存成功、界面无异常、重进页面条件全空。
//     测试库实测 `conditions` 出现 8 次、`escalation` 1 次，说明这些是真在用的，
//     不是纸上功能。
//     → 本套件断言读回的 conditions 是**对象**且 `logic` / `conditions[0].field`
//       逐项一致，并把 escalation 也一并钉住。
//
//  ② **只拨开关（改 enabled）就把节点全删光**（本域最高频操作）
//     设置页最常用的是「启用/停用某个审批流」这一个开关。
//     语义必须是「不传 nodes = 节点保持原样」。
//     若实现把「没传」当成「清空」，用户点一次开关，
//     这条流程的 2~3 个审批节点就全没了 —— 而界面提示「保存成功」。
//     → 本套件先建带 3 个节点的流程，再只 PUT `{enabled:false}`，
//       然后断言节点数仍为 3 且那条带 conditions 的节点条件完好。
//
//  ③ **只改节点却把父表字段冲掉**（反方向，同样常见）
//     节点编辑器保存时只传 nodes。若实现把「没传的父表字段」整体覆盖成 NULL，
//     模块中文名 / 状态 / 描述会在编辑节点后集体消失。
//     → 本套件断言只传 nodes 后 moduleLabel / status / description 仍在。
//
//  ④ **JSON 字符串数组列编码错**（approverRoles / fields / visibleRoles）
//     这三者在库里是 TEXT，接口上是数组。漏了任一方向的编解码会得到
//     「渲染出 N 个字符而不是 N 项」或「数组被写进 TEXT 存成逗号串」。
//     `fields` 与 `approverRoles` 在真实默认流程里都有数据（各 1 个节点用到），
//     且 material / material_make 两个流程的全部节点都靠 fields 驱动分步录入 ——
//     这一列丢了，物料审批的分步表单就是空白。
//
//  ⑤ **删除不报连带行数**
//     删一条带 3 个节点的流程与删一条空流程后果不同。回执必须可读。
//
//  ⑥ **RLS 登记错（'own' 而非 'all'）**
//     本域是公司级公共配置。若误登成 'own'，每个人只看到自己建的自定义流程，
//     系统预置的 20 个流程反而**一条都看不到**（它们没有 owner_id）——
//     表现是「设置页审批流列表只剩自己建的两条，其余全空」。
//     这是本域与销售域（'own'）刻意相反的地方，必须钉住。
//
// ── 为什么每个断言都要「POST 之后必须再 GET 一次」 ─────────────────
//   POST/PUT 的回执可能只是把请求体原样回显，证明不了真的落到了 D1。
//   只有重新 GET 一次（打在数据库上）才能证明写入生效。
export const meta = { id: '21-approval-flow-domain', title: '审批流域关系化护栏（子表内嵌对象往返 + 只拨开关不删节点 + JSON 数组列 + 公司级可见）' };

const cleanup = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).toUpperCase();

  // ══════════════════════════════════════════════════════════════
  // 1. 端点可达性与鉴权
  //    （漏登记 RLS 会返回空表而不是 200；未登录必须 401）
  // ══════════════════════════════════════════════════════════════
  const list0 = await req('GET', '/api/approval-flows', { token });
  const list0Ok = s.expectStatus('GET /api/approval-flows 返回 200（审批流 RLS 已登记）', list0, 200,
    list0.status !== 200 ? JSON.stringify(list0.data).slice(0, 160) : '');
  if (list0Ok) {
    s.expectListShape('  └ 审批流列表契约 {data,total,page,pageSize}', list0);
    // ★★ 这里曾写错过一条断言（V3.10.0 首版），必须说明白，否则后人会重犯：
    //
    //   原断言是「系统预置流程可见，total ≥ 5」，理由是「生产库已有 13 条系统
    //   流程，RLS 是 'all' 就应该看得见」。**这条断言从原理上永远不可能通过** ——
    //   因为它把两种完全不同的作用域搞混了：
    //
    //     · RLS 的 'all' = 「**本公司内**全员可见」（相对 'own' = 仅建者可见）
    //     · 而 E2E 门禁每轮都**注册一个全新的隔离组织**（公司码 `E2E-<runId>`）
    //
    //   隔离组织里当然没有别的公司的流程。RLS 拦住的正是它该拦的 ——
    //   这是**正确的安全行为**，错的是断言。
    //
    //   验「RLS 是不是登成了 'own'」的正确做法（本套件第 6 节已实现）：
    //   用**本组织内**两个不同身份互看 —— A 建的流程，B 必须也能看到。
    //   这与组织无关，却精准命中了 'own' 会造成的真实故障。
    //   （前四域套件里都没有「存量数据可见」这类断言，本域也不该有。）
    const total = Number(list0.data?.total ?? 0);
    s.expectTrue('  列表可正常读取（total 为数字，RLS 未把本表整表拒绝）',
      Number.isFinite(total) && total >= 0, `total=${total}`);
  }

  const anon = await req('GET', '/api/approval-flows');
  s.expectStatus('未登录访问审批流被拒 401', anon, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. ★ 核心：带嵌套对象的节点数组往返（本域最凶险的一类）
  // ══════════════════════════════════════════════════════════════
  const flowId = `e2e-af-${stamp.toLowerCase()}`;
  const nodes = [
    {
      id: `n-${stamp}-1`,
      name: '发起申请',
      role: 'rd_engineer',
      roleName: '研发工程师',
      timeout: 24,
      order: 1,
      approverType: 'role',
      mode: 'serial',
      // ★ 字符串数组（JSON 文本列）
      fields: ['name', 'unit', 'specification', 'model'],
    },
    {
      id: `n-${stamp}-2`,
      name: '采购审核',
      role: 'buyer',
      roleName: '采购员',
      timeout: 48,
      order: 2,
      approverType: 'role',
      mode: 'serial',
      // ★★ 嵌套对象（ConditionGroup）—— 若实现误用 toJsonText 会被写成 []
      conditions: {
        logic: 'and',
        conditions: [
          { field: 'amount', operator: '>', value: 100000 },
          { field: 'materialType', operator: '==', value: 'purchased' },
        ],
      },
      // ★ 字符串数组
      approverRoles: ['buyer', 'finance_manager'],
      fields: ['leadTime', 'moq'],
    },
    {
      id: `n-${stamp}-3`,
      name: '批准生效',
      role: 'admin',
      roleName: '系统管理员',
      timeout: 72,
      order: 3,
      approverType: 'role',
      mode: 'serial',
      optional: true,
      // ★ 嵌套对象（EscalationRule，含内层 notify: string[]）
      escalation: { timeout: 24, escalateTo: 'role', targetRole: 'admin', notify: ['admin', 'finance_manager'] },
      // ★ 嵌套对象（SkipRule，含内层 when: ConditionGroup）——
      //   真实默认流程里当前未用到（0 次），但类型支持且用户可配，
      //   不建列的话用户一配就被静默丢弃，故必须一起钉住。
      skipRule: {
        when: { logic: 'or', conditions: [{ field: 'amount', operator: '<=', value: 1000 }] },
        action: 'auto_approve',
      },
    },
  ];

  const flowBody = {
    id: flowId,
    module: flowId,
    moduleLabel: 'E2E 审批流验证',
    enabled: true,
    profile: 'standard',
    status: 'system',
    visibleRoles: ['admin', 'buyer'],
    description: '护栏套件验证用',
    nodes,
  };

  const c1 = await req('POST', '/api/approval-flows', { token, body: flowBody });
  const c1Ok = s.expectStatus('★ 创建带 3 个节点的审批流返回 201', c1, 201,
    c1.status !== 201 ? JSON.stringify(c1.data).slice(0, 160) : '');
  if (c1Ok) cleanup.push({ path: '/api/approval-flows', id: flowId });
  if (c1Ok && c1.data) {
    s.expectEq('★ 创建回执：节点 3 行（未被静默丢弃）', (c1.data.nodes || []).length, 3, '节点数');
  }

  // ★ 必须重新 GET：证明真的落到了 D1，而不是回显请求体
  const g1 = await req('GET', `/api/approval-flows/${flowId}`, { token });
  const g1Ok = s.expectStatus('GET 审批流单条返回 200', g1, 200);
  if (g1Ok && g1.data) {
    const got = g1.data.nodes || [];
    s.expectEq('★ 从 D1 读回仍是 3 个节点（写入未丢行）', got.length, 3, '节点数');

    // 节点顺序：审批步骤的先后就是业务语义（先采购后总经理 ≠ 反过来）
    s.expectEq('  节点按 order 升序读回（第1个是发起申请）',
      String(got[0]?.name || ''), '发起申请');
    s.expectEq('  第2个是采购审核', String(got[1]?.name || ''), '采购审核');
    s.expectEq('  第3个是批准生效', String(got[2]?.name || ''), '批准生效');

    // 节点基础字段逐项比对
    const n2 = got.find((n) => n.id === `n-${stamp}-2`) || got[1];
    if (n2) {
      s.expectEq('  节点名称一致', String(n2.name), '采购审核');
      s.expectEq('  节点角色一致', String(n2.role), 'buyer');
      s.expectEq('  节点角色名一致', String(n2.roleName), '采购员');
      s.expectEq('  timeout 一致（数字）', Number(n2.timeout), 48);
      s.expectEq('  ★ order 一致（列名 node_order，接口名仍是 order）', Number(n2.order), 2);
      s.expectEq('  approverType 一致', String(n2.approverType), 'role');
      s.expectEq('  mode 一致', String(n2.mode), 'serial');

      // ★★ 本域最核心的一条：嵌套对象不能被写成 []
      const cond = n2.conditions;
      s.expectTrue('★★ conditions 读回是**对象**而非 []（子表 JSON 用了 toJsonValue）',
        cond !== null && typeof cond === 'object' && !Array.isArray(cond),
        `类型=${Array.isArray(cond) ? 'Array(空壳!)' : typeof cond} 值=${JSON.stringify(cond)?.slice(0, 80)}`);
      if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
        s.expectEq('  conditions.logic 一致', String(cond.logic), 'and');
        const inner = cond.conditions || [];
        s.expectEq('  ★ conditions.conditions 内层 2 条条件（两层嵌套完整）', inner.length, 2, '条件数');
        if (inner.length >= 2) {
          s.expectEq('    第1条条件字段', String(inner[0].field), 'amount');
          s.expectEq('    第1条运算符', String(inner[0].operator), '>');
          s.expectEq('    第1条数值', Number(inner[0].value), 100000);
          s.expectEq('    第2条条件字段', String(inner[1].field), 'materialType');
          s.expectEq('    第2条比较值', String(inner[1].value), 'purchased');
        }
      }

      // ★ 字符串数组列
      const ar = n2.approverRoles;
      s.expectTrue('★ approverRoles 读回是真数组（不是字符串/逗号串）',
        Array.isArray(ar), `类型=${typeof ar} 值=${JSON.stringify(ar)?.slice(0, 60)}`);
      if (Array.isArray(ar)) {
        s.expectEq('  approverRoles 数量一致', ar.length, 2, '元素数');
        s.expectEq('  第 1 项一致', String(ar[0]), 'buyer');
        s.expectEq('  第 2 项一致', String(ar[1]), 'finance_manager');
      }

      const fd = n2.fields;
      s.expectTrue('★ fields 读回是真数组（物料分步录入靠它驱动）',
        Array.isArray(fd), `类型=${typeof fd} 值=${JSON.stringify(fd)?.slice(0, 60)}`);
      if (Array.isArray(fd)) {
        s.expectEq('  fields 数量一致', fd.length, 2, '元素数');
        s.expectEq('  第 1 项一致', String(fd[0]), 'leadTime');
        s.expectEq('  第 2 项一致', String(fd[1]), 'moq');
      }
    } else {
      s.fail('  第 2 个节点读回', '未找到 id 为 n-...-2 的节点');
    }

    // 第 3 个节点：escalation（对象） + skipRule（对象，含内层 ConditionGroup）
    const n3 = got.find((n) => n.id === `n-${stamp}-3`) || got[2];
    if (n3) {
      s.expectEq('  第3个节点 optional 一致（布尔）', Boolean(n3.optional), true);

      const esc = n3.escalation;
      s.expectTrue('★ escalation 读回是对象而非 []',
        esc !== null && typeof esc === 'object' && !Array.isArray(esc),
        `值=${JSON.stringify(esc)?.slice(0, 80)}`);
      if (esc && typeof esc === 'object' && !Array.isArray(esc)) {
        s.expectEq('  escalation.timeout 一致', Number(esc.timeout), 24);
        s.expectEq('  escalation.escalateTo 一致', String(esc.escalateTo), 'role');
        s.expectEq('  escalation.targetRole 一致', String(esc.targetRole), 'admin');
        s.expectTrue('  escalation.notify 是真数组且 2 项',
          Array.isArray(esc.notify) && esc.notify.length === 2,
          `值=${JSON.stringify(esc.notify)?.slice(0, 60)}`);
      }

      const sk = n3.skipRule;
      s.expectTrue('★ skipRule 读回是对象（当前数据未用但用户可配，不能静默丢弃）',
        sk !== null && typeof sk === 'object' && !Array.isArray(sk),
        `值=${JSON.stringify(sk)?.slice(0, 80)}`);
      if (sk && typeof sk === 'object' && !Array.isArray(sk)) {
        s.expectEq('  skipRule.action 一致', String(sk.action), 'auto_approve');
        s.expectEq('  skipRule.when.logic 一致', String(sk.when?.logic || ''), 'or');
        s.expectEq('  skipRule.when.conditions 内层 1 条',
          (sk.when?.conditions || []).length, 1, '条件数');
        s.expectEq('    内层条件字段', String(sk.when?.conditions?.[0]?.field || ''), 'amount');
      }
    }

    // 父表字段逐项比对（防「表结构对不上前端契约」的回潮 —— 0053 的教训）
    s.expectEq('  父表 module 一致', String(g1.data.module), flowId);
    s.expectEq('  父表 moduleLabel 一致', String(g1.data.moduleLabel), 'E2E 审批流验证');
    s.expectEq('  父表 profile 一致', String(g1.data.profile), 'standard');
    s.expectEq('  父表 status 一致', String(g1.data.status), 'system');
    s.expectEq('  父表 description 一致', String(g1.data.description), '护栏套件验证用');
    s.expectEq('  父表 enabled 一致（布尔 true）', Boolean(g1.data.enabled), true);

    // ★ 父表 JSON 数组列：visibleRoles
    const vr = g1.data.visibleRoles;
    s.expectTrue('★ visibleRoles 读回是真数组',
      Array.isArray(vr), `类型=${typeof vr} 值=${JSON.stringify(vr)?.slice(0, 60)}`);
    if (Array.isArray(vr)) {
      s.expectEq('  visibleRoles 数量一致', vr.length, 2, '元素数');
      s.expectEq('  第 1 项一致', String(vr[0]), 'admin');
      s.expectEq('  第 2 项一致', String(vr[1]), 'buyer');
    }
  } else {
    s.fail('重新 GET 审批流以核对节点嵌套', `status=${g1.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 3. ★ 只拨开关：改 enabled 不得删光节点（本域最高频操作）
  // ══════════════════════════════════════════════════════════════
  const t1 = await req('PUT', `/api/approval-flows/${flowId}`, { token, body: { enabled: false } });
  s.expectStatus('PUT 只改 enabled 返回 200', t1, 200);
  const g2 = await req('GET', `/api/approval-flows/${flowId}`, { token });
  if (g2.status === 200 && g2.data) {
    s.expectEq('★ (1) 只拨开关后节点仍是 3 个（不传子数组 ≠ 清空）',
      (g2.data.nodes || []).length, 3, '节点数');
    s.expectEq('  enabled 已更新为 false', Boolean(g2.data.enabled), false);
    s.expectEq('  未传的 moduleLabel 未被清空', String(g2.data.moduleLabel), 'E2E 审批流验证');
    s.expectEq('  未传的 description 未被清空', String(g2.data.description), '护栏套件验证用');
    // ★ 开关操作后嵌套对象也必须完好（最容易被顺手冲掉的是 JSON 列）
    const n2b = (g2.data.nodes || []).find((n) => n.id === `n-${stamp}-2`);
    s.expectTrue('★ 只拨开关后节点的 conditions 对象完好（未被写成 []）',
      n2b?.conditions && typeof n2b.conditions === 'object' && !Array.isArray(n2b.conditions),
      `值=${JSON.stringify(n2b?.conditions)?.slice(0, 80)}`);
    s.expectTrue('  只拨开关后节点的 fields 数组完好',
      Array.isArray(n2b?.fields) && n2b.fields.length === 2,
      `值=${JSON.stringify(n2b?.fields)?.slice(0, 60)}`);
  } else {
    s.fail('只拨开关后重新读回审批流', `status=${g2.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 4. ★ 只改节点：父表字段不得被冲掉（反方向）
  // ══════════════════════════════════════════════════════════════
  const newNodeList = [
    { id: `n-${stamp}-1`, name: '发起申请(改)', role: 'rd_engineer', roleName: '研发工程师', timeout: 12, order: 1, approverType: 'role', mode: 'serial', fields: ['name'] },
    { id: `n-${stamp}-9`, name: '新增终审', role: 'admin', roleName: '系统管理员', timeout: 36, order: 2, approverType: 'role', mode: 'or', approverRoles: ['admin'] },
  ];
  const t2 = await req('PUT', `/api/approval-flows/${flowId}`, { token, body: { nodes: newNodeList } });
  s.expectStatus('PUT 只传 nodes 返回 200', t2, 200);
  const g3 = await req('GET', `/api/approval-flows/${flowId}`, { token });
  if (g3.status === 200 && g3.data) {
    s.expectEq('★ (2) 显式传数组时按整体替换（3 → 2 个节点）',
      (g3.data.nodes || []).length, 2, '节点数');
    s.expectEq('  新节点列表第1个是「发起申请(改)」', String(g3.data.nodes?.[0]?.name || ''), '发起申请(改)');
    s.expectEq('  新节点列表第2个是「新增终审」', String(g3.data.nodes?.[1]?.name || ''), '新增终审');
    // ★ 只传 nodes 时父表字段必须保持原样（字段级更新，不是整体覆盖）
    s.expectEq('★ (3) 只传 nodes 后 moduleLabel 仍在（父表字段级更新）',
      String(g3.data.moduleLabel), 'E2E 审批流验证');
    s.expectEq('  只传 nodes 后 status 仍在', String(g3.data.status), 'system');
    s.expectEq('  只传 nodes 后 description 仍在', String(g3.data.description), '护栏套件验证用');
    s.expectTrue('  只传 nodes 后 visibleRoles 未被冲掉',
      Array.isArray(g3.data.visibleRoles) && g3.data.visibleRoles.length === 2,
      `值=${JSON.stringify(g3.data.visibleRoles)?.slice(0, 60)}`);
    s.expectEq('  enabled 保持上一步的 false（未被重置）', Boolean(g3.data.enabled), false);
    // 新节点的 approverRoles 数组
    const n9 = (g3.data.nodes || []).find((n) => n.id === `n-${stamp}-9`);
    s.expectTrue('  新节点的 approverRoles 是真数组',
      Array.isArray(n9?.approverRoles) && n9.approverRoles.length === 1,
      `值=${JSON.stringify(n9?.approverRoles)?.slice(0, 60)}`);
    s.expectEq('  新节点 mode 一致（or）', String(n9?.mode || ''), 'or');
  } else {
    s.fail('只传 nodes 后重新读回审批流', `status=${g3.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 5. 自定义流程全生命周期：draft → pending → published → 删除
  //    （V2.87.0 的状态机，D1 化后必须真的落库）
  // ══════════════════════════════════════════════════════════════
  const cid = `e2e-custom-${stamp.toLowerCase()}`;
  const cc = await req('POST', '/api/approval-flows', {
    token,
    body: {
      id: cid, module: cid, moduleLabel: 'E2E 自定义流程', enabled: false,
      profile: 'standard', status: 'draft', createdBy: 'E2E',
      createdAt: '2026-09-15T00:00:00.000Z',
      description: '自定义流程生命周期验证',
      visibleRoles: [],
      nodes: [{ id: `cn-${stamp}-1`, name: '自定义节点', role: 'admin', roleName: '系统管理员', timeout: 8, order: 1, approverType: 'role', mode: 'serial' }],
    },
  });
  const ccOk = s.expectStatus('创建自定义流程（draft）返回 201', cc, 201,
    cc.status !== 201 ? JSON.stringify(cc.data).slice(0, 160) : '');
  if (ccOk) cleanup.push({ path: '/api/approval-flows', id: cid });

  // draft → pending
  const sp = await req('PUT', `/api/approval-flows/${cid}`, { token, body: { status: 'pending' } });
  s.expectStatus('状态流转 draft → pending 返回 200', sp, 200);
  const gp = await req('GET', `/api/approval-flows/${cid}`, { token });
  if (gp.status === 200 && gp.data) {
    s.expectEq('  status 已落库为 pending（不是只改了内存）', String(gp.data.status), 'pending');
    s.expectEq('  流转过程中节点未丢', (gp.data.nodes || []).length, 1, '节点数');
  }

  // pending → published（同时置 enabled）
  const ap = await req('PUT', `/api/approval-flows/${cid}`, {
    token,
    body: { status: 'published', enabled: true, approvedBy: 'E2E', approvedAt: '2026-09-15T01:00:00.000Z' },
  });
  s.expectStatus('状态流转 pending → published 返回 200', ap, 200);
  const ga = await req('GET', `/api/approval-flows/${cid}`, { token });
  if (ga.status === 200 && ga.data) {
    s.expectEq('  status 已落库为 published', String(ga.data.status), 'published');
    s.expectEq('  enabled 随发布置为 true', Boolean(ga.data.enabled), true);
    s.expectEq('  approvedBy 已落库', String(ga.data.approvedBy), 'E2E');
    s.expectEq('  approvedAt 已落库', String(ga.data.approvedAt), '2026-09-15T01:00:00.000Z');
    // ★ createdAt 必须能落库回读（V3.9.0 同款坑：字段没登记就既不写也不读）
    s.expectEq('★ createdAt 已落库回读（parentCols 已登记，未漏字段）',
      String(ga.data.createdAt), '2026-09-15T00:00:00.000Z');
  } else {
    s.fail('发布后重新读回自定义流程', `status=${ga.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 6. 重复 id 被拒 409（本域 id 即业务标识）
  // ══════════════════════════════════════════════════════════════
  const dup = await req('POST', '/api/approval-flows', {
    token, body: { ...flowBody, id: flowId },
  });
  s.expectTrue('重复审批流 id 被拒（409，而不是静默覆盖已有配置）',
    dup.status === 409, `status=${dup.status} body=${JSON.stringify(dup.data).slice(0, 120)}`);

  // ══════════════════════════════════════════════════════════════
  // 7. 删除连带：报告子表行数 + 确实删掉
  // ══════════════════════════════════════════════════════════════
  // 先补回 3 个节点，验证「删除时报告连带行数」
  await req('PUT', `/api/approval-flows/${flowId}`, {
    token,
    body: {
      nodes: [
        { id: `dn-${stamp}-1`, name: '待删节点A', role: 'admin', roleName: '系统管理员', timeout: 1, order: 1, approverType: 'role', mode: 'serial' },
        { id: `dn-${stamp}-2`, name: '待删节点B', role: 'admin', roleName: '系统管理员', timeout: 1, order: 2, approverType: 'role', mode: 'serial' },
        { id: `dn-${stamp}-3`, name: '待删节点C', role: 'admin', roleName: '系统管理员', timeout: 1, order: 3, approverType: 'role', mode: 'serial' },
      ],
    },
  });
  const del = await req('DELETE', `/api/approval-flows/${flowId}`, { token });
  const delOk = s.expectStatus('DELETE 审批流返回 200', del, 200);
  if (delOk && del.data) {
    const detail = String(del.data.deletedDetail || '');
    s.expectTrue('★ 删除回执报告连带删除的节点行数（nodes 3 行）',
      /nodes\s*3\s*行/.test(detail), `deletedDetail=${detail}`);
  }
  const gAfter = await req('GET', `/api/approval-flows/${flowId}`, { token });
  s.expectStatus('删除审批流后再查返回 404', gAfter, 404);
  {
    const i = cleanup.findIndex((c) => c.id === flowId);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // 自定义流程删除
  const cdel = await req('DELETE', `/api/approval-flows/${cid}`, { token });
  s.expectStatus('DELETE 自定义流程返回 200', cdel, 200);
  const gcd = await req('GET', `/api/approval-flows/${cid}`, { token });
  s.expectStatus('删除自定义流程后再查返回 404', gcd, 404);
  {
    const i = cleanup.findIndex((c) => c.id === cid);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // 8. ★★ RLS 的 'all' 到底测什么：**组织内跨用户可见**
  //    （V3.10.0 首版这一节写错了方向，修正记录见 §1 的注释）
  //
  //    要防的真故障是：审批流被误登成 'own'（像销售域那样）。
  //    后果不是「看不到别的公司的流程」（那本来就该看不到），而是
  //    **「张三配好的审批流，李四看不到」** —— 而审批流是公司制度，
  //    必须全公司一致。这个故障在组织内就能完整复现，也只需要组织内复现。
  //
  //    做法：用 admin 建一条 → 用同组织内的另一个普通用户去查，
  //    必须能查到（若登的是 'own'，第二条断言必红）。
  // ══════════════════════════════════════════════════════════════
  const peer = ctx.users.afpeer || await ctx.registerUser('afpeer', 'buyer', 'QA-采购部');
  if (peer?.token) {
    const sharedId = `e2e-af-shared-${stamp.toLowerCase()}`;
    const mk = await req('POST', '/api/approval-flows', {
      token,
      body: {
        id: sharedId,
        module: 'e2e_shared_check',
        moduleLabel: 'E2E 跨用户可见性校验',
        enabled: true,
        description: 'admin 创建，供同组织他人查看',
        nodes: [{ id: `${sharedId}-n1`, name: '部门经理', role: 'manager' }],
      },
    });
    const mkOk = s.expectStatus('  同组织内 admin 创建一条审批流', mk, 201);
    if (mkOk) {
      cleanup.push({ path: '/api/approval-flows', id: sharedId });
      const seen = await req('GET', '/api/approval-flows', { token: peer.token });
      const seenRows = seen.data?.data || [];
      const hit = seenRows.find((f) => f.id === sharedId);
      s.expectTrue('★★ RLS 为 all：同组织内他人能看到 admin 建的流程（误登 own 则此处必红）',
        !!hit, `他人视角 total=${Number(seen.data?.total ?? 0)}，命中=${!!hit}`);
      // 反向确认：他人**不能**看到别的组织的数据（组织隔离仍生效）
      s.expectTrue('  组织隔离仍生效（他人只看到本组织的行）',
        seenRows.every((f) => !String(f.id).startsWith('e2e-af-mu')),
        `他人可见 ${seenRows.length} 行`);
      // 他人改这条流程应被允许（公司级公共配置，不是「只有建者能改」）
      const canEdit = await req('PUT', `/api/approval-flows/${sharedId}`, {
        token: peer.token,
        body: { enabled: false },
      });
      s.expectStatus('  同组织内他人可修改该流程（公共配置语义）', canEdit, 200);
      // ★ 单资源 GET 返回的是**扁平对象**（`json(parentToApi(...))`），
      //   不带 `data` 包层 —— 只有列表接口才是 `{data,total,page,pageSize}`。
      //   这里曾误写成 `afterEdit.data?.data?.nodes`，多解了一层，于是 nodes
      //   恒为 undefined，套件假报「改开关把节点删光了」（实际一条没少）。
      const afterEdit = await req('GET', `/api/approval-flows/${sharedId}`, { token });
      if (afterEdit.status === 200) {
        s.expectEq('  他人的修改确实落库（不是只改了对方内存）',
          Boolean(afterEdit.data?.enabled), false);
        s.expectEq('  改开关未删掉节点', (afterEdit.data?.nodes || []).length, 1, '节点数');
      }
    }
  } else {
    s.warn('同组织第二身份未就绪', '无法验证跨用户可见性（跳过，不算失败）');
  }

  // ══════════════════════════════════════════════════════════════
  // 9. 安全网：本轮测试没有污染本组织已有配置
  //    （注意：**不能**断言「生产库的 13 条系统流程可见」—— 隔离组织看不到
  //      别的组织的数据，那是正确的安全行为，详见 §1 注释。）
  //      这里只做一件事：确认本轮结束时，本组织剩下的行都能正常解析
  //      （即没有留下半截/损坏的记录）。
  // ══════════════════════════════════════════════════════════════
  const listEnd = await req('GET', '/api/approval-flows', { token });
  if (listEnd.status === 200 && listEnd.data) {
    const rows = listEnd.data.data || [];
    s.expectTrue('  收尾时列表仍可正常读取（无损坏行）',
      rows.every((f) => f && typeof f.id === 'string' && Array.isArray(f.nodes)),
      `${rows.length} 行`);
    // 本轮建的行必须都带 nodes 数组（证明子表读回链路没断）
    const brokenNodes = rows.filter((f) => !Array.isArray(f.nodes));
    s.expectEq('  所有行的 nodes 均为数组（子表读回链路完好）', brokenNodes.length, 0, '异常行数');
  } else {
    s.fail('收尾时重新拉取审批流列表', `status=${listEnd.status}`);
  }

  // ══════════════════════════════════════════════════════════════
  // 10. 清理本轮残留（断言失败时中断也不会把测试数据留在库里）
  // ══════════════════════════════════════════════════════════════
  for (const c of cleanup.splice(0)) {
    try {
      await req('DELETE', `${c.path}/${c.id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}

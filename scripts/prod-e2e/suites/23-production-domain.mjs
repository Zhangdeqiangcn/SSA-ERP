// 套件 23 · 生产域关系化护栏（V3.12.0 C1 数据关系化第七个域）
//
// ── ★ 本域与前面六个域最大的不同：它是「半迁移」状态 ────────────────
// `useProductionStore` 的三个切片里，**workOrders 早在 V2.75.x 就直连 D1**
// （表 work_orders）。真正本轮迁的是另外两个：
//   · processRoutes      —— 带 operations[]（每行还带 skills[]）→ /api/process-routes
//   · mrpRecommendations —— 平表                                → /api/entities/mrpRecommendation
// **同一个 store 的两个切片走两条不同通道** —— 判据是「有没有嵌套」，
// 不是「属不属于同一个域」。本套件对两条通道**分别**设护栏。
//
// ── 这个套件防的是什么回潮 ────────────────────────────────────────
//  ① **operations 嵌套被静默丢弃**（本域最痛的一种）
//     通用路由 pickSnake 只挑登记过的列，嵌套数组不写、不报错、返回 201。
//     表现：工艺路线建成功了，进去一看工序一栏是空的 ——
//     而工艺路线的全部价值就在于工序，等于建了一条空壳。
//
//  ② **skills 的 JSON 编解码错**
//     Operation.skills 是字符串数组，落在子表 TEXT 列。
//     漏了任一方向的编解码会得到「读回是字符串」或「写进去变成 [object]」。
//     → 断言读回是**真数组**（Array.isArray）且内容逐项一致。
//
//  ③ **「不传 operations = 保持原样」被写成「不传 = 清空」**
//     工艺路线最高频的非明细操作是**升版 / 作废**（PUT {status:'obsolete'}）。
//     若语义写反，一次作废就把这条路线全部工序删光，而界面提示保存成功；
//     等下次开工单选它时才发现是空的 —— 那时已无法判断是被删还是本来就没配。
//     → 本套件连续做 3 次「只改父表字段」的 PUT，最后工序必须仍是 3 行。
//
//  ④ **同组织内跨身份不可见（RLS 漏登记 / 误登 'own'）**
//     本域三张表全取 'all'（工艺路线是公司级制造标准、MRP 建议是中央计划输出）。
//     误登 'own' 的表现是「列表少几行、零报错」——
//     工单创建时工艺路线下拉框少几项，谁也不会想到是权限问题。
//     → 用**同组织内两个身份**互看（与采购域 4.7 节同款）。
//
//  ⑤ **业务单号唯一约束没真建上**
//     0058 采购域就漏了它，导致「同一单号能建出第二条」（不报错）。
//     本轮 0061 在建表时就建了 uniq_process_routes_no。
//     → 断言重复 routeNo 返回 409；**且必须在原记录还活着时测**（4.8 节时序坑）。
//
// 为什么断言要「POST 之后必须再 GET 一次」：
//   POST 的回执可能只是把请求体原样回显，证明不了真的落到了 D1。
export const meta = {
  id: '23-production-domain',
  title: '生产域关系化护栏（工序嵌套往返 + skills JSON 往返 + 不传子数组不清空 + 单号唯一 + 平表/父子表双通道）',
};

const cleanup = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).toUpperCase();

  // ══════════════════════════════════════════════════════════════
  // 1. 端点可达性与鉴权（漏登记 RLS 会返回空表甚至报错；未登录必须 401）
  // ══════════════════════════════════════════════════════════════
  const prList = await req('GET', '/api/process-routes', { token });
  const prListOk = s.expectStatus('GET /api/process-routes 返回 200（process_routes RLS 已登记）', prList, 200,
    prList.status === 200 ? `total=${prList.data?.total}` : JSON.stringify(prList.data).slice(0, 120));
  if (prListOk) s.expectListShape('  └ 工艺路线列表契约 {data,total,page,pageSize}', prList);

  const mrList = await req('GET', '/api/entities/mrpRecommendation', { token });
  const mrListOk = s.expectStatus('GET /api/entities/mrpRecommendation 返回 200（mrp_recommendations RLS 已登记）', mrList, 200,
    mrList.status === 200 ? `total=${mrList.data?.total}` : JSON.stringify(mrList.data).slice(0, 120));
  if (mrListOk) s.expectListShape('  └ MRP 建议列表契约 {data,total,page,pageSize}', mrList);

  const anon1 = await req('GET', '/api/process-routes');
  s.expectStatus('未登录访问工艺路线被拒 401', anon1, 401);
  const anon2 = await req('GET', '/api/entities/mrpRecommendation');
  s.expectStatus('未登录访问 MRP 建议被拒 401', anon2, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. ★ 工艺路线：operations 嵌套（前端自带 id）+ 行内 skills JSON 数组
  // ══════════════════════════════════════════════════════════════
  const routeNo = `RT-E2E-${stamp}`;
  const operations = [
    {
      id: `op-${stamp}-1`, sequence: 10, operationCode: 'OP-CUT', operationName: '下料切割',
      workCenter: '数控切割区', setupTime: 30, runTime: 45, waitTime: 2,
      description: '按图纸尺寸进行钢板切割', skills: ['数控操作', '图纸识读'],
    },
    {
      id: `op-${stamp}-2`, sequence: 20, operationCode: 'OP-WELD', operationName: '组焊',
      workCenter: '焊接车间', setupTime: 60, runTime: 120, waitTime: 4,
      description: '按焊接工艺规程组立焊接', skills: ['焊接', '焊接工艺', '焊缝检验'],
    },
    {
      id: `op-${stamp}-3`, sequence: 30, operationCode: 'OP-INSP', operationName: '成品检验',
      workCenter: '检验区', setupTime: 10, runTime: 30, waitTime: 1,
      description: '按FQC标准检验', skills: ['质检'],
    },
  ];
  const routeId = `rt-e2e-${stamp}`;
  const routeBody = {
    id: routeId,
    routeNo,
    name: 'E2E 钢结构焊接架加工工艺路线',
    productCode: 'PRD-E2E-001',
    productName: 'E2E 重型钢结构焊接架 H1200',
    version: 'V1.0',
    status: 'draft',
    totalLeadTime: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'E2E',
    updatedBy: 'E2E',
    operations,
  };

  const pc = await req('POST', '/api/process-routes', { token, body: routeBody });
  const pcOk = s.expectStatus('★ 创建带 3 道工序的工艺路线返回 201', pc, 201,
    pc.status !== 201 ? JSON.stringify(pc.data).slice(0, 220) : '');
  if (pcOk) cleanup.push({ path: '/api/process-routes', id: routeId });
  if (pcOk && pc.data) {
    s.expectEq('★ 创建回执：工序 3 行（嵌套未被静默丢弃）',
      (pc.data.operations || []).length, 3, 'operations 行数');
  }

  // ★ 必须重新 GET：证明真的落到了 D1，不是回显请求体
  const pg = await req('GET', `/api/process-routes/${routeId}`, { token });
  const pgOk = s.expectStatus('GET 工艺路线单条返回 200', pg, 200);
  if (pgOk && pg.data) {
    const got = pg.data.operations || [];
    s.expectEq('★ 从 D1 读回仍是 3 道工序（写入未丢行）', got.length, 3, 'operations 行数');
    s.expectTrue('★ 工序 id 保留为前端提供的 id（Operation 自带 id，非后端重新生成）',
      got.every((o) => String(o.id).startsWith(`op-${stamp}-`)),
      `ids=${got.map((o) => o.id).join(',')}`);

    // 顺序：按 seq（插入顺序），不是按 sequence 数值重排
    s.expectEq('★ 工序按写入顺序返回（seq 升序，与数组下标一致）',
      got.map((o) => Number(o.sequence)).join(','), '10,20,30', 'sequence 序列');

    const w = got.find((o) => o.operationCode === 'OP-WELD');
    if (w) {
      s.expectEq('  第 2 道工序名一致', String(w.operationName), '组焊');
      s.expectEq('  第 2 道工作中心一致', String(w.workCenter), '焊接车间');
      s.expectEq('  第 2 道准备时间一致', Number(w.setupTime), 60);
      s.expectEq('  第 2 道运行时间一致', Number(w.runTime), 120);
      s.expectEq('  第 2 道等待时间一致', Number(w.waitTime), 4);
      s.expectEq('  第 2 道工序说明一致', String(w.description), '按焊接工艺规程组立焊接');
      // ★★ skills JSON 往返：必须是真数组、且内容逐项一致
      s.expectTrue('★★ skills 读回是**真数组**（JSON 文本列编解码正确，不是字符串）',
        Array.isArray(w.skills), `typeof=${typeof w.skills} value=${JSON.stringify(w.skills)}`);
      s.expectEq('★★ skills 内容逐项一致（3 项未被压成 [] 或拼成逗号串）',
        Array.isArray(w.skills) ? w.skills.join('|') : String(w.skills),
        '焊接|焊接工艺|焊缝检验', 'skills');
    } else {
      s.fail('  OP-WELD 工序读回', '未找到该工序行');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 3. ★★ 「不传 operations」≠「清空」：连续 3 次只改父表字段
  //    （对应真实操作：草稿→发布→升版→作废）
  // ══════════════════════════════════════════════════════════════
  for (const [label, patch] of [
    ['发布（status）', { status: 'active' }],
    ['升版（version + 提前期）', { version: 'V1.1', totalLeadTime: 30 }],
    ['改名（name）', { name: 'E2E 钢结构焊接架加工工艺路线（改名）' }],
  ]) {
    const r = await req('PUT', `/api/process-routes/${routeId}`, { token, body: patch });
    const ok = s.expectStatus(`★ 只改${label}返回 200`, r, 200,
      r.status !== 200 ? JSON.stringify(r.data).slice(0, 160) : '');
    if (!ok) continue;
    const back = await req('GET', `/api/process-routes/${routeId}`, { token });
    const n = (back.data?.operations || []).length;
    s.expectEq(`★ 只改${label}后工序仍是 3 行（不传子数组 ≠ 清空）`, n, 3, 'operations 行数');
  }
  const afterPuts = await req('GET', `/api/process-routes/${routeId}`, { token });
  s.expectEq('★ 连续 3 次只改父表字段后，父表字段确实都改了（name/version/status/leadTime）',
    [afterPuts.data?.name?.includes('改名'), afterPuts.data?.version, afterPuts.data?.status, Number(afterPuts.data?.totalLeadTime)].join(','),
    'true,V1.1,active,30', 'name含改名/version/status/totalLeadTime');

  // ══════════════════════════════════════════════════════════════
  // 4. ★ 同组织内跨身份可见（RLS = 'all'，不是 'own'）
  // ══════════════════════════════════════════════════════════════
  const peer = ctx.users.prpeer || await ctx.registerUser('prpeer', 'buyer', 'QA-生产部');
  if (peer?.token) {
    const seen = await req('GET', `/api/process-routes/${routeId}`, { token: peer.token });
    s.expectStatus('★★ 同事能读到 admin 建的工艺路线 200（RLS=all 生效，误登 own 会 404）', seen, 200,
      `status=${seen.status}`);
    if (seen.status === 200) {
      s.expectEq('  └ 同事读到的工序行数同样是 3（子表随父表可见）',
        (seen.data?.operations || []).length, 3, 'operations 行数');
    }
    const peerList = await req('GET', '/api/process-routes', { token: peer.token });
    if (peerList.status === 200) {
      s.expectTrue('  └ 同事的列表里能找到这条路线',
        (peerList.data?.data || []).some((r) => r.id === routeId),
        `total=${peerList.data?.total}`);
    }
  } else {
    s.warn('同组织第二身份不可用（注册审批链路未通过）', '跳过跨身份可见性断言');
  }

  // ══════════════════════════════════════════════════════════════
  // 5. ★ 业务单号唯一约束（0061 已建 uniq_process_routes_no）
  //    ★★ 时序：必须在原记录**还活着**的时候测重复（README 4.8）
  // ══════════════════════════════════════════════════════════════
  const dup = await req('POST', '/api/process-routes', {
    token, body: { ...routeBody, id: `${routeId}-dup`, operations: [] },
  });
  s.expectTrue('★ 重复 routeNo 被拒（409 而非静默建第二条）',
    dup.status === 409, `status=${dup.status} body=${JSON.stringify(dup.data).slice(0, 120)}`);
  if (dup.status === 201) cleanup.push({ path: '/api/process-routes', id: `${routeId}-dup` });

  // ══════════════════════════════════════════════════════════════
  // 6. ★ 传 operations: [] = 清空（合法操作，与「不传」语义相反）
  // ══════════════════════════════════════════════════════════════
  const clr = await req('PUT', `/api/process-routes/${routeId}`, { token, body: { operations: [] } });
  const clrOk = s.expectStatus('★ 显式传 operations:[] 返回 200（清空是合法操作）', clr, 200,
    clr.status !== 200 ? JSON.stringify(clr.data).slice(0, 160) : '');
  if (clrOk) {
    const after = await req('GET', `/api/process-routes/${routeId}`, { token });
    s.expectEq('★ 传空数组后工序确实被清空（0 行）',
      (after.data?.operations || []).length, 0, 'operations 行数');
  }

  // ══════════════════════════════════════════════════════════════
  // 7. 删除：连带清理工序 + 回执报告行数 + 删后 404
  // ══════════════════════════════════════════════════════════════
  // 先补回 2 道工序，才能验证「连带删除」不是因为本来就是空的
  await req('PUT', `/api/process-routes/${routeId}`, {
    token, body: { operations: operations.slice(0, 2) },
  });
  const beforeDel = await req('GET', `/api/process-routes/${routeId}`, { token });
  s.expectEq('删除前先补回 2 道工序（否则「连带删除 0 行」证明不了任何事）',
    (beforeDel.data?.operations || []).length, 2, 'operations 行数');

  const del = await req('DELETE', `/api/process-routes/${routeId}`, { token });
  const delOk = s.expectStatus('DELETE 工艺路线返回 200', del, 200,
    del.status !== 200 ? JSON.stringify(del.data).slice(0, 160) : '');
  if (delOk && del.data) {
    s.expectTrue('★ 删除回执报告连带删除的工序行数（中文摘要含 operations N 行）',
      /operations\s*2\s*行/.test(String(del.data.deletedDetail || '')),
      `deletedDetail=${del.data.deletedDetail}`);
    s.expectEq('  └ deletedChildren（单子表时代的兼容字段）报告 2',
      Number(del.data.deletedChildren), 2, 'deletedChildren');
  }
  const afterDel = await req('GET', `/api/process-routes/${routeId}`, { token });
  s.expectStatus('删除工艺路线后再查返回 404', afterDel, 404);
  {
    const i = cleanup.findIndex((c) => c.id === routeId);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // 反向验证时序（README 4.8 配套）：删掉之后同一单号可以再次使用
  const reuse = await req('POST', '/api/process-routes', {
    token, body: { ...routeBody, id: `${routeId}-reuse`, operations: [] },
  });
  s.expectStatus('★ 原路线删除后同一 routeNo 可再次使用（约束只在存在时生效 → 时序正确）', reuse, 201,
    reuse.status !== 201 ? JSON.stringify(reuse.data).slice(0, 160) : '');
  if (reuse.status === 201) cleanup.push({ path: '/api/process-routes', id: `${routeId}-reuse` });

  // ══════════════════════════════════════════════════════════════
  // 8. ★ MRP 建议：平表走通用实体路由（本域第二条通道）
  //    防的是「13 个标量字段被 pickSnake 静默丢掉」——
  //    列没登记 → 写入成功 201、读回来字段全空。
  // ══════════════════════════════════════════════════════════════
  const mrpId = `mrp-e2e-${stamp}`;
  const mrpBody = {
    id: mrpId,
    materialCode: 'M-E2E-MRP-001',
    materialName: 'E2E 热轧钢板 Q235B 3mm',
    currentStock: 8,
    safetyStock: 10,
    requiredQuantity: 20,
    onOrderQuantity: 0,
    suggestedQuantity: 22,
    unit: '张',
    suggestedDate: '2026-10-18',
    reason: '当前库存低于安全库存，且工单 WO-E2E-001 需求 20 张',
    type: 'purchase',
    priority: 'urgent',
  };
  const mc = await req('POST', '/api/entities/mrpRecommendation', { token, body: mrpBody });
  const mcOk = s.expectStatus('★ 创建 MRP 建议返回 201（通用实体路由已登记该资源）', mc, 201,
    mc.status !== 201 ? JSON.stringify(mc.data).slice(0, 200) : '');
  if (mcOk) cleanup.push({ path: '/api/entities/mrpRecommendation', id: mrpId });

  const mg = await req('GET', `/api/entities/mrpRecommendation/${mrpId}`, { token });
  const mgOk = s.expectStatus('GET MRP 建议单条返回 200', mg, 200);
  if (mgOk && mg.data) {
    const g = mg.data;
    // ★ 13 个契约字段逐个读回 —— 平表最怕的就是「某一列没登记 → 静默丢失」
    for (const [camel, want] of [
      ['materialCode', 'M-E2E-MRP-001'], ['materialName', 'E2E 热轧钢板 Q235B 3mm'],
      ['currentStock', 8], ['safetyStock', 10], ['requiredQuantity', 20],
      ['onOrderQuantity', 0], ['suggestedQuantity', 22], ['unit', '张'],
      ['suggestedDate', '2026-10-18'], ['type', 'purchase'], ['priority', 'urgent'],
    ]) {
      const got = typeof want === 'number' ? Number(g[camel]) : String(g[camel]);
      s.expectEq(`★ MRP 字段 ${camel} 读回一致（未被 pickSnake 静默丢弃）`, got, want, camel);
    }
    s.expectTrue('★ MRP 建议理由（长文本）读回非空',
      String(g.reason || '').includes('WO-E2E-001'), `reason=${g.reason}`);
  }

  // 平表的更新与删除
  const mu = await req('PUT', `/api/entities/mrpRecommendation/${mrpId}`, {
    token, body: { suggestedQuantity: 33, priority: 'high' },
  });
  s.expectStatus('PUT MRP 建议返回 200', mu, 200,
    mu.status !== 200 ? JSON.stringify(mu.data).slice(0, 160) : '');
  const mu2 = await req('GET', `/api/entities/mrpRecommendation/${mrpId}`, { token });
  s.expectEq('★ MRP 更新后读回生效（建议量 22→33）', Number(mu2.data?.suggestedQuantity), 33, 'suggestedQuantity');

  const md = await req('DELETE', `/api/entities/mrpRecommendation/${mrpId}`, { token });
  s.expectStatus('DELETE MRP 建议返回 200', md, 200,
    md.status !== 200 ? JSON.stringify(md.data).slice(0, 160) : '');
  const md2 = await req('GET', `/api/entities/mrpRecommendation/${mrpId}`, { token });
  s.expectStatus('删除 MRP 建议后再查返回 404', md2, 404);
  {
    const i = cleanup.findIndex((c) => c.id === mrpId);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // 9. 工单（V2.75.x 既有 D1 通道）不被本轮改造打破
  // ══════════════════════════════════════════════════════════════
  const woList = await req('GET', '/api/work-orders', { token });
  const woOk = s.expectStatus('GET /api/work-orders 仍返回 200（既有工单通道未被本轮打破）', woList, 200);
  if (woOk) s.expectListShape('  └ 工单列表契约未变', woList);

  // ══════════════════════════════════════════════════════════════
  // 10. 清理本轮残留（断言失败时中断也不会把测试数据留在生产库）
  //     ★ harness 的 ctx.cleanup() 的 pathOf 不含 process-routes / mrpRecommendation，
  //       本套件内已自行 DELETE，此处兜底剩余项。
  // ══════════════════════════════════════════════════════════════
  for (const c of cleanup.splice(0)) {
    try {
      await req('DELETE', `${c.path}/${c.id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}

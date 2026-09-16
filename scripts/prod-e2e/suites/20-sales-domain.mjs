// 套件 20 · 销售域关系化护栏（V3.9.0 C1 数据关系化第三个域）
//
// ── 这个套件防的是什么回潮 ────────────────────────────────────────
// 销售域是 C1 里**嵌套结构最复杂**的一个域，风险面比财务域（各表 1 个数组）宽：
//   · Prospect  2 个数组：interestProducts: string[]（JSON 列）、followupRecords[]（子表）
//   · Shipment  1 个数组：items: ShipmentItem[]（子表）
//   · Project   3 个数组：team: string[]（JSON 列）、milestones[]、exceptions[]（两个子表）
//
// 四类「搬过去了但静默少了数据」的失败模式，每一种界面上都看不出来：
//
//  ① **子表被静默丢弃**（沿用最凶的一种）
//     通用实体路由 pickSnake 只挑已登记列，嵌套数组不写、不报错、返回 201。
//     → 表现：对象建成功了，进去一看明细/跟进/里程碑一栏是空的。
//     本套件用「写进去 N 行、读回来必须还是 N 行」把这条线钉死。
//
//  ② ★ **多子表下第二、三个数组被丢掉**（本域新增风险）
//     Project 有 milestones 和 exceptions 两个真子表。若实现只处理第一个
//     匹配的数组（或配置只支持单子表），exceptions 会被静默丢弃 ——
//     表现是「项目详情页正常、里程碑按计划显示、进度条正常，但异常列表永远空白」。
//     而项目管理的核心价值恰恰是「异常能被记录并跟踪到闭环」。
//     → 本套件对 milestones 和 exceptions **分别断言 3 行、2 行**，
//       只要有一个数组被吞掉立刻变红。
//
//  ③ **多子表下「只改一个数组」把另一个清空**（本域独有，最隐蔽）
//     项目详情页有多个独立操作入口：拖进度条只传 progress、标记里程碑只传
//     milestones、登记异常只传 exceptions。语义必须是「没出现在请求体里的
//     数组保持原样」。若实现成「只要没传就清空」或者「清空其余子表」，
//     拖一次进度条就会把里程碑和异常全删掉 —— 用户看到的是「保存成功」。
//     → 本套件做**交叉验证**：只传 milestones 后 exceptions 必须还在，
//       只传 exceptions 后 milestones 必须还在。
//
//  ④ **JSON 字符串数组列编码错**
//     team / linkedOrders / interestProducts 在库里是 TEXT（存 `["张","李"]`），
//     接口上是数组。漏了任一方向的编解码会得到：
//     「界面拿到字符串但按数组用」（渲染出 6 个字符而不是 2 个姓名）或
//     「数组被写进 TEXT 存成逗号串」（下次读回退化成单元素数组）。
//     → 本套件断言读回的是**真数组**且元素逐项一致。
//
// 为什么断言要「POST 之后必须再 GET 一次」：
//   POST 的回执可能只是把请求体原样回显，证明不了真的落到了 D1。
//   只有重新 GET 一次（打在数据库上）才能证明写入生效。
export const meta = { id: '20-sales-domain', title: '销售域关系化护栏（多子表嵌套往返 + 交叉不误删 + 字段契约 + JSON 数组列）' };

const cleanup = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36).toUpperCase();

  // ══════════════════════════════════════════════════════════════
  // 1. 端点可达性与鉴权（漏登记 RLS 会返回空表而不是 200；未登录必须 401）
  // ══════════════════════════════════════════════════════════════
  for (const [label, path] of [
    ['意向客户', '/api/sales-prospects'],
    ['发货单', '/api/shipments'],
    ['项目', '/api/projects'],
  ]) {
    const r = await req('GET', path, { token });
    const ok = s.expectStatus(`GET ${path} 返回 200（${label} RLS 已登记）`, r, 200,
      r.status === 200 ? `total=${r.data?.total}` : JSON.stringify(r.data).slice(0, 100));
    if (ok) s.expectListShape(`  └ ${label} 列表契约 {data,total,page,pageSize}`, r);
  }

  const anon1 = await req('GET', '/api/sales-prospects');
  s.expectStatus('未登录访问意向客户被拒 401', anon1, 401);
  const anon2 = await req('GET', '/api/shipments');
  s.expectStatus('未登录访问发货单被拒 401', anon2, 401);
  const anon3 = await req('GET', '/api/projects');
  s.expectStatus('未登录访问项目被拒 401', anon3, 401);

  // ══════════════════════════════════════════════════════════════
  // 2. ★ 意向客户：followupRecords 嵌套数组 + interestProducts JSON 数组列
  // ══════════════════════════════════════════════════════════════
  const prospectNo = `PSP-E2E-${stamp}`;
  const followupRecords = [
    { id: `fu-${stamp}-1`, date: '2026-09-01', method: 'phone', content: '首次电话接触', result: '有意向', nextAction: '寄送样品', followedBy: 'E2E' },
    { id: `fu-${stamp}-2`, date: '2026-09-05', method: 'visit', content: '上门拜访', result: '确认需求', nextAction: '出报价', followedBy: 'E2E' },
    { id: `fu-${stamp}-3`, date: '2026-09-10', method: 'email', content: '发送报价单', result: '待回复', nextAction: '三日后回访', followedBy: 'E2E' },
  ];
  const prospectBody = {
    id: `prospect-e2e-${stamp}`,
    prospectNo,
    companyName: 'E2E 验证科技有限公司',
    contactName: '张工',
    contactPhone: '13800000000',
    contactEmail: 'zhang@e2e.example',
    industry: '机械制造',
    region: '成都',
    source: 'exhibition',
    status: 'negotiating',
    interestProducts: ['伺服电机', '减速机', '控制器'],
    estimatedValue: 260000,
    probability: 60,
    nextFollowupDate: '2026-09-20',
    assignedTo: 'E2E',
    convertedToCustomer: false,
    creditLimit: 100000,
    usedCredit: 25000,
    notes: '护栏套件验证用',
    followupRecords,
  };

  const pc = await req('POST', '/api/sales-prospects', { token, body: prospectBody });
  const pcOk = s.expectStatus('★ 创建带 3 条跟进记录的意向客户返回 201', pc, 201,
    pc.status !== 201 ? JSON.stringify(pc.data).slice(0, 160) : '');
  if (pcOk) cleanup.push({ path: '/api/sales-prospects', id: prospectBody.id });
  if (pcOk && pc.data) {
    s.expectEq('★ 创建回执：跟进记录 3 行（未被静默丢弃）',
      (pc.data.followupRecords || []).length, 3, '跟进行数');
  }

  // ★ 必须重新 GET：证明真的落到了 D1，而不是回显请求体
  const pg = await req('GET', `/api/sales-prospects/${prospectBody.id}`, { token });
  const pgOk = s.expectStatus('GET 意向客户单条返回 200', pg, 200);
  if (pgOk && pg.data) {
    const got = pg.data.followupRecords || [];
    s.expectEq('★ 从 D1 读回仍是 3 条跟进（写入未丢行）', got.length, 3, '跟进行数');
    const second = got.find((f) => f.id === `fu-${stamp}-2`) || got[1];
    if (second) {
      s.expectEq('  跟进方式一致', String(second.method), 'visit');
      s.expectEq('  跟进结果一致', String(second.result), '确认需求');
      s.expectEq('  下一步动作一致', String(second.nextAction), '出报价');
      s.expectEq('  跟进日期一致', String(second.date), '2026-09-05');
    } else {
      s.fail('  第 2 条跟进读回', '未找到 id 为 fu-...-2 的跟进行');
    }

    // ★ JSON 数组列：interestProducts 必须是真数组，逐项一致
    const ip = pg.data.interestProducts;
    s.expectTrue('★ interestProducts 读回是真数组（不是字符串/逗号串）',
      Array.isArray(ip), `类型=${typeof ip} 值=${JSON.stringify(ip)?.slice(0, 60)}`);
    if (Array.isArray(ip)) {
      s.expectEq('  兴趣产品数量一致', ip.length, 3, '元素数');
      s.expectEq('  第 1 项一致', String(ip[0]), '伺服电机');
      s.expectEq('  第 3 项一致', String(ip[2]), '控制器');
    }

    // 父表业务字段逐项比对（防「表结构对不上前端契约」的回潮 —— 0053 的教训）
    s.expectEq('  父表意向编号一致', String(pg.data.prospectNo), prospectNo);
    s.expectEq('  父表公司名一致', String(pg.data.companyName), 'E2E 验证科技有限公司');
    s.expectEq('  父表来源一致', String(pg.data.source), 'exhibition');
    s.expectEq('  父表状态一致', String(pg.data.status), 'negotiating');
    s.expectEq('  父表预估金额一致', Number(pg.data.estimatedValue), 260000);
    s.expectEq('  父表成交概率一致', Number(pg.data.probability), 60);
    s.expectEq('  父表信用额度一致', Number(pg.data.creditLimit), 100000);
    s.expectEq('  父表已用信用一致', Number(pg.data.usedCredit), 25000);
  }

  // ★ 只改状态、不传 followupRecords → 跟进一条都不能少（销售漏斗最常用操作）
  const pu = await req('PUT', `/api/sales-prospects/${prospectBody.id}`, {
    token, body: { status: 'won', probability: 100 },
  });
  s.expectStatus('PUT 只改意向状态返回 200', pu, 200);
  const pg2 = await req('GET', `/api/sales-prospects/${prospectBody.id}`, { token });
  if (pg2.status === 200 && pg2.data) {
    s.expectEq('★ 只改状态后跟进记录仍是 3 条（不传子数组 ≠ 清空）',
      (pg2.data.followupRecords || []).length, 3, '跟进行数');
    s.expectEq('  状态已更新为 won', String(pg2.data.status), 'won');
    s.expectEq('  概率已更新为 100', Number(pg2.data.probability), 100);
    s.expectEq('  未传的公司名未被清空', String(pg2.data.companyName), 'E2E 验证科技有限公司');
    // 只改状态也不能把 JSON 数组列冲掉
    s.expectTrue('  只改状态后 interestProducts 未丢失',
      Array.isArray(pg2.data.interestProducts) && pg2.data.interestProducts.length === 3,
      `值=${JSON.stringify(pg2.data.interestProducts)?.slice(0, 60)}`);
  } else {
    s.fail('只改状态后重新读回意向客户', `status=${pg2.status}`);
  }

  // 显式传 5 条 = 整体替换
  const five = Array.from({ length: 5 }, (_, i) => ({
    id: `fu-new-${stamp}-${i + 1}`, date: '2026-10-01', method: 'meeting',
    content: `重排第${i + 1}次`, result: 'ok', followedBy: 'E2E',
  }));
  const pr = await req('PUT', `/api/sales-prospects/${prospectBody.id}`, { token, body: { followupRecords: five } });
  s.expectStatus('PUT 显式传 5 条跟进返回 200', pr, 200);
  const pg3 = await req('GET', `/api/sales-prospects/${prospectBody.id}`, { token });
  if (pg3.status === 200 && pg3.data) {
    s.expectEq('  显式传数组时按整体替换（5 行）',
      (pg3.data.followupRecords || []).length, 5, '跟进行数');
  }

  // 显式传空数组 = 清空
  const pz = await req('PUT', `/api/sales-prospects/${prospectBody.id}`, { token, body: { followupRecords: [] } });
  s.expectStatus('PUT 传空数组返回 200', pz, 200);
  const pg4 = await req('GET', `/api/sales-prospects/${prospectBody.id}`, { token });
  if (pg4.status === 200 && pg4.data) {
    s.expectEq('  传空数组时清空跟进（0 行）',
      (pg4.data.followupRecords || []).length, 0, '跟进行数');
  }

  // 唯一约束：同组织重复 prospect_no 应 409
  const dupProspect = await req('POST', '/api/sales-prospects', {
    token, body: { ...prospectBody, id: `${prospectBody.id}-dup` },
  });
  s.expectTrue('重复 prospect_no 被拒（409 而非静默建第二条）', dupProspect.status === 409,
    `status=${dupProspect.status}`);

  // ══════════════════════════════════════════════════════════════
  // 3. ★ 发货单：items 嵌套数组往返
  // ══════════════════════════════════════════════════════════════
  const shipmentNo = `SHP-E2E-${stamp}`;
  const shipItems = [
    { id: `si-${stamp}-1`, materialId: 'mat-1', materialCode: 'M-001', materialName: '钢板', specification: 'Q235 10mm', unit: '张', orderQuantity: 100, shipQuantity: 100, unitPrice: 320, amount: 32000 },
    { id: `si-${stamp}-2`, materialId: 'mat-2', materialCode: 'M-002', materialName: '轴承', specification: '6205', unit: '个', orderQuantity: 400, shipQuantity: 400, unitPrice: 18, amount: 7200 },
    { id: `si-${stamp}-3`, materialId: 'mat-3', materialCode: 'M-003', materialName: '电机', specification: '2.2kW', unit: '台', orderQuantity: 10, shipQuantity: 8, unitPrice: 1250, amount: 10000 },
    { id: `si-${stamp}-4`, materialId: 'mat-4', materialCode: 'M-004', materialName: '联轴器', specification: 'L-90', unit: '套', orderQuantity: 20, shipQuantity: 20, unitPrice: 240, amount: 4800 },
  ];
  const shipmentBody = {
    id: `shipment-e2e-${stamp}`,
    shipmentNo,
    salesOrderNo: `SO-E2E-${stamp}`,
    projectNo: `PRJ-E2E-${stamp}`,
    customerName: 'E2E 验证科技有限公司',
    status: 'pending',
    transportMode: 'road',
    carrier: '顺丰物流',
    trackingNo: `SF${stamp}`,
    estimatedPickupDate: '2026-09-18',
    estimatedDeliveryDate: '2026-09-20',
    originAddress: '四川省成都市新都区',
    destinationAddress: '重庆市渝北区',
    driverName: '李师傅',
    driverPhone: '13900000000',
    vehicleNo: '川A88888',
    totalWeight: 1540,
    totalVolume: 3.2,
    packageCount: 6,
    freight: 800,
    insurance: 120,
    notes: '护栏套件验证用',
    items: shipItems,
  };

  const sc = await req('POST', '/api/shipments', { token, body: shipmentBody });
  const scOk = s.expectStatus('★ 创建带 4 条货品明细的发货单返回 201', sc, 201,
    sc.status !== 201 ? JSON.stringify(sc.data).slice(0, 160) : '');
  if (scOk) cleanup.push({ path: '/api/shipments', id: shipmentBody.id });
  if (scOk && sc.data) {
    s.expectEq('★ 创建回执：货品明细 4 行（未被静默丢弃）',
      (sc.data.items || []).length, 4, '明细行数');
  }

  const sg = await req('GET', `/api/shipments/${shipmentBody.id}`, { token });
  const sgOk = s.expectStatus('GET 发货单单条返回 200', sg, 200);
  if (sgOk && sg.data) {
    const got = sg.data.items || [];
    s.expectEq('★ 从 D1 读回仍是 4 行明细（写入未丢行）', got.length, 4, '明细行数');
    const third = got.find((i) => i.materialCode === 'M-003');
    if (third) {
      s.expectEq('  第 3 行物料名一致', String(third.materialName), '电机');
      s.expectEq('  第 3 行发货数量一致', Number(third.shipQuantity), 8);
      s.expectEq('  第 3 行订货数量一致', Number(third.orderQuantity), 10);
      s.expectEq('  第 3 行金额一致', Number(third.amount), 10000);
    } else {
      s.fail('  物料 M-003 明细读回', '未找到该明细行');
    }
    s.expectEq('  父表发货单号一致', String(sg.data.shipmentNo), shipmentNo);
    s.expectEq('  父表运输方式一致', String(sg.data.transportMode), 'road');
    s.expectEq('  父表承运商一致', String(sg.data.carrier), '顺丰物流');
    s.expectEq('  父表件数一致', Number(sg.data.packageCount), 6);
    s.expectEq('  父表运费一致', Number(sg.data.freight), 800);
    s.expectEq('  父表目的地一致', String(sg.data.destinationAddress), '重庆市渝北区');
  }

  // ★ 发货单最频繁的操作：推进状态（不带 items）。这是最典型的静默损坏场景
  const statusChain = ['picked', 'packed', 'shipped', 'in_transit'];
  for (const st of statusChain) {
    const r = await req('PUT', `/api/shipments/${shipmentBody.id}`, { token, body: { status: st } });
    if (st === statusChain[0]) s.expectStatus(`PUT 推进状态为 ${st} 返回 200`, r, 200);
  }
  const sg2 = await req('GET', `/api/shipments/${shipmentBody.id}`, { token });
  if (sg2.status === 200 && sg2.data) {
    s.expectEq('★ 连续推进 4 次状态后明细仍是 4 行（每次都不带 items）',
      (sg2.data.items || []).length, 4, '明细行数');
    s.expectEq('  状态已推进到 in_transit', String(sg2.data.status), 'in_transit');
    s.expectEq('  未传的承运商未被清空', String(sg2.data.carrier), '顺丰物流');
  } else {
    s.fail('推进状态后重新读回发货单', `status=${sg2.status}`);
  }

  // 显式传空数组 = 清空
  const sz = await req('PUT', `/api/shipments/${shipmentBody.id}`, { token, body: { items: [] } });
  s.expectStatus('PUT 传空数组返回 200', sz, 200);
  const sg3 = await req('GET', `/api/shipments/${shipmentBody.id}`, { token });
  if (sg3.status === 200 && sg3.data) {
    s.expectEq('  传空数组时清空明细（0 行）',
      (sg3.data.items || []).length, 0, '明细行数');
  }

  const dupShipment = await req('POST', '/api/shipments', {
    token, body: { ...shipmentBody, id: `${shipmentBody.id}-dup` },
  });
  s.expectTrue('重复 shipment_no 被拒（409）', dupShipment.status === 409,
    `status=${dupShipment.status}`);

  // ══════════════════════════════════════════════════════════════
  // 4. ★★ 项目：多子表（milestones + exceptions）+ JSON 数组列（team / linkedOrders）
  //     这是本域最核心、也是全项目第一次出现「一个父表两个子表」的验证
  // ══════════════════════════════════════════════════════════════
  const projectNo = `PRJ-E2E-${stamp}`;
  const milestones = [
    { id: `ms-${stamp}-1`, name: '方案设计', plannedDate: '2026-09-30', actualDate: '2026-09-28', status: 'completed', description: '完成总体方案', deliverable: '设计方案书' },
    { id: `ms-${stamp}-2`, name: '设备制造', plannedDate: '2026-11-30', status: 'in_progress', description: '零部件加工与装配', deliverable: '整机' },
    { id: `ms-${stamp}-3`, name: '现场安装', plannedDate: '2026-12-31', status: 'pending', description: '客户现场安装调试' },
  ];
  const exceptions = [
    { id: `ex-${stamp}-1`, exceptionNo: `EX-${stamp}-1`, type: 'schedule', severity: 'high', title: '钢材到货延期', description: '供应商交期推迟 10 天', reportedBy: 'E2E', reportedAt: '2026-10-05', status: 'open', impactDescription: '影响制造里程碑' },
    { id: `ex-${stamp}-2`, exceptionNo: `EX-${stamp}-2`, type: 'cost', severity: 'medium', title: '外协费用超预算', description: '外协加工单价上涨 8%', reportedBy: 'E2E', reportedAt: '2026-10-12', status: 'investigating', impactDescription: '成本超支约 3 万' },
  ];
  const projectBody = {
    id: `project-e2e-${stamp}`,
    projectNo,
    projectName: 'E2E 验证智能产线项目',
    customerName: 'E2E 验证科技有限公司',
    customerCode: 'CUS-E2E',
    status: 'in_progress',
    startDate: '2026-09-01',
    endDate: '2027-03-31',
    contractAmount: 1800000,
    receivedAmount: 720000,
    budget: 1500000,
    actualCost: 520000,
    progress: 35,
    manager: '王经理',
    team: ['王经理', '张工', '李工', '赵工'],
    linkedOrders: [`SO-E2E-${stamp}`, `SO-E2E-${stamp}-B`],
    description: '护栏套件验证用',
    notes: '含 4 名团队成员与 2 个关联订单',
    milestones,
    exceptions,
  };

  const jc = await req('POST', '/api/projects', { token, body: projectBody });
  const jcOk = s.expectStatus('★★ 创建带 3 里程碑 + 2 异常的项目返回 201', jc, 201,
    jc.status !== 201 ? JSON.stringify(jc.data).slice(0, 200) : '');
  if (jcOk) cleanup.push({ path: '/api/projects', id: projectBody.id });
  if (jcOk && jc.data) {
    s.expectEq('★★ 创建回执：里程碑 3 行（第一个子表未被丢弃）',
      (jc.data.milestones || []).length, 3, '里程碑行数');
    s.expectEq('★★ 创建回执：异常 2 行（第二个子表也未被丢弃）',
      (jc.data.exceptions || []).length, 2, '异常行数');
  }

  const jg = await req('GET', `/api/projects/${projectBody.id}`, { token });
  const jgOk = s.expectStatus('GET 项目单条返回 200', jg, 200);
  if (jgOk && jg.data) {
    // 子表 1：milestones
    const msGot = jg.data.milestones || [];
    s.expectEq('★★ 从 D1 读回里程碑 3 行', msGot.length, 3, '里程碑行数');
    const ms2 = msGot.find((m) => m.name === '设备制造');
    if (ms2) {
      s.expectEq('  里程碑状态一致', String(ms2.status), 'in_progress');
      s.expectEq('  里程碑计划日期一致', String(ms2.plannedDate), '2026-11-30');
      s.expectEq('  里程碑交付物一致', String(ms2.deliverable), '整机');
    } else {
      s.fail('  里程碑「设备制造」读回', '未找到该里程碑行');
    }

    // 子表 2：exceptions
    const exGot = jg.data.exceptions || [];
    s.expectEq('★★ 从 D1 读回异常 2 行', exGot.length, 2, '异常行数');
    const ex1 = exGot.find((e) => e.exceptionNo === `EX-${stamp}-1`);
    if (ex1) {
      s.expectEq('  异常类型一致', String(ex1.type), 'schedule');
      s.expectEq('  异常严重度一致', String(ex1.severity), 'high');
      s.expectEq('  异常状态一致', String(ex1.status), 'open');
      s.expectEq('  异常报告人一致', String(ex1.reportedBy), 'E2E');
      s.expectEq('  异常影响描述一致', String(ex1.impactDescription), '影响制造里程碑');
    } else {
      s.fail('  异常 EX-...-1 读回', '未找到该异常行');
    }

    // ★ JSON 数组列 ×2
    const team = jg.data.team;
    s.expectTrue('★ team 读回是真数组（不是字符串/逗号串）',
      Array.isArray(team), `类型=${typeof team} 值=${JSON.stringify(team)?.slice(0, 60)}`);
    if (Array.isArray(team)) {
      s.expectEq('  团队成员数量一致', team.length, 4, '元素数');
      s.expectEq('  第 1 名成员一致', String(team[0]), '王经理');
      s.expectEq('  第 4 名成员一致', String(team[3]), '赵工');
    }
    const linked = jg.data.linkedOrders;
    s.expectTrue('★ linkedOrders 读回是真数组', Array.isArray(linked),
      `类型=${typeof linked} 值=${JSON.stringify(linked)?.slice(0, 60)}`);
    if (Array.isArray(linked)) {
      s.expectEq('  关联订单数量一致', linked.length, 2, '元素数');
      s.expectEq('  第 1 个订单号一致', String(linked[0]), `SO-E2E-${stamp}`);
    }

    // 父表业务字段
    s.expectEq('  父表项目编号一致', String(jg.data.projectNo), projectNo);
    s.expectEq('  父表状态一致', String(jg.data.status), 'in_progress');
    s.expectEq('  父表合同金额一致', Number(jg.data.contractAmount), 1800000);
    s.expectEq('  父表已收款一致', Number(jg.data.receivedAmount), 720000);
    s.expectEq('  父表进度一致', Number(jg.data.progress), 35);
    s.expectEq('  父表项目经理一致', String(jg.data.manager), '王经理');
  }

  // ══════════════════════════════════════════════════════════════
  // 4b. ★★ 交叉验证：只改一个子表，另一个子表必须原样保留
  //     这是多子表实现最容易出错的地方（拖进度条把异常全删了）
  // ══════════════════════════════════════════════════════════════

  // (A) 只传 milestones → exceptions 必须还在 2 行
  const onlyMs = [
    { id: `ms-new-${stamp}-1`, name: '重排里程碑一', plannedDate: '2027-01-15', status: 'pending' },
    { id: `ms-new-${stamp}-2`, name: '重排里程碑二', plannedDate: '2027-02-15', status: 'pending' },
  ];
  const jr1 = await req('PUT', `/api/projects/${projectBody.id}`, { token, body: { milestones: onlyMs } });
  s.expectStatus('★★ PUT 只传 milestones 返回 200', jr1, 200);
  const jg2 = await req('GET', `/api/projects/${projectBody.id}`, { token });
  if (jg2.status === 200 && jg2.data) {
    s.expectEq('★★ 只传 milestones 后里程碑已替换为 2 行',
      (jg2.data.milestones || []).length, 2, '里程碑行数');
    s.expectEq('★★ 只传 milestones 后异常仍是 2 行（未被连带清空）',
      (jg2.data.exceptions || []).length, 2, '异常行数');
    s.expectTrue('  只传 milestones 后 team 未丢失',
      Array.isArray(jg2.data.team) && jg2.data.team.length === 4,
      `值=${JSON.stringify(jg2.data.team)?.slice(0, 60)}`);
  } else {
    s.fail('只传 milestones 后重新读回项目', `status=${jg2.status}`);
  }

  // (B) 只传 exceptions → milestones 必须还是 (A) 之后的 2 行
  const onlyEx = [
    { id: `ex-new-${stamp}-1`, exceptionNo: `EX-${stamp}-NEW`, type: 'quality', severity: 'critical', title: '来料检验不合格', description: '批次不合格率 12%', reportedBy: 'E2E', reportedAt: '2026-10-20', status: 'open' },
  ];
  const jr2 = await req('PUT', `/api/projects/${projectBody.id}`, { token, body: { exceptions: onlyEx } });
  s.expectStatus('★★ PUT 只传 exceptions 返回 200', jr2, 200);
  const jg3 = await req('GET', `/api/projects/${projectBody.id}`, { token });
  if (jg3.status === 200 && jg3.data) {
    s.expectEq('★★ 只传 exceptions 后异常已替换为 1 行',
      (jg3.data.exceptions || []).length, 1, '异常行数');
    s.expectEq('★★ 只传 exceptions 后里程碑仍是 2 行（未被连带清空）',
      (jg3.data.milestones || []).length, 2, '里程碑行数');
    const kept = (jg3.data.milestones || [])[0];
    if (kept) s.expectEq('  保留的里程碑名称是 A 步替换后的', String(kept.name), '重排里程碑一');
  } else {
    s.fail('只传 exceptions 后重新读回项目', `status=${jg3.status}`);
  }

  // (C) 只改进度、两个子表都不传 → 两个子表都必须原样
  const jr3 = await req('PUT', `/api/projects/${projectBody.id}`, { token, body: { progress: 68 } });
  s.expectStatus('PUT 只改进度返回 200', jr3, 200);
  const jg4 = await req('GET', `/api/projects/${projectBody.id}`, { token });
  if (jg4.status === 200 && jg4.data) {
    s.expectEq('★★ 只改进度后里程碑仍是 2 行', (jg4.data.milestones || []).length, 2, '里程碑行数');
    s.expectEq('★★ 只改进度后异常仍是 1 行', (jg4.data.exceptions || []).length, 1, '异常行数');
    s.expectEq('  进度已更新为 68', Number(jg4.data.progress), 68);
  } else {
    s.fail('只改进度后重新读回项目', `status=${jg4.status}`);
  }

  // (D) 两个子表同时传空数组 = 同时清空
  const jr4 = await req('PUT', `/api/projects/${projectBody.id}`, {
    token, body: { milestones: [], exceptions: [] },
  });
  s.expectStatus('PUT 同时传两个空数组返回 200', jr4, 200);
  const jg5 = await req('GET', `/api/projects/${projectBody.id}`, { token });
  if (jg5.status === 200 && jg5.data) {
    s.expectEq('  里程碑被清空（0 行）', (jg5.data.milestones || []).length, 0, '里程碑行数');
    s.expectEq('  异常被清空（0 行）', (jg5.data.exceptions || []).length, 0, '异常行数');
  }

  const dupProject = await req('POST', '/api/projects', {
    token, body: { ...projectBody, id: `${projectBody.id}-dup` },
  });
  s.expectTrue('重复 project_no 被拒（409）', dupProject.status === 409,
    `status=${dupProject.status}`);

  // ══════════════════════════════════════════════════════════════
  // 5. 删除连带：报告子表行数 + 确实删掉
  // ══════════════════════════════════════════════════════════════
  // 项目当前子表已清空，先补回里程碑与异常再删，验证「删除时报告连带行数」
  await req('PUT', `/api/projects/${projectBody.id}`, {
    token,
    body: {
      milestones: [{ id: `ms-del-${stamp}`, name: '待删里程碑', plannedDate: '2027-01-01', status: 'pending' }],
      exceptions: [{ id: `ex-del-${stamp}`, exceptionNo: `EX-DEL-${stamp}`, type: 'other', severity: 'low', title: '待删异常', description: 'd', reportedBy: 'E2E', reportedAt: '2026-11-01', status: 'open' }],
    },
  });
  const jd = await req('DELETE', `/api/projects/${projectBody.id}`, { token });
  const jdOk = s.expectStatus('DELETE 项目返回 200', jd, 200);
  if (jdOk && jd.data) {
    const detail = String(jd.data.deletedDetail || '');
    s.expectTrue('★ 删除回执报告连带删除的里程碑与异常行数',
      /milestones\s*1\s*行/.test(detail) && /exceptions\s*1\s*行/.test(detail),
      `deletedDetail=${detail}`);
  }
  const jg6 = await req('GET', `/api/projects/${projectBody.id}`, { token });
  s.expectStatus('删除项目后再查返回 404', jg6, 404);
  {
    const i = cleanup.findIndex((c) => c.id === projectBody.id);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // 意向客户 / 发货单 的删除与 404 确认
  const pdel = await req('DELETE', `/api/sales-prospects/${prospectBody.id}`, { token });
  s.expectStatus('DELETE 意向客户返回 200', pdel, 200);
  const pgd = await req('GET', `/api/sales-prospects/${prospectBody.id}`, { token });
  s.expectStatus('删除意向客户后再查返回 404', pgd, 404);
  {
    const i = cleanup.findIndex((c) => c.id === prospectBody.id);
    if (i >= 0) cleanup.splice(i, 1);
  }

  const sdel = await req('DELETE', `/api/shipments/${shipmentBody.id}`, { token });
  s.expectStatus('DELETE 发货单返回 200', sdel, 200);
  const sgd = await req('GET', `/api/shipments/${shipmentBody.id}`, { token });
  s.expectStatus('删除发货单后再查返回 404', sgd, 404);
  {
    const i = cleanup.findIndex((c) => c.id === shipmentBody.id);
    if (i >= 0) cleanup.splice(i, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // 6. 销售订单（W1 既有 D1 通道）不被本轮改造打破
  // ══════════════════════════════════════════════════════════════
  const soList = await req('GET', '/api/sales-orders', { token });
  const soOk = s.expectStatus('GET /api/sales-orders 仍返回 200（未被本轮改造打破）', soList, 200);
  if (soOk) s.expectListShape('  └ 销售订单列表契约未变', soList);

  // ══════════════════════════════════════════════════════════════
  // 7. 清理本轮残留（断言失败时中断也不会把测试数据留在生产库）
  // ══════════════════════════════════════════════════════════════
  for (const c of cleanup.splice(0)) {
    try {
      await req('DELETE', `${c.path}/${c.id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}

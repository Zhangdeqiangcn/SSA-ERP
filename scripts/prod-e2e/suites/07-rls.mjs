// 套件 07 · RLS 行级安全（下沉 D1 后的真实隔离效果）
// 覆盖：own 档（仅见自己的行）、all 档（共享主数据全可见）、privileged 豁免（admin 见全部）、
//       跨主体更新/删除被拒（assertRlsOwnership）、dept 档端点可用性
// 背景：V2.74.0 把 RLS 从前端展示级下沉到 D1 查询级（TABLE_RLS 11 表 / 3 档 scope）。
export const meta = { id: '07-rls', title: 'RLS 行级安全（own/all/privileged/归属校验）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const adminToken = ctx.admin.token;

  // 准备两个同组织、非特权（buyer）用户
  const b1 = ctx.users.buyer1 || await ctx.registerUser('buyer1', 'buyer', 'QA-采购一部');
  const b2 = ctx.users.buyer2 || await ctx.registerUser('buyer2', 'buyer', 'QA-采购二部');
  if (!b1 || !b2) {
    s.fail('RLS 多主体准备失败', `buyer1=${!!b1} buyer2=${!!b2}，本套件无法执行`);
    return;
  }
  s.pass('准备两个同组织非特权用户', `${b1.username}(${b1.department}) / ${b2.username}(${b2.department})`);
  s.expectTrue('两用户属同一组织',
    b1.user.org_id === ctx.org.orgId && b2.user.org_id === ctx.org.orgId,
    `b1=${b1.user.org_id} b2=${b2.user.org_id}`);

  // ---------- own 档：vendor_master ----------
  // ★ V3.45 起供应商创建权收紧：普通角色（buyer/user/vendor）的 vendor.create 全为 false，
  //   只有 admin/super_admin（'*' 全模块特权）能建供应商（operationGuard.ts 明确设计）。
  //   故旧套件「两个买手各建一个供应商」的造数路径已不成立（会被操作守卫 403 拦），
  //   且那次失败还连锁短路了后面整段读隔离断言。现按权限设计对齐：
  //   · 造数主体改为 **admin**（唯一有 vendor.create 的角色），两条供应商 owner_id=admin；
  //   · 用两个非特权买手 b1/b2 当「跨主体」，验证 own 档三件事：
  //       ① 非 owner 看不到 owner（admin）的供应商（读隔离）
  //       ② 跨主体读/改/删全被拒（assertRlsOwnership 写隔离）
  //       ③ admin（特权/all）看全部
  //   验证本质不变：「非 owner 碰不到 owner 的数据，特权看全部」，只是让造数合规。
  const v1 = await req('POST', '/api/vendors', {
    token: adminToken,
    body: { code: `E2E-RLS1-${runId}`, name: 'admin 的供应商1', status: 'approved', creditLimit: 100 },
  });
  const v2 = await req('POST', '/api/vendors', {
    token: adminToken,
    body: { code: `E2E-RLS2-${runId}`, name: 'admin 的供应商2', status: 'approved', creditLimit: 200 },
  });
  s.expectStatus('admin 创建供应商1 201', v1, 201);
  s.expectStatus('admin 创建供应商2 201', v2, 201);
  const id1 = v1.data?.id, id2 = v2.data?.id;
  if (id1) ctx.track('vendor', id1);
  if (id2) ctx.track('vendor', id2);

  if (!id1 || !id2) {
    s.fail('RLS own 档校验中止', '供应商创建失败（admin 建应成功；若 403 查 admin 特权通道）');
  } else {
    s.expectTrue('创建时自动填入 owner_id（=创建人 admin）',
      !!(v1.data?.ownerId),
      `ownerId=${v1.data?.ownerId}`);

    // b1 视角（非 owner）：看不到 admin 的两条供应商（own 档读隔离）
    const l1 = await req('GET', '/api/vendors', { token: b1.token });
    const l1ids = (l1.data?.data || []).map((v) => v.id);
    s.expectTrue('【own】非 owner b1 看不到 owner(admin) 的供应商1', !l1ids.includes(id1),
      l1ids.includes(id1) ? 'RLS 未生效，数据越界！' : `b1 可见 ${l1ids.length} 条，隔离生效`);
    s.expectTrue('【own】非 owner b1 看不到 owner(admin) 的供应商2', !l1ids.includes(id2),
      l1ids.includes(id2) ? 'RLS 未生效，数据越界！' : '隔离生效');

    // admin（privileged）视角：应看到全部
    const la = await req('GET', '/api/vendors', { token: adminToken });
    const laids = (la.data?.data || []).map((v) => v.id);
    s.expectTrue('【privileged】admin 看到自己创建的两条供应商',
      laids.includes(id1) && laids.includes(id2),
      `admin 可见 ${laids.length} 条（id1=${laids.includes(id1)} id2=${laids.includes(id2)}）`);

    // 跨主体详情读取应被拒
    const crossGet = await req('GET', `/api/vendors/${id2}`, { token: b1.token });
    s.expectStatus('【own】b1 读 admin 的供应商详情被拒', crossGet, [403, 404]);

    // 跨主体更新应被拒（assertRlsOwnership）
    const crossPut = await req('PUT', `/api/vendors/${id2}`, { token: b1.token, body: { creditLimit: 999999 } });
    s.expectStatus('【own】b1 更新 admin 的供应商被拒', crossPut, [403, 404]);

    // 跨主体删除应被拒
    const crossDel = await req('DELETE', `/api/vendors/${id2}`, { token: b1.token });
    s.expectStatus('【own】b1 删除 admin 的供应商被拒', crossDel, [403, 404]);

    // 确认越权未造成实际改动（owner 读回）
    const verify = await req('GET', `/api/vendors/${id2}`, { token: adminToken });
    s.expectEq('越权尝试后供应商数据未被篡改', Number(verify.data?.creditLimit), 200, 'creditLimit');
    s.expectTrue('越权尝试后供应商仍存在', verify.status === 200, `status=${verify.status}`);

    // owner（admin）自己的行可正常更新
    const ownPut = await req('PUT', `/api/vendors/${id1}`, { token: adminToken, body: { creditLimit: 111 } });
    s.expectStatus('【own】owner admin 更新自己的供应商成功', ownPut, 200);
  }

  // ---------- all 档：materials / work_orders / vouchers 为共享主数据 ----------
  const shared = [['materials', '物料'], ['work-orders', '工单'], ['vouchers', '凭证']];
  for (const [path, label] of shared) {
    const r1 = await req('GET', `/api/${path}`, { token: b1.token });
    const r2 = await req('GET', `/api/${path}`, { token: b2.token });
    const ra = await req('GET', `/api/${path}`, { token: adminToken });
    if (r1.status === 200 && r2.status === 200 && ra.status === 200) {
      s.expectTrue(`【all】${label} 对两个非特权用户可见总数一致（共享主数据）`,
        r1.data?.total === r2.data?.total && r1.data?.total === ra.data?.total,
        `b1=${r1.data?.total} b2=${r2.data?.total} admin=${ra.data?.total}`);
    } else {
      s.fail(`【all】${label} 可读性`, `b1=${r1.status} b2=${r2.status} admin=${ra.status}`);
    }
  }

  // ---------- dept 档：inbound/outbound/inventory ----------
  // 说明：这三张表无业务创建端点（数据经 Blob 通道或专属流程写入），
  // 生产库中本轮隔离组织为空表，无法构造跨部门数据来验证过滤效果。
  // 此处仅验证端点在 dept 档下可用且不报错（防 SQL 拼接错误回潮）。
  const deptDomains = [['inbound-orders', '入库单'], ['outbound-orders', '出库单'], ['inventory-records', '库存流水']];
  let deptOk = 0;
  for (const [path, label] of deptDomains) {
    const r = await req('GET', `/api/${path}`, { token: b1.token });
    if (r.status === 200) deptOk += 1;
    else s.fail(`【dept】${label} 非特权用户查询报错`, `status=${r.status}`);
  }
  s.expectEq('【dept】三个部门档端点在非特权用户下均可查询', deptOk, deptDomains.length, '端点数');
  s.info('【dept】过滤效果未做数据级验证',
    '隔离组织内 inbound/outbound/inventory 无创建端点、为空表，无法构造跨部门数据；仅验证 SQL 可执行');
}

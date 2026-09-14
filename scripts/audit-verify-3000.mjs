// V3.0.0 第三批整改实测：备份恢复体系 + 乐观锁 + 明细兜底
// 用法：先起本地服务（wrangler pages dev dist --local --persist-to ... --port 8799），再运行本脚本
const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const PW = 'Audit@2026';
const RUN = Date.now().toString(36).slice(-6).toUpperCase();

let pass = 0, fail = 0;
function T(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' :: ' + detail : ''}`); }
}
async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const r = await fetch(BASE + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, json, text };
}
async function login(u) {
  const r = await req('/api/auth/login', { method: 'POST', body: { username: u, password: PW } });
  return r.json?.token || null;
}

(async () => {
  console.log('=== V3.0.0 第三批整改实测 ===\n');
  const admin = await login('a_admin');
  if (!admin) { console.log('无法登录，请先造夹具'); process.exit(1); }

  // ---------- 准备数据 ----------
  await req('/api/customers', { method: 'POST', token: admin, body: { code: `BAK-${RUN}`, name: '备份测试客户' } });
  await req('/api/purchase-orders', {
    method: 'POST', token: admin,
    body: { orderNo: `PO-BAK-${RUN}`, vendorId: 'V1', vendorName: '备份供应商', status: 'draft', orderDate: '2026-09-14', totalAmount: 500 },
  });

  // ############ 一、备份导出 ############
  console.log('\n--- 一、备份导出 ---');
  const man = await req('/api/system/backup?mode=manifest', { token: admin });
  T('备份范围清单返回 200', man.status === 200, `实际 ${man.status}`);
  T('清单统计出业务数据行', (man.json?.totalRows || 0) > 0, `totalRows=${man.json?.totalRows}`);
  T('清单含业务表（非仅 app_state）',
    Object.keys(man.json?.tables || {}).length > 5,
    `表数=${Object.keys(man.json?.tables || {}).length}`);

  const bak = await req('/api/system/backup', { token: admin });
  T('完整备份返回 200', bak.status === 200, `实际 ${bak.status}`);
  const tblNames = Object.keys(bak.json?.tables || {});
  T('备份含客户表数据', (bak.json?.tables?.customers?.rows || 0) > 0, `customers.rows=${bak.json?.tables?.customers?.rows}`);
  T('备份含采购单主表数据', (bak.json?.tables?.purchase_orders?.rows || 0) > 0, `rows=${bak.json?.tables?.purchase_orders?.rows}`);
  T('备份标记可用于恢复', bak.json?.restorable === true, `restorable=${bak.json?.restorable}`);
  T('导出不含会话/验证码等运行态表',
    !tblNames.includes('sessions') && !tblNames.includes('email_verifications') && !tblNames.includes('system_config'),
    tblNames.filter((t) => ['sessions', 'email_verifications', 'system_config'].includes(t)).join(','));
  T('备份总量大于旧版（旧版仅1项）', tblNames.length > 3, `导出表数=${tblNames.length}`);

  // ---------- 权限 ----------
  const member = await login('a_user2');
  if (member) {
    const m = await req('/api/system/backup', { token: member });
    T('普通成员导出被拒 403', m.status === 403, `实际 ${m.status}`);
  } else {
    console.log('  SKIP  普通成员用例（无该账号）');
  }
  const anon = await req('/api/system/backup');
  T('未登录导出被拒 401', anon.status === 401, `实际 ${anon.status}`);

  // ############ 二、恢复 ############
  console.log('\n--- 二、数据恢复 ---');
  const dry = await req('/api/system/restore', { method: 'POST', token: admin, body: { payload: bak.json, mode: 'dry-run' } });
  T('预演返回 200', dry.status === 200, `实际 ${dry.status}`);
  T('预演统计出待写入行数', (dry.json?.totalPlanned || 0) > 0, `totalPlanned=${dry.json?.totalPlanned}`);
  T('预演未真正写入（written 为 0）',
    (dry.json?.report || []).every((r) => (r.written ?? 0) === 0),
    JSON.stringify((dry.json?.report || []).slice(0, 2)));

  // 篡改组织编号：必须被拒
  const evil = JSON.parse(JSON.stringify(bak.json));
  evil.orgId = 'org_other_company';
  const evilRes = await req('/api/system/restore', { method: 'POST', token: admin, body: { payload: evil, mode: 'merge' } });
  T('跨组织备份被拒绝（400）', evilRes.status === 400, `实际 ${evilRes.status} ${evilRes.text.slice(0, 80)}`);

  // 伪造 schema
  const bad = { schema: 'something-else', orgId: bak.json.orgId, tables: {} };
  const badRes = await req('/api/system/restore', { method: 'POST', token: admin, body: { payload: bad, mode: 'merge' } });
  T('非备份文件被拒绝（400）', badRes.status === 400, `实际 ${badRes.status}`);

  const real = await req('/api/system/restore', { method: 'POST', token: admin, body: { payload: bak.json, mode: 'merge' } });
  T('正式恢复返回 200', real.status === 200, `实际 ${real.status} ${real.text.slice(0, 100)}`);
  T('恢复确实写入行数', (real.json?.totalPlanned || 0) > 0, `totalPlanned=${real.json?.totalPlanned}`);

  // 恢复后数据仍在（merge 幂等）
  const after = await req('/api/customers?keyword=' + `BAK-${RUN}`, { token: admin });
  T('恢复后业务数据仍可查到', (after.json?.data || []).length > 0, `len=${(after.json?.data || []).length}`);

  // ---------- 恢复权限 ----------
  const memRestore = member
    ? await req('/api/system/restore', { method: 'POST', token: member, body: { payload: bak.json, mode: 'dry-run' } })
    : null;
  if (memRestore) T('普通成员恢复被拒 403', memRestore.status === 403, `实际 ${memRestore.status}`);

  // ############ 三、乐观锁 ############
  console.log('\n--- 三、乐观锁 ---');
  const poNo = `PO-LOCK-${RUN}`;
  const created = await req('/api/purchase-orders', {
    method: 'POST', token: admin,
    body: { orderNo: poNo, vendorId: 'V1', vendorName: '锁测试', status: 'draft', orderDate: '2026-09-14', totalAmount: 100 },
  });
  const poId = created.json?.id;
  const v0 = created.json?.version ?? 1;

  if (poId) {
    const r1 = await req(`/api/purchase-orders/${poId}`, { method: 'PUT', token: admin, body: { version: v0, remarks: '甲改' } });
    T('携带正确版本号可正常更新', r1.status === 200, `实际 ${r1.status} ${r1.text.slice(0, 80)}`);

    const r2 = await req(`/api/purchase-orders/${poId}`, { method: 'PUT', token: admin, body: { version: v0, remarks: '乙改' } });
    T('用过期版本号更新返回 409', r2.status === 409, `实际 ${r2.status} ${r2.text.slice(0, 100)}`);
    T('冲突响应带冲突标识', r2.json?.code === 'VERSION_CONFLICT', `code=${r2.json?.code}`);
    T('冲突响应给出当前版本号', r2.json?.currentVersion !== undefined, `currentVersion=${r2.json?.currentVersion}`);

    // 不带版本号：保持兼容
    const r3 = await req(`/api/purchase-orders/${poId}`, { method: 'PUT', token: admin, body: { remarks: '不带版本' } });
    T('不带版本号仍可更新（向后兼容）', r3.status === 200, `实际 ${r3.status}`);
  } else {
    T('创建采购单成功', false, `响应 ${created.text.slice(0, 120)}`);
  }

  // ############ 四、明细兜底 ############
  console.log('\n--- 四、明细行缺字段兜底 ---');
  const draft = await req('/api/purchase-orders', {
    method: 'POST', token: admin,
    body: {
      orderNo: `PO-IT-${RUN}`, vendorId: 'V1', vendorName: '明细测试', status: 'draft',
      orderDate: '2026-09-14', totalAmount: 10,
      // 明细行故意只给一个字段，其余全部缺失
      items: [{ materialId: 'M1' }],
    },
  });
  T('明细行缺字段不再 500', draft.status !== 500, `实际 ${draft.status} ${draft.text.slice(0, 120)}`);
  T('明细行缺字段可正常创建', draft.status === 201, `实际 ${draft.status}`);

  // 明细行传非法对象
  const weird = await req('/api/purchase-orders', {
    method: 'POST', token: admin,
    body: {
      orderNo: `PO-IT2-${RUN}`, vendorId: 'V1', vendorName: '明细测试2', status: 'draft',
      orderDate: '2026-09-14', totalAmount: 10, items: [null, 'x', { materialId: 'M2' }],
    },
  });
  T('明细行含脏对象不崩溃', weird.status !== 500, `实际 ${weird.status} ${weird.text.slice(0, 120)}`);

  console.log(`\n=== 小结：PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})();

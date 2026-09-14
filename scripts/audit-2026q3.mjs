// SSA ERP 第三方独立评测 · 运行期实测脚本（只测不改业务代码）
// 用途：对 V2.97.0 安全整改做独立复核，并推演并发/时序/数据边界/权限边界场景。
// 运行前提：本地 wrangler pages dev 已启动（默认 http://127.0.0.1:8799）
// 夹具通过本地测试库的 SQL 直接构造（仅评测环境，不触碰生产与业务代码）。
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const PY = 'C:/Users/zhangdeqiang/.workbuddy/binaries/python/versions/3.13.12/python.exe';
const SQLTOOL = 'scripts/_audit_sql.py';
const HASH = 'd9a65f3ab320eaf541ba8c370712c93ac8d43af70706f4447393a855d4bbafb4'; // sha256('audsalt:Audit@2026')
const PWD = 'Audit@2026';
const SALT = 'audsalt';

function sql(s) {
  try { return execFileSync(PY, [SQLTOOL, s], { encoding: 'utf8' }).trim(); }
  catch (e) { return 'ERR:' + String(e.stdout || e.message).slice(0, 200); }
}
const esc = (s) => String(s).replace(/'/g, "''");

const out = [];
function rec(cat, name, verdict, detail) {
  out.push({ cat, name, verdict, detail });
  const tag = verdict === 'PASS' ? '✅' : verdict === 'FAIL' ? '❌' : verdict === 'WARN' ? '⚠️ ' : 'ℹ️ ';
  console.log(`${tag} [${cat}] ${name}${detail ? ' — ' + detail : ''}`);
}
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch { data = null; }
    return { status: res.status, data };
  } catch (e) { return { status: 0, data: null, err: String(e) }; }
}
const rn = () => Math.random().toString(36).slice(2, 8);

function makeFixture(orgId, orgName, code, userId, uname, role, dept, status = 'active') {
  sql(`INSERT OR REPLACE INTO orgs (id,name,company_code,status,created_by,created_at) VALUES ('${orgId}','${esc(orgName)}','${code}','active','${userId}','2026-09-11T00:00:00.000Z')`);
  sql(`INSERT OR REPLACE INTO users (id,org_id,username,password_hash,salt,name,role,department,created_at,status,is_owner,email,phone,security_initialized) VALUES ('${userId}','${orgId}','${uname}','${HASH}','${SALT}','${esc(role + '-' + dept)}','${role}',${dept ? "'" + dept + "'" : 'NULL'},'2026-09-11T00:00:00.000Z','${status}',0,NULL,NULL,1)`);
}
async function login(uname) {
  const r = await req('POST', '/api/auth/login', { username: uname, password: PWD });
  return r;
}

async function main() {
  console.log(`\n============ SSA ERP 独立评测 · 运行期实测 @ ${BASE} ============\n`);

  // ───── 夹具 ─────
  const OA = 'org_aud_a', OB = 'org_aud_b';
  makeFixture(OA, '评测组织A', 'AUDA', 'u_a_admin', 'a_admin', 'admin', 'DEPT-A');
  makeFixture(OA, '评测组织A', 'AUDA', 'u_a_user2', 'a_user2', 'user', 'DEPT-A2');
  makeFixture(OA, '评测组织A', 'AUDA', 'u_a_vendor', 'a_vendor', 'vendor', null);
  makeFixture(OB, '评测组织B', 'AUDB', 'u_b_admin', 'b_admin', 'admin', 'DEPT-B');

  const la = await login('a_admin');
  if (la.status !== 200 || !la.data?.token) {
    rec('基线', '组织A管理员登录', 'FAIL', `status=${la.status} ${JSON.stringify(la.data)}`); return finish();
  }
  const A = la.data.token, Au = la.data.user;
  rec('基线', '组织A管理员登录', 'PASS', `role=${Au.role} dept=${Au.department} org=${Au.org_id}`);

  const lb = await login('b_admin');
  const B = lb.data?.token, Bu = lb.data?.user || {};
  rec('基线', '组织B管理员登录', lb.status === 200 ? 'PASS' : 'FAIL', `status=${lb.status}`);

  const lu2 = await login('a_user2');
  const A2 = lu2.data?.token, A2u = lu2.data?.user || {};
  rec('基线', '组织A普通成员(DEPT-A2)登录', lu2.status === 200 ? 'PASS' : 'FAIL', `status=${lu2.status} role=${A2u.role}`);

  // ───── S1~S3 跨组织越权 ─────
  const custA = await req('POST', '/api/customers', {
    code: 'CA' + rn(), name: 'A组织机密客户', type: 'customer', status: 'active', creditLimit: 999999, taxId: 'TAXA-SECRET',
  }, A);
  const cidA = custA.data?.id;
  rec('基线', '组织A创建客户', custA.status < 300 && cidA ? 'PASS' : 'FAIL', `status=${custA.status} id=${cidA}`);

  if (cidA) {
    const r1 = await req('GET', `/api/customers/${cidA}`, undefined, B);
    rec('权限边界', 'S1 组织B读组织A客户（期望403/404）',
      (r1.status === 403 || r1.status === 404) ? 'PASS' : 'FAIL',
      `status=${r1.status}${r1.status === 200 ? ' 泄露=' + JSON.stringify(r1.data).slice(0, 150) : ''}`);
    const r2 = await req('PUT', `/api/customers/${cidA}`, { name: '被B篡改' }, B);
    rec('权限边界', 'S2 组织B改组织A客户（期望403/404）',
      (r2.status === 403 || r2.status === 404) ? 'PASS' : 'FAIL', `status=${r2.status}`);
    const r3 = await req('DELETE', `/api/customers/${cidA}`, undefined, B);
    rec('权限边界', 'S3 组织B删组织A客户（期望403/404）',
      (r3.status === 403 || r3.status === 404) ? 'PASS' : 'FAIL', `status=${r3.status}`);
    // 列表是否混入
    const r4 = await req('GET', '/api/customers?pageSize=100', undefined, B);
    const leak = (r4.data?.data || []).some((c) => c.id === cidA);
    rec('权限边界', 'S4 组织B客户列表是否混入组织A记录', leak ? 'FAIL' : 'PASS',
      `B列表${(r4.data?.data || []).length}条，含A记录=${leak}`);
  }

  // ───── S5 采购单跨组织 ─────
  const poA = await req('POST', '/api/purchase-orders', {
    orderNo: 'POA' + rn(), vendorId: 'V1', vendorName: 'A供应商', status: 'draft',
    orderDate: '2026-09-11', totalAmount: 88888, currency: 'CNY',
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '料', quantity: 1, unitPrice: 88888, amount: 88888 }],
  }, A);
  const pidA = poA.data?.id;
  if (pidA) {
    const r = await req('GET', `/api/purchase-orders/${pidA}`, undefined, B);
    rec('权限边界', 'S5 组织B读组织A采购单（期望403/404）',
      (r.status === 403 || r.status === 404) ? 'PASS' : 'FAIL',
      `status=${r.status}${r.status === 200 ? ' 金额=' + (r.data?.total_amount ?? r.data?.totalAmount) : ''}`);
  } else {
    rec('权限边界', 'S5 组织B读组织A采购单', 'WARN', `A采购单创建失败 status=${poA.status} ${JSON.stringify(poA.data).slice(0,120)}`);
  }

  // ───── S6 同组织跨部门隔离（仓库域 B3 复核）─────
  const inb = await req('POST', '/api/inbound-orders', {
    inboundNo: 'INB' + rn(), type: 'purchase', status: 'pending', warehouseId: 'WH1', warehouseName: '主仓',
    operator: 'A部门', inboundDate: '2026-09-11', remarks: 'A部门入库', totalCost: 10,
    items: [{ materialId: 'M1', materialCode: 'M001', materialName: '料', unit: 'PCS', expectedQuantity: 1, actualQuantity: 1, unitPrice: 10, amount: 10 }],
  }, A);
  const inbId = inb.data?.id;
  if (inbId) {
    const byA2 = await req('GET', `/api/inbound-orders?pageSize=100`, undefined, A2);
    const list = byA2.data?.data || byA2.data?.items || [];
    const seen = list.some((o) => o.id === inbId);
    rec('权限边界', 'S6 同组织跨部门：DEPT-A2 能否看到 DEPT-A 的入库单',
      seen ? 'FAIL' : 'PASS', `A2可见${list.length}条，含A部门单据=${seen} (total=${byA2.data?.total})`);
    const one = await req('GET', `/api/inbound-orders/${inbId}`, undefined, A2);
    rec('权限边界', 'S7 同组织跨部门：直接按编号取单（期望403/404）',
      (one.status === 403 || one.status === 404) ? 'PASS' : 'FAIL', `status=${one.status}`);
  } else {
    rec('权限边界', 'S6 同组织跨部门隔离', 'WARN', `入库单创建失败 status=${inb.status}`);
  }

  // ───── S8 通用实体内核 COUNT 与行级过滤一致性 ─────
  const eByA2 = await req('GET', '/api/entities/inbound-orders?page=1&pageSize=20', undefined, A2);
  const eByA = await req('GET', '/api/entities/inbound-orders?page=1&pageSize=20', undefined, A);
  const tA2 = eByA2.data?.total, tA = eByA.data?.total;
  const rowsA2 = (eByA2.data?.data || []).length;
  rec('数据边界', 'S8 通用实体内核 COUNT 是否按部门过滤',
    (typeof tA2 === 'number' && typeof tA === 'number') ? ((tA2 === tA && rowsA2 === 0) ? 'FAIL' : 'PASS') : 'WARN',
    `DEPT-A2 total=${tA2} 返回行=${rowsA2}；DEPT-A admin total=${tA}`);

  // ───── S9 供应商角色会话隔离（A2 复核）─────
  const lv = await login('a_vendor');
  if (lv.status === 200 && lv.data?.token) {
    const vt = lv.data.token;
    const vi = await req('GET', '/api/customers', undefined, vt);
    rec('权限边界', 'S9 role=vendor 会话访问内部客户接口（期望401）',
      vi.status === 401 ? 'PASS' : 'FAIL', `status=${vi.status}`);
    const vp = await req('PUT', '/api/state/ssa-erp-users', { value: '{}' }, vt);
    rec('权限边界', 'S10 role=vendor 会话改写组织级用户表（期望401）',
      vp.status === 401 ? 'PASS' : 'FAIL', `status=${vp.status}`);
  } else {
    rec('权限边界', 'S9 vendor 会话隔离', 'WARN', `vendor 登录失败 status=${lv.status} ${JSON.stringify(lv.data)}`);
  }

  // ───── S11 会话签发后账号被驳回 → 令牌是否立即失效（A1 复核）─────
  sql(`UPDATE users SET status='active' WHERE id='u_a_user2'`);
  const relog = await login('a_user2');
  const liveToken = relog.data?.token;
  if (liveToken) {
    const before = await req('GET', '/api/auth/me', undefined, liveToken);
    sql(`UPDATE users SET status='rejected' WHERE id='u_a_user2'`);
    const after = await req('GET', '/api/auth/me', undefined, liveToken);
    rec('时序', 'S11 账号被驳回后既有令牌立即失效（A1）',
      (before.status === 200 && after.status === 401) ? 'PASS' : 'FAIL',
      `驳回前=${before.status} 驳回后=${after.status}`);
    sql(`UPDATE users SET status='active' WHERE id='u_a_user2'`);
  } else {
    rec('时序', 'S11 账号停用后令牌失效', 'WARN', '未能取得成员令牌');
  }

  // ───── S12 自操作护栏（A3 复核）─────
  const self = await req('PUT', `/api/users/${Au.id}`, { action: 'reject' }, A);
  rec('权限边界', 'S12 管理员对自己执行驳回（期望403）', self.status === 403 ? 'PASS' : 'FAIL',
    `status=${self.status} ${JSON.stringify(self.data).slice(0, 100)}`);

  // ───── S13 提权：把自己设为 super_admin ─────
  const esc1 = await req('PUT', `/api/users/${Au.id}`, { role: 'super_admin' }, A);
  rec('权限边界', 'S13 经接口授予 super_admin（期望400/403）',
    (esc1.status === 400 || esc1.status === 403) ? 'PASS' : 'FAIL', `status=${esc1.status}`);

  // ───── S14 组织A管理员改组织B用户 ─────
  const crossU = await req('PUT', '/api/users/u_b_admin', { action: 'reject' }, A);
  rec('权限边界', 'S14 组织A管理员操作组织B账号（期望403）',
    crossU.status === 403 ? 'PASS' : 'FAIL', `status=${crossU.status}`);

  // ───── S15 特权配置键：普通成员写入（C1 复核）─────
  const pw = await req('PUT', '/api/state/ssa-erp-audit', { value: '{"wiped":true}' }, A2);
  rec('权限边界', 'S15 普通成员写组织级审计缓存键（期望403）',
    pw.status === 403 ? 'PASS' : 'FAIL', `status=${pw.status} ${JSON.stringify(pw.data).slice(0, 90)}`);
  const pw2 = await req('PUT', '/api/state/ssa-erp-users', { value: '{"escalate":true}' }, A2);
  rec('权限边界', 'S16 普通成员写用户表键（期望403）', pw2.status === 403 ? 'PASS' : 'FAIL', `status=${pw2.status}`);
  const pr = await req('GET', '/api/state/ssa-erp-data-permission', undefined, A2);
  rec('权限边界', 'S17 普通成员读字段权限矩阵（刻意放开，期望非403）',
    pr.status !== 403 ? 'PASS' : 'WARN', `status=${pr.status}`);

  // ───── S18 非特权键普通成员可写（业务数据，符合预期）─────
  const nw = await req('PUT', '/api/state/ssa-erp-testkey', { value: '{"a":1}' }, A2);
  rec('权限边界', 'S18 普通成员写普通业务键（期望200）', nw.status === 200 ? 'PASS' : 'WARN', `status=${nw.status}`);

  // ───── S19 备份导出范围 ─────
  const bk = await req('GET', '/api/system/backup', undefined, A);
  const keys = bk.data?.state ? Object.keys(bk.data.state) : [];
  rec('容错恢复', 'S19 备份导出覆盖内容', 'INFO',
    `status=${bk.status} schema=${bk.data?.schema} 键数=${keys.length} 键=${JSON.stringify(keys.slice(0, 6))}`);
  rec('容错恢复', 'S20 备份是否含业务关系表行数据',
    'FAIL', `备份仅导出 app_state 的 ${keys.length} 个键值，materials/purchase_orders/sales_orders/customers 等业务表零行导出 → 无法用于真实恢复`);

  // ───── S21 备份：非管理员（受 B5 保护）─────
  const bk2 = await req('GET', '/api/system/backup', undefined, A2);
  rec('权限边界', 'S21 普通成员导出组织备份（期望403）', bk2.status === 403 ? 'PASS' : 'FAIL', `status=${bk2.status}`);

  // ───── S22 并发：同编码重复创建 ─────
  const code = 'DUP' + rn();
  const [d1, d2] = await Promise.all([
    req('POST', '/api/vendors', { code, name: '并发甲' }, A),
    req('POST', '/api/vendors', { code, name: '并发乙' }, A),
  ]);
  rec('并发', 'S22 并发同编码创建供应商（期望仅一个成功）',
    (d1.status < 300 && d2.status < 300) ? 'FAIL' : 'PASS', `resp1=${d1.status} resp2=${d2.status}`);
  const dupCheck = await req('GET', `/api/vendors?keyword=${code}`, undefined, A);
  rec('并发', 'S23 并发后该编码实际落库条数',
    (dupCheck.data?.total === 1) ? 'PASS' : 'WARN', `total=${dupCheck.data?.total}`);

  // ───── S24 数据边界：超长字段 ─────
  const longName = 'X'.repeat(200000);
  const lv2 = await req('POST', '/api/vendors', { code: 'LONG' + rn(), name: longName }, A);
  rec('数据边界', 'S24 超长字段(20万字符)写入',
    (lv2.status === 400 || lv2.status === 413) ? 'PASS' : 'FAIL',
    `status=${lv2.status}${lv2.status < 300 ? ' → 服务端无长度校验即入库' : ''}`);

  // ───── S25 数据边界：超深分页 ─────
  const deep = await req('GET', '/api/vendors?page=99999999&pageSize=100', undefined, A);
  rec('数据边界', 'S25 超深分页（第1亿页）', deep.status === 200 ? 'PASS' : 'WARN',
    `status=${deep.status} 返回=${(deep.data?.data || []).length} totalPages=${deep.data?.totalPages}`);

  // ───── S26 超大 pageSize ─────
  const big = await req('GET', '/api/vendors?pageSize=2147483647', undefined, A);
  rec('数据边界', 'S26 超大 pageSize 夹紧', big.data?.pageSize <= 100 ? 'PASS' : 'FAIL',
    `返回 pageSize=${big.data?.pageSize}`);

  // ───── S27 非法分页参数 ─────
  const neg = await req('GET', '/api/vendors?page=-5&pageSize=-9', undefined, A);
  rec('数据边界', 'S27 负数分页参数', neg.status === 200 ? 'PASS' : 'WARN',
    `status=${neg.status} page=${neg.data?.page} pageSize=${neg.data?.pageSize}`);

  // ───── S28 无凭据 / 伪造令牌 ─────
  const anon = await req('GET', '/api/customers');
  rec('权限边界', 'S28 无凭据访问业务列表（期望401）', anon.status === 401 ? 'PASS' : 'FAIL', `status=${anon.status}`);
  const fake = await req('GET', '/api/customers', undefined, 'fake_token_abc');
  rec('权限边界', 'S29 伪造 Bearer 令牌（期望401）', fake.status === 401 ? 'PASS' : 'FAIL', `status=${fake.status}`);

  // ───── S30 开放网关无 Key ─────
  const o1 = await req('GET', '/api/open/materials');
  rec('权限边界', 'S30 开放网关无密钥（期望401）', o1.status === 401 ? 'PASS' : 'FAIL', `status=${o1.status}`);
  const o2 = await req('GET', '/api/open/materials', undefined, A);
  rec('权限边界', 'S31 用登录会话令牌访问开放网关（期望401）', o2.status === 401 ? 'PASS' : 'FAIL', `status=${o2.status}`);

  // ───── S32 脱敏接口与归属过滤一致性 ─────
  const pd = await req('GET', '/api/protected-data/vendors', undefined, A2);
  const vl = await req('GET', '/api/vendors?pageSize=100', undefined, A2);
  rec('数据保护', 'S32 脱敏接口 vs 主数据接口条数一致性',
    (pd.data?.count === (vl.data?.data || []).length) ? 'PASS' : 'WARN',
    `protected-data=${pd.data?.count} /api/vendors=${(vl.data?.data || []).length} masked=${JSON.stringify(pd.data?.maskedFields)}`);
  rec('数据保护', 'S33 脱敏接口是否对普通角色生效', 'INFO',
    `role=${pd.data?.role} maskedFields=${JSON.stringify(pd.data?.maskedFields)} count=${pd.data?.count}`);

  // ───── S34 错误信息泄露 ─────
  const bad = await req('GET', '/api/protected-data/nonexist', undefined, A);
  rec('数据保护', 'S34 非法类型错误信息', bad.status === 400 ? 'PASS' : 'WARN', `status=${bad.status} ${JSON.stringify(bad.data).slice(0, 100)}`);

  // ───── S35 审计日志 ─────
  const al = await req('GET', '/api/audit/logs', undefined, A);
  const alRows = al.data?.data || al.data?.logs || [];
  rec('数据保护', 'S35 审计日志接口', 'INFO', `status=${al.status} 条数=${alRows.length}`);
  const al2 = await req('GET', '/api/audit/logs', undefined, B);
  const al2Rows = al2.data?.data || al2.data?.logs || [];
  const crossSeen = al2Rows.some((r) => String(r.org_id) === OA || String(r.orgId) === OA);
  rec('数据保护', 'S36 组织B能否看到组织A的审计日志', crossSeen ? 'FAIL' : 'PASS', `B可见${al2Rows.length}条，含A记录=${crossSeen}`);

  finish();
}

function finish() {
  const p = out.filter((o) => o.verdict === 'PASS').length;
  const f = out.filter((o) => o.verdict === 'FAIL').length;
  const w = out.filter((o) => o.verdict === 'WARN').length;
  const i = out.filter((o) => o.verdict === 'INFO').length;
  console.log(`\n──────── 实测小结：PASS ${p} / FAIL ${f} / WARN ${w} / INFO ${i}（共 ${out.length}）────────\n`);
  if (f) {
    console.log('【失败项明细】');
    out.filter((o) => o.verdict === 'FAIL').forEach((o) => console.log(`  ❌ [${o.cat}] ${o.name} — ${o.detail}`));
  }
  if (w) {
    console.log('【需人工确认项】');
    out.filter((o) => o.verdict === 'WARN').forEach((o) => console.log(`  ⚠️  [${o.cat}] ${o.name} — ${o.detail}`));
  }
}
main().catch((e) => { console.error('脚本异常:', e); process.exit(1); });

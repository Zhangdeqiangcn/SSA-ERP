// 评测第二轮：聚焦「代码推演出的疑点」做运行期证伪/证实
import { execFileSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const PY = 'C:/Users/zhangdeqiang/.workbuddy/binaries/python/versions/3.13.12/python.exe';
const sql = (s) => { try { return execFileSync(PY, ['scripts/_audit_sql.py', s], { encoding: 'utf8' }).trim(); } catch (e) { return 'ERR'; } };
const out = [];
function rec(cat, name, v, d) {
  out.push({ cat, name, v, d });
  const tag = v === 'PASS' ? '✅' : v === 'FAIL' ? '❌' : v === 'WARN' ? '⚠️ ' : 'ℹ️ ';
  console.log(`${tag} [${cat}] ${name}${d ? ' — ' + d : ''}`);
}
async function req(m, p, b, t) {
  const h = { 'Content-Type': 'application/json' }; if (t) h['Authorization'] = `Bearer ${t}`;
  try {
    const r = await fetch(`${BASE}${p}`, { method: m, headers: h, body: b !== undefined ? JSON.stringify(b) : undefined });
    let d = null; try { d = await r.json(); } catch {}
    return { status: r.status, data: d };
  } catch (e) { return { status: 0, data: null }; }
}
const rn = () => Math.random().toString(36).slice(2, 7);

async function main() {
  console.log(`\n============ 评测第二轮 · 针对性验证 @ ${BASE} ============\n`);
  const lg = await req('POST', '/api/auth/login', { username: 'a_admin', password: 'Audit@2026' });
  const A = lg.data?.token;

  // ── T1 通用实体内核：关键字搜索时 COUNT 是否同步过滤 ──
  const tag = 'ZZ' + rn();
  let made = 0;
  for (let i = 0; i < 3; i++) {
    const r = await req('POST', '/api/entities/checkTask', { taskName: `任务${tag}第${i}号`, status: 'open' }, A);
    if (r.status < 300) made++;
  }
  const all = await req('GET', '/api/entities/checkTask?pageSize=100', undefined, A);
  const hit = await req('GET', `/api/entities/checkTask?keyword=${tag}&pageSize=100`, undefined, A);
  const hitRows = (hit.data?.data || []).length;
  rec('数据边界', 'T1 通用实体内核关键字搜索时 COUNT 是否同步过滤',
    (hit.data?.total === hitRows) ? 'PASS' : 'FAIL',
    `本轮创建=${made} 全量total=${all.data?.total} 关键字[${tag}]命中行=${hitRows} 但接口返回total=${hit.data?.total} → ${hit.data?.total !== hitRows ? '总数未随关键字收敛，分页页数计算错误' : '一致'}`);

  // ── T2 约束冲突是否返回 400（而非 500 + 泄露 SQL）──
  const badType = await req('POST', '/api/customers', { code: 'BAD' + rn(), name: 'x', type: 'not_a_valid_type' }, A);
  rec('容错恢复', 'T2 业务字段违反约束时的状态码与信息泄露',
    badType.status === 400 ? 'PASS' : 'FAIL',
    `status=${badType.status} msg=${JSON.stringify(badType.data?.error || '').slice(0, 160)}`);

  // ── T3 会话登出后令牌是否立即失效 ──
  const lo = await req('POST', '/api/auth/logout', {}, A);
  const afterLo = await req('GET', '/api/auth/me', undefined, A);
  rec('时序', 'T3 登出后既有令牌是否立即失效',
    afterLo.status === 401 ? 'PASS' : 'FAIL', `logout=${lo.status} 登出后me=${afterLo.status}`);

  // ── T4 改密后既有会话是否失效 ──
  const lg2 = await req('POST', '/api/auth/login', { username: 'a_user2', password: 'Audit@2026' });
  const T2 = lg2.data?.token;
  const lgA = await req('POST', '/api/auth/login', { username: 'a_admin', password: 'Audit@2026' });
  const A2 = lgA.data?.token;
  // 用超管/管理员改 a_user2 无法改密码；改为直接观察：同一账号多处登录会话是否互相独立
  const lg2b = await req('POST', '/api/auth/login', { username: 'a_user2', password: 'Audit@2026' });
  const T2b = lg2b.data?.token;
  rec('时序', 'T4 同一账号多次登录签发多枚并行会话（无会话数上限）',
    (T2 && T2b && T2 !== T2b) ? 'WARN' : 'PASS', `两次登录令牌不同=${T2 !== T2b}（无并发会话数限制/无登出全部设备能力）`);

  // ── T5 sessions 表是否无限增长（过期会话是否清理）──
  const sessCnt = sql("SELECT COUNT(*) AS c FROM sessions");
  const expired = sql("SELECT COUNT(*) AS c FROM sessions WHERE expires_at < datetime('now')");
  rec('容错恢复', 'T5 会话表过期记录清理情况', 'INFO', `当前会话数=${sessCnt.split('\n')[1] || sessCnt} 已过期=${expired.split('\n')[1] || expired}（代码层无清理逻辑）`);

  // ── T6 空组织 / 孤儿数据：把用户 org_id 指向不存在的组织 ──
  sql("UPDATE users SET org_id='org_does_not_exist' WHERE id='u_a_vendor'");
  const lv = await req('POST', '/api/auth/login', { username: 'a_vendor', password: 'Audit@2026' });
  const orphan = lv.data?.token;
  if (orphan) {
    const r = await req('GET', '/api/customers', undefined, orphan);
    rec('数据边界', 'T6 孤儿组织账号（org_id 指向不存在组织）访问业务数据',
      'INFO', `登录=${lv.status} 业务接口=${r.status} 说明=孤儿账号仍可签发会话（role=vendor 被 A2 拦截，但同逻辑对普通角色成立）`);
  } else {
    rec('数据边界', 'T6 孤儿组织账号', 'INFO', `登录=${lv.status}`);
  }
  sql("UPDATE users SET org_id='org_aud_a' WHERE id='u_a_vendor'");

  // ── T7 空值与空字符串混用 ──
  const emptyStr = await req('POST', '/api/vendors', { code: 'EMP' + rn(), name: '', contactEmail: '' }, A2 || A);
  rec('数据边界', 'T7 空字符串业务字段', 'INFO', `status=${emptyStr.status}（name 为空串时 ${emptyStr.status < 300 ? '仍可写入' : '被拒'}）`);

  // ── T8 数字与文本隐式转换 ──
  const numStr = await req('POST', '/api/vendors', { code: 'NUM' + rn(), name: '数字测试', creditLimit: '一千元', rating: 'abc' }, A2 || A);
  rec('数据边界', 'T8 数值字段传入非数字文本',
    numStr.status === 400 ? 'PASS' : 'WARN', `status=${numStr.status} creditLimit=${numStr.data?.creditLimit} rating=${numStr.data?.rating}`);

  // ── T9 日期边界：跨时区/非法日期 ──
  const badDate = await req('POST', '/api/purchase-orders', {
    orderNo: 'POD' + rn(), vendorId: 'V1', vendorName: '供', status: 'draft',
    orderDate: '2026-13-45', totalAmount: 1,
  }, A2 || A);
  rec('数据边界', 'T9 非法日期(2026-13-45)',
    badDate.status === 400 ? 'PASS' : 'WARN', `status=${badDate.status} 落库值=${badDate.data?.order_date ?? badDate.data?.orderDate}`);

  // ── T10 审计日志是否记录关键写操作 ──
  const before = await req('GET', '/api/audit/logs', undefined, A2 || A);
  await req('POST', '/api/vendors', { code: 'AUD' + rn(), name: '审计留痕测试' }, A2 || A);
  const after = await req('GET', '/api/audit/logs', undefined, A2 || A);
  const b = (before.data?.data || before.data?.logs || []).length;
  const a = (after.data?.data || after.data?.logs || []).length;
  rec('数据保护', 'T10 业务写操作是否落审计日志', a > b ? 'PASS' : 'WARN',
    `写入前=${b} 写入后=${a}（增量=${a - b}）`);

  // ── T11 审计接口是否可被普通成员读取（日志本身是否越权可见）──
  const alUser = await req('GET', '/api/audit/logs', undefined, T2);
  rec('数据保护', 'T11 普通成员能否读取组织审计日志', 'INFO', `status=${alUser.status} 条数=${(alUser.data?.data || alUser.data?.logs || []).length}`);

  finish();
}
function finish() {
  const p = out.filter((o) => o.v === 'PASS').length, f = out.filter((o) => o.v === 'FAIL').length;
  const w = out.filter((o) => o.v === 'WARN').length, i = out.filter((o) => o.v === 'INFO').length;
  console.log(`\n──────── 第二轮小结：PASS ${p} / FAIL ${f} / WARN ${w} / INFO ${i}（共 ${out.length}）────────\n`);
  out.filter((o) => o.v === 'FAIL').forEach((o) => console.log(`  ❌ [${o.cat}] ${o.name} — ${o.d}`));
  out.filter((o) => o.v === 'WARN').forEach((o) => console.log(`  ⚠️  [${o.cat}] ${o.name} — ${o.d}`));
}
main().catch((e) => { console.error(e); process.exit(1); });

// 评测第三轮：审计可读性、计数一致性、并发丢失更新
import { execFileSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const PY = 'C:/Users/zhangdeqiang/.workbuddy/binaries/python/versions/3.13.12/python.exe';
const sql = (s) => { try { return execFileSync(PY, ['scripts/_audit_sql.py', s], { encoding: 'utf8' }).trim(); } catch (e) { return 'ERR'; } };
const out = [];
function rec(cat, name, v, d) { out.push({ cat, name, v, d }); const t = v === 'PASS' ? '✅' : v === 'FAIL' ? '❌' : v === 'WARN' ? '⚠️ ' : 'ℹ️ '; console.log(`${t} [${cat}] ${name}${d ? ' — ' + d : ''}`); }
async function req(m, p, b, t) {
  const h = { 'Content-Type': 'application/json' }; if (t) h['Authorization'] = `Bearer ${t}`;
  try { const r = await fetch(`${BASE}${p}`, { method: m, headers: h, body: b !== undefined ? JSON.stringify(b) : undefined }); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; }
  catch (e) { return { status: 0, data: null }; }
}
const rn = () => Math.random().toString(36).slice(2, 7);

async function main() {
  console.log(`\n============ 评测第三轮 @ ${BASE} ============\n`);
  const lg = await req('POST', '/api/auth/login', { username: 'a_admin', password: 'Audit@2026' });
  const A = lg.data?.token;
  const lg2 = await req('POST', '/api/auth/login', { username: 'a_user2', password: 'Audit@2026' });
  const M = lg2.data?.token;

  // ── T1b 通用实体内核：COUNT 是否随关键字收敛 ──
  const tag = 'KW' + rn();
  for (let i = 0; i < 3; i++) {
    sql(`INSERT INTO check_tasks (id,org_id,task_no,type,status,created_at) VALUES ('ct_${tag}_${i}','org_aud_a','NO${tag}${i}','full','pending','2026-09-11T00:00:0${i}.000Z')`);
  }
  const all = await req('GET', '/api/entities/checkTask?pageSize=100', undefined, A);
  const hit = await req('GET', `/api/entities/checkTask?keyword=${tag}&pageSize=100`, undefined, A);
  const rows = (hit.data?.data || []).length, total = hit.data?.total;
  rec('数据边界', 'T1b 通用实体内核 COUNT 是否随关键字收敛',
    (total === rows) ? 'PASS' : 'FAIL',
    `全量total=${all.data?.total}；关键字[${tag}]实际命中行=${rows}，接口返回total=${total} → ${total !== rows ? '总数未收敛，分页页数与末页空白' : '一致'}`);

  // ── T10b 审计日志可读性与增量 ──
  const b1 = await req('GET', '/api/audit?pageSize=100', undefined, A);
  const before = b1.data?.total ?? (b1.data?.data || []).length;
  await req('POST', '/api/vendors', { code: 'AUD' + rn(), name: '审计留痕验证' }, A);
  const b2 = await req('GET', '/api/audit?pageSize=100', undefined, A);
  const after = b2.data?.total ?? (b2.data?.data || []).length;
  rec('数据保护', 'T10b 服务端写操作是否落审计并可被读回',
    after > before ? 'PASS' : 'FAIL', `写入前=${before} 写入后=${after} 增量=${after - before} status=${b2.status}`);

  // ── T11b 普通成员能否读到全组织审计日志 ──
  const mAud = await req('GET', '/api/audit?pageSize=100', undefined, M);
  rec('数据保护', 'T11b 普通成员读取组织审计日志', 'INFO',
    `status=${mAud.status} 可见条数=${mAud.data?.total ?? (mAud.data?.data || []).length}（审计日志无角色分级）`);

  // ── T12 并发更新同一行是否丢失更新 ──
  const cr = await req('POST', '/api/customers', { code: 'CU' + rn(), name: '初始名称' }, A);
  const cid = cr.data?.id;
  if (cid) {
    await Promise.all([
      req('PUT', `/api/customers/${cid}`, { name: '甲写入' }, A),
      req('PUT', `/api/customers/${cid}`, { name: '乙写入' }, A),
    ]);
    const fin = await req('GET', `/api/customers/${cid}`, undefined, A);
    rec('并发', 'T12 并发更新同一行（是否有乐观锁/版本号）',
      'WARN', `最终值=${fin.data?.name}（无版本校验，后到者直接覆盖；采购单虽有 version 列但接口未校验）`);
  }

  // ── T13 审计日志保留策略副作用 ──
  rec('数据保护', 'T13 审计日志保留上限', 'INFO',
    `每次写入审计都执行全组织扫描删除（保留最近 10000 条），见 functions/api/audit/logs.ts:24-27；超出即静默丢弃，无归档`);

  // ── T14 开放网关单条：越权猜 ID ──
  const oget = await req('GET', '/api/open/vendors/not_exist_id');
  rec('权限边界', 'T14 开放网关无密钥猜编号（期望401先于404）',
    oget.status === 401 ? 'PASS' : 'WARN', `status=${oget.status}（401 先于 404 说明未泄露存在性）`);

  // ── T15 组织B能否通过开放网关拿到组织A数据（需密钥，仅验证隔离模型）──
  rec('权限边界', 'T15 开放网关密钥与组织绑定', 'INFO',
    `密钥表 api_keys 含 org_id，校验用 auth.org_id 强制拼入 WHERE（functions/api/open/[resource]/[id].ts:85/111/128）→ 跨组织不可达`);

  finish();
}
function finish() {
  const p = out.filter((o) => o.v === 'PASS').length, f = out.filter((o) => o.v === 'FAIL').length;
  const w = out.filter((o) => o.v === 'WARN').length, i = out.filter((o) => o.v === 'INFO').length;
  console.log(`\n──────── 第三轮小结：PASS ${p} / FAIL ${f} / WARN ${w} / INFO ${i}（共 ${out.length}）────────\n`);
  out.filter((o) => o.v === 'FAIL').forEach((o) => console.log(`  ❌ [${o.cat}] ${o.name} — ${o.d}`));
  out.filter((o) => o.v === 'WARN').forEach((o) => console.log(`  ⚠️  [${o.cat}] ${o.name} — ${o.d}`));
}
main().catch((e) => { console.error(e); process.exit(1); });

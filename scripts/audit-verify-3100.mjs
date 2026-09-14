// V3.1.0 实测：① 前端持久化可感知失败与冲突检测  ② 后台任务可靠调度
// 用法：先起本地服务（wrangler pages dev dist --local --persist-to .d1v310 --port 8799），再运行本脚本
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
  const r = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, json, text };
}
async function login(u) {
  const r = await req('/api/auth/login', { method: 'POST', body: { username: u, password: PW } });
  return r.json?.token || null;
}

(async () => {
  console.log('=== V3.1.0 剩余两项整改实测 ===\n');
  const admin = await login('a_admin');
  const member = await login('a_user1');
  if (!admin || !member) { console.log('无法登录，请先造夹具'); process.exit(1); }
  T('超管与成员均可登录', !!admin && !!member);

  // ################ 一、状态键版本号与冲突检测（H-02 / M-13 支撑） ################
  console.log('\n--- 一、状态键版本与冲突检测 ---');
  const KEY = `ssa-erp-v310-${RUN}`;

  const p1 = await req(`/api/state/${KEY}`, { method: 'PUT', token: admin, body: { value: JSON.stringify({ v: 1 }) } });
  T('首次写入返回 200 并给出版本号', p1.status === 200 && Number(p1.json?.version) === 1, `status=${p1.status} version=${p1.json?.version}`);

  const g1 = await req(`/api/state/${KEY}`, { token: admin });
  T('读取返回 value 与 version', g1.status === 200 && Number(g1.json?.version) === 1, `version=${g1.json?.version}`);

  const p2 = await req(`/api/state/${KEY}`, { method: 'PUT', token: admin, body: { value: JSON.stringify({ v: 2 }), baseVersion: 1 } });
  T('带正确版本号写入成功并递增到 2', p2.status === 200 && Number(p2.json?.version) === 2, `status=${p2.status} version=${p2.json?.version}`);

  // 关键：拿着「过期版本号」写入 → 必须 409 而不是静默覆盖
  const p3 = await req(`/api/state/${KEY}`, { method: 'PUT', token: admin, body: { value: JSON.stringify({ v: 3 }), baseVersion: 1 } });
  T('过期版本号写入返回 409（不再静默覆盖）', p3.status === 409, `实际 ${p3.status}`);
  T('冲突响应带明确的错误码', p3.json?.code === 'VERSION_CONFLICT', `code=${p3.json?.code}`);
  T('冲突响应回传云端最新版本', Number(p3.json?.current?.version) === 2, `current.version=${p3.json?.current?.version}`);
  T('冲突后云端值未被覆盖', String(p3.json?.current?.value || '').includes('"v":2') || String(p3.json?.current?.value || '').includes('"v": 2'), `value=${p3.json?.current?.value}`);

  const g2 = await req(`/api/state/${KEY}`, { token: admin });
  T('冲突写入确实没有改动云端数据', Number(g2.json?.version) === 2 && String(g2.json?.value).includes('"v":2'), `version=${g2.json?.version}`);

  // 兼容性：不带 baseVersion 仍按旧行为覆盖（老客户端不受影响）
  const p4 = await req(`/api/state/${KEY}`, { method: 'PUT', token: admin, body: { value: JSON.stringify({ v: 4 }) } });
  T('不带版本号仍可覆盖（老客户端兼容）', p4.status === 200 && Number(p4.json?.version) === 3, `status=${p4.status} version=${p4.json?.version}`);

  // 组织内共享：成员读到同一份与同一版本
  const g3 = await req(`/api/state/${KEY}`, { token: member });
  T('同组织成员读到同一版本', Number(g3.json?.version) === 3, `version=${g3.json?.version}`);

  // 未登录不得读写（H-02 之外的基线校验）
  const anon = await req(`/api/state/${KEY}`);
  T('未登录读取状态返回 401', anon.status === 401, `实际 ${anon.status}`);

  // ################ 二、后台任务调度（H-04） ################
  console.log('\n--- 二、后台任务调度 ---');

  const noAuth = await req('/api/system/jobs');
  T('无鉴权访问任务接口返回 401', noAuth.status === 401, `实际 ${noAuth.status}`);

  const badToken = await req('/api/system/jobs', { headers: { 'X-Job-Token': 'wrong-token-xxx' } });
  T('错误调度令牌返回 401', badToken.status === 401, `实际 ${badToken.status}`);

  const ov = await req('/api/system/jobs', { token: admin });
  T('管理员读取任务概览返回 200', ov.status === 200, `实际 ${ov.status}`);
  T('概览含队列统计字段', ov.json?.queue && typeof ov.json.queue.pending === 'number', JSON.stringify(ov.json?.queue));
  T('管理员可见调度令牌', !!ov.json?.config?.token, `token=${ov.json?.config?.token ? '有' : '无'}`);
  const TOKEN = ov.json?.config?.token || '';

  const run1 = await req('/api/system/jobs', { method: 'POST', token: admin, body: { action: 'run' } });
  T('管理员手动推进返回 200', run1.status === 200, `实际 ${run1.status} ${run1.text.slice(0, 80)}`);
  T('推进结果含处理数量', typeof run1.json?.processed === 'number', `processed=${run1.json?.processed}`);

  const tk = await req('/api/system/jobs', { headers: { 'X-Job-Token': TOKEN } });
  T('调度令牌可读取概览（最小权限内）', tk.status === 200, `实际 ${tk.status}`);
  T('调度令牌读取时不回显令牌本身', !tk.json?.config?.token, `token=${tk.json?.config?.token}`);

  const run2 = await req('/api/system/jobs', { method: 'POST', headers: { 'X-Job-Token': TOKEN }, body: { action: 'run' } });
  T('调度令牌可推进任务', run2.status === 200, `实际 ${run2.status}`);

  const replayByToken = await req('/api/system/jobs', { method: 'POST', headers: { 'X-Job-Token': TOKEN }, body: { action: 'replay' } });
  T('调度令牌不得执行重放（最小权限）', replayByToken.status === 403, `实际 ${replayByToken.status}`);

  const memberJobs = await req('/api/system/jobs', { token: member });
  T('普通成员无权查看任务状态', memberJobs.status === 401, `实际 ${memberJobs.status}`);

  // 留痕：推进后应能查到执行记录
  const ov2 = await req('/api/system/jobs', { token: admin });
  T('执行留痕已写入（至少 2 条）', (ov2.json?.ticks || []).length >= 2, `条数=${(ov2.json?.ticks || []).length}`);
  T('留痕记录触发来源', !!ov2.json?.ticks?.[0]?.source, `source=${ov2.json?.ticks?.[0]?.source}`);
  T('来源名有中文映射', !!ov2.json?.sourceText?.[ov2.json?.ticks?.[0]?.source], JSON.stringify(ov2.json?.sourceText || {}));

  // 失败任务重放：造一条 failed 任务（直接改库不可行，用队列语义验证接口可用）
  const rp = await req('/api/system/jobs', { method: 'POST', token: admin, body: { action: 'replay' } });
  T('管理员重放接口可用', rp.status === 200 && typeof rp.json?.reset === 'number', `reset=${rp.json?.reset} status=${rp.status}`);

  // 轮换令牌后旧令牌立即失效
  const rot = await req('/api/system/jobs', { method: 'POST', token: admin, body: { action: 'rotate-token' } });
  T('轮换令牌返回新令牌', rot.status === 200 && !!rot.json?.token && rot.json.token !== TOKEN, `new=${rot.json?.token ? '有' : '无'}`);
  const oldTok = await req('/api/system/jobs', { method: 'POST', headers: { 'X-Job-Token': TOKEN }, body: { action: 'run' } });
  T('旧令牌轮换后立即失效', oldTok.status === 401, `实际 ${oldTok.status}`);

  console.log(`\n=== 结果：PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail ? 1 : 0);
})();

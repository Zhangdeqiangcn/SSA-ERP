// 并发提交错误验证码：4 个请求同时打，观察 attempts 是否累计到 4
const BASE = 'http://127.0.0.1:8799';
const body = JSON.stringify({
  username: 'super_audit',
  purpose: 'change_password',
  password: 'Audit@2026',
  codes: ['000000', '000000'],
});
const req = () =>
  fetch(BASE + '/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(async (r) => ({ s: r.status, t: await r.text() }));

const rs = await Promise.all([req(), req(), req(), req()]);
rs.forEach((r, i) => console.log('  请求' + (i + 1) + ': HTTP ' + r.s + ' ' + r.t.slice(0, 100)));

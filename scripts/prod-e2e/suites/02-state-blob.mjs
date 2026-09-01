// 套件 02 · app_state Blob 通道（多数前端 store 的系统-of-record）
// 覆盖：写→读往返一致性、覆盖更新、删除后读空、组织隔离、未登录拒绝
export const meta = { id: '02-state-blob', title: 'app_state Blob 通道（写读往返/覆盖/删除/隔离）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const key = `__e2e_${runId}__`;
  ctx.track('state', key);

  // 1) 未登录拒绝
  const anon = await req('GET', `/api/state/${key}`);
  s.expectStatus('GET /api/state/:key 未登录拒绝', anon, 401);

  // 2) 首次读应为空
  const first = await req('GET', `/api/state/${key}`, { token: ctx.admin.token });
  s.expectTrue('新键首次读为空', first.status === 404 || first.data?.value == null,
    `status=${first.status} value=${JSON.stringify(first.data?.value)}`);

  // 3) 写入结构化对象
  const payload = { runId, nested: { a: 1, b: [1, 2, 3] }, ts: Date.now() };
  const put = await req('PUT', `/api/state/${key}`, { token: ctx.admin.token, body: { value: payload } });
  s.expectStatus('PUT /api/state/:key 写入', put, 200);
  s.expectTrue('写入返回 updated_at', !!put.data?.updated_at, `updated_at=${put.data?.updated_at}`);

  // 4) 读回并校验往返一致（端点以字符串存储，需 JSON.parse 后比对）
  const get = await req('GET', `/api/state/${key}`, { token: ctx.admin.token });
  s.expectStatus('GET /api/state/:key 读回', get, 200);
  let readBack = get.data?.value;
  if (typeof readBack === 'string') { try { readBack = JSON.parse(readBack); } catch { /* 保留原值以便报错 */ } }
  s.expectTrue('Blob 写→读 往返内容完全一致',
    JSON.stringify(readBack) === JSON.stringify(payload),
    `读回=${JSON.stringify(readBack)?.slice(0, 160)}`);

  // 5) 覆盖更新（同键二次写入应覆盖而非追加）
  const payload2 = { runId, overwritten: true };
  await req('PUT', `/api/state/${key}`, { token: ctx.admin.token, body: { value: payload2 } });
  const get2 = await req('GET', `/api/state/${key}`, { token: ctx.admin.token });
  let readBack2 = get2.data?.value;
  if (typeof readBack2 === 'string') { try { readBack2 = JSON.parse(readBack2); } catch { /* noop */ } }
  s.expectTrue('同键覆盖更新生效（非追加）',
    JSON.stringify(readBack2) === JSON.stringify(payload2),
    `读回=${JSON.stringify(readBack2)?.slice(0, 160)}`);

  // 6) 组织隔离：另一组织的会话读不到本组织的键
  const otherCC = `E2E-ISO-${runId}`;
  const otherReg = await req('POST', '/api/auth/register', {
    body: { username: `e2e_iso_${runId}`, password: ctx.password, name: 'E2E 隔离', companyCode: otherCC, role: 'admin' },
  });
  if (otherReg.status === 200 && otherReg.data?.token) {
    const cross = await req('GET', `/api/state/${key}`, { token: otherReg.data.token });
    s.expectTrue('跨组织读不到同名 Blob 键（org 隔离生效）',
      cross.status === 404 || cross.data?.value == null,
      `status=${cross.status} value=${JSON.stringify(cross.data?.value)?.slice(0, 80)}`);
    s.expectTrue('隔离校验组织 org_id 与主组织不同',
      otherReg.data.user.org_id !== ctx.org.orgId,
      `other=${otherReg.data.user.org_id}`);
  } else {
    s.warn('跨组织隔离校验跳过', `隔离组织注册失败 status=${otherReg.status}`);
  }

  // 7) 删除后读空
  const del = await req('DELETE', `/api/state/${key}`, { token: ctx.admin.token });
  s.expectStatus('DELETE /api/state/:key 删除', del, 200);
  const after = await req('GET', `/api/state/${key}`, { token: ctx.admin.token });
  s.expectTrue('删除后读为空', after.status === 404 || after.data?.value == null,
    `status=${after.status}`);
}

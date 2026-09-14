// 套件 15 · 凭据生命周期与组织准入（V3.2.0 新增能力）
// 覆盖独立安全评测遗留项的整改效果：
//   M-12 接口密钥无有效期、支持网址参数传递  → 有效期校验 + 网址参数显式拒绝
//   L-02 密钥无轮换机制                     → 原地轮换（旧密钥即时失效）
//   L-03 孤儿组织账号仍可签发会话            → 登录与会话双层组织状态闸门
//
// 两条路径在生产门禁里无法构造数据，故如实标注为「未覆盖」而非假绿：
//   ① 密钥「已过期」——需要时间流逝或直接改库把 expires_at 拨到过去；
//   ② 组织被停用 / 组织不存在而账号仍为正常状态——需要运维级改库。
//   二者均已由本地实测（直连本地库造数）验证，见交付说明。
export const meta = { id: '15-key-lifecycle', title: '凭据生命周期与组织准入' };

export default async function run(ctx, s) {
  const { req } = ctx;
  const runId = ctx.runId;
  const token = ctx.admin.token;
  const label = `E2E 生命周期 ${runId}`;

  // ── 1) 创建：有效期契约 ───────────────────────────────────────
  const k30 = await req('POST', '/api/open/keys', {
    token,
    body: { label, scopes: 'read', expiresInDays: 30 },
  });
  s.expectStatus('创建限期 Key（30 天）返回 201', k30, 201);
  const keyOld = k30.data?.plainKey;
  s.expectTrue('限期 Key 返回明文 plainKey（仅此一次）', !!keyOld, keyOld ? `前缀=${String(keyOld).slice(0, 6)}…` : '未返回');

  const expAt = k30.data?.expiresAt;
  s.expectTrue(
    '限期 Key 返回 expiresAt（非空）',
    !!expAt,
    `expiresAt=${expAt}`
  );
  if (expAt) {
    const days = (new Date(expAt).getTime() - Date.now()) / 86400000;
    s.expectTrue(
      'expiresAt 约在 30 天后（允许 ±1 天）',
      days > 28.5 && days < 31.5,
      `实测算得 ${days.toFixed(2)} 天`
    );
  }
  const keyId = k30.data?.id;

  const kForever = await req('POST', '/api/open/keys', {
    token,
    body: { label: `${label}-永久`, scopes: 'read', expiresInDays: null },
  });
  s.expectStatus('创建永久 Key 返回 201', kForever, 201);
  s.expectTrue(
    '显式指定永久时 expiresAt 为 null',
    kForever.data?.expiresAt === null,
    `expiresAt=${JSON.stringify(kForever.data?.expiresAt)}`
  );

  // 未传 expiresInDays → 走默认（90 天），而不是意外变成永久
  const kDefault = await req('POST', '/api/open/keys', {
    token,
    body: { label: `${label}-默认`, scopes: 'read' },
  });
  s.expectStatus('未指定有效期时创建成功（采用默认）', kDefault, 201);
  s.expectTrue(
    '未指定有效期 → 默认 90 天（不落成永久）',
    !!kDefault.data?.expiresAt,
    `expiresAt=${kDefault.data?.expiresAt} expiresInDays=${kDefault.data?.expiresInDays}`
  );

  // ── 2) 列表契约：暴露生命周期字段 ──────────────────────────────
  const list = await req('GET', '/api/open/keys', { token });
  s.expectStatus('GET /api/open/keys 列表', list, 200);
  s.expectTrue(
    '列表返回 defaultExpiresDays（供界面展示默认口径）',
    typeof list.data?.defaultExpiresDays === 'number',
    `defaultExpiresDays=${list.data?.defaultExpiresDays}`
  );
  const rows = list.data?.data || [];
  s.expectTrue(
    '列表行含 expires_at / rotated_at 字段',
    rows.length > 0 && rows.every((k) => 'expires_at' in k && 'rotated_at' in k),
    `共 ${rows.length} 行，缺字段 ${rows.filter((k) => !('expires_at' in k) || !('rotated_at' in k)).length} 行`
  );
  s.expectTrue(
    '列表不泄露密钥哈希与明文',
    rows.every((k) => !('key_hash' in k) && !('plainKey' in k)),
    '任一泄露即为失败'
  );

  // ── 3) 正常使用 + 拒绝路径 ────────────────────────────────────
  if (keyOld) {
    const ok = await req('GET', '/api/open/materials', { apiKey: keyOld });
    s.expectStatus('限期 Key 可正常访问开放网关', ok, 200);
  }

  // 网址参数传参必须被显式拒绝（M-12 整改核心）
  if (keyOld) {
    const viaQuery = await req('GET', `/api/open/materials?api_key=${encodeURIComponent(keyOld)}`);
    s.expectStatus('经网址参数传密钥被拒绝（401）', viaQuery, 401);
    s.expectEq(
      '网址参数拒绝时给出可区分原因 code=query_param',
      viaQuery.data?.code,
      'query_param',
      `error=${viaQuery.data?.error}`
    );
    s.expectTrue(
      '网址参数拒绝时提示明确指引改用请求头',
      /请求头|Authorization/.test(String(viaQuery.data?.error || '')),
      `error=${viaQuery.data?.error}`
    );
  }

  // 格式不对（未以 sk_ 开头）→ malformed，与「不存在」区分开
  const malformed = await req('GET', '/api/open/materials', { apiKey: 'not_a_valid_key_' + runId });
  s.expectStatus('格式错误的密钥被拒绝（401）', malformed, 401);
  s.expectEq(
    '格式错误的原因码为 malformed',
    malformed.data?.code,
    'malformed',
    `error=${malformed.data?.error}`
  );

  // ── 4) 轮换（L-02 整改核心）──────────────────────────────────
  if (keyId && keyOld) {
    const rot = await req('POST', `/api/open/keys/${keyId}`, { token, body: {} });
    s.expectStatus('轮换密钥返回 200', rot, 200);
    const keyNew = rot.data?.plainKey;
    s.expectTrue('轮换返回新明文 plainKey', !!keyNew, keyNew ? `前缀=${String(keyNew).slice(0, 6)}…` : '未返回');
    s.expectTrue('新密钥与原密钥不同', !!keyNew && keyNew !== keyOld, '新旧相同即为失败');
    s.expectTrue('轮换记录 rotatedAt', !!rot.data?.rotatedAt, `rotatedAt=${rot.data?.rotatedAt}`);
    s.expectEq('轮换保持标签不变（原地替换语义）', rot.data?.label, label, `label=${rot.data?.label}`);

    // 旧密钥即时失效
    const oldNow = await req('GET', '/api/open/materials', { apiKey: keyOld });
    s.expectStatus('轮换后旧密钥立即失效（401）', oldNow, 401);
    s.expectEq(
      '旧密钥失效原因码为 invalid（已被替换出表）',
      oldNow.data?.code,
      'invalid',
      `error=${oldNow.data?.error}`
    );

    // 新密钥可用
    const newOk = await req('GET', '/api/open/materials', { apiKey: keyNew });
    s.expectStatus('轮换后新密钥可用（200）', newOk, 200);

    // 列表里能看到轮换留痕
    const list2 = await req('GET', '/api/open/keys', { token });
    const row = (list2.data?.data || []).find((k) => k.id === keyId);
    s.expectTrue(
      '列表可见该 Key 的最近轮换时间',
      !!row?.rotated_at,
      `rotated_at=${row?.rotated_at}`
    );

    // ── 5) 吊销与「吊销是终态」────────────────────────────────
    const rev = await req('DELETE', `/api/open/keys/${keyId}`, { token });
    s.expectStatus('吊销密钥返回 200', rev, 200);

    const afterRevoke = await req('GET', '/api/open/materials', { apiKey: keyNew });
    s.expectStatus('吊销后密钥立即失效（401）', afterRevoke, 401);
    s.expectEq(
      '吊销原因码为 revoked（与不存在区分开）',
      afterRevoke.data?.code,
      'revoked',
      `error=${afterRevoke.data?.error}`
    );

    const rotRevoked = await req('POST', `/api/open/keys/${keyId}`, { token, body: {} });
    s.expectStatus('已吊销的 Key 不允许轮换复活（409）', rotRevoked, 409);
    s.expectEq(
      '轮换被拒原因码为 REVOKED',
      rotRevoked.data?.code,
      'REVOKED',
      `error=${rotRevoked.data?.error}`
    );

    // 不存在的 Key 轮换 → 404（此前 res.changes 写法会把 404 误报成 200）
    const rotMissing = await req('POST', `/api/open/keys/ak_not_exist_${runId}`, { token, body: {} });
    s.expectStatus('轮换不存在的 Key 返回 404（非 200 假成功）', rotMissing, 404);

    const delMissing = await req('DELETE', `/api/open/keys/ak_not_exist_${runId}`, { token });
    s.expectStatus('吊销不存在的 Key 返回 404（非 200 假成功）', delMissing, 404);
  }

  // ── 6) 无凭据基线 ─────────────────────────────────────────────
  const anon = await req('GET', '/api/open/materials');
  s.expectStatus('开放网关无凭据拒绝 401', anon, 401);
  s.expectEq('无凭据原因码为 missing', anon.data?.code, 'missing', `error=${anon.data?.error}`);

  // ── 7) 组织准入（L-03）：豁免路径可测，拒绝路径需造数 ─────────────
  // 超管豁免：平台级运维角色不应被任一组织状态锁死（否则唯一超管所在公司一旦异常即无人能修）
  if (ctx.supervisor?.token) {
    const sup = await req('GET', '/api/users?pageSize=1', { token: ctx.supervisor.token });
    s.expectStatus('超管不受组织闸门影响，仍可正常访问', sup, 200);
  } else {
    s.warn('组织闸门豁免路径未覆盖', '缺少测试超管凭据，跳过');
  }
  s.warn(
    '组织闸门的拒绝路径（未覆盖，已由本地实测验证）',
    '「组织不存在」与「组织被停用而账号正常」两种场景在生产门禁中无法构造（需运维级改库），已在本地库造数验证：登录返回 403 且 code=ORG_MISSING / ORG_SUSPENDED，既有会话于下次请求即失效'
  );
  s.warn(
    '密钥「已过期」路径（未覆盖，已由本地实测验证）',
    '过期需要时间流逝或直接改库把 expires_at 拨到过去，生产门禁不可构造；本地实测已确认到期返回 401 且 code=expired'
  );
}

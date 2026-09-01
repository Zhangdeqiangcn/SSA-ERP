// 套件 08 · 多币种汇率（fx_rates）
// 覆盖：汇率写入/读取、同键 upsert 覆盖、参数校验、组织隔离、外部源刷新（容忍外网不可用）
// 背景：V2.74.0 落地多币种 FX（迁移 0014 建 fx_rates，唯一键 org_id+base+quote）。
export const meta = { id: '08-fx', title: '多币种汇率（写入/upsert/校验/隔离/外部刷新）' };

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;

  // 1) 未登录拒绝
  const anon = await req('GET', '/api/fx');
  s.expectStatus('GET /api/fx 未登录拒绝', anon, 401);

  // 2) 初始读取（隔离组织应为空）
  const init = await req('GET', '/api/fx?base=CNY', { token });
  s.expectStatus('GET /api/fx?base=CNY 读取', init, 200);
  s.expectTrue('返回 data 数组契约', Array.isArray(init.data?.data), `type=${typeof init.data?.data}`);

  // 3) 参数校验：缺 quote / rate 应 400
  const noQuote = await req('POST', '/api/fx', { token, body: { base: 'CNY' } });
  s.expectStatus('POST /api/fx 缺 quote 返回 400', noQuote, 400);
  const noRate = await req('POST', '/api/fx', { token, body: { base: 'CNY', quote: 'USD' } });
  s.expectStatus('POST /api/fx 缺 rate 返回 400', noRate, 400);

  // 4) 写入三条汇率
  const seeds = [['USD', 0.1392], ['EUR', 0.1284], ['JPY', 20.55]];
  let written = 0;
  for (const [quote, rate] of seeds) {
    const r = await req('POST', '/api/fx', { token, body: { base: 'CNY', quote, rate } });
    if (r.status === 200 && r.data?.ok) written += 1;
    else s.fail(`POST /api/fx 写入 CNY→${quote}`, `status=${r.status} ${JSON.stringify(r.data)?.slice(0, 120)}`);
  }
  s.expectEq('汇率写入 3 条成功', written, seeds.length, '成功条数');

  // 5) 读回校验
  const after = await req('GET', '/api/fx?base=CNY', { token });
  const rows = after.data?.data || [];
  s.expectTrue('读回包含写入的 3 个币种',
    seeds.every(([q]) => rows.some((r) => r.quote === q)),
    `读回币种=${rows.map((r) => r.quote).join(',')}`);
  const usd = rows.find((r) => r.quote === 'USD');
  s.expectEq('CNY→USD 汇率值精确往返', Number(usd?.rate), 0.1392, 'rate');
  s.expectEq('汇率来源标记为 manual', usd?.source, 'manual');
  s.expectTrue('返回 updatedAt 时间戳', !!usd?.updatedAt, `updatedAt=${usd?.updatedAt}`);

  // 6) 同键 upsert：重复写入同一 base+quote 应覆盖而非新增
  const before = rows.length;
  const upsert = await req('POST', '/api/fx', { token, body: { base: 'CNY', quote: 'USD', rate: 0.1400 } });
  s.expectStatus('POST /api/fx 同键重复写入', upsert, 200);
  const after2 = await req('GET', '/api/fx?base=CNY', { token });
  const rows2 = after2.data?.data || [];
  s.expectEq('同键 upsert 未产生重复行', rows2.length, before, '行数');
  s.expectEq('同键 upsert 覆盖为新汇率', Number(rows2.find((r) => r.quote === 'USD')?.rate), 0.14, 'rate');

  // 7) 不同 base 独立存储
  const usdBase = await req('POST', '/api/fx', { token, body: { base: 'USD', quote: 'CNY', rate: 7.1839 } });
  s.expectStatus('POST /api/fx 写入不同 base（USD→CNY）', usdBase, 200);
  const usdRows = await req('GET', '/api/fx?base=USD', { token });
  s.expectTrue('不同 base 独立存储互不干扰',
    (usdRows.data?.data || []).some((r) => r.quote === 'CNY' && Number(r.rate) === 7.1839),
    `USD base 行数=${usdRows.data?.data?.length}`);
  const cnyRows = await req('GET', '/api/fx?base=CNY', { token });
  s.expectEq('写入 USD base 未污染 CNY base', (cnyRows.data?.data || []).length, rows2.length, 'CNY 行数');

  // 8) 组织隔离
  const otherReg = await req('POST', '/api/auth/register', {
    body: { username: `e2e_fxiso_${ctx.runId}`, password: ctx.password, name: 'E2E FX 隔离', companyCode: `E2E-FXISO-${ctx.runId}`, role: 'admin' },
  });
  if (otherReg.status === 200) {
    const otherFx = await req('GET', '/api/fx?base=CNY', { token: otherReg.data.token });
    s.expectTrue('【组织隔离】他组织读不到本组织汇率',
      (otherFx.data?.data || []).length === 0,
      `他组织可见=${otherFx.data?.data?.length} 条`);
  } else {
    s.warn('汇率组织隔离校验跳过', `隔离组织注册失败 status=${otherReg.status}`);
  }

  // 9) 外部源刷新（依赖公网 exchangerate.host，不可用时记 WARN 不阻断）
  const refresh = await req('POST', '/api/fx/refresh', { token, body: { base: 'CNY' } });
  if (refresh.status === 200 && refresh.data?.ok) {
    s.pass('POST /api/fx/refresh 外部源刷新成功', `base=${refresh.data.base} 写入 ${refresh.data.count} 个币种`);
    const refreshed = await req('GET', '/api/fx?base=CNY', { token });
    s.expectTrue('刷新后存在 exchangerate.host 来源记录',
      (refreshed.data?.data || []).some((r) => r.source === 'exchangerate.host'),
      `来源分布=${[...new Set((refreshed.data?.data || []).map((r) => r.source))].join(',')}`);
  } else if (refresh.status === 502) {
    s.warn('POST /api/fx/refresh 外部汇率源暂不可用', '端点已正确返回 502（非 500 崩溃），属外部依赖问题');
  } else {
    s.fail('POST /api/fx/refresh 刷新异常', `status=${refresh.status} ${JSON.stringify(refresh.data)?.slice(0, 160)}`);
  }
  s.info('汇率数据未清理', 'fx_rates 无删除端点；数据仅存于本轮隔离组织，不影响真实业务组织');
}

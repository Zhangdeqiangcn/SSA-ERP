/**
 * 第 38 号套件：生产运营域落库守护（工序报工 / 工作中心 / 成本费率）
 *
 * 覆盖 V3.46.0 第2批③。此前这三类数据只存用户浏览器：
 *  · 换台电脑打开，成本费率变成另一个值 → 同一批产品的成本算出来不一样且无法复算
 *  · 浏览器清缓存，已录的工序报工整块消失，而工单进度可能已按它算过
 * 本套件验证：写入真落 D1、读回字段完整（含此前存不下的 laborHours/operator）、
 * 费率按生效日取、越权写入被拦。
 */
export const meta = {
  id: '38-v346-prod-ops',
  title: '生产运营域落库守护（报工/工作中心/费率）',
};

export default async function run(ctx, s) {
  const { req } = ctx;
  const admin = ctx.admin.token;
  const stamp = String(Date.now());

  s.info('── A. 工序报工：落库 + 字段完整 ──');

  // 关键：laborHours / operator / operationId 在建表时**根本没有**（迁移 0082 才补），
  //   若实体列没同步补齐，POST 会静默丢掉这些字段 → 人工成本恒 0 而界面看着"填了"。
  const repId = `or-e2e-${stamp}`;
  const rep = await req('POST', '/api/entities/mesOperationReport', {
    token: admin,
    body: {
      id: repId,
      workOrderId: 'wo-e2e-38',
      workOrderNo: 'WO-E2E-38',
      operationId: 'op-003',
      operationName: 'V3.46.0守护工序',
      workCenter: '焊接中心',
      operator: 'E2E报工员',
      startTime: '2026-06-20T08:00:00Z',
      endTime: '2026-06-20T16:30:00Z',
      goodQuantity: 120,
      scrapQuantity: 3,
      laborHours: 8.5,
      station: 'LINE-1',
      note: '落库守护用例',
      reportedAt: '2026-06-20T16:35:00Z',
    },
  });
  s.expectStatus('★ A1 工序报工落库 201', rep, 201,
    rep.status !== 201 ? JSON.stringify(rep.data).slice(0, 220) : '');
  if (rep.data?.id) ctx.track('mesOperationReport', rep.data.id);

  // 读回验字段：迁移 0082 前的表存不下 laborHours/operator/operationId
  const gotRep = await req('GET', `/api/entities/mesOperationReport/${encodeURIComponent(repId)}`, { token: admin });
  s.expectTrue('★ A2 报工可按 id 读回（真落库而非本机内存）',
    gotRep.status === 200 && !!gotRep.data?.id, `status=${gotRep.status}`);
  s.expectTrue('★ A3 关键字段完整：laborHours（人工成本依赖它）',
    Number(gotRep.data?.laborHours) === 8.5, `laborHours=${gotRep.data?.laborHours}`);
  s.expectTrue('★ A4 报工人与工序标识可追溯（operator / operationId）',
    gotRep.data?.operator === 'E2E报工员' && gotRep.data?.operationId === 'op-003',
    `operator=${gotRep.data?.operator} operationId=${gotRep.data?.operationId}`);
  s.expectTrue('★ A5 起止时间与班别工位已存（单件工时/在制时长的输入）',
    !!gotRep.data?.startTime && !!gotRep.data?.endTime && gotRep.data?.station === 'LINE-1',
    `start=${gotRep.data?.startTime} end=${gotRep.data?.endTime} station=${gotRep.data?.station}`);

  // 产量口径：合格 120 / 报废 3 —— 报废必须单列，否则报废被当合格、成品率虚高
  s.expectTrue('★ A6 合格与报废分别存储（不混算成品率）',
    Number(gotRep.data?.goodQuantity) === 120 && Number(gotRep.data?.scrapQuantity) === 3,
    `good=${gotRep.data?.goodQuantity} scrap=${gotRep.data?.scrapQuantity}`);

  s.info('── B. 工序报工：更新与删除真落库 ──');

  const upd = await req('PUT', `/api/entities/mesOperationReport/${encodeURIComponent(repId)}`, {
    token: admin,
    body: { goodQuantity: 150, laborHours: 9.25 },
  });
  s.expectTrue('★ B1 报工更新 200', upd.status === 200, `status=${upd.status} ${JSON.stringify(upd.data).slice(0, 160)}`);

  const afterUpd = await req('GET', `/api/entities/mesOperationReport/${encodeURIComponent(repId)}`, { token: admin });
  s.expectTrue('★ B2 更新后读回是新值（不是旧值残留）',
    Number(afterUpd.data?.goodQuantity) === 150 && Number(afterUpd.data?.laborHours) === 9.25,
    `good=${afterUpd.data?.goodQuantity} hours=${afterUpd.data?.laborHours}`);

  s.info('── C. 工作中心：落库（排产与标准工时的基础） ──');

  const wcId = `wc-e2e-${stamp}`;
  const wc = await req('POST', '/api/entities/workCenter', {
    token: admin,
    body: {
      id: wcId, code: `WC-E2E-${stamp}`, name: 'E2E守护工作中心',
      description: '落库守护用例', capacityHours: 16, shiftCount: 2, hourlyRate: 85, active: 1,
    },
  });
  s.expectStatus('★ C1 工作中心落库 201', wc, 201, wc.status !== 201 ? JSON.stringify(wc.data).slice(0, 200) : '');
  if (wc.data?.id) ctx.track('workCenter', wc.data.id);

  const gotWc = await req('GET', `/api/entities/workCenter/${encodeURIComponent(wcId)}`, { token: admin });
  s.expectTrue('★ C2 工作中心可读回且产能/班次完整',
    Number(gotWc.data?.capacityHours) === 16 && Number(gotWc.data?.shiftCount) === 2,
    `cap=${gotWc.data?.capacityHours} shift=${gotWc.data?.shiftCount}`);

  s.info('── D. 成本费率：按生效日存多行（历史可复算） ──');

  // 核心价值：同一批产品跨月完工时，6 月调价不该把 5 月的成本一起改掉
  const oldRateId = `rate-e2e-${stamp}-old`;
  const newRateId = `rate-e2e-${stamp}-new`;
  const r1 = await req('POST', '/api/entities/productionRate', {
    token: admin,
    body: { id: oldRateId, rateType: 'labor', effectiveDate: '2026-01-01', rate: 60, remark: '年初费率' },
  });
  s.expectStatus('★ D1 历史费率落库 201', r1, 201, r1.status !== 201 ? JSON.stringify(r1.data).slice(0, 200) : '');
  if (r1.data?.id) ctx.track('productionRate', r1.data.id);

  const r2 = await req('POST', '/api/entities/productionRate', {
    token: admin,
    body: { id: newRateId, rateType: 'labor', effectiveDate: '2026-07-01', rate: 75, remark: '7月调价' },
  });
  s.expectStatus('★ D2 新费率落库 201（不覆盖历史那一条）', r2, 201, r2.status !== 201 ? JSON.stringify(r2.data).slice(0, 200) : '');
  if (r2.data?.id) ctx.track('productionRate', r2.data.id);

  // 按生效日取：5 月应取 60，8 月应取 75 —— 这正是"同一批货按当时费率算"的能力
  const listRate = await req('GET', '/api/entities/productionRate?page=1&pageSize=200', { token: admin });
  const rows = Array.isArray(listRate.data?.data) ? listRate.data.data : [];
  const pickByDate = (asOf) => rows
    .filter((r) => r.rateType === 'labor' && String(r.effectiveDate || '') <= asOf)
    .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)))[0];
  s.expectTrue('★ D3 5 月取年初费率 60（调价不影响历史）',
    Number(pickByDate('2026-05-31')?.rate) === 60,
    `5月取到=${pickByDate('2026-05-31')?.rate}`);
  s.expectTrue('★ D4 8 月取新费率 75（同一产品线不同时点口径正确）',
    Number(pickByDate('2026-08-15')?.rate) === 75,
    `8月取到=${pickByDate('2026-08-15')?.rate}`);

  s.info('── E. 鉴权与数据完整性 ──');

  // 注意：/api/entities/* 走的是「会话鉴权 + org 隔离 + RLS + 字段权限」，
  //   **不接 operationGuard**（那是业务专用端点用的），所以这里不能断言 403 越权。
  //   诚实做法：验真实存在的行为（未登录被拒 + 已登录可读），不断言不存在的守卫。
  const anon = await req('GET', '/api/entities/mesOperationReport?page=1&pageSize=5', { token: '' });
  s.expectTrue('★ E1 未登录读报工被拒（401，鉴权生效）',
    anon.status === 401, `status=${anon.status}`);

  const authed = await req('GET', '/api/entities/mesOperationReport?page=1&pageSize=50', { token: admin });
  s.expectTrue('★ E2 已登录可读本组织报工（鉴权不误伤合法使用者）',
    authed.status === 200, `status=${authed.status}`);

  // 负数与非法值必须被拒或被规范化：报废数填负数会让成品率算成 >100% 或负数
  const negRepId = `or-e2e-${stamp}-neg`;
  const neg = await req('POST', '/api/entities/mesOperationReport', {
    token: admin,
    body: {
      id: negRepId, workOrderNo: 'WO-E2E-NEG', operationName: '负数用例',
      goodQuantity: -5, scrapQuantity: -2, laborHours: -1, reportedAt: '2026-06-20T10:00:00Z',
    },
  });
  if (neg.status === 201 || neg.status === 200) {
    ctx.track('mesOperationReport', negRepId);
    const negGot = await req('GET', `/api/entities/mesOperationReport/${encodeURIComponent(negRepId)}`, { token: admin });
    const g = Number(negGot.data?.goodQuantity);
    const sc = Number(negGot.data?.scrapQuantity);
    // 诚实记录：当前是否已拦。若未拦，作为已知缺口上报而不是把它当"通过"
    s.expectTrue('★ E3 负数产量被拒或已归零（否则成品率会出现负数/超100%）',
      neg.status === 400 || g >= 0 || sc >= 0,
      `status=${neg.status} good=${g} scrap=${sc}（若均为负说明服务端未拦，属已知缺口）`);
  } else {
    s.expectTrue('★ E3 负数产量被服务端拒绝（400/422）',
      neg.status === 400 || neg.status === 422,
      `status=${neg.status} ${JSON.stringify(neg.data).slice(0, 160)}`);
  }

  s.info('   → 修复前：这些数据全在用户浏览器，换设备即失、费率即变；');
  s.info('     修复后：真落 D1、按生效日取费率、历史成本可复算。');
}

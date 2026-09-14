// 套件 16 · 审计写入降级通道 + 行级策略显式全量登记（V3.3.0 新增能力）
// 覆盖独立安全评测遗留项的整改效果：
//   L-04 行级策略表未做显式全量登记（「默认共享」隐式放行）
//        → 改为显式全量登记 + 未登记表默认拒绝；并以「数据库真实表清单 vs 登记表」
//          做机器校验，把「漏登记」变成一道会拦住发布的检查。
//   L-05 审计写入失败无降级记录（静默丢弃）
//        → 统一入口 + 三层降级（结构化日志 / 降级表留痕 / 永不抛出）+ 管理端可查。
//
// 说明：本套件无法在生产环境人为制造「审计写入失败」（那需要改库或打断 D1），
//   故「降级确实留痕」这条路径由本地实测（直连本地库造数）验证，此处如实标注为
//   未覆盖，只断言「降级通道已就位且当前为空」（降级表可读 = 迁移 0048 已生效）。
export const meta = { id: '16-rls-audit', title: '审计降级通道与行级策略登记' };

export default async function run(ctx, s) {
  const { req } = ctx;
  const runId = ctx.runId;
  const token = ctx.admin.token;

  // ── 1) 鉴权：健康度接口只对管理员开放 ───────────────────────────
  const anon = await req('GET', '/api/system/audit-health');
  s.expectStatus('未登录访问审计健康度返回 401', anon, 401);

  const staff = await ctx.registerUser('ral', 'buyer', 'QA');
  if (staff?.token) {
    const deny = await req('GET', '/api/system/audit-health', { token: staff.token });
    s.expectStatus('普通角色访问审计健康度返回 403', deny, 403);
  } else {
    s.warn('普通角色拒绝路径未覆盖', '未能注册普通用户，跳过');
  }

  // ── 2) 管理员可读，且结构完整 ─────────────────────────────────
  const h = await req('GET', '/api/system/audit-health', { token });
  s.expectStatus('管理员访问审计健康度返回 200', h, 200);

  const rls = h.data?.rls || {};
  const audit = h.data?.audit || {};

  // 降级表可读 = 迁移 0048 已在该库生效
  s.expectTrue(
    '审计降级表已就位（可读，未返回 unavailable）',
    audit.unavailable !== true,
    audit.unavailable ? `原因=${audit.error}` : `total=${audit.total} last24h=${audit.last24h}`,
  );
  s.expectTrue(
    '审计降级计数为数字',
    typeof audit.total === 'number',
    `total=${JSON.stringify(audit.total)}`,
  );
  s.expectEq('当前无审计降级记录（审计链路全程未失败）', audit.total, 0, `last24h=${audit.last24h}`);

  // ── 3) 行级策略登记：结构自洽 ────────────────────────────────
  s.expectTrue(
    '已登记业务表数量 ≥ 48',
    typeof rls.registeredCount === 'number' && rls.registeredCount >= 48,
    `registeredCount=${rls.registeredCount}`,
  );
  s.expectTrue(
    '平台豁免表数量 ≥ 18',
    typeof rls.exemptCount === 'number' && rls.exemptCount >= 18,
    `exemptCount=${rls.exemptCount}`,
  );

  const scopes = rls.scopes || {};
  const scopeSum = (scopes.all || 0) + (scopes.own || 0) + (scopes.dept || 0);
  s.expectEq(
    '三种可见性之和等于登记总数（无未归类的作用域）',
    scopeSum,
    rls.registeredCount,
    `all=${scopes.all} own=${scopes.own} dept=${scopes.dept} 合计=${scopeSum}`,
  );
  s.expectTrue(
    '三类作用域均非空（own/dept 未被误删）',
    (scopes.all || 0) > 0 && (scopes.own || 0) > 0 && (scopes.dept || 0) > 0,
    `all=${scopes.all} own=${scopes.own} dept=${scopes.dept}`,
  );

  const registered = new Set(rls.registered || []);
  const exempt = new Set(rls.exempt || []);
  const both = [...registered].filter((t) => exempt.has(t));
  s.expectEq('登记表与豁免表无交集（同一张表不得既登记又豁免）', both.length, 0, both.join(','));

  // ── 4) 关键业务表逐一在册（防止漏登记回归）────────────────────
  const mustRegistered = [
    'materials', 'customers', 'sales_orders', 'purchase_orders',
    'vendor_master', 'inbound_orders', 'outbound_orders', 'inventory_records',
    'work_orders', 'vouchers', 'sop_plans', 'cash_accounts',
  ];
  const missing = mustRegistered.filter((t) => !registered.has(t));
  s.expectEq('关键业务表全部在册', missing.length, 0, missing.join(','));

  // ── 5) L-04 闭环：数据库真实表清单 vs 登记表 ─────────────────
  s.expectTrue(
    '已取得数据库真实表清单',
    typeof rls.tableCount === 'number' && rls.tableCount > 0,
    `tableCount=${rls.tableCount} err=${rls.unclassifiedUnavailable || '-'}`,
  );
  const unclassified = rls.unclassified || [];
  s.expectEq(
    '全量登记闭环：数据库实有表无一遗漏（既未登记也未豁免的表 = 0）',
    unclassified.length,
    0,
    unclassified.join(','),
  );

  // 平台内部表的排除必须是「可见的」——不能被当成黑洞藏起来
  const platformTables = rls.platformTables || [];
  s.expectTrue(
    '平台内部表被如实回报（排除项不隐藏）',
    Array.isArray(platformTables) && platformTables.length >= 2,
    JSON.stringify(platformTables),
  );
  s.expectTrue(
    '排除的仅是平台内部表（前缀 sqlite_ / _cf_）',
    platformTables.every((t) => t.startsWith('sqlite_') || t.startsWith('_cf_')),
    JSON.stringify(platformTables),
  );
  // 「僵尸登记」核对：登记在案但库里不存在的表。
  //   与「漏登记」是同一枚硬币的两面——V3.3.0 首次上生产时即以守恒式 68 ≠ 69 暴露了
  //   `schema_migrations_new`（迁移 0009 的临时表，改名后即不存在）。
  //   用一个恒差 1 的守恒式去暴露问题，代价是定位困难；故此处改为直接断言「僵尸条目 = 0」，
  //   并额外断言该字段确实存在（避免新字段缺失时被 `|| []` 掩盖成假通过）。
  s.expectTrue(
    '接口已回报「僵尸登记」清单（字段存在，非旧版部署）',
    Array.isArray(rls.staleEntries),
    `staleEntries=${JSON.stringify(rls.staleEntries)}`,
  );
  const stale = rls.staleEntries || [];
  s.expectEq(
    '登记清单无僵尸条目（登记/豁免的表必须真实存在于本库）',
    stale.length,
    0,
    stale.join(','),
  );

  const nonPlatform = (rls.tableCount || 0) - platformTables.length;
  s.expectEq(
    '实有业务表 = 登记 + 豁免（三分类无遗漏、无重叠）',
    rls.registeredCount + rls.exemptCount,
    nonPlatform,
    `登记=${rls.registeredCount} 豁免=${rls.exemptCount} 实有非平台=${nonPlatform}（平台内部 ${platformTables.length} 张已单列）`,
  );

  // ── 6) 默认拒绝：本轮全部请求未触碰未登记表 ──────────────────
  const hits = rls.unregisteredHits || [];
  s.expectEq(
    '本轮未出现「未登记表被访问」（出现即说明有查询走了默认拒绝）',
    hits.length,
    0,
    hits.map((x) => `${x.table}×${x.count}`).join(','),
  );
  s.expectEq('默认拒绝子句为 1=0（拒绝全部行，而非隐式放行）', rls.denyClause, '1=0', '');

  // ── 7) 审计写入回归：统一入口仍能正常落库 ────────────────────
  const marker = `E2E-AUDIT-${runId}`;
  const wrote = await req('POST', '/api/audit/logs', {
    token,
    body: {
      entity: 'e2e-audit-health',
      action: 'e2e_probe',
      summary: `审计通道探针 ${marker}`,
      diff: { runId, step: 'suite16' },
    },
  });
  s.expectStatus('审计写入接口返回 200', wrote, 200);
  s.expectEq('审计写入未降级（degraded=false）', wrote.data?.degraded, false, JSON.stringify(wrote.data));

  // 读回确认真的落库（而不是接口报成功、实际没写）
  const readBack = await req('GET', `/api/audit?keyword=${encodeURIComponent(marker)}&pageSize=5`, { token });
  s.expectStatus('按关键字读回审计记录返回 200', readBack, 200);
  s.expectTrue(
    '审计记录确实已落库（可通过关键字检索到）',
    (readBack.data?.pagination?.total || 0) >= 1,
    `total=${readBack.data?.pagination?.total} 首条=${readBack.data?.data?.[0]?.summary || '-'}`,
  );
  const probeRow = (readBack.data?.data || []).find((r) => String(r.summary || '').includes(marker));
  s.expectTrue('落库记录的 diff 字段可解析（JSON 往返正常）', !!probeRow && probeRow.diff?.runId === runId,
    probeRow ? `diff=${JSON.stringify(probeRow.diff)}` : '未找到探针记录');

  // ── 8) 审计可见范围仍按角色收敛（L-05 改动未越权）──────────────
  if (staff?.token) {
    const selfView = await req('GET', `/api/audit?pageSize=5`, { token: staff.token });
    s.expectStatus('普通角色可读自己的审计轨迹', selfView, 200);
    s.expectEq('普通角色的审计可见范围为 self（非 org）', selfView.data?.scope, 'self', `scope=${selfView.data?.scope}`);
  }

  // ── 9) 顺带修复回归：写路径在依赖未就绪时不得抛原始 500 ─────────
  //   L-05 排查中发现：税务网关写路径直接 env.TAX_GATEWAY.put，而该 KV 绑定
  //   在 wrangler.toml 中并未声明 → 必然 TypeError → 原始 500。
  //   此处只断言「不是原始 500」：生产若已绑定该 KV 则应返回 200，未绑定则应返回
  //   可读的 503 + KV_UNBOUND。两种情况都算通过，唯独裸 500 不算。
  const tgPost = await req('POST', '/api/tax-gateway', {
    token,
    body: { provider: 'manual', dailyQuota: 500 },
  });
  s.expectTrue(
    '★ 税务网关配置保存：依赖未就绪时不返回原始 500（应为 200 或可读 503）',
    tgPost.status !== 500,
    `status=${tgPost.status} code=${tgPost.data?.code || '-'}`,
  );
  const tgGet = await req('GET', '/api/tax-gateway', { token });
  s.expectStatus('税务网关配置读取仍正常', tgGet, 200);

  // ── 10) 如实标注未覆盖路径 ────────────────────────────────────
  s.warn(
    '「审计写入失败后确实进入降级表」路径（未覆盖，已由本地实测验证）',
    '在生产环境人为制造审计写入失败需要改库或打断 D1，会污染共享生产库；本地实测已确认：构造 audit_logs 写入失败后，降级表 audit_degraded 新增一行、且业务请求仍返回成功',
  );
  s.info(
    '重复登记拦截由接口自洽性保证',
    'rls.denyClause 与登记表均由同一份 _shared/rls.ts 常量导出，不存在两套口径；本套件断言的是「数据库实有表 vs 该常量」的一致性',
  );
}

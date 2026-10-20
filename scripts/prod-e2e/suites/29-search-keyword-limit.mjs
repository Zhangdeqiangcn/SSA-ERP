// 套件 29 · 搜索关键词超长不再 500（D1 的 LIKE 模式长度上限）
// ------------------------------------------------------------------
// 覆盖 V3.20.1 修复：`LIKE or GLOB pattern too complex` (SQLITE_ERROR 7500)。
//
// ── 缺陷是什么 ──────────────────────────────────────────────────
// Cloudflare D1 把 SQLITE_LIMIT_LIKE_PATTERN_LENGTH 设成 50（原生默认 50000）。
// 关键词超过 48 字符时，模式 `%关键词%` 超过 50 字符，SQLite 直接抛错，
// 端点未捕获 → 中间件兜底成 500「请求处理失败」。生产真机二分实测：
//     48 字符 → 模式 50 字符 → 通过
//     49 字符 → 模式 51 字符 → too complex
//
// ── 为什么这个缺陷能潜伏这么久 ───────────────────────────────────
// 它只在「关键词 > 48 字符」时现形，而触发场景恰恰是最自然的操作：
// **用户把完整单号粘进搜索框**。本项目单号形如
// `OUT-WO-BF-WO-E2E-260923060258-m2b7-MAIN-1790143389976`（53 字符），一粘即炸。
// 首次暴露是在套件 28（倒冲留痕用完整单号反查出库单）。
//
// ── 本套件要证明的四件事 ────────────────────────────────────────
//   ① 23 个受影响端点在超长关键词下**全部不再 500**（含参数名为 q 的变体）
//   ② 极端长度（200 字符）也安全
//   ③ ★ 截断后**仍然搜得到目标**——不能为了不报错把搜索功能弄瘸
//      （这是本套件最重要的断言：只断言「不 500」会放过「静默搜不到」）
//   ④ 短关键词功能未退化
//
// 安全：全部写操作发生在 run 级隔离组织内（E2E-<runId>），跑完自动清理。
export const meta = { id: '29-search-keyword-limit', title: '搜索关键词超长不再 500（D1 LIKE 上限）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const P = (p, body) => req('POST', p, { token, body });
  const G = (p) => req('GET', p, { token });

  const LONG60 = 'Z'.repeat(60);
  const LONG200 = 'Q'.repeat(200);
  const CRIT48 = 'K'.repeat(48);   // 原上限临界：修复前刚好通过
  const CRIT49 = 'K'.repeat(49);   // 原上限临界：修复前第一个炸掉的长度

  // ══════════════════════════════════════════════════════════════
  // 0. 前置：造一张**超长单号**的出库单，作为「截断后仍可搜到」的被测目标
  //    单号刻意构造成 > 48 字符，与倒冲单号同形。
  // ══════════════════════════════════════════════════════════════
  const stamp = Date.now();
  const longNo = `OUT-WO-BF-WO-E2E-${runId}-MAIN-${stamp}`;
  s.expectTrue('前置：构造的单号确实超过原上限 48 字符（本例为缺陷触发形态）',
    longNo.length > 48, `单号长度=${longNo.length} 单号=${longNo}`);

  const ob = await P('/api/outbound-orders', {
    outboundNo: longNo,
    type: 'pick',
    status: 'draft', // draft：不触发库存过账，避免副作用
    customerId: 'cust-e2e',
    warehouseId: 'wh-001',
    warehouseName: '主仓库-A区',
    operator: 'E2E 关键词套件',
    outboundDate: '2026-09-23',
  });
  s.expectStatus('前置：创建超长单号出库单 200', ob, [200, 201],
    ob.status >= 300 ? JSON.stringify(ob.data).slice(0, 200) : '');
  if (ob.data?.id) ctx.track('outbound-order', ob.data.id);

  // ══════════════════════════════════════════════════════════════
  // 1. ★ 核心：超长关键词命中原单 —— 不 500 且**真的搜得到**
  // ══════════════════════════════════════════════════════════════
  const hit = await G('/api/outbound-orders?keyword=' + encodeURIComponent(longNo) + '&pageSize=20');
  s.expectStatus('★ 用完整超长单号搜索：不再 500', hit, 200,
    hit.status !== 200 ? JSON.stringify(hit.data).slice(0, 220) : '');
  const hitRow = (hit.data?.data || []).find((o) => o.outbound_no === longNo);
  s.expectTrue('★ 截断后仍能搜到目标单据（不是静默搜不到）', !!hitRow,
    hitRow ? `命中 ${hitRow.outbound_no}` : `未命中；total=${hit.data?.total}`);

  // 单条读取对照：证明单据本身入库正常（排除「造单失败导致搜不到」的假阴性）
  if (ob.data?.id) {
    const one = await G('/api/outbound-orders/' + ob.data.id);
    s.expectStatus('对照：该出库单单条读取 200', one, 200);
    s.expectEq('对照：单条读取的单号与创建一致', one.data?.outbound_no, longNo, 'outbound_no');
  }

  // ══════════════════════════════════════════════════════════════
  // 2. 23 个受影响端点 × 超长关键词：全部不得 500
  //    这份清单来自 V3.20.1 的实际改动面（functions/ 下 23 个文件）。
  //    新增列表端点若也用关键词搜索，应同步加进这里。
  // ══════════════════════════════════════════════════════════════
  const endpoints = [
    ['出库单（本轮缺陷首现场）', '/api/outbound-orders'],
    ['入库单', '/api/inbound-orders'],
    ['工单', '/api/work-orders'],
    ['工单领料单', '/api/work-orders/picking'],
    ['物料主数据', '/api/materials'],
    ['客户', '/api/customers'],
    ['供应商', '/api/vendors'],
    ['销售订单', '/api/sales-orders'],
    ['采购订单', '/api/purchase-orders'],
    ['委外单', '/api/subcontracts'],
    ['BOM', '/api/bom'],
    ['库存记录', '/api/inventory-records'],
    ['库存调整', '/api/inventory-adjustments'],
    ['库存调拨', '/api/stock-transfers'],
    ['质检冻结', '/api/quality-holds'],
    ['序列号', '/api/serial-numbers'],
    ['计划订单', '/api/planned-orders'],
    ['凭证', '/api/vouchers'],
    ['审计日志', '/api/audit'],
    ['用户', '/api/users'],
    ['组织', '/api/orgs'],
  ];

  for (const [label, path] of endpoints) {
    for (const [name, kw] of [['60 字符', LONG60], ['200 字符', LONG200]]) {
      const r = await G(path + '?keyword=' + encodeURIComponent(kw) + '&pageSize=5');
      s.expectStatus(`${label} · 关键词 ${name} 不 500`, r, 200,
        r.status !== 200 ? '原缺陷：模式超 D1 上限 50 → too complex → 500；' + JSON.stringify(r.data).slice(0, 160) : '');
    }
  }

  // org-members 的参数名是 q（不是 keyword）—— 最容易在批量修复中被漏掉的一个
  for (const [name, kw] of [['60 字符', LONG60], ['200 字符', LONG200]]) {
    const r = await G('/api/org-members?q=' + encodeURIComponent(kw) + '&pageSize=5');
    s.expectStatus(`组织成员（参数名为 q）· 关键词 ${name} 不 500`, r, 200,
      r.status !== 200 ? JSON.stringify(r.data).slice(0, 160) : '');
  }

  // 通用实体路由（覆盖多个实体共用同一段 keyword 逻辑）
  for (const res of ['sop', 'finInvoice', 'finPaymentPlan', 'repMfgLine']) {
    const r = await G(`/api/entities/${res}?keyword=` + encodeURIComponent(LONG60) + '&pageSize=5');
    s.expectStatus(`通用实体 ${res} · 关键词 60 字符不 500`, r, 200,
      r.status !== 200 ? JSON.stringify(r.data).slice(0, 160) : '');
  }

  // ══════════════════════════════════════════════════════════════
  // 3. 原上限的两个临界点：48（修复前通过）与 49（修复前第一个炸）
  //    修复后两者都必须通过 —— 若哪天截断被去掉，49 会立刻变红。
  // ══════════════════════════════════════════════════════════════
  const at48 = await G('/api/outbound-orders?keyword=' + encodeURIComponent(CRIT48) + '&pageSize=5');
  s.expectStatus('临界点：关键词 48 字符通过（修复前也通过）', at48, 200,
    at48.status !== 200 ? JSON.stringify(at48.data).slice(0, 160) : '');
  const at49 = await G('/api/outbound-orders?keyword=' + encodeURIComponent(CRIT49) + '&pageSize=5');
  s.expectStatus('★ 临界点：关键词 49 字符通过（修复前的第一个崩溃长度）', at49, 200,
    at49.status !== 200 ? '若此处变红，说明关键词截断被移除：' + JSON.stringify(at49.data).slice(0, 160) : '');

  // ══════════════════════════════════════════════════════════════
  // 4. 短关键词功能未退化（截断不能把正常搜索弄坏）
  // ══════════════════════════════════════════════════════════════
  const shortKw = longNo.slice(0, 12);
  const shortHit = await G('/api/outbound-orders?keyword=' + encodeURIComponent(shortKw) + '&pageSize=20');
  s.expectStatus('短关键词（单号前缀）搜索 200', shortHit, 200);
  s.expectTrue('短关键词能命中同一张单', !!(shortHit.data?.data || []).find((o) => o.outbound_no === longNo),
    `keyword=${shortKw} total=${shortHit.data?.total}`);

  const mShort = await G('/api/materials?keyword=M&pageSize=5');
  s.expectStatus('物料按短关键词搜索 200（功能未退化）', mShort, 200);

  const emptyKw = await G('/api/outbound-orders?keyword=&pageSize=5');
  s.expectStatus('空关键词等价于不筛选，返回 200', emptyKw, 200);

  // ══════════════════════════════════════════════════════════════
  // 5. ★ V3.21.0：LIKE 通配符转义（搜「100%」不再被当通配符）
  //
  //    修复前：`%`（任意长度）与 `_`（任意单字符）直接生效 ——
  //      搜「100%」返回「以 100 开头的一切」；搜「_」几乎能匹配任何记录。
  //    修法：进模式前转义 `%` `_` `\`，并在 SQL 里声明 `ESCAPE '\'`；
  //      两者**必须成对**，且两种错法都很隐蔽：
  //        · 只转义不声明 ESCAPE → 模式里的 `\%` 被理解成「字面反斜杠 + 通配符」，
  //          搜索去找数据里根本不存在的反斜杠 → **连该搜到的也搜不到**，且不报错；
  //        · 只声明不转义 → 通配符照旧生效（＝没修）。
  //    故本节断言刻意成对设计，任一边写错必有红字：
  //      「能搜到含 100% 的行」= 证明 ESCAPE 已声明且被识别
  //      「搜不到含 100X 的行」= 证明 % 已转义、不再当通配符
  // ══════════════════════════════════════════════════════════════
  const wcStamp = Date.now();
  const mkMat = async (suffix, name) => {
    const code = `M-E2E-WC-${suffix}-${runId}`;
    const r = await req('POST', '/api/materials', { token, body: { code, name, specification: 'E2E-SPEC', unit: '个' } });
    if (r.data?.id) ctx.track('material', r.data.id);
    return { res: r, code, id: r.data?.id };
  };

  const wcPct = await mkMat('PCT', `E2E WC ${wcStamp} 100%纯铜`);      // 含字面 %
  const wcPctX = await mkMat('PCTX', `E2E WC ${wcStamp} 100X纯铜`);    // 用 X 代替 %（对照）
  const wcUnd = await mkMat('UND', `E2E WC ${wcStamp} AB_CD料号`);     // 含字面 _
  const wcUndX = await mkMat('UNDX', `E2E WC ${wcStamp} ABXCD料号`);   // 用 X 代替 _（对照）

  for (const [label, w] of [
    ['含字面 % 的物料', wcPct], ['用 X 代替 % 的对照物料', wcPctX],
    ['含字面 _ 的物料', wcUnd], ['用 X 代替 _ 的对照物料', wcUndX],
  ]) {
    s.expectStatus(`前置：创建${label} → 201`, w.res, [200, 201],
      w.res.status >= 300 ? JSON.stringify(w.res.data).slice(0, 200) : '');
  }

  const searchMat = async (kw) => {
    const r = await G('/api/materials?keyword=' + encodeURIComponent(kw) + '&pageSize=50');
    return { res: r, rows: r.data?.data || [] };
  };

  // 5.1 搜「100%」——成对断言
  const q1 = await searchMat('100%');
  s.expectStatus('★ 搜「100%」返回 200（不再 500 也不报错）', q1.res, 200,
    q1.res.status !== 200 ? JSON.stringify(q1.res.data).slice(0, 200) : '');
  s.expectTrue(
    '★★ 搜「100%」能找到含字面 100% 的物料（证明 ESCAPE 已声明、转义符被正确识别）',
    q1.rows.some((r2) => r2.code === wcPct.code),
    `命中 code 列表=${JSON.stringify(q1.rows.map((r2) => r2.code))} 期望含 ${wcPct.code}`
  );
  s.expectTrue(
    '★★ 搜「100%」找不到含 100X 的物料（证明 % 已转义、不再当通配符）',
    !q1.rows.some((r2) => r2.code === wcPctX.code),
    `命中 code 列表=${JSON.stringify(q1.rows.map((r2) => r2.code))} 不应含 ${wcPctX.code}`
  );

  // 5.2 搜「AB_CD」——`_` 是单字符通配符，修复前会误匹配 ABXCD
  const q2 = await searchMat('AB_CD');
  s.expectStatus('★ 搜「AB_CD」返回 200', q2.res, 200);
  s.expectTrue(
    '★★ 搜「AB_CD」能找到含字面下划线的物料',
    q2.rows.some((r2) => r2.code === wcUnd.code),
    `命中 code 列表=${JSON.stringify(q2.rows.map((r2) => r2.code))}`
  );
  s.expectTrue(
    '★★ 搜「AB_CD」找不到 ABXCD（证明 _ 已转义、不再匹配任意单字符）',
    !q2.rows.some((r2) => r2.code === wcUndX.code),
    `命中 code 列表=${JSON.stringify(q2.rows.map((r2) => r2.code))} 不应含 ${wcUndX.code}`
  );

  // 5.3 单个 `%` 是最锋利的探针：修复前它匹配一切（等于没筛选）
  const q3 = await searchMat('%');
  s.expectStatus('★ 搜单个「%」返回 200', q3.res, 200);
  s.expectTrue(
    '★★ 搜单个「%」不会返回全部记录（修复前 % 匹配一切，等于筛选失效）',
    !q3.rows.some((r2) => r2.code === wcPctX.code) && !q3.rows.some((r2) => r2.code === wcUndX.code),
    `命中 code 列表=${JSON.stringify(q3.rows.map((r2) => r2.code))} ` +
    `（不应含不含字面 % 的 ${wcPctX.code} / ${wcUndX.code}）`
  );

  // 5.4 普通搜索未退化：搜不含通配符的前缀，应同时命中两条对照行
  const q4 = await searchMat('100');
  s.expectStatus('★ 搜普通词「100」返回 200', q4.res, 200);
  s.expectTrue(
    '★ 普通搜索未退化：搜「100」同时命中 100% 与 100X 两条（转义不影响正常匹配）',
    q4.rows.some((r2) => r2.code === wcPct.code) && q4.rows.some((r2) => r2.code === wcPctX.code),
    `命中 code 列表=${JSON.stringify(q4.rows.map((r2) => r2.code))}`
  );

  // 5.5 ★ 转义会让模式变长（一个 % 变两个字符），必须确认长度收口仍在生效：
  //      60 个 % 经截断 + 转义后仍不得超过 D1 的 50 字符模式上限。
  const q5 = await searchMat('%'.repeat(60));
  s.expectStatus('★★ 60 个「%」的关键词不 500（转义膨胀后的长度收口仍生效）', q5.res, 200,
    q5.res.status !== 200
      ? '若此处变红：转义把模式撑长后突破了 D1 上限，需检查 likePattern 的二次收口'
        + JSON.stringify(q5.res.data).slice(0, 160)
      : '');
  s.expectTrue(
    '★★ 60 个「%」搜不到任何记录（收口后它是一串字面 %，而数据里没有这种串）',
    q5.rows.length === 0,
    `返回 ${q5.rows.length} 条：${JSON.stringify(q5.rows.slice(0, 3).map((r2) => r2.code))}`
  );

  // 收尾
  if (ob.data?.id) {
    const del = await req('DELETE', '/api/outbound-orders/' + ob.data.id, { token });
    s.expectStatus('收尾：删除被测出库单 200', del, [200, 404]);
  }
}

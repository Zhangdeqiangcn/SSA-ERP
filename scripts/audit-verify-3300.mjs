// V3.3.0 本地实测：行级策略显式全量登记（L-04）与审计写入降级通道（L-05）
//
// 为什么需要它：「默认拒绝」与「审计失败降级」这两条路径在生产环境都不可触达——
//   ① 生产库里所有真实表都已登记，走不到「未登记表」分支；
//   ② 人为制造审计写入失败需要改库或打断 D1，会污染共享生产库。
//   故本脚本分两层验证：
//     · 单元层：把后端模块编译后直接加载，对 rlsCondition / assertRlsOwnership /
//       findUnclassifiedTables / writeAudit 的边界行为逐条断言；
//     · 接口层：对本地真实 HTTP 服务验证「登记完整性」「默认拒绝未发生」
//       「审计降级表就位且为空」「审计写入正常落库且未降级」。
//
// 用法（先启动本地服务）：
//   node scripts/audit-verify-3300.mjs
//   BASE=http://127.0.0.1:8799 node scripts/audit-verify-3300.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';

const BASE = process.env.BASE || 'http://127.0.0.1:8799';

let PASS = 0;
let FAIL = 0;
const FAILED = [];

function check(name, ok, detail = '') {
  if (ok) {
    PASS += 1;
    console.log(`  [PASS] ${name}${detail ? '  (' + detail + ')' : ''}`);
  } else {
    FAIL += 1;
    FAILED.push(name);
    console.log(`  [FAIL] ${name}  -> ${detail}`);
  }
}

/** 把 TS 模块打成临时 ESM 文件再加载（后端不在 tsc 范围内，这是最接近真实的加载方式） */
function loadModule(entry) {
  const out = path.join(os.tmpdir(), `ssa-audit-${path.basename(entry).replace(/\W/g, '_')}-${Date.now()}.mjs`);
  const res = buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    packages: 'external',
    external: ['cloudflare:*'],
    logLevel: 'silent',
  });
  fs.writeFileSync(out, res.outputFiles[0].text, 'utf8');
  return import(pathToFileURL(out).href);
}

async function http(method, p, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const r = await fetch(BASE + p, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { _raw: text.slice(0, 300) }; }
    return { status: r.status, data };
  } catch (e) {
    return { status: 0, data: { _err: String(e) } };
  }
}

/** 从迁移文件里抽取 CREATE TABLE 的表名（用于「登记是否全量」的静态独立核对） */
// 从迁移脚本推导「最终存活的表清单」。
// ⚠️ V3.3.0 修正：原实现只抓 CREATE TABLE，属**过度近似**——迁移 0009 会先建
//   `schema_migrations_new`、再 DROP 旧表、最后 RENAME 成 `schema_migrations`，
//   只抓 CREATE 会把这个**临时表**当成真实存在的表。曾因此导致登记表里多出一条
//   `schema_migrations_new`（生产门禁以 68 ≠ 69 暴露）。现按**语句在文件中的先后顺序**
//   依次处理 CREATE / DROP / RENAME，使推导结果与真实库结构一致。
function tablesFromMigrations(dir = 'migrations') {
  const names = new Set();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const re = new RegExp(
    '(CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["`]?([A-Za-z_0-9]+)["`]?)'
    + '|(ALTER\\s+TABLE\\s+["`]?([A-Za-z_0-9]+)["`]?\\s+RENAME\\s+TO\\s+["`]?([A-Za-z_0-9]+)["`]?)'
    + '|(DROP\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?["`]?([A-Za-z_0-9]+)["`]?)',
    'gi',
  );
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of sql.matchAll(re)) {
      if (m[2]) names.add(m[2].toLowerCase());                       // CREATE
      else if (m[4] && m[5]) {                                       // RENAME
        names.delete(m[4].toLowerCase());
        names.add(m[5].toLowerCase());
      } else if (m[6]) names.delete(m[6].toLowerCase());             // DROP
    }
  }
  return [...names].sort();
}

async function main() {
  console.log('='.repeat(72));
  console.log('V3.3.0 本地实测：行级策略全量登记（L-04）+ 审计降级通道（L-05）');
  console.log('='.repeat(72));

  const rls = await loadModule('functions/_shared/rls.ts');
  const auditLog = await loadModule('functions/_shared/auditLog.ts');

  // ════════════════════════════════════════════════════════════════
  console.log('\n【单元层 1】行级策略：显式全量登记与默认拒绝（L-04）');
  // ════════════════════════════════════════════════════════════════

  const admin = { id: 'u_admin', role: 'admin', org_id: 'o1', department: 'QA' };
  const buyer = { id: 'u_buyer', role: 'buyer', org_id: 'o1', department: '采购部' };
  const keeper = { id: 'u_keeper', role: 'warehouse_keeper', org_id: 'o1', department: '仓储部' };

  // 已登记：owner 域（仅本人）
  const own = rls.rlsCondition(buyer, 'customers');
  check(
    "已登记 own 表（customers）→ 追加 owner 归属条件",
    own.clause === '(owner_id = ? OR owner_id IS NULL)' && own.params.length === 1 && own.params[0] === 'u_buyer',
    `clause=${own.clause} params=${JSON.stringify(own.params)}`,
  );

  // 已登记：dept 域（按部门）
  const dept = rls.rlsCondition(keeper, 'inventory_records');
  check(
    '已登记 dept 表（inventory_records）→ 追加部门条件',
    dept.clause === '(dept_id = ? OR dept_id IS NULL)' && dept.params.length === 1 && dept.params[0] === '仓储部',
    `clause=${dept.clause} params=${JSON.stringify(dept.params)}`,
  );

  // 已登记：all 域（共享）
  const all = rls.rlsCondition(buyer, 'materials');
  check('已登记 all 表（materials）→ 不过滤', all.clause === '1=1' && all.params.length === 0,
    `clause=${all.clause}`);

  // 特权角色：一律不过滤
  const priv = rls.rlsCondition(admin, 'customers');
  check('特权角色（admin）→ 不过滤', priv.clause === '1=1', `clause=${priv.clause}`);

  // ★ 未登记表：默认拒绝（核心整改点）
  const unknown = rls.rlsCondition(buyer, 'some_table_not_registered');
  check(
    '★ 未登记表 → 默认拒绝（1=0，拒绝全部行）',
    unknown.clause === '1=0' && unknown.params.length === 0,
    `clause=${unknown.clause} params=${JSON.stringify(unknown.params)}`,
  );
  check(
    '★ 未登记表返回的参数数组为空（不会造成占位符数≠参数数）',
    Array.isArray(unknown.params) && unknown.params.length === 0,
    `params=${JSON.stringify(unknown.params)}`,
  );

  // 未登记表 + 同时含占位符的调用方式：参数数与子句匹配
  const phCount = (unknown.clause.match(/\?/g) || []).length;
  check(
    '★ 默认拒绝子句的占位符数等于参数个数（0 = 0）',
    phCount === unknown.params.length,
    `占位符=${phCount} 参数=${unknown.params.length}`,
  );

  // 豁免的平台表：不适用 = 不过滤（而非拒绝）
  const exempted = rls.rlsCondition(buyer, 'audit_logs');
  check('显式豁免的平台表（audit_logs）→ 不适用行级过滤', exempted.clause === '1=1',
    `clause=${exempted.clause}`);

  // 归属校验：未登记表 → 拒绝
  check('★ 未登记表的归属校验 → 拒绝（false）',
    rls.assertRlsOwnership(buyer, { owner_id: 'u_buyer' }, 'some_table_not_registered') === false, '');
  check('已登记 own 表：本人数据放行',
    rls.assertRlsOwnership(buyer, { owner_id: 'u_buyer' }, 'customers') === true, '');
  check('已登记 own 表：他人数据拒绝',
    rls.assertRlsOwnership(buyer, { owner_id: 'u_other' }, 'customers') === false, '');
  check('已登记 dept 表：本部门放行',
    rls.assertRlsOwnership(keeper, { dept_id: '仓储部' }, 'inventory_records') === true, '');
  check('已登记 dept 表：他部门拒绝',
    rls.assertRlsOwnership(keeper, { dept_id: '采购部' }, 'inventory_records') === false, '');

  // ════════════════════════════════════════════════════════════════
  console.log('\n【单元层 2】登记完整性：迁移建表清单 vs 登记表（L-04 闭环）');
  // ════════════════════════════════════════════════════════════════
  const migTables = tablesFromMigrations();
  const unclassified = rls.findUnclassifiedTables(migTables);
  check(
    '★ 迁移建出的每张表都已登记或显式豁免（缺口 = 0）',
    unclassified.length === 0,
    unclassified.length ? `缺口=${unclassified.join(',')}` : `已核对 ${migTables.length} 张表`,
  );

  const regList = Object.keys(rls.RLS_SCOPE);
  const exList = Object.keys(rls.RLS_EXEMPT);
  const overlap = regList.filter((t) => rls.RLS_EXEMPT[t] !== undefined);
  check('登记表与豁免表无交集', overlap.length === 0, overlap.join(','));
  check(
    '登记表与豁免表之并集覆盖迁移全部建表',
    migTables.every((t) => rls.isRlsKnown(t)),
    `登记=${regList.length} 豁免=${exList.length} 迁移建表=${migTables.length}`,
  );
  check(
    '每张豁免表都写明了理由（不允许无理由豁免）',
    exList.every((t) => typeof rls.RLS_EXEMPT[t] === 'string' && rls.RLS_EXEMPT[t].length >= 4),
    exList.filter((t) => !rls.RLS_EXEMPT[t] || rls.RLS_EXEMPT[t].length < 4).join(',') || '全部已注明',
  );
  check('登记表数量 ≥ 48', regList.length >= 48, `registered=${regList.length}`);
  check('豁免表数量 ≥ 18', exList.length >= 18, `exempt=${exList.length}`);

  // 僵尸登记（反向核对）：登记在案但真实库里不存在的表。
  //   与「漏登记」互补——本项正是生产门禁 68 ≠ 69 暴露出的问题类型。
  //
  //   ⚠️ 核对口径必须包含「非迁移脚本创建的表」：`d1_migrations` 是 wrangler
  //   迁移工具自建的账本表，从未出现在 migrations/*.sql 中，只在真实库里存在。
  //   若只用「迁移建表清单」当口径，会把它误判为僵尸条目（本地实测曾如此误报一次）。
  //   生产门禁的同一断言走的是 sqlite_master 真实清单，因此不存在这个口径问题。
  const toolCreatedTables = ['d1_migrations'];
  const registryUniverse = [...new Set([...migTables, ...toolCreatedTables])];
  check(
    '★ 登记清单无僵尸条目（登记/豁免的表必须真实存在）',
    rls.findStaleRegistryEntries(registryUniverse).length === 0,
    rls.findStaleRegistryEntries(registryUniverse).join(',') || `已核对 ${regList.length + exList.length} 条`,
  );
  check(
    '僵尸登记可被检出（反向自测：传入残缺表清单应报出缺口）',
    rls.findStaleRegistryEntries(['materials', 'customers']).length > 0,
    JSON.stringify(rls.findStaleRegistryEntries(['materials', 'customers']).slice(0, 3)),
  );
  check(
    '迁移 0009 的临时表 schema_migrations_new 未被误登记',
    rls.isRlsKnown('schema_migrations_new') === false,
    '（临时表 DROP/RENAME 后即不存在）',
  );

  // 平台内部表：按前缀排除，且排除范围可被显式检验
  check('sqlite_ 前缀被识别为平台内部表', rls.isPlatformTable('sqlite_sequence') === true, '');
  check('_cf_ 前缀被识别为平台内部表', rls.isPlatformTable('_cf_KV') === true, '');
  check('业务表不会被误判为平台内部表', rls.isPlatformTable('materials') === false, '');
  check(
    'wrangler 迁移账本 d1_migrations 已显式豁免（本地实测发现的漏登记项）',
    rls.isRlsKnown('d1_migrations') === true,
    `豁免理由=${rls.RLS_EXEMPT['d1_migrations'] || '(无)'}`,
  );
  check(
    '含平台内部表的混合清单核对结果为空（不误报）',
    rls.findUnclassifiedTables(['sqlite_sequence', '_cf_KV', '_cf_METADATA', 'd1_migrations', 'materials']).length === 0,
    JSON.stringify(rls.findUnclassifiedTables(['sqlite_sequence', '_cf_KV', '_cf_METADATA', 'd1_migrations', 'materials'])),
  );
  check(
    '平台内部表清单可单独取出（用于如实回报，不隐藏）',
    rls.findPlatformTables(['sqlite_sequence', '_cf_KV', 'materials']).length === 2,
    JSON.stringify(rls.findPlatformTables(['sqlite_sequence', '_cf_KV', 'materials'])),
  );

  // 未登记命中会被计数（可观测性）
  const rep = rls.rlsRegistryReport();
  check(
    '未登记表命中已被计数并可查询（可观测性）',
    (rep.unregisteredHits || []).some((x) => x.table === 'some_table_not_registered' && x.count >= 1),
    JSON.stringify(rep.unregisteredHits),
  );

  // ════════════════════════════════════════════════════════════════
  console.log('\n【单元层 3】审计写入降级通道（L-05）');
  // ════════════════════════════════════════════════════════════════

  // 3.1 正常路径：返回 true
  const okDb = {
    prepare() {
      return { bind: () => ({ run: async () => ({ success: true }) }) };
    },
  };
  const okRes = await auditLog.writeAudit(okDb, {
    orgId: 'o1',
    actor: { id: 'u1', name: '测试' },
    entity: 'unit_test',
    action: 'create',
    summary: '正常写入',
  });
  check(
    '审计正常写入返回 ok=true 且带回记录 id（/api/audit/logs 的既有契约）',
    okRes?.ok === true && typeof okRes.id === 'string' && okRes.id.length > 0 && okRes.degraded === false,
    `返回=${JSON.stringify(okRes)}`,
  );

  // 3.2 失败路径：不抛出、返回 false、降级留痕被写入
  const captured = [];
  const logs = [];
  const origErr = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  const failThenOkDb = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            run: async () => {
              if (sql.includes('audit_logs') && !sql.includes('audit_degraded')) {
                throw new Error('模拟审计表写入失败');
              }
              captured.push({ sql, args });
              return { success: true };
            },
          };
        },
      };
    },
  };
  let threw = null;
  let failRes = null;
  try {
    failRes = await auditLog.writeAudit(failThenOkDb, {
      orgId: 'o1',
      actor: { id: 'u1', name: '测试' },
      entity: 'unit_test',
      action: 'delete',
      summary: '模拟失败写入',
    });
  } catch (e) {
    threw = e;
  }
  console.error = origErr;

  check('★ 审计写入失败时不抛出（审计绝不阻断业务主流程）', threw === null, threw ? String(threw) : '未抛出');
  check(
    '★ 审计写入失败时返回 ok=false + degraded=true 且 id 为空（调用方可感知）',
    failRes?.ok === false && failRes.degraded === true && failRes.id === null,
    `返回=${JSON.stringify(failRes)}`,
  );
  check(
    '★ 失败时写出结构化降级日志（含 AUDIT_DEGRADED 关键词，平台日志可检索）',
    logs.some((l) => l.includes('AUDIT_DEGRADED')),
    logs.length ? logs[0].slice(0, 120) : '无日志',
  );
  check(
    '★ 失败时向 audit_degraded 表写入降级记录',
    captured.some((c) => c.sql.includes('audit_degraded') && c.args.length === 9),
    captured.length ? `捕获 ${captured.length} 条写入，含降级表=${captured.some((c) => c.sql.includes('audit_degraded'))}` : '未捕获任何写入',
  );

  // 3.3 主审计与降级表都失败：仍不抛出（只剩日志那一层）
  const origErr2 = console.error;
  console.error = () => {};
  const allFailDb = {
    prepare() {
      return { bind: () => ({ run: async () => { throw new Error('库整体不可用'); } }) };
    },
  };
  let threw2 = null;
  try {
    await auditLog.writeAudit(allFailDb, {
      orgId: 'o1', actor: { id: 'u1' }, entity: 'x', action: 'y', summary: 'z',
    });
  } catch (e) {
    threw2 = e;
  }
  console.error = origErr2;
  check('★ 主审计与降级表同时失败时仍不抛出', threw2 === null, threw2 ? String(threw2) : '未抛出');

  // 3.4 diff 序列化
  const seen = [];
  const diffDb = {
    prepare() { return { bind: (...a) => ({ run: async () => { seen.push(a); return { success: true }; } }) }; },
  };
  await auditLog.writeAudit(diffDb, {
    orgId: 'o1', actor: { id: 'u1', name: 'n' }, entity: 'e', action: 'a', summary: 's',
    entityId: 'id1', diff: { k: 1 },
  });
  check('审计记录的 diff 被序列化为 JSON', seen[0] && seen[0][8] === '{"k":1}',
    seen[0] ? `diff=${seen[0][8]}` : '未捕获');
  check('审计记录的绑定参数个数为 10（与 10 列一致）', seen[0] && seen[0].length === 10,
    seen[0] ? `参数个数=${seen[0].length}` : '未捕获');

  // ════════════════════════════════════════════════════════════════
  console.log('\n【接口层】本地真实 HTTP（需先启动本地服务）');
  // ════════════════════════════════════════════════════════════════
  const probe = await http('GET', '/api/system/audit-health');
  if (probe.status === 0) {
    check('本地服务可达', false, `无法连接 ${BASE}（${probe.data?._err}）`);
    console.log('\n提示：本地 HTTP 部分需先启动服务，例如：');
    console.log('  npx wrangler pages dev dist --local --persist-to ./.d1v330 --port 8799');
  } else {
    check('未登录访问审计健康度被拒（401）', probe.status === 401, `status=${probe.status}`);

    const login = await http('POST', '/api/auth/login', {
      body: { username: process.env.V330_USER || 'audit330', password: process.env.V330_PASS || 'Audit3300' },
    });
    if (login.status !== 200 || !login.data?.token) {
      check('本地夹具管理员登录成功', false, `status=${login.status} body=${JSON.stringify(login.data).slice(0, 200)}`);
    } else {
      const token = login.data.token;
      check('本地夹具管理员登录成功', true, `role=${login.data?.user?.role}`);

      const h = await http('GET', '/api/system/audit-health', { token });
      check('管理员访问审计健康度（200）', h.status === 200, `status=${h.status}`);

      const rlsApi = h.data?.rls || {};
      const auditApi = h.data?.audit || {};
      check(
        '★ 接口回报：数据库实有表无一遗漏（unclassified = 0）',
        Array.isArray(rlsApi.unclassified) && rlsApi.unclassified.length === 0,
        `tableCount=${rlsApi.tableCount} unclassified=${JSON.stringify(rlsApi.unclassified)}`,
      );
      check(
        '平台内部表被如实回报（不隐藏排除项）',
        Array.isArray(rlsApi.platformTables) && rlsApi.platformTables.length >= 2,
        `platformTables=${JSON.stringify(rlsApi.platformTables)}`,
      );
      check(
        '排除的仅是平台内部表（前缀 sqlite_ / _cf_）',
        (rlsApi.platformTables || []).every((t) => t.startsWith('sqlite_') || t.startsWith('_cf_')),
        JSON.stringify(rlsApi.platformTables),
      );
      check(
        '★ 接口回报的实有表清单与本地库一致（非硬编码）',
        typeof rlsApi.tableCount === 'number' && rlsApi.tableCount >= migTables.length,
        `接口 tableCount=${rlsApi.tableCount} 迁移建表=${migTables.length}`,
      );
      check('审计降级表已就位（未返回 unavailable）', auditApi.unavailable !== true,
        auditApi.unavailable ? String(auditApi.error) : `total=${auditApi.total}`);
      // 注意：本脚本自身会制造一次审计失败（见下方端到端小节），因此降级计数
      //   在重复运行时不会归零。断言改为「相对基线无新增」，脚本才可重复执行。
      const baselineTotal = auditApi.total;
      check('审计降级计数可读（作为本次运行基线）', typeof baselineTotal === 'number',
        `基线 total=${baselineTotal}（重复运行会有历史残留，属预期）`);
      check('默认拒绝子句经接口回报为 1=0', rlsApi.denyClause === '1=0', `denyClause=${rlsApi.denyClause}`);
      check(
        '本轮未出现未登记表被访问',
        Array.isArray(rlsApi.unregisteredHits) && rlsApi.unregisteredHits.length === 0,
        JSON.stringify(rlsApi.unregisteredHits),
      );

      // 审计写入回归
      const marker = 'V330-AUDIT-' + Date.now();
      const wrote = await http('POST', '/api/audit/logs', {
        token,
        body: { entity: 'v330-probe', action: 'v330_probe', summary: `探针 ${marker}`, diff: { m: marker } },
      });
      check('审计写入接口返回 200', wrote.status === 200, `status=${wrote.status}`);
      check('审计写入未降级（degraded=false）', wrote.data?.degraded === false, JSON.stringify(wrote.data));

      const back = await http('GET', `/api/audit?keyword=${encodeURIComponent(marker)}&pageSize=5`, { token });
      check('审计记录确实落库并可检索', (back.data?.pagination?.total || 0) >= 1,
        `total=${back.data?.pagination?.total}`);
      const row = (back.data?.data || []).find((r) => String(r.summary || '').includes(marker));
      check('落库记录 diff 可解析（JSON 往返正常）', !!row && row.diff?.m === marker,
        row ? `diff=${JSON.stringify(row.diff)}` : '未找到');

      // 正常审计写入不应产生降级记录：相对基线无新增
      const h2 = await http('GET', '/api/system/audit-health', { token });
      check('正常审计写入未产生降级记录（相对基线无新增）',
        h2.data?.audit?.total === baselineTotal,
        `基线=${baselineTotal} 现在=${h2.data?.audit?.total}`);

      // ════════════════════════════════════════════════════════════
      console.log('\n【端到端】真实制造「审计写入失败」，验证降级确实留痕（L-05）');
      // ════════════════════════════════════════════════════════════
      // 做法：把本地库的 audit_logs 表改名 → 审计写入必然失败
      //   → 断言 ① 业务请求未因此失败 ② 接口如实回报 degraded ③ 降级表新增一行
      //   → 断言 ④ 管理端能看到这条降级记录 → 改回表名 → 断言 ⑤ 恢复正常
      // 这是「静默丢弃 → 可发现」这条整改真正落地的直接证据。
      const sqlite = {
        run(code) {
          const py = process.env.PYTHON
            || 'C:/Users/zhangdeqiang/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
          return execFileSync(py, ['-c', code], { encoding: 'utf8' }).trim();
        },
        path() {
          return this.run(
            'import glob,os;' +
            "h=[p for p in glob.glob(os.path.join('.d1v330','v3','d1','miniflare-D1DatabaseObject','*.sqlite')) if os.path.basename(p)!='metadata.sqlite'];" +
            'print(max(h,key=os.path.getmtime))',
          );
        },
        count(table) {
          return parseInt(this.run(
            'import glob,os,sqlite3;' +
            "h=[p for p in glob.glob(os.path.join('.d1v330','v3','d1','miniflare-D1DatabaseObject','*.sqlite')) if os.path.basename(p)!='metadata.sqlite'];" +
            'db=sqlite3.connect(max(h,key=os.path.getmtime));' +
            `print(db.execute('SELECT COUNT(*) FROM ${table}').fetchone()[0])`,
          ), 10);
        },
        rename(from_, to) {
          this.run(
            'import glob,os,sqlite3;' +
            "h=[p for p in glob.glob(os.path.join('.d1v330','v3','d1','miniflare-D1DatabaseObject','*.sqlite')) if os.path.basename(p)!='metadata.sqlite'];" +
            'db=sqlite3.connect(max(h,key=os.path.getmtime));' +
            `db.execute('ALTER TABLE ${from_} RENAME TO ${to}');db.commit();print('ok')`,
          );
        },
        latest() {
          return this.run(
            'import glob,os,sqlite3;' +
            "h=[p for p in glob.glob(os.path.join('.d1v330','v3','d1','miniflare-D1DatabaseObject','*.sqlite')) if os.path.basename(p)!='metadata.sqlite'];" +
            'db=sqlite3.connect(max(h,key=os.path.getmtime));' +
            "r=db.execute('SELECT org_id,user_id,entity,action,error FROM audit_degraded ORDER BY created_at DESC LIMIT 1').fetchone();" +
            "print('|'.join([str(x) for x in (r or [])]))",
          );
        },
      };

      let degradeOk = false;
      try {
        const dbPath = sqlite.path();
        check('定位到本地 D1 数据库文件', !!dbPath, dbPath.split(/[\\/]/).pop());
        const before = sqlite.count('audit_degraded');

        sqlite.rename('audit_logs', 'audit_logs_bak');
        const broken = await http('POST', '/api/audit/logs', {
          token,
          body: { entity: 'v330-degrade', action: 'v330_probe', summary: '降级探针' },
        });
        check('★ 审计写入失败时业务接口仍返回 200（故障未扩散）', broken.status === 200,
          `status=${broken.status} body=${JSON.stringify(broken.data)}`);
        check('★ 接口如实回报 degraded=true（调用方可感知）', broken.data?.degraded === true,
          `degraded=${broken.data?.degraded}`);

        const after = sqlite.count('audit_degraded');
        check('★ 降级表确实新增了留痕记录', after === before + 1, `${before} -> ${after}`);
        const row = sqlite.latest();
        check('降级记录内容完整（组织/执行者/实体/动作/失败原因）',
          row.includes('org_v330') && row.includes('v330-degrade') && row.includes('no such table'),
          row);

        const hh = await http('GET', '/api/system/audit-health', { token });
        check('★ 管理端健康接口能看到该降级记录（相对基线 +1）',
          (hh.data?.audit?.total || 0) >= baselineTotal + 1,
          `基线=${baselineTotal} 现在=${hh.data?.audit?.total} last24h=${hh.data?.audit?.last24h}`);

        sqlite.rename('audit_logs_bak', 'audit_logs');
        const recovered = await http('POST', '/api/audit/logs', {
          token,
          body: { entity: 'v330-recover', action: 'v330_probe', summary: '恢复后探针' },
        });
        check('恢复后审计写入回到正常（degraded=false）',
          recovered.status === 200 && recovered.data?.degraded === false,
          `status=${recovered.status} degraded=${recovered.data?.degraded}`);
        degradeOk = true;
      } catch (e) {
        check('端到端降级验证可执行', false, String(e).slice(0, 200));
      }
      if (!degradeOk) {
        // 兜底：确保表名被还原，避免污染后续测试
        try { sqlite.rename('audit_logs_bak', 'audit_logs'); } catch { /* 已还原或不存在 */ }
      }

      // ════════════════════════════════════════════════════════════
      console.log('\n【顺带修复】税务网关写路径在 KV 未绑定时不再抛原始 500');
      // ════════════════════════════════════════════════════════════
      // 原状：读路径用 env?.TAX_GATEWAY?.get（安全），写路径直接 env.TAX_GATEWAY.put，
      //   而 wrangler.toml 并未声明该 KV 绑定 → 必然抛 TypeError → 原始 500。
      const tgPost = await http('POST', '/api/tax-gateway', {
        token,
        body: { provider: 'manual', dailyQuota: 500 },
      });
      check(
        '★ POST 税务网关配置：不再返回原始 500（未绑定 KV 时给可读 503）',
        tgPost.status !== 500,
        `status=${tgPost.status} code=${tgPost.data?.code} error=${String(tgPost.data?.error || '').slice(0, 60)}`,
      );
      const tgDel = await http('DELETE', '/api/tax-gateway', { token });
      check('★ DELETE 税务网关配置：同样不再返回原始 500', tgDel.status !== 500,
        `status=${tgDel.status} code=${tgDel.data?.code}`);
      const tgGet = await http('GET', '/api/tax-gateway', { token });
      check('GET 税务网关配置（读路径）仍正常返回', tgGet.status === 200, `status=${tgGet.status}`);
    }
  }

  console.log('\n' + '='.repeat(72));
  console.log(`汇总：PASS ${PASS} / FAIL ${FAIL}`);
  if (FAILED.length) {
    console.log('失败项：');
    for (const f of FAILED) console.log('  - ' + f);
  }
  console.log('='.repeat(72));
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('脚本异常：', e);
  process.exit(3);
});

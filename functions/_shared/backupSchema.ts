/**
 * 备份与恢复的「表清单」定义
 *
 * 设计要点：
 * 1. 主表（带 org_id 的组织业务表）按 org_id 导出；
 * 2. 明细表本身没有 org_id，通过父单编号关联，必须跟着父单一起导出，
 *    否则恢复后会出现「有主表无明细」的残缺单据；
 * 3. 系统运行类表（会话、验证码、登录计数、邮件日志、系统配置）不参与备份——
 *    它们要么随时可重建，要么含凭据，恢复这类数据反而会引入安全风险。
 */

/** 明细表 -> 父表 + 外键列 */
export interface ChildTableDef {
  table: string;
  parent: string;
  fk: string;
}

export const CHILD_TABLES: ChildTableDef[] = [
  { table: 'purchase_order_items', parent: 'purchase_orders', fk: 'purchase_order_id' },
  { table: 'sales_order_items', parent: 'sales_orders', fk: 'sales_order_id' },
  { table: 'inbound_order_items', parent: 'inbound_orders', fk: 'inbound_order_id' },
  { table: 'outbound_order_items', parent: 'outbound_orders', fk: 'outbound_order_id' },
  { table: 'inventory_adjustment_items', parent: 'inventory_adjustments', fk: 'inventory_adjustment_id' },
  { table: 'stock_transfer_items', parent: 'stock_transfers', fk: 'stock_transfer_id' },
  { table: 'voucher_items', parent: 'vouchers', fk: 'voucher_id' },
  { table: 'subcontract_issue_items', parent: 'subcontract_orders', fk: 'subcontract_order_id' },
  { table: 'serial_movements', parent: 'serial_masters', fk: 'serial_master_id' },
  // V3.17.9（迁移 0075）：审批动作流水从属于审批实例。
  // 必须登记为子表 —— 否则父表按 org_id 全量导出时，它会被当成独立父表再导一次
  // （它也有 org_id 列），恢复时就会先写子行、后写父行，触发外键约束失败。
  { table: 'approval_actions', parent: 'approval_instances', fk: 'instance_id' },
];

/** 不参与备份的表：运行态、凭据、日志类 */
export const EXCLUDED_TABLES = new Set([
  'sessions',              // 登录会话，恢复会造成会话劫持风险
  'email_verifications',   // 验证码，短时效
  'login_attempts',        // 登录失败计数，运行态
  'security_tickets',      // 一次性凭据
  'security_mail_queue',   // 邮件投递队列，运行态
  'mail_logs',             // 发信日志
  'system_config',         // 含邮件口令等系统凭据
  'api_keys',              // 开放网关密钥，仅存哈希且不应跨环境搬迁
  'd1_migrations',         // 迁移记录
  'schema_migrations',     // wrangler 迁移记录（无 org_id，不能当业务表导出）
  '_cf_KV',                // Cloudflare 内部
]);

/** 组织主表本体（orgs），单独处理：只导本组织那一行 */
export const ORG_TABLE = 'orgs';

/**
 * 读取数据库中真实存在的表清单，并区分主表 / 明细表。
 * 表名一律来自数据库元数据，不接受外部传入，避免 SQL 注入。
 *
 * ★ V3.52.0 备份超时分批/异步专项（13 号守护长期红的根因修复）：
 *   旧实现对每张候选表串行跑一次 PRAGMA table_info（~90 张表 = 90 次 D1 往返），
 *   生产库负载高时累计耗时轻松超过 D1 单请求 30s 限制 → 间歇性 30s 超时/500。
 *   现改为**一次 PRAGMA batch 往返**取回全部列信息（db.batch 把 N 条 PRAGMA
 *   合并成 1 次网络往返，结果行自带 table 列，按表名分组即可），
 *   并加进程内短 TTL 缓存（表结构不会秒变，60s 内重复请求直接复用）。
 *   表名仍全部来自 sqlite_master（可信元数据），无外部输入，注入面不变。
 */
// 进程内缓存：Cloudflare Worker 单实例内多请求共享；TTL 60s，兼顾时效与往返开销
let _discoverCache: { at: number; val: { parents: string[]; children: ChildTableDef[] } } | null = null;
const DISCOVER_TTL_MS = 60_000;

export async function discoverTables(
  env: any,
  opts: { force?: boolean } = {}
): Promise<{ parents: string[]; children: ChildTableDef[] }> {
  if (!opts.force && _discoverCache && Date.now() - _discoverCache.at < DISCOVER_TTL_MS) {
    return _discoverCache.val;
  }
  const res = await env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type='table'
      AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'`
  ).all();
  const all: string[] = (res.results || []).map((r: any) => String(r.name));

  const childMap = new Set(CHILD_TABLES.map((c) => c.table));
  const candidates = all.filter(
    (t) => !EXCLUDED_TABLES.has(t) && !childMap.has(t) && t !== ORG_TABLE
  );

  // 关键：不能靠静态清单判断谁能按 org_id 导出 ——
  // 一旦出现一张没有 org_id 列的表（如 wrangler 自建的 schema_migrations），
  // 整次备份就会以 no such column 失败。这里按运行时真实结构筛选。
  // ★ 一次性批量取全部候选表的列信息（1 次网络往返），替代旧的逐表串行 PRAGMA
  const hasOrgId = await tableHasOrgIdBatch(env, candidates);
  const parents = candidates.filter((t) => hasOrgId.has(t));

  // 明细表只有在父表也存在于库中时才导出（兼容旧库缺表的情况）
  const children = CHILD_TABLES.filter(
    (c) => all.includes(c.table) && all.includes(c.parent)
  );
  const val = { parents, children };
  _discoverCache = { at: Date.now(), val };
  return val;
}

/**
 * 判断一批表各自是否含 org_id 列（★ 单次 batch 往返，替代 N 次串行 PRAGMA）。
 * PRAGMA table_info 每行自带 table 列（表名），把 N 条 PRAGMA 收进一个
 * db.batch，结果行按 table 列分组即可；单条 PRAGMA 失败（表恰好不存在等）
 * 不影响整体——该行缺失的表按「无 org_id」处理（保守：不误导出陌生表）。
 */
async function tableHasOrgIdBatch(env: any, tables: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (tables.length === 0) return out;
  // D1 单 batch 上限 100 条语句，候选表 >99 时分片多批（分片间仍各只 1 次往返）
  const CHUNK = 99;
  for (let i = 0; i < tables.length; i += CHUNK) {
    const slice = tables.slice(i, i + CHUNK);
    let results: any[];
    try {
      results = await env.DB.batch(slice.map((t) => env.DB.prepare(`PRAGMA table_info(${t})`)));
    } catch (_e) {
      // ★ 稳妥兜底：batch 跑 PRAGMA 万一在 D1 后端不稳定（本次正是要治的间歇失败），
      //   降级回逐表串行 PRAGMA（旧行为），绝不比现状更糟 —— 宁可慢不可错。
      results = [];
      for (const t of slice) {
        try {
          const res = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
          results.push(res);
        } catch (_e2) {
          // 单表 PRAGMA 失败（表恰好不存在）按「无 org_id」处理，保守不误导出
          results.push({ results: [] });
        }
      }
    }
    // ★ 关键修正（V3.68.0 生产真机暴露）：batch 结果顺序与输入语句一一对应，
    //   按「索引」把每个 PRAGMA 的结果行关联到对应表名，不再依赖 PRAGMA 是否返回
    //   table 列（真实 D1 的 batch 模式未必带该列，旧实现依赖 row.table → 生产上
    //   hasOrgId 恒空 → 所有业务表被判「不可访问」→ /api/data 全表 400、备份也漏导）。
    //   串行兜底分支同样按索引关联，两条路径统一。
    for (let j = 0; j < slice.length; j++) {
      const t = slice[j];
      const rows = (results[j] && results[j].results) || [];
      for (const row of rows) {
        if (row && String(row.name) === 'org_id') { out.add(t); break; }
      }
    }
  }
  return out;
}

/** 读取一张表的真实列名（用于恢复时过滤未知列，防止注入与脏列） */
export async function tableColumns(env: any, table: string): Promise<string[]> {
  const res = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return (res.results || []).map((r: any) => String(r.name));
}

/** 校验表名是否在可信清单内（外部传入的表名必须过这一关） */
export function assertSafeTable(table: string, parents: string[], children: ChildTableDef[]): boolean {
  if (parents.includes(table)) return true;
  if (children.some((c) => c.table === table)) return true;
  return table === ORG_TABLE;
}

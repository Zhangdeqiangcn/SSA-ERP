// 外部 ERP 同步引擎（V3.68.0）
//
// 通用可配置 REST 适配器——不绑定任何品牌（金蝶/用友/SAP/自建系统皆可对接）。
// 一份「连接配置」描述：对方在哪（base_url）、怎么鉴权（auth_type/auth_config）、
// 字段怎么对（mapping_profile）。引擎据此把本组织数据「推送」到对方，或把对方数据
// 「拉取」回本系统（等效异地互备）。
//
// 设计要点：
//   ① 复用统一数据访问层（dataAccess）：拉取回写走 daBulk，天然享受 org 强制归属、
//      列交集过滤、父单归属校验、写审计——与本地人工写入同一套安全网，不另造。
//   ② 增量游标：推送时按连接级 last_synced_at 只取「上次之后变更」的行；全量用 full。
//   ③ 幂等：推送把本地 id 映射为对方 idField；拉取把对方 id 作为本地 id。重复跑不重复建。
//   ④ 失败聚合不中断：单行/单次请求失败只记进 run_items + errors，整轮继续，最终状态
//      success/partial/failed 精确反映。
//   ⑤ 鉴权四种：bearer / basic / apikey（自定义请求头）/ none。
import { isDataTable, daBulk, DataRequester } from './dataAccess';
import { CHILD_TABLES } from './backupSchema';
import { uid } from './auth';

export interface SyncConnection {
  id: string;
  org_id: string;
  name: string;
  enabled: number;
  target_type: string;
  base_url: string;
  auth_type: string;
  auth_config?: string | null;   // JSON
  mapping_profile?: string | null; // JSON
  direction: string;              // push | pull | both
  schedule_cron?: string | null;
  last_synced_at?: string | null;
}

interface TableMapping {
  resource: string;            // 对方 REST 路径段，如 'customers'
  idField?: string;            // 对方主键列名（默认 'id'）
  fields?: Record<string, string>; // 推送：本地列 -> 对方列；拉取时自动反向
  method?: 'put' | 'post';     // 推送动词，默认 put
  query?: Record<string, string>; // 拉取附加查询参数
}

interface MappingProfile {
  tables?: Record<string, TableMapping>;          // 推送映射（本地表 -> 对方）
  pullTables?: Record<string, { localTable: string; idField?: string; fields?: Record<string, string> }>;
}

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

/** 构造对方请求头（鉴权）。 */
function buildAuthHeaders(conn: SyncConnection): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const cfg = parseJson<any>(conn.auth_config, {});
  switch (conn.auth_type) {
    case 'bearer':
      if (cfg.token) headers['Authorization'] = 'Bearer ' + cfg.token;
      break;
    case 'basic':
      if (cfg.username != null && cfg.password != null) {
        const b = btoa(cfg.username + ':' + cfg.password);
        headers['Authorization'] = 'Basic ' + b;
      }
      break;
    case 'apikey':
      if (cfg.header_name && cfg.header_value) headers[cfg.header_name] = cfg.header_value;
      break;
    case 'none':
    default:
      break;
  }
  return headers;
}

/** 取对方某资源的数组数据（兼容直接数组或 {data:[...]} 包裹）。 */
async function fetchRemoteArray(conn: SyncConnection, resource: string, query?: Record<string, string>): Promise<any[]> {
  const headers = buildAuthHeaders(conn);
  let url = conn.base_url.replace(/\/$/, '') + '/' + resource.replace(/^\//, '');
  if (query && Object.keys(query).length) {
    const qs = new URLSearchParams(query).toString();
    url += '?' + qs;
  }
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) throw new Error(`GET ${resource} 返回 ${resp.status}`);
  const j: any = await resp.json();
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.data)) return j.data;
  if (j && Array.isArray(j.rows)) return j.rows;
  return [];
}

/** 推送单行到对方（put 默认按 id；post 整条 upsert）。 */
async function pushRow(conn: SyncConnection, map: TableMapping, localRow: any): Promise<{ remoteId?: string; status: string; message?: string }> {
  const headers = buildAuthHeaders(conn);
  const idField = map.idField || 'id';
  const payload: Record<string, any> = {};
  if (map.fields) {
    for (const [local, remote] of Object.entries(map.fields)) payload[remote] = localRow[local];
  } else {
    // 未给字段映射：整行原样（剔除 org_id 等内部审计列，含 V3.71.0 新增的 *_by_name）
    for (const k of Object.keys(localRow)) if (!['org_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'created_by_name', 'updated_by_name'].includes(k)) payload[k] = localRow[k];
  }
  // 始终带上 id 字段，便于对方按主键幂等
  payload[idField] = localRow.id;

  const base = conn.base_url.replace(/\/$/, '') + '/' + map.resource.replace(/^\//, '');
  const method = map.method || 'put';
  let url = base;
  if (method === 'put') url = base + '/' + encodeURIComponent(String(localRow.id));
  const resp = await fetch(url, { method: method.toUpperCase(), headers, body: JSON.stringify(payload) });
  if (!resp.ok) return { status: 'error', message: `推送 ${map.resource} 返回 ${resp.status}` };
  const j: any = await resp.json();
  const remoteId = j?.id ?? j?.[idField] ?? String(localRow.id);
  return { remoteId, status: 'ok' };
}

/** 读本地待同步行（增量：since 之后 updated_at）。 */
async function readLocalRows(env: any, orgId: string, table: string, since?: string | null): Promise<any[]> {
  const info = await isDataTable(env, table);
  if (!info.ok) return [];
  let where = 'org_id = ?';
  const args: any[] = [orgId];
  if (since) { where += ' AND updated_at > ?'; args.push(since); }
  const rows = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${where} ORDER BY updated_at ASC`).bind(...args).all();
  return (rows.results || []) as any[];
}

export interface RunOptions {
  direction?: 'push' | 'pull' | 'both';
  full?: boolean; // 忽略增量游标
}

export interface SyncResult {
  runId: string;
  status: string;
  totals: { pushed: number; pulled: number; errors: number };
  summary: string;
  items: any[];
}

/**
 * 执行一次同步运行（推送和/或拉取）。写 erp_sync_runs + erp_sync_run_items。
 * 任一单行失败都计入 errors 但整轮继续；最终据此定 success / partial / failed。
 */
export async function runSync(env: any, conn: SyncConnection, opts: RunOptions = {}): Promise<SyncResult> {
  const dir = opts.direction || (conn.direction as any) || 'push';
  const doPush = dir === 'push' || dir === 'both';
  const doPull = dir === 'pull' || dir === 'both';

  const profile = parseJson<MappingProfile>(conn.mapping_profile, {});
  const runId = uid('syn');
  const now = new Date().toISOString();
  const items: any[] = [];
  const totals = { pushed: 0, pulled: 0, errors: 0 };

  const writeRun = async (status: string, summary: string) => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO erp_sync_runs (id, org_id, connection_id, direction, status, started_at, finished_at, totals, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(runId, conn.org_id, conn.id, dir, status, now, new Date().toISOString(),
      JSON.stringify(totals), summary, now).run();
  };
  const writeItem = async (it: any) => {
    items.push(it);
    await env.DB.prepare(
      `INSERT INTO erp_sync_run_items (id, org_id, run_id, connection_id, table_name, direction, local_id, remote_id, status, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('si'), conn.org_id, runId, conn.id, it.table_name, it.direction, it.local_id || null, it.remote_id || null, it.status, it.message || null, new Date().toISOString()).run();
  };

  await writeRun('running', '同步进行中');

  let maxUpdated: string | null = conn.last_synced_at || null;

  // ───── 推送 ─────
  if (doPush && profile.tables) {
    for (const [table, map] of Object.entries(profile.tables)) {
      const rows = await readLocalRows(env, conn.org_id, table, opts.full ? null : conn.last_synced_at);
      for (const row of rows) {
        try {
          const res = await pushRow(conn, map, row);
          if (res.status === 'ok') totals.pushed++;
          else totals.errors++;
          if (row.updated_at && (!maxUpdated || row.updated_at > maxUpdated)) maxUpdated = row.updated_at;
          await writeItem({ table_name: table, direction: 'push', local_id: String(row.id), remote_id: res.remoteId, status: res.status, message: res.message });
        } catch (e: any) {
          totals.errors++;
          await writeItem({ table_name: table, direction: 'push', local_id: String(row.id), status: 'error', message: String(e?.message || e) });
        }
      }
    }
  }

  // ───── 拉取（回写本系统） ─────
  if (doPull) {
    // 拉取映射：优先 pullTables；否则复用 tables 反向（resource->本地表，fields 反向）
    const pulls: { localTable: string; resource: string; idField: string; fields?: Record<string, string>; query?: Record<string, string> }[] = [];
    if (profile.pullTables) {
      for (const [resource, m] of Object.entries(profile.pullTables)) {
        pulls.push({ localTable: m.localTable, resource, idField: m.idField || 'id', fields: m.fields, query: undefined });
      }
    } else if (profile.tables) {
      for (const [localTable, m] of Object.entries(profile.tables)) {
        const rev: Record<string, string> = {};
        if (m.fields) for (const [local, remote] of Object.entries(m.fields)) rev[remote] = local;
        pulls.push({ localTable, resource: m.resource, idField: m.idField || 'id', fields: rev, query: m.query });
      }
    }

    for (const p of pulls) {
      let remoteRows: any[] = [];
      try {
        remoteRows = await fetchRemoteArray(conn, p.resource, p.query);
      } catch (e: any) {
        totals.errors++;
        await writeItem({ table_name: p.localTable, direction: 'pull', status: 'error', message: String(e?.message || e) });
        continue;
      }
      // 转换：对方行 -> 本地行（字段反向映射 + 强制 org_id + 用对方 id 作本地 id 幂等）
      const localRows = remoteRows.map((rr) => {
        const lr: Record<string, any> = { org_id: conn.org_id, id: rr[p.idField] ?? rr.id };
        if (p.fields) {
          for (const [remote, local] of Object.entries(p.fields)) lr[local] = rr[remote];
        } else {
          for (const k of Object.keys(rr)) if (!['org_id'].includes(k)) lr[k] = rr[k];
        }
        lr.org_id = conn.org_id;
        if (!lr.id) lr.id = rr[p.idField] ?? rr.id;
        return lr;
      }).filter((lr) => lr.id);

      // 批量回写（复用 daBulk：org 强制 + 列交集 + 父单校验 + 审计）
      const requester: DataRequester = {
        org_id: conn.org_id,
        actorId: 'sync:' + conn.id,
        actorName: 'ERP同步(' + conn.name + ')',
        scopes: ['*'],
        source: 'session',
      };
      try {
        const bulkRes = await daBulk(env, requester, p.localTable, { rows: localRows, mode: 'upsert' });
        const bulk = (await bulkRes.json()) as any; // daBulk 返回 Response，必须解析体
        const written = (bulk.inserted || 0) + (bulk.deleted || 0);
        totals.pulled += written;
        totals.errors += bulk.skipped || 0;
        for (const lr of localRows) {
          await writeItem({ table_name: p.localTable, direction: 'pull', local_id: String(lr.id), remote_id: String(lr.id), status: 'ok' });
        }
        if (bulk.errors && bulk.errors.length) {
          for (const er of bulk.errors) totals.errors++;
        }
      } catch (e: any) {
        totals.errors++;
        await writeItem({ table_name: p.localTable, direction: 'pull', status: 'error', message: String(e?.message || e) });
      }
    }
  }

  // ───── 收尾：状态 + 增量游标 ─────
  let status = 'success';
  if (totals.errors > 0 && (totals.pushed > 0 || totals.pulled > 0)) status = 'partial';
  else if (totals.errors > 0 && totals.pushed === 0 && totals.pulled === 0) status = 'failed';

  if (doPush && maxUpdated && (status === 'success' || status === 'partial')) {
    await env.DB.prepare(`UPDATE erp_sync_connections SET last_synced_at = ?, updated_at = ? WHERE id = ?`)
      .bind(maxUpdated, now, conn.id).run();
  }

  const summary = `推送 ${totals.pushed} 行，拉取 ${totals.pulled} 行，错误 ${totals.errors} 行`;
  await writeRun(status, summary);

  return { runId, status, totals, summary, items };
}

/** 测试连接：对 base_url 发一次 HEAD/GET，返回可达性与状态码。 */
export async function testConnection(conn: SyncConnection): Promise<{ ok: boolean; status?: number; message: string }> {
  const headers = buildAuthHeaders(conn);
  try {
    const url = conn.base_url.replace(/\/$/, '') + '/';
    const resp = await fetch(url, { method: 'GET', headers });
    return { ok: resp.status < 500, status: resp.status, message: `连接可达，状态码 ${resp.status}` };
  } catch (e: any) {
    return { ok: false, message: String(e?.message || e) };
  }
}

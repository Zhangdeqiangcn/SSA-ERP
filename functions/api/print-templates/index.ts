// 打印模板域集合端点（C1 数据关系化 · 第二个域）
// GET  /api/print-templates        列表（全量，模板是少量基础配置；带图片资源）
// POST /api/print-templates        创建或整条保存（正文图片自动外置到资源表）
//
// ── 这个域与前一个域（BOM）的根本区别 ──────────────────────────────
// BOM 的问题是「数据存在 JSON 里，查不动」。打印模板的问题更深一层：
// **一半是数据、一半是文件，被混在同一个 JSON 字段里**。
//
// 实测：生产库该域 404.3 KB，其中 397.5 KB（98.3%）是页眉页脚里内嵌的
// base64 图片，且同一张 Logo 被存了两遍（各 203.5 KB）。所以本端点的核心
// 不是「把 JSON 拆成表」，而是**把文件夹带出来**：
//
//   写入时 stripAssets()：正文里 `<img src="data:image/png;base64,AAA...">`
//                        → 二进制存入 print_template_assets，正文留
//                          `<img src="{{asset:<id>}}">`
//   读取时 restoreAssets()：`{{asset:<id>}}` → 还原成 data URL
//
// 两个方向都在**服务端**完成，前端拿到的对象形状与改造前完全一致
// （`headerConfig.html` 里照样是可直接渲染的 data URL）。
// 这样 6 个消费方一行不用改，而库里存的是关系行 + 二进制资源。
//
// ── 为什么 blob 存原始字节而不是 base64 ────────────────────────────
// base64 每 3 字节膨胀为 4 个字符，体积多约 33%。存原始字节后，
// 取用时再编码回 base64 —— 存储省 1/4，代价只有取用时的编码开销。
//
// ── 去重（content_hash）────────────────────────────────────────────
// 同一张图被页眉、页脚、多个模板引用时只存一条。旧实现里「页眉页脚贴同一张
// Logo」就会存两份，正是 203.5 KB 冗余的来源。现在按内容指纹查重，
// 命中即复用已有资源行，不再重复占空间。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition, RLS_PRIVILEGED } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import { sanitizeTemplateHtml } from '../../_shared/templateSanitize';
import { requireByRegistry } from '../../_shared/validate';

/**
 * 图片二进制的分片大小。
 *
 * 为什么必须分片存储（这是实测逼出来的，不是设计洁癖）：
 *   D1 单条语句长度有硬上限 —— 实测 BLOB 字面量 48 KB 可写、64 KB 直接失败。
 *   页眉 Logo 是 149 KB，一条 INSERT 写不进去。
 *   而「zeroblob 占位 + 分块 UPDATE 拼接」实测会**静默损坏**（152658 字节最后只剩 784），
 *   详见迁移 0052 里 print_template_asset_chunks 的注释。
 *   所以采用「一个图片 = 多行分片」，每片 ≤ 16 KB，写入互不依赖。
 */
const ASSET_CHUNK_BYTES = 16 * 1024;

/** 模板业务列：snake（库）× camel（前端），嵌套字段单独处理 */
const TPL_COLS: Array<[string, string]> = [
  ['name', 'name'],
  ['entity', 'entity'],
  ['title', 'title'],
  ['paper_size', 'paperSize'],
  ['orientation', 'orientation'],
  ['description', 'description'],
  ['sort_order', 'sortOrder'],
];

/** data URL → { mime, bytes }；非 data URL 返回 null */
function parseDataUrl(src: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(src);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}

/** Uint8Array → base64（分块，避免超长参数栈溢出） */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

/** 内容指纹：FNV-1a 32 位（无需加密强度，只要碰撞率足够低即可做去重判据） */
function hashOf(bytes: Uint8Array, mime: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${mime}:${bytes.length}:${h.toString(16)}`;
}

/**
 * 正文里的 base64 图片 → 资源行。
 * 返回改写后的 HTML（图片变占位符）与待写入的资源清单。
 * 同一张图在正文出现多次只产出**一条**资源记录（按 content_hash 去重），
 * 所有出现位置改写为同一个占位符 —— 这是消除 203 KB 冗余的关键。
 */
function stripAssets(html: string, templateId: string) {
  const assets: Array<{ id: string; mime: string; bytes: Uint8Array; hash: string }> = [];
  const byHash = new Map<string, string>(); // hash → assetId
  if (!html) return { html: '', assets };

  const out = html.replace(
    /src="(data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+)"/g,
    (_full, dataUrl: string) => {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) return _full; // 认不出来就原样保留，绝不吞内容
      const hash = hashOf(parsed.bytes, parsed.mime);
      let assetId = byHash.get(hash);
      if (!assetId) {
        assetId = `pta-${templateId}-${assets.length + 1}`;
        byHash.set(hash, assetId);
        assets.push({ id: assetId, mime: parsed.mime, bytes: parsed.bytes, hash });
      }
      return `src="{{asset:${assetId}}}"`;
    }
  );
  return { html: out, assets };
}

/** 占位符 → data URL 还原（渲染前调用，前端拿到即可直接放进 img src） */
function restoreAssets(html: string, assetMap: Map<string, { mime: string; base64: string }>): string {
  if (!html) return '';
  return html.replace(/\{\{asset:([\w-]+)\}\}/g, (full, id: string) => {
    const a = assetMap.get(id);
    if (!a) return full; // 资源缺失时保留占位符，页面能看出异常而不是静默空白
    return `data:${a.mime};base64,${a.base64}`;
  });
}

/**
 * 写图片分片：一个图片写成 N 行，每行 ≤ ASSET_CHUNK_BYTES。
 * 每行是独立 INSERT，彼此无依赖 —— 这是关键，避开「分块 UPDATE 拼接」的静默损坏。
 */
function chunkStatements(DB: any, assetId: string, bytes: Uint8Array): any[] {
  const stmts: any[] = [];
  let idx = 0;
  for (let off = 0; off < bytes.length; off += ASSET_CHUNK_BYTES) {
    const slice = bytes.subarray(off, Math.min(off + ASSET_CHUNK_BYTES, bytes.length));
    stmts.push(
      DB.prepare(
        'INSERT INTO print_template_asset_chunks (asset_id, chunk_index, chunk) VALUES (?,?,?)'
      ).bind(assetId, idx, slice)
    );
    idx++;
  }
  // 空图片（0 字节）也要留一行，否则「有资源但零分片」会成为另一种异常态
  if (idx === 0) {
    stmts.push(
      DB.prepare(
        'INSERT INTO print_template_asset_chunks (asset_id, chunk_index, chunk) VALUES (?,?,?)'
      ).bind(assetId, 0, new Uint8Array(0))
    );
  }
  return stmts;
}

/**
 * 读图片：把某模板下全部资源的分片按 chunk_index 拼回完整二进制。
 * 一次查询取回（按 asset_id, chunk_index 排序），不在 JS 里做二次排序。
 */
async function loadAssets(
  DB: any,
  templateIds: string[]
): Promise<Map<string, { mime: string; base64: string }>> {
  const map = new Map<string, { mime: string; base64: string }>();
  if (templateIds.length === 0) return map;
  const ph = templateIds.map(() => '?').join(',');
  const res = await DB.prepare(
    `SELECT a.id AS aid, a.mime AS mime, c.chunk AS chunk
       FROM print_template_assets a
       JOIN print_template_asset_chunks c ON c.asset_id = a.id
      WHERE a.template_id IN (${ph})
      ORDER BY a.id ASC, c.chunk_index ASC`
  )
    .bind(...templateIds)
    .all();

  const buffers = new Map<string, { mime: string; parts: Uint8Array[] }>();
  for (const r of res.results || []) {
    let e = buffers.get(r.aid);
    if (!e) {
      e = { mime: r.mime, parts: [] };
      buffers.set(r.aid, e);
    }
    e.parts.push(new Uint8Array(r.chunk));
  }
  for (const [aid, e] of buffers) {
    const total = e.parts.reduce((a, p) => a + p.length, 0);
    const all = new Uint8Array(total);
    let off = 0;
    for (const p of e.parts) {
      all.set(p, off);
      off += p.length;
    }
    map.set(aid, { mime: e.mime, base64: bytesToBase64(all) });
  }
  return map;
}

/** 库行 → 前端 PrintTemplate（含图片还原） */
function rowToApi(row: any, assetMap: Map<string, { mime: string; base64: string }>) {
  const parseJson = (s: any, dflt: any) => {
    if (s == null || s === '') return dflt;
    try {
      return JSON.parse(s);
    } catch {
      return dflt;
    }
  };
  const extra = parseJson(row.extra_options, {});
  return {
    id: row.id,
    name: row.name,
    entity: row.entity,
    title: row.title || '',
    paperSize: row.paper_size || 'A4',
    orientation: row.orientation || 'portrait',
    // 兼容字段：旧版本用纯文本 headerText/footerText，保留但不再写入
    headerText: '',
    footerText: '',
    headerConfig: {
      html: restoreAssets(row.header_html || '', assetMap),
      showDate: !!row.header_show_date,
    },
    footerConfig: {
      html: restoreAssets(row.footer_html || '', assetMap),
      showDate: !!row.footer_show_date,
    },
    fieldKeys: parseJson(row.field_keys, []),
    extraOptions: extra,
    description: row.description || '',
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

/** 前端 PrintTemplate → 库值（图片外置在此发生） */
function pickTemplate(body: any, templateId: string) {
  const cols: Record<string, any> = {};
  for (const [snake, camel] of TPL_COLS) {
    if (body[camel] !== undefined) cols[snake] = body[camel];
  }
  if (body.headerConfig !== undefined) {
    // P0 修复：入库前净化页眉 HTML，从写入源头断掉存储型 XSS（SEC-001）
    cols.header_html = sanitizeTemplateHtml(body.headerConfig?.html ?? '');
    cols.header_show_date = body.headerConfig?.showDate ? 1 : 0;
  }
  if (body.footerConfig !== undefined) {
    // P0 修复：入库前净化页脚 HTML，从写入源头断掉存储型 XSS（SEC-001）
    cols.footer_html = sanitizeTemplateHtml(body.footerConfig?.html ?? '');
    cols.footer_show_date = body.footerConfig?.showDate ? 1 : 0;
  }
  if (body.fieldKeys !== undefined) cols.field_keys = JSON.stringify(body.fieldKeys || []);
  if (body.extraOptions !== undefined) cols.extra_options = JSON.stringify(body.extraOptions || {});

  // 正文里的图片剥出来（页眉 + 页脚一起处理，跨两段去重）
  const allAssets: Array<{ id: string; mime: string; bytes: Uint8Array; hash: string }> = [];
  const byHash = new Map<string, string>();
  for (const key of ['header_html', 'footer_html'] as const) {
    if (cols[key] === undefined) continue;
    const { html, assets } = stripAssets(cols[key], templateId);
    // 跨页眉页脚再合并一次：同一张 Logo 出现在两处时复用同一资源 id
    let merged = html;
    for (const a of assets) {
      const exist = byHash.get(a.hash);
      if (exist) {
        merged = merged.split(`{{asset:${a.id}}}`).join(`{{asset:${exist}}}`);
      } else {
        byHash.set(a.hash, a.id);
        allAssets.push(a);
      }
    }
    cols[key] = merged;
  }
  return { cols, assets: allAssets };
}

export async function onRequestGet(context: any) {
  const { env, request } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const entity = url.searchParams.get('entity');

  // ★ rlsCondition 返回的是 { clause, params }，必须取 .clause 拼进 SQL
  //   （直接拼对象会得到字面量 "object Object"，D1 报 no such column: object Object）
  const rls = rlsCondition(user, 'print_templates');
  let sql = `SELECT * FROM print_templates WHERE ${rls.clause}`;
  const binds: any[] = [...rls.params];
  if (entity) {
    sql += ' AND entity = ?';
    binds.push(entity);
  }
  sql += ' ORDER BY entity ASC, is_default DESC, sort_order ASC, name ASC';

  const res = await env.DB.prepare(sql).bind(...binds).all();
  const rows = res.results || [];

  // 一次取回全部图片（模板是少量基础配置，全量比 N+1 更划算）
  const assetMap = await loadAssets(
    env.DB,
    rows.map((r: any) => r.id)
  );

  const templates = rows.map((r: any) => rowToApi(r, assetMap));
  return json({ success: true, templates, total: templates.length, assetCount: assetMap.size });
}

export async function onRequestPost(context: any) {
  const { env, request } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // P0 修复：仅管理员可管理打印模板，否则任意登录用户都能注入恶意模板（SEC-001 存储型 XSS）
  if (!RLS_PRIVILEGED.has(user.role)) {
    return json({ error: '权限不足：仅管理员可管理打印模板' }, 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求体不是合法 JSON' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: '请求体为空' }, 400);
  // ★ V3.87.0 扩面：收口到集中必填登记表（单一真相，不造双源）
  const _reqCore = requireByRegistry('print_templates', body);
  if (_reqCore) return _reqCore;

  const now = new Date().toISOString();
  const templateId: string = body.id ? String(body.id) : uid('tpl');
  const { cols, assets } = pickTemplate(body, templateId);

  // 已存在则视为整条更新（模板编辑器每次保存整份配置）
  const existing = await env.DB.prepare('SELECT id FROM print_templates WHERE id = ?')
    .bind(templateId)
    .first();
  const isCreate = !existing;

  const stmts: any[] = [];
  if (isCreate) {
    const keys = ['id', 'org_id', 'created_at', 'updated_at', ...Object.keys(cols)];
    const vals = [templateId, user.org_id || null, now, now, ...Object.values(cols)];
    stmts.push(
      env.DB.prepare(
        `INSERT INTO print_templates (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
      ).bind(...vals)
    );
  } else {
    const setCols = Object.keys(cols);
    if (setCols.length > 0) {
      stmts.push(
        env.DB.prepare(
          `UPDATE print_templates SET ${setCols.map((c) => `${c}=?`).join(',')}, updated_at=? WHERE id=?`
        ).bind(...[...Object.values(cols), now, templateId])
      );
    } else {
      stmts.push(
        env.DB.prepare('UPDATE print_templates SET updated_at=? WHERE id=?').bind(now, templateId)
      );
    }
    // 图片资源整体重建：模板保存是「整份替换」语义，旧资源一并清掉
    stmts.push(
      env.DB.prepare(
        'DELETE FROM print_template_asset_chunks WHERE asset_id IN (SELECT id FROM print_template_assets WHERE template_id = ?)'
      ).bind(templateId)
    );
    stmts.push(
      env.DB.prepare('DELETE FROM print_template_assets WHERE template_id = ?').bind(templateId)
    );
  }

  // 写入图片资源（跨页眉页脚已去重，同一张图只写一条；二进制按 16 KB 分片）
  for (const a of assets) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO print_template_assets
         (id, template_id, kind, mime, file_name, byte_size, content_hash, placeholder, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(
        a.id,
        templateId,
        'image',
        a.mime,
        null,
        a.bytes.length,
        a.hash,
        `{{asset:${a.id}}}`,
        now
      )
    );
    stmts.push(...chunkStatements(env.DB, a.id, a.bytes));
  }

  try {
    await env.DB.batch(stmts);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/UNIQUE/i.test(msg)) {
      return json({ error: '同名模板已存在，请换一个名称' }, 409);
    }
    return json({ error: `保存失败：${msg}` }, 500);
  }

  const savedBytes = assets.reduce((a, x) => a + x.bytes.length, 0);
  await writeAudit(env.DB, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'print_templates',
    action: isCreate ? 'create' : 'update',
    entityId: templateId,
    summary: `${isCreate ? '新建' : '保存'}打印模板「${body.name}」（适用于${
      body.entity
    }），正文图片外置 ${assets.length} 个资源、占用 ${(savedBytes / 1024).toFixed(1)} KB（列表查询不再搬运图片）`,
  });

  // 从库里重新读回（保证回执内容就是落库内容，而不是内存里的中间态）
  const row = await env.DB.prepare('SELECT * FROM print_templates WHERE id = ?')
    .bind(templateId)
    .first();
  const assetMap = await loadAssets(env.DB, [templateId]);
  return json({ success: true, template: rowToApi(row, assetMap), assets: assets.length }, isCreate ? 201 : 200);
}

export {
  bytesToBase64,
  parseDataUrl,
  hashOf,
  stripAssets,
  restoreAssets,
  rowToApi,
  pickTemplate,
  chunkStatements,
  loadAssets,
};

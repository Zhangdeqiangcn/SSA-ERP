// GET/POST /api/fixed-assets — 固定资产 CRUD（org 隔离，#13 折旧计提服务端化 V3.17.1）
// 数据权威落在 D1 fixed_assets 表（不再存 app_state KV）。GET 首次访问做 KV→关系表惰性回填。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/entities';
import { getAppStateValue } from '../../_shared/appState';

import { roundAmount } from '../../_shared/money';

/** snake → camel（与前端 @/types/finance FixedAsset 对齐） */
function rowToFixedAsset(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    assetCode: r.asset_code,
    assetName: r.asset_name,
    category: r.category,
    originalValue: r.original_value,
    residualRate: r.residual_rate,
    usefulLifeMonths: r.useful_life_months,
    startDate: r.start_date,
    monthlyDepreciation: r.monthly_depreciation,
    accumulatedDepreciation: r.accumulated_depreciation,
    netValue: r.net_value,
    depreciationMethod: r.depreciation_method,
    status: r.status,
    scrapDate: r.scrap_date,
    lastDepreciationPeriod: r.last_depreciation_period,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

/**
 * KV 惰性回填：当组织 D1 中 fixed_assets 计数为 0，且 KV 键 ssa-erp-finance-ledger
 * 存有历史 fixedAssets 时，批量迁入关系表。幂等（仅当 D1 为空才回填），不重复、不丢数据。
 * （存量迁移不放在 migration.sql 里，因为 KV 数据按 org 各不相同、可能很大。）
 */
async function backfillFromKV(db: any, orgId: string) {
  const cnt = await db.prepare('SELECT COUNT(*) AS c FROM fixed_assets WHERE org_id = ?').bind(orgId).first();
  if (cnt && cnt.c > 0) return;
  const raw = await getAppStateValue(db, orgId, 'ssa-erp-finance-ledger');
  if (!raw) return;
  let state: any = null;
  try {
    state = JSON.parse(raw);
  } catch {
    return;
  }
  const list: any[] = Array.isArray(state?.fixedAssets) ? state.fixedAssets : [];
  if (list.length === 0) return;
  const now = new Date().toISOString();
  const stmts = list.map((a: any) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO fixed_assets
          (id, org_id, asset_code, asset_name, category, original_value, residual_rate, useful_life_months,
           start_date, monthly_depreciation, accumulated_depreciation, net_value, depreciation_method,
           status, scrap_date, note, created_at, updated_at, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .bind(
        a.id || 'fa-' + uid('fa'),
        orgId,
        a.assetCode,
        a.assetName,
        a.category,
        Number(a.originalValue) || 0,
        Number(a.residualRate) || 0,
        Number(a.usefulLifeMonths) || 0,
        a.startDate,
        Number(a.monthlyDepreciation) || 0,
        Number(a.accumulatedDepreciation) || 0,
        Number(a.netValue != null ? a.netValue : a.originalValue) || 0,
        a.depreciationMethod || 'straight_line',
        a.status || 'in_use',
        a.scrapDate || null,
        a.note || null,
        a.createdAt || now,
        a.updatedAt || now,
        a.createdBy || 'KV迁移',
        a.updatedBy || 'KV迁移'
      )
  );
  if (stmts.length) await db.batch(stmts);
}

// GET /api/fixed-assets — 列表（含 KV 首次回填）
export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  await backfillFromKV(db, user.org_id);
  const rows = await db
    .prepare('SELECT * FROM fixed_assets WHERE org_id = ? ORDER BY asset_code')
    .bind(user.org_id)
    .all();
  return json({ data: (rows.results || []).map(rowToFixedAsset) });
}

// POST /api/fixed-assets — 新增
export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  const b = await context.request.json().catch(() => ({}));
  const assetCode = (b.assetCode || '').trim();
  const assetName = (b.assetName || '').trim();
  const originalValue = Number(b.originalValue) || 0;
  const residualRate = Number(b.residualRate != null ? b.residualRate : 0.05) || 0;
  const usefulLifeMonths = Number(b.usefulLifeMonths) || 0;
  const startDate = b.startDate || new Date().toISOString().slice(0, 10);
  if (!assetCode || !assetName || !originalValue || !usefulLifeMonths) {
    return json({ error: '资产编码/名称/原值/使用年限为必填' }, 400);
  }
  const monthlyDepreciation =
    b.monthlyDepreciation != null
      ? Number(b.monthlyDepreciation)
      : roundAmount((originalValue * (1 - residualRate)) / usefulLifeMonths);
  const id = b.id || 'fa-' + uid('fa');
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO fixed_assets
        (id, org_id, asset_code, asset_name, category, original_value, residual_rate, useful_life_months,
         start_date, monthly_depreciation, accumulated_depreciation, net_value, depreciation_method,
         status, scrap_date, note, created_at, updated_at, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .bind(
      id,
      user.org_id,
      assetCode,
      assetName,
      b.category || '生产设备',
      originalValue,
      residualRate,
      usefulLifeMonths,
      startDate,
      monthlyDepreciation,
      Number(b.accumulatedDepreciation) || 0,
      b.netValue != null ? Number(b.netValue) : originalValue,
      b.depreciationMethod || 'straight_line',
      b.status || 'in_use',
      b.scrapDate || null,
      b.note || null,
      now,
      now,
      user.id,
      user.name
    )
    .run();
  await audit(db, user.org_id, user, 'fixed_assets', 'create', `新增固定资产 ${assetCode} ${assetName}`);
  const row = await db.prepare('SELECT * FROM fixed_assets WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json({ data: rowToFixedAsset(row) }, 201);
}

// PUT /api/fixed-assets — 更新（任一影响因子变化则重算月折旧，与前端公式一致）
export async function onRequestPut(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  const b = await context.request.json().catch(() => ({}));
  const id = b.id;
  if (!id) return json({ error: '资产 id 必填' }, 400);
  const existing = await db.prepare('SELECT * FROM fixed_assets WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!existing) return json({ error: '固定资产不存在' }, 404);

  const originalValue = b.originalValue != null ? Number(b.originalValue) : existing.original_value;
  const residualRate = b.residualRate != null ? Number(b.residualRate) : existing.residual_rate;
  const usefulLifeMonths = b.usefulLifeMonths != null ? Number(b.usefulLifeMonths) : existing.useful_life_months;
  let monthlyDepreciation = existing.monthly_depreciation;
  if (b.monthlyDepreciation != null) monthlyDepreciation = Number(b.monthlyDepreciation);
  else if (b.originalValue != null || b.residualRate != null || b.usefulLifeMonths != null) {
    monthlyDepreciation = roundAmount((originalValue * (1 - residualRate)) / usefulLifeMonths);
  }

  const sets: string[] = [];
  const params: any[] = [];
  const set = (col: string, val: any) => {
    sets.push(`${col} = ?`);
    params.push(val);
  };
  if (b.assetCode != null) set('asset_code', b.assetCode);
  if (b.assetName != null) set('asset_name', b.assetName);
  if (b.category != null) set('category', b.category);
  if (b.originalValue != null) set('original_value', originalValue);
  if (b.residualRate != null) set('residual_rate', residualRate);
  if (b.usefulLifeMonths != null) set('useful_life_months', usefulLifeMonths);
  if (b.startDate != null) set('start_date', b.startDate);
  set('monthly_depreciation', monthlyDepreciation);
  if (b.accumulatedDepreciation != null) set('accumulated_depreciation', Number(b.accumulatedDepreciation));
  if (b.netValue != null) set('net_value', Number(b.netValue));
  if (b.depreciationMethod != null) set('depreciation_method', b.depreciationMethod);
  if (b.status != null) set('status', b.status);
  if (b.scrapDate != null) set('scrap_date', b.scrapDate);
  if (b.note != null) set('note', b.note);
  set('updated_at', new Date().toISOString());
  set('updated_by', user.name);
  params.push(id, user.org_id);
  await db.prepare(`UPDATE fixed_assets SET ${sets.join(',')} WHERE id = ? AND org_id = ?`).bind(...params).run();
  await audit(db, user.org_id, user, 'fixed_assets', 'update', `更新固定资产 ${existing.asset_code}`);
  const row = await db.prepare('SELECT * FROM fixed_assets WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  return json({ data: rowToFixedAsset(row) });
}

// DELETE /api/fixed-assets?id=xxx — 删除
export async function onRequestDelete(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return json({ error: '资产 id 必填' }, 400);
  const existing = await db.prepare('SELECT * FROM fixed_assets WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  if (!existing) return json({ error: '固定资产不存在' }, 404);
  await db.prepare('DELETE FROM fixed_assets WHERE id = ? AND org_id = ?').bind(id, user.org_id).run();
  await audit(db, user.org_id, user, 'fixed_assets', 'delete', `删除固定资产 ${existing.asset_code}`);
  return json({ ok: true });
}

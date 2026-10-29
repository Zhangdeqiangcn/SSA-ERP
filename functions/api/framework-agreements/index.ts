// POST /api/framework-agreements — 供应商框架协议（协议价基准）落库 + 注入审批
//
// V3.65.0 立项①④ 薄端点：框架协议此前走通用 entities 路由（/api/entities/frameworkAgreement），
//   通用路由是「config 驱动范式」，无法在落库后注入 startApprovalForDoc → 审批流接不上。
//   本端点只做「创建」这一动作（建头 + 明细，明细 ceiling_price 为真实列，供付款核验读协议价基准），
//   落库后注入审批（module='vendor_agreement'，静默幂等：该模块无启用审批流则自动跳过，绝不阻断业务）。
//   增 / 删 / 改继续走通用 entities 路由（不重复造 CRUD，够用原则）；列表查也走通用路由 GET。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';
import { guardOperation } from '../../_shared/operationGuard';
import { startApprovalForDoc } from '../../_shared/autoApproval';
import { requireByRegistry } from '../../_shared/validate';

const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, '');

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  // 框架协议属采购域：采购管理可建协议，越权角色 403 + OPERATION_FORBIDDEN
  const _opGuard = await guardOperation(user, 'purchase', 'create', db, user.org_id);
  if (_opGuard) return _opGuard;

  const body = await context.request.json().catch(() => ({}));
  const vendorId = String(body.vendorId || '').slice(0, 64);
  const vendorName = String(body.vendorName || '').slice(0, 200);
  // ★ V3.87.0 扩面：收口到集中必填登记表（逻辑收口；响应保留原 MISSING_VENDOR 业务码，前端可读）
  const _reqCore = requireByRegistry('framework_agreements', body);
  if (_reqCore) return json({ error: '供应商（vendorId）必填', code: 'MISSING_VENDOR' }, 400);

  const now = nowIso();
  const id = uid('fa');
  const status = ['active', 'expired', 'closed'].includes(body.status) ? body.status : 'active';
  const items: any[] = Array.isArray(body.items) ? body.items : [];
  const releases: any[] = Array.isArray(body.releases) ? body.releases : [];

  // ── 原子提交：头 + 全部明细同 batch（全成或全回滚，杜绝「头建了明细缺」半状态）──
  const headStmt = db.prepare(
    `INSERT INTO framework_agreements
       (id, org_id, agreement_no, vendor_id, vendor_name, status, start_date, end_date,
        currency, total_ceiling, released_amount, remarks, extra_json,
        created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, user.org_id,
    String(body.agreementNo || `FA-${now.slice(0, 10).replace(/-/g, '')}`).slice(0, 64),
    vendorId, vendorName || null, status,
    String(body.startDate || '').slice(0, 10) || null,
    String(body.endDate || '').slice(0, 10) || null,
    String(body.currency || 'CNY').slice(0, 8) || 'CNY',
    Number(body.totalCeiling) || 0,
    Number(body.releasedAmount) || 0,
    String(body.remarks || '').slice(0, 500) || null,
    JSON.stringify({ releases }),
    now, now, user.name || user.username, user.name || user.username,
  );

  // 明细 ceiling_price 为真实列（V3.65 立项④ 付款核验基准数据入口）：逐行归一化，防御 undefined 进 bind 导致 500
  const itemStmts = items.map((raw) => {
    const it = (raw && typeof raw === 'object') ? raw : {};
    return db.prepare(
      `INSERT INTO framework_agreement_items
         (id, org_id, agreement_id, material_id, material_code, material_name, unit, ceiling_price, committed_qty, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      String(it.id || uid('fai')), user.org_id, id,
      String(it.materialId || '').slice(0, 64) || null,
      String(it.materialCode || '').slice(0, 64) || null,
      String(it.materialName || '').slice(0, 200) || null,
      String(it.unit || '').slice(0, 16) || null,
      Number(it.ceilingPrice) || 0,
      Number(it.committedQty) || 0,
      now, now,
    );
  });

  if (itemStmts.length <= 99) {
    await db.batch([headStmt, ...itemStmts]);
  } else {
    await headStmt.run();
    for (const s of itemStmts) await s.run();
  }

  const row: any = await db.prepare(`SELECT * FROM framework_agreements WHERE id = ?`).bind(id).first();
  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'framework_agreements',
    entityId: id,
    action: 'create',
    summary: `创建框架协议 ${row?.agreement_no || id}（供应商 ${vendorName || vendorId}，协议价明细 ${items.length} 行）`,
  });

  // V3.65.0 立项①：协议价基准落库后注入审批（静默幂等，无启用审批流则跳过，不阻断主单据）
  const appr = await startApprovalForDoc(db, user.org_id, user, 'vendor_agreement', id, row?.agreement_no).catch(() => null);

  return json({ ...row, items, releases, approval: appr ? { started: appr.started, reason: appr.reason, instanceId: appr.instanceId } : null }, 201);
}

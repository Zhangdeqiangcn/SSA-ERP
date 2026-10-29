// P0-4 供应商审核激活 · 共享辅助
// ─────────────────────────────────────────────────────────────
// 背景（V3.113.3 实测复验）：
//   系统里存在**两张供应商表**，且彼此无任何关联：
//     · vendors        —— 供应商**门户账号**表（password_hash / salt / role），
//                        由 functions/api/vendor/register.ts（自助注册）与
//                        functions/api/vendor/login.ts（门户登录）使用。
//     · vendor_master  —— 供应商**主数据**表（credit_level / tax_id / bank_account …），
//                        由 functions/api/vendors/*（CRUD、审核）使用。
//   实测生产：vendors 15 行 / vendor_master 90 行，按 id 与 vendor_code **零匹配**。
//
//   由此产生两条真实断链：
//   ① 自助注册写死 status='pending'，而门户登录只放行 'approved' → **注册后永久无法登录**。
//   ② 前端 src/services/vendor.ts 调用了 6 个后端**根本不存在**的端点
//      （pending-approvals / approve / reject / blacklist / unblacklist / ratings）
//      → 整套供应商审核与评级功能是「空头支票」，界面点了必然 404。
//
// 本模块提供两表同步与状态归一的唯一实现，避免各端点各写一套口径。
import { json } from './auth';
import { audit } from './auditLog';

/** 供应商状态口径（与 src/types/vendor.ts 的 VendorStatus 对齐） */
export const VENDOR_STATUSES = ['registered', 'pending', 'approved', 'rejected', 'blacklisted'] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

/**
 * 登录放行状态白名单。
 *
 * 为什么不只认 'approved'：实测生产 vendors 表里 **存量 2 条 status='active'**
 * （'钢铁联合集团' V001 / '华东铝业有限公司' V002）——这是更早期版本写入的值。
 * 若只认 'approved'，这两家供应商会在改代码后**突然登不进去**（存量功能回归）。
 * 故：'approved' 与 'active' 均放行；'active' 在归一时统一改写为 'approved'（幂等、可回滚）。
 */
export const LOGIN_ALLOWED_STATUSES: readonly string[] = ['approved', 'active'];

/** 归一化：把历史遗留的 'active' 映射为 'approved' */
export function normalizeVendorStatus(s: unknown): VendorStatus {
  const v = String(s ?? '').trim();
  if (v === 'active') return 'approved';
  if ((VENDOR_STATUSES as readonly string[]).includes(v)) return v as VendorStatus;
  return 'pending';
}

/** 审核类状态变更是否属于「放行」动作（审计用） */
export function isApprovalStatus(s: unknown): boolean {
  return normalizeVendorStatus(s) === 'approved';
}

/**
 * 同步供应商状态到**两张表**。
 *
 * 为什么要两表都写：门户登录读 vendors.status；供应商列表/详情读 vendor_master.status。
 * 只改一张 → 管理员在界面看到「已批准」，供应商仍登不进去（或反之），又是一个「界面与后台不一致」。
 *
 * @param db   D1 句柄
 * @param orgId 组织 id
 * @param id   供应商 id（先按 id 找，找不到再按 vendor_code 兜底）
 * @param status 目标状态（会自动归一）
 * @param actor 操作人（写审计用）
 * @param summary 审计摘要附加说明
 * @returns { ok, id, code, status, syncedTables } —— syncedTables 说明实际更新了哪几张表
 */
export async function syncVendorStatus(
  db: any,
  orgId: string,
  id: string,
  status: string,
  actor: { id: string; name: string },
  summary?: string
): Promise<{ ok: boolean; id: string | null; code: string | null; status: VendorStatus; syncedTables: string[] }> {
  const target = normalizeVendorStatus(status);

  // 先按 id 定位；id 找不到再按 vendor_code 兜底（两表 id 不一致的历史数据）
  let master: any = await db
    .prepare('SELECT id, vendor_code, status FROM vendor_master WHERE id = ? AND org_id = ?')
    .bind(id, orgId).first();
  let account: any = await db
    .prepare('SELECT id, vendor_code, status FROM vendors WHERE id = ? AND org_id = ?')
    .bind(id, orgId).first();

  // 跨表兜底：若 id 在另一张表能按 vendor_code 命中，则以同一供应商处理
  if (!master && !account) {
    const probe = await db
      .prepare('SELECT id, vendor_code FROM vendor_master WHERE vendor_code = ? AND org_id = ?')
      .bind(id, orgId).first();
    if (probe) {
      master = probe;
      account = await db
        .prepare('SELECT id, vendor_code, status FROM vendors WHERE vendor_code = ? AND org_id = ?')
        .bind(probe.vendor_code, orgId).first();
    } else {
      const probe2 = await db
        .prepare('SELECT id, vendor_code FROM vendors WHERE vendor_code = ? AND org_id = ?')
        .bind(id, orgId).first();
      if (probe2) {
        account = probe2;
        master = await db
          .prepare('SELECT id, vendor_code, status FROM vendor_master WHERE vendor_code = ? AND org_id = ?')
          .bind(probe2.vendor_code, orgId).first();
      }
    }
  }

  if (!master && !account) {
    return { ok: false, id: null, code: null, status: target, syncedTables: [] };
  }

  const realId = (master?.id || account?.id) as string;
  const code = (master?.vendor_code || account?.vendor_code || null) as string | null;
  const synced: string[] = [];
  const now = new Date().toISOString();

  if (master) {
    await db.prepare('UPDATE vendor_master SET status = ?, updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?')
      .bind(target, now, actor.name, master.id, orgId).run();
    synced.push('vendor_master');
  }
  if (account) {
    await db.prepare('UPDATE vendors SET status = ? WHERE id = ? AND org_id = ?')
      .bind(target, account.id, orgId).run();
    synced.push('vendors');
  }

  await audit(db, orgId, actor as any, 'vendor_master', isApprovalStatus(target) ? 'approve' : 'update',
    `供应商 ${code || realId} 状态 ${master?.status || account?.status || '-'} → ${target}` +
    (summary ? `（${summary}）` : '') +
    `［同步表：${synced.join(' + ') || '无'}］`);

  return { ok: true, id: realId, code, status: target, syncedTables: synced };
}

/**
 * 把供应商主数据行（vendor_master）格式化为前端 Vendor 契约。
 * 与 functions/api/vendors/index.ts 的 formatVendor 保持同构（字段名一致），避免前后端口径分叉。
 */
export function formatVendorRow(r: any) {
  return {
    id: r.id, org_id: r.org_id,
    code: r.vendor_code, name: r.company_name,
    shortName: r.short_name,
    type: r.type,
    contact: r.contact_name, phone: r.contact_phone, email: r.contact_email,
    address: r.address,
    status: r.status,
    qualificationExpiry: r.qualification_expiry,
    rating: r.rating,
    creditLevel: r.credit_level,
    creditLimit: r.credit_limit,
    usedCredit: r.used_credit,
    taxId: r.tax_id,
    bankAccount: r.bank_account,
    salesOrg: r.sales_org,
    reconciliationAccount: r.reconciliation_account,
    taxCode: r.tax_code,
    blacklistReason: r.blacklist_reason,
    blacklistedAt: r.blacklisted_at,
    blacklistReasonHistory: r.blacklist_reason_history ? JSON.parse(r.blacklist_reason_history) : undefined,
    profilePending: r.profile_pending ? JSON.parse(r.profile_pending) : undefined,
    profilePendingAt: r.profile_pending_at,
    profilePendingBy: r.profile_pending_by,
    profileReviewedBy: r.profile_reviewed_by,
    customFields: r.custom_fields ? JSON.parse(r.custom_fields) : undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
    createdBy: r.created_by, updatedBy: r.updated_by,
  };
}

/** 审核端点统一的守卫失败响应 */
export function deny(msg: string, code = 403) {
  return json({ error: msg, code }, code);
}

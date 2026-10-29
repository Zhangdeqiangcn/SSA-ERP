// 采购员定向邀请供应商注册（V3.100.0）— 前端数据访问层
//
// 两类调用：
//   · inviteApi：走通用实体路由 /api/entities/vendorInvitation（会话鉴权 + RLS 'own'
//     保证采购员只管自己的邀请；admin/super 特权看全部）。用于「采购员邀请」管理页。
//   · fetchInvitePublic / submitPublicApplication：直接 fetch 公开接口，无需登录，
//     用于供应商门户注册页（外部供应商可能未登录也能落库）。
import { entityRepo } from './entityRepo';

/** 邀请记录（与后端 vendor_invitations 行一致，camelCase） */
export interface VendorInvitation {
  id: string;
  code: string;
  buyerId?: string;
  buyerName?: string;
  salesOrg?: string;
  status?: 'active' | 'used' | 'revoked';
  expiresAt?: string | null;
  usedAt?: string | null;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 采购员邀请：实体路由 CRUD（会话鉴权 + RLS 'own'） */
export const inviteApi = {
  list: (params?: Record<string, unknown>) =>
    entityRepo.list<VendorInvitation>('vendorInvitation', params),
  create: (data: Partial<VendorInvitation>) =>
    entityRepo.create<VendorInvitation>('vendorInvitation', data),
  update: (id: string, data: Partial<VendorInvitation>) =>
    entityRepo.update<VendorInvitation>('vendorInvitation', id, data),
  remove: (id: string) => entityRepo.remove('vendorInvitation', id),
};

export interface PublicInviteInfo {
  valid: boolean;
  buyerName?: string;
  salesOrg?: string;
  status?: string;
  expiresAt?: string | null;
  reason?: string;
}

/** 公开查询邀请码信息（无需登录）——供应商门户注册页回填用 */
export async function fetchInvitePublic(code: string): Promise<PublicInviteInfo> {
  try {
    const r = await fetch(`/api/vendor-invite/${encodeURIComponent(code)}`);
    if (!r.ok) return { valid: false, reason: '邀请链接校验失败' };
    return (await r.json()) as PublicInviteInfo;
  } catch {
    return { valid: false, reason: '网络异常，无法校验邀请链接' };
  }
}

/** 公开提交供应商注册申请（无需登录）——携带有效邀请码时由服务端落库并定向归属 */
export async function submitPublicApplication(payload: Record<string, unknown>): Promise<{ ok: boolean; applicationNo?: string; error?: string }> {
  try {
    const r = await fetch('/api/vendor-application-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({ error: '网络异常' }));
    if (!r.ok) return { ok: false, error: data?.error || '提交失败' };
    return { ok: true, applicationNo: data?.applicationNo };
  } catch {
    return { ok: false, error: '网络异常，提交失败' };
  }
}

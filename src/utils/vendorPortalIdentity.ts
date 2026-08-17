/**
 * 供应商门户统一身份源（B5）
 * 门户登录会话（sessionStorage.vendorPortalUser）只携带演示用 code（V001/V002/V-NEW），
 * 与主数据供应商 code（V202401001…）并不一致。此处集中维护「登录 code → 主数据供应商」
 * 的绑定关系，作为门户回写主系统时的唯一身份依据，消除各页面散落的硬编码 ven-001 常量。
 */
import { useVendorStore } from '@/stores/vendorStore';

/** 门户登录 code → 主数据供应商 id 绑定 */
const PORTAL_VENDOR_BINDING: Record<string, { vendorId: string }> = {
  V001: { vendorId: 'ven-001' },
  V002: { vendorId: 'ven-002' },
  'V-NEW': { vendorId: 'ven-001' }, // 申请中账号暂挂主供应商，便于演示回写
  // B6 演示绑定：登录 code V-BLACK 对应种子黑名单供应商 ven-011，
  // 用于演示「黑名单供应商门户报价被拦截」的端到端体验。
  'V-BLACK': { vendorId: 'ven-011' },
};

export interface VendorPortalIdentity {
  code: string;
  name: string;
  role: string;
  /** 主数据供应商 id（门户回写主系统时使用） */
  vendorId: string;
  /** 主数据供应商名称（始终以供应商主数据为准，避免与主数据漂移） */
  vendorName: string;
}

/** 读取当前登录供应商在主数据中的真实身份；未登录返回 null */
export function getVendorPortalIdentity(): VendorPortalIdentity | null {
  const raw = sessionStorage.getItem('vendorPortalUser');
  if (!raw) return null;
  let u: { code: string; name: string; role: string };
  try {
    u = JSON.parse(raw);
  } catch {
    return null;
  }
  const bind = PORTAL_VENDOR_BINDING[u.code] || PORTAL_VENDOR_BINDING.V001;
  const vendor = useVendorStore.getState().vendors.find((v) => v.id === bind.vendorId);
  return {
    code: u.code,
    name: u.name,
    role: u.role,
    vendorId: bind.vendorId,
    vendorName: vendor?.name || u.name,
  };
}

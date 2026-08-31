import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

export interface MaterialRatingWeights {
  bomUsage: number;     // 更多 BOM 使用
  purchaseFreq: number; // 采购频次高
  shortLead: number;    // 交货期短
  lowMoq: number;       // 起订量低
  goodQuality: number;  // 质量好
}

export interface MaterialRatingConfig {
  enabled: boolean;
  weights: MaterialRatingWeights;
  thresholds: { A: number; B: number; C: number };
}

export interface VendorRatingWeights {
  quality: number;  // 质量合格率（来料检验通过率 / NCR）
  delivery: number; // 交期达成率（按约交付）
  price: number;    // 价格竞争力（对比价目表基准）
}

export interface VendorRatingConfig {
  enabled: boolean;
  weights: VendorRatingWeights;
  thresholds: { A: number; B: number; C: number };
}

/** 对接通道（原 IntegrationTab 的 localStorage `ssa-erp-integrations`） */
export type IntType = 'WMS' | 'TMS' | 'MES' | 'PLM' | 'SRM' | 'FINANCE';
export type IntStatus = 'connected' | 'disconnected' | 'testing';

export interface Integration {
  id: string;
  name: string;
  type: IntType;
  url: string;
  enabled: boolean;
  frequency: string;
  status: IntStatus;
}

/** 移动端 / PDA 配置（原 MobileTab 的 localStorage `ssa-erp-mobile-config`） */
export interface MobileConfig {
  enabled: boolean;
  accessUrl: string;
}

/** 菜单配置（原 MenuConfigTab 的 localStorage `ssa-menu-config`）——仅存顺序 + 可见性（按路由 path） */
export interface MenuConfigShape {
  order: Record<string, number>;
  visible: Record<string, boolean>;
}

/** 供应商门户配置（系统设置 → 供应商门户配置 Tab） */
export type InquiryAttachmentPolicy = 'always' | 'timed' | 'viewOnly';
export interface VendorPortalConfig {
  /** 订单确认默认时限（小时）：超过后系统自动确认，默认 24 */
  vendorOrderAutoConfirmHours: number;
  /** 询价附件下载策略：一直允许 / 限时允许 / 仅在线查看 */
  inquiryAttachmentPolicy: InquiryAttachmentPolicy;
  /** 限时允许下载的小时数（inquiryAttachmentPolicy==='timed' 时生效） */
  inquiryAttachmentDownloadHours: number;
}

export const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'i1', name: '立体库 WMS', type: 'WMS', url: 'https://wms.ssa.com/api/v1', enabled: true, frequency: '实时', status: 'connected' },
  { id: 'i2', name: '干线运输 TMS', type: 'TMS', url: 'https://tms.ssa.com/api/v1', enabled: true, frequency: '每 15 分钟', status: 'connected' },
  { id: 'i3', name: '车间 MES', type: 'MES', url: 'https://mes.ssa.com/api/v2', enabled: false, frequency: '每 5 分钟', status: 'disconnected' },
  { id: 'i4', name: '用友 U9 财务', type: 'FINANCE', url: 'https://u9.ssa.com/integration', enabled: true, frequency: '每日', status: 'connected' },
];

export const DEFAULT_MOBILE_CONFIG: MobileConfig = {
  enabled: true,
  accessUrl: 'http://erp.ssa.com/m',
};

const seedIntegrations = (): Integration[] => {
  try {
    const raw = localStorage.getItem('ssa-erp-integrations');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem('ssa-erp-integrations');
        return parsed as Integration[];
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_INTEGRATIONS.map((i) => ({ ...i }));
};

const seedMobileConfig = (): MobileConfig => {
  try {
    const raw = localStorage.getItem('ssa-erp-mobile-config');
    if (raw) {
      const parsed = JSON.parse(raw) as MobileConfig;
      localStorage.removeItem('ssa-erp-mobile-config');
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_MOBILE_CONFIG };
};

const seedMenuConfig = (): MenuConfigShape => {
  try {
    const raw = localStorage.getItem('ssa-menu-config');
    if (raw) {
      const parsed = JSON.parse(raw) as { order?: Record<string, number>; visible?: Record<string, boolean> };
      if (parsed && (parsed.order || parsed.visible)) {
        localStorage.removeItem('ssa-menu-config');
        return { order: parsed.order || {}, visible: parsed.visible || {} };
      }
    }
  } catch {
    /* ignore */
  }
  return { order: {}, visible: {} };
};

interface SettingsState {
  materialRatingConfig: MaterialRatingConfig;
  vendorRatingConfig: VendorRatingConfig;
  integrations: Integration[];
  mobileConfig: MobileConfig;
  menuConfig: MenuConfigShape;
  vendorPortalConfig: VendorPortalConfig;
  setMaterialRatingConfig: (c: MaterialRatingConfig) => void;
  setVendorRatingConfig: (c: VendorRatingConfig) => void;
  setIntegrations: (items: Integration[]) => void;
  setMobileConfig: (c: MobileConfig) => void;
  setMenuConfig: (c: MenuConfigShape) => void;
  setVendorPortalConfig: (c: VendorPortalConfig) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      materialRatingConfig: {
        enabled: true,
        weights: { bomUsage: 25, purchaseFreq: 25, shortLead: 20, lowMoq: 15, goodQuality: 15 },
        thresholds: { A: 80, B: 60, C: 40 },
      },
      vendorRatingConfig: {
        enabled: true,
        weights: { quality: 40, delivery: 35, price: 25 },
        thresholds: { A: 80, B: 60, C: 40 },
      },
      integrations: seedIntegrations(),
      mobileConfig: seedMobileConfig(),
      menuConfig: seedMenuConfig(),
      vendorPortalConfig: {
        vendorOrderAutoConfirmHours: 24,
        inquiryAttachmentPolicy: 'viewOnly',
        inquiryAttachmentDownloadHours: 24,
      },
      setMaterialRatingConfig: (c) => set({ materialRatingConfig: c }),
      setVendorRatingConfig: (c) => set({ vendorRatingConfig: c }),
      setIntegrations: (items) => set({ integrations: items }),
      setMobileConfig: (c) => set({ mobileConfig: c }),
      setMenuConfig: (c) => set({ menuConfig: c }),
      setVendorPortalConfig: (c) => set({ vendorPortalConfig: c }),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-settings', version: 1 }
  )
);

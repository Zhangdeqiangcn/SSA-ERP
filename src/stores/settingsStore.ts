import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeConfig } from './entityBackedShared';

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

/** V3.65.0 立项③：检验标准配置引擎（根治 P1-5「检验标准未纳入配置引擎统一管理」）
 *  此前质量模块建检验任务时 aql/检验水平要么写死 'N/A'、要么逐单手填，跨组织标准不一致。
 *  现在把「默认抽样方案 + 按物料类别的 AQL/检验水平覆盖」收进系统设置配置引擎，
 *  质量模块建任务时经 resolveInspectionConfig 消费：命中类别用类别值，否则用默认；
 *  配置停用或缺失时回退既有默认（绝不卡业务）——与凭证模板「未命中回退内置」同口径。 */
export interface InspectionStandardConfig {
  enabled: boolean;
  /** 默认 AQL（接收质量限 %），未命中类别时套用 */
  defaultAql: number;
  /** 默认检验水平（S-1..S-4 / I / II / III），未命中类别时套用 */
  defaultLevel: string;
  /** 按物料类别的覆盖：key=类别名，命中优先于默认 */
  perCategory: Record<string, { aql: number; level: string }>;
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

/** V3.65.0 立项③ 检验标准配置默认值（与质量模块既有默认抽样口径一致） */
export const DEFAULT_INSPECTION_STANDARD_CONFIG: InspectionStandardConfig = {
  enabled: true,
  defaultAql: 1.0,        // AQL 1.0 为制造业来料检通用抽样限（GB/T 2828.1 常规 II 级）
  defaultLevel: 'II',     // 检验水平 II（常规水平）
  perCategory: {
    // 关键件（安全/功能）从紧：AQL 0.65、水平 III
    '关键件': { aql: 0.65, level: 'III' },
    // 外观件从宽：AQL 4.0、水平 II
    '外观件': { aql: 4.0, level: 'II' },
    // 标准件（螺栓/轴承等）：AQL 1.0、水平 I（大量检验从轻抽）
    '标准件': { aql: 1.0, level: 'I' },
  },
};

/** V3.65.0 立项③：解析某物料类别应套用的检验抽样配置（供质量模块建检验任务时调用）。
 *  返回 { aql, level, fromConfig }：fromConfig=true 表示来自配置引擎；
 *  配置停用/无对应类别时返回默认抽样口径，fromConfig=false（诚实降级，绝不卡业务）。 */
export function resolveInspectionConfig(
  cfg: InspectionStandardConfig | undefined,
  materialCategory?: string
): { aql: number; level: string; fromConfig: boolean } {
  const fallback = { aql: DEFAULT_INSPECTION_STANDARD_CONFIG.defaultAql, level: DEFAULT_INSPECTION_STANDARD_CONFIG.defaultLevel, fromConfig: false };
  if (!cfg || !cfg.enabled) return fallback;
  // 命中类别覆盖 → 用类别值
  if (materialCategory && cfg.perCategory && cfg.perCategory[materialCategory]) {
    const c = cfg.perCategory[materialCategory];
    if (c && Number.isFinite(c.aql) && c.aql > 0 && c.level) {
      return { aql: c.aql, level: c.level, fromConfig: true };
    }
  }
  // 未命中类别 → 用配置的默认值（配置启用时默认值也是「配置」的一部分）
  if (Number.isFinite(cfg.defaultAql) && cfg.defaultAql > 0 && cfg.defaultLevel) {
    return { aql: cfg.defaultAql, level: cfg.defaultLevel, fromConfig: true };
  }
  return fallback; // 配置数据残缺 → 回退安全默认
}

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
  inspectionStandardConfig: InspectionStandardConfig;
  setMaterialRatingConfig: (c: MaterialRatingConfig) => void;
  setVendorRatingConfig: (c: VendorRatingConfig) => void;
  setIntegrations: (items: Integration[]) => void;
  setMobileConfig: (c: MobileConfig) => void;
  setMenuConfig: (c: MenuConfigShape) => void;
  setVendorPortalConfig: (c: VendorPortalConfig) => void;
  setInspectionStandardConfig: (c: InspectionStandardConfig) => void;
}

const RES = 'systemSetting';
const CFG_ID = 'app-config';

// V3.77.0：本地 persist 保留作离线缓存；同时经 D1 关系表 system_settings 作组织共享权威源。
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
      inspectionStandardConfig: { ...DEFAULT_INSPECTION_STANDARD_CONFIG, perCategory: { ...DEFAULT_INSPECTION_STANDARD_CONFIG.perCategory } },
      setMaterialRatingConfig: (c) => set({ materialRatingConfig: c }),
      setVendorRatingConfig: (c) => set({ vendorRatingConfig: c }),
      setIntegrations: (items) => set({ integrations: items }),
      setMobileConfig: (c) => set({ mobileConfig: c }),
      setMenuConfig: (c) => set({ menuConfig: c }),
      setVendorPortalConfig: (c) => set({ vendorPortalConfig: c }),
      setInspectionStandardConfig: (c) => set({ inspectionStandardConfig: c }),
    }),
    { storage: backendStorage, name: 'ssa-erp-settings', version: 1 }
  )
);

// ── V3.77.0 D1 同步层（组织共享配置，避免各终端配置漂移）──
function snapshotConfig(s: SettingsState) {
  return {
    materialRatingConfig: s.materialRatingConfig,
    vendorRatingConfig: s.vendorRatingConfig,
    integrations: s.integrations,
    mobileConfig: s.mobileConfig,
    menuConfig: s.menuConfig,
    vendorPortalConfig: s.vendorPortalConfig,
    inspectionStandardConfig: s.inspectionStandardConfig,
  };
}

let hydrating = false;
export const hydrateSettings = async () => {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 50 });
    const rows = parsePayload(res?.data || []);
    const cfg = rows.find((r) => r.id === CFG_ID);
    if (cfg) {
      const { id: _i, ...rest } = cfg as any;
      useSettingsStore.setState(rest);
    } else {
      // 首跑：把当前（含旧 localStorage 迁移来的）配置写回 D1
      writeConfig(RES, CFG_ID, { id: CFG_ID, ...snapshotConfig(useSettingsStore.getState()) });
    }
  } catch {
    /* 离线/异常：保留本地缓存 */
  } finally {
    hydrating = false;
  }
};

// 任何配置变更 → 写穿 D1（hydrate 自身 set 不触发）
useSettingsStore.subscribe((s) => {
  if (hydrating) return;
  if (isAuthed()) writeConfig(RES, CFG_ID, { id: CFG_ID, ...snapshotConfig(s) });
});

// 模块加载即自动水合（未登录/离线静默兜底）
void hydrateSettings();

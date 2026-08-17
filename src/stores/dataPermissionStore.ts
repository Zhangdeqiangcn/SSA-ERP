import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 数据权限（行级 / 组织级）开关（C3 核心之二）
 * ------------------------------------------------------------
 * 把 P2-2 已有的 orgStore（currentOrgId）落地为真正的「业务数据过滤」：
 *   - enabled=false：关闭数据权限，全部数据可见（默认，兼容老逻辑）。
 *   - mode='all'：开启但仍显示全部组织数据（组织级「全部可见」）。
 *   - mode='current-org'：仅显示归属 currentOrgId 的数据；无 orgId 的遗留数据仍可见。
 *   - modules：按模块控制哪些业务域纳入过滤（如 production / purchase / sales）。
 *
 * 业务模块通过 passDataPermission(orgId, currentOrgId, ...) 判断是否展示某行。
 */

export type PermissionMode = 'all' | 'current-org';

/** 敏感字段屏蔽配置：按角色 + 模块隐藏特定字段 */
export interface SensitiveFieldConfig {
  role: string;
  module: string;
  fields: string[];
}

export interface DataPermissionState {
  enabled: boolean;
  mode: PermissionMode;
  /** 纳入数据权限过滤的业务模块开关 */
  modules: Record<string, boolean>;
  /** 敏感字段屏蔽配置 */
  sensitiveFields: SensitiveFieldConfig[];
  setEnabled: (v: boolean) => void;
  setMode: (m: PermissionMode) => void;
  toggleModule: (key: string) => void;
  setSensitiveFields: (configs: SensitiveFieldConfig[]) => void;
  addSensitiveFieldConfig: (config: SensitiveFieldConfig) => void;
  removeSensitiveFieldConfig: (role: string, module: string) => void;
  /** 检查当前用户是否有权查看指定模块的指定字段 */
  isFieldVisible: (userRole: string, module: string, fieldName: string) => boolean;
  reset: () => void;
}

const seedModules: Record<string, boolean> = {
  production: true,
  purchase: true,
  sales: true,
  warehouse: false,
  quality: false,
};

const defaultSensitiveFields: SensitiveFieldConfig[] = [
  { role: 'warehouse_keeper', module: 'purchase', fields: ['unitPrice'] },
  { role: 'buyer', module: 'sales', fields: ['unitPrice'] },
  { role: 'qa_inspector', module: 'purchase', fields: ['unitPrice'] },
];

export const useDataPermissionStore = create<DataPermissionState>()(
  persist(
    (set, get) => ({
      enabled: false,
      mode: 'all',
      modules: { ...seedModules },
      sensitiveFields: [...defaultSensitiveFields],

      setEnabled: (v) => set({ enabled: v }),
      setMode: (m) => set({ mode: m }),
      toggleModule: (key) =>
        set((s) => ({ modules: { ...s.modules, [key]: !s.modules[key] } })),
      setSensitiveFields: (configs) => set({ sensitiveFields: configs }),
      addSensitiveFieldConfig: (config) =>
        set((s) => {
          const idx = s.sensitiveFields.findIndex(
            (c) => c.role === config.role && c.module === config.module
          );
          if (idx >= 0) {
            const next = [...s.sensitiveFields];
            next[idx] = config;
            return { sensitiveFields: next };
          }
          return { sensitiveFields: [...s.sensitiveFields, config] };
        }),
      removeSensitiveFieldConfig: (role, module) =>
        set((s) => ({
          sensitiveFields: s.sensitiveFields.filter(
            (c) => !(c.role === role && c.module === module)
          ),
        })),
      isFieldVisible: (userRole, module, fieldName) => {
        const config = get().sensitiveFields.find(
          (c) => c.role === userRole && c.module === module
        );
        if (!config) return true;
        return !config.fields.includes(fieldName);
      },
      reset: () =>
        set({
          enabled: false,
          mode: 'all',
          modules: { ...seedModules },
          sensitiveFields: [...defaultSensitiveFields],
        }),
    }),
    {
      name: 'ssa-erp-data-permission',
      version: 2,
      partialize: (state) => ({
        enabled: state.enabled,
        mode: state.mode,
        modules: state.modules,
        sensitiveFields: state.sensitiveFields,
      }),
    }
  )
);

/**
 * 行级可见性判定：供业务列表过滤使用。
 * @param orgId        该行数据的归属组织（无则为遗留数据）
 * @param currentOrgId 当前登录/切换到的组织
 * @param enabled      数据权限总开关
 * @param mode         组织级模式
 * @param moduleKey    业务模块键
 * @param modules      各模块纳入过滤的开关
 */
export const passDataPermission = (
  orgId: string | undefined,
  currentOrgId: string,
  enabled: boolean,
  mode: PermissionMode,
  moduleKey: string,
  modules: Record<string, boolean>
): boolean => {
  if (!enabled) return true;                 // 总开关关闭：全部可见
  if (mode === 'all') return true;           // 组织级「全部可见」
  if (!modules[moduleKey]) return true;      // 该模块未纳入过滤
  if (!orgId) return true;                   // 遗留数据默认可见
  return orgId === currentOrgId;             // 仅当前组织
};

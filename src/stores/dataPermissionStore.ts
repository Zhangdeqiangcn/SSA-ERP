import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

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

// ── 行级可见性范围（镜像后端 functions/_shared/rls.ts TABLE_RLS）──
//  D1/SQLite 无原生 RLS，后端在 org_id 隔离基础上按角色追加 owner/dept 过滤。
//  前端此处仅做「展示一致性」对齐（非强制，真强制在后端），避免界面出现后端会拦截的数据。
export type RlsScope = 'all' | 'own' | 'dept';

/** 前端业务模块 → 行级可见性范围（与后端表范围语义对齐） */
export const MODULE_RLS_SCOPE: Record<string, RlsScope> = {
  materials: 'all',      // 物料=共享主数据
  production: 'all',     // 工单=共享
  finance: 'all',        // 凭证=共享
  warehouse: 'dept',     // 出入库/库存按部门
  quality: 'dept',
  purchase: 'own',       // 采购单/供应商按负责人
  vendor: 'own',
  sales: 'own',          // 销售单/客户按负责人
  customer: 'own',
};

/** 豁免角色：组织内管理员/老板看全部（与后端 RLS_PRIVILEGED 一致） */
export const RLS_PRIVILEGED = new Set(['admin', 'owner', 'boss']);

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
  // 采购：仓库/质检看不到单价与订单金额
  { role: 'warehouse_keeper', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },
  { role: 'qa_inspector', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },
  // 销售：采购/仓库/质检看不到单价与订单金额
  { role: 'buyer', module: 'sales', fields: ['unitPrice', 'orderAmount'] },
  { role: 'warehouse_keeper', module: 'sales', fields: ['orderAmount'] },
  { role: 'qa_inspector', module: 'sales', fields: ['orderAmount'] },
  // 客户：仓库/采购/质检看不到授信额度
  { role: 'warehouse_keeper', module: 'customer', fields: ['creditLimit'] },
  { role: 'buyer', module: 'customer', fields: ['creditLimit'] },
  { role: 'qa_inspector', module: 'customer', fields: ['creditLimit'] },
  // 供应商：仓库/质检看不到授信额度
  { role: 'warehouse_keeper', module: 'vendor', fields: ['creditLimit'] },
  { role: 'qa_inspector', module: 'vendor', fields: ['creditLimit'] },
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
    { storage: backendStorage,
    
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
 * @param opts         对接后端 D1 行级策略（角色可见性）的可选项，仅影响前端展示一致性，非强制
 *                       - role:    当前用户角色（admin/owner/boss 豁免）
 *                       - userId:  当前用户 id（'own' 范围比对 ownerId）
 *                       - userDept:当前用户部门（'dept' 范围比对 deptId）
 *                       - ownerId: 该行负责人 id
 *                       - deptId:  该行部门
 */
export const passDataPermission = (
  orgId: string | undefined,
  currentOrgId: string,
  enabled: boolean,
  mode: PermissionMode,
  moduleKey: string,
  modules: Record<string, boolean>,
  opts?: { role?: string; userId?: string; userDept?: string; ownerId?: string; deptId?: string }
): boolean => {
  if (!enabled) return true;                 // 总开关关闭：全部可见
  if (mode === 'all') return true;           // 组织级「全部可见」
  if (!modules[moduleKey]) return true;      // 该模块未纳入过滤
  if (!orgId) return true;                   // 遗留数据默认可见
  if (orgId !== currentOrgId) return false;  // 仅当前组织

  // ── 后端 D1 行级策略（角色可见性）前端展示一致性对齐 ──
  // 豁免角色看全部；'all' 范围不过滤；'own' 比负责人；'dept' 比部门。
  if (opts?.role && RLS_PRIVILEGED.has(opts.role)) return true;
  const scope = MODULE_RLS_SCOPE[moduleKey] ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'own') return !opts?.ownerId || opts.ownerId === opts.userId;
  if (scope === 'dept') return !opts?.deptId || opts.deptId === opts.userDept;
  return true;
};

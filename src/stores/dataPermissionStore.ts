import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { RLS_PRIVILEGED, maskValue, checkRoleOperation } from '@/utils/roleOperation';
import type { RoleModuleOperation } from '@/utils/roleOperation';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeConfig } from './entityBackedShared';

// 透传导出：保持对外 API 兼容（其它模块从本 store 导入这些符号，V3.44.0 提取纯函数时保留）。
export { RLS_PRIVILEGED, maskValue } from '@/utils/roleOperation';
export type { RoleModuleOperation } from '@/utils/roleOperation';

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
//  D1/SQLite 无原生 RLS，后端在 org_id 隔离基础上按角色追加 负责人/部门 范围过滤。
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

/** 字段级权限模式：hidden=完全隐藏，readonly=可见但不可写 */
export type FieldMode = 'hidden' | 'readonly';

/** 敏感字段屏蔽配置：按角色 + 模块 + 模式控制字段 */
export interface SensitiveFieldConfig {
  role: string;
  module: string;
  fields: string[];
  /** 权限模式：'hidden'（默认，字段不可见）或 'readonly'（字段可见但不可修改） */
  mode?: FieldMode;
}

export interface DataPermissionState {
  enabled: boolean;
  mode: PermissionMode;
  /** 纳入数据权限过滤的业务模块开关 */
  modules: Record<string, boolean>;
  /** 敏感字段屏蔽配置 */
  sensitiveFields: SensitiveFieldConfig[];
  /** 操作权限配置（V2.91.0 新增） */
  roleModuleOps: RoleModuleOperation[];
  setEnabled: (v: boolean) => void;
  setMode: (m: PermissionMode) => void;
  toggleModule: (key: string) => void;
  setSensitiveFields: (configs: SensitiveFieldConfig[]) => void;
  addSensitiveFieldConfig: (config: SensitiveFieldConfig) => void;
  removeSensitiveFieldConfig: (role: string, module: string) => void;
  /** 检查当前用户是否有权查看指定模块的指定字段 */
  isFieldVisible: (userRole: string, module: string, fieldName: string) => boolean;
  /** 检查当前用户是否对某模块有某操作权限（V2.91.0 新增） */
  hasOperation: (userRole: string, module: string, operation: 'create' | 'read' | 'update' | 'delete') => boolean;
  /** V2.91.0：更新角色操作权限 */
  setRoleModuleOp: (role: string, module: string, operations: RoleModuleOperation['operations']) => void;
  /** 脱敏工具：保留首尾、中间掩码 */
  maskValue: (value: string, mask?: string) => string;
  reset: () => void;
}

const seedModules: Record<string, boolean> = {
  production: true,
  purchase: true,
  sales: true,
  warehouse: false,
  quality: false,
};

// V2.91.0 默认操作权限：大部分角色只有读权限，管理员/负责人有写权限
/** 超级管理员：全部模块全权限（默认矩阵与持久化迁移复用同一份定义） */
const SUPER_ADMIN_ROLE_OPS: RoleModuleOperation = {
  role: 'super_admin', module: '*', operations: { create: true, read: true, update: true, delete: true },
};
/** 普通用户：只读（与 ROLE_DEFINITIONS 中 user 的 view 权限保持一致） */
const PLAIN_USER_ROLE_OPS: RoleModuleOperation = {
  role: 'user', module: '*', operations: { create: false, read: true, update: false, delete: false },
};

const defaultRoleModuleOps: RoleModuleOperation[] = [
  // 超级管理员 / 系统管理员：全部模块全权限
  SUPER_ADMIN_ROLE_OPS,
  { role: 'admin', module: '*', operations: { create: true, read: true, update: true, delete: true } },
  PLAIN_USER_ROLE_OPS,

  // 采购员：采购模块有写权限
  { role: 'buyer', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'buyer', module: 'vendor', operations: { create: false, read: true, update: true, delete: false } },

  // 库管：仓储模块有写权限
  { role: 'warehouse_keeper', module: 'warehouse', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'warehouse_keeper', module: 'material', operations: { create: false, read: true, update: true, delete: false } },

  // 质检：质量模块有写权限
  { role: 'qa_inspector', module: 'quality', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'qa_inspector', module: 'warehouse', operations: { create: false, read: true, update: false, delete: false } },

  // 生产班长：生产模块有写权限
  { role: 'prod_leader', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'prod_leader', module: 'purchase', operations: { create: false, read: true, update: false, delete: false } },

  // 物流：只读
  { role: 'logistics', module: 'purchase', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'logistics', module: 'sales', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'logistics', module: 'warehouse', operations: { create: false, read: true, update: false, delete: false } },

  // 研发工程师：只读
  { role: 'rd_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },

  // 销售管理员 / 销售员：销售模块写权限（V3.28.0 补齐，消除 P0 守卫缺口）
  { role: 'sales_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'salesperson', module: 'sales', operations: { create: true, read: true, update: true, delete: false } },

  // ★ V3.51.0 对标三大 ERP「财务是资金最终闸门」：财务主管/会计补全 4 个模块写权
  //   （与后端 BUILTIN_ROLE_OPS 逐条对齐，铁律㉛同口径两处实现对齐）。
  //   注意：前端默认矩阵此前连财务主管的 finance 全权条目都没有（结构性不一致），
  //   本批一并补齐 finance/purchase/sales/vendor 四块。
  //   ⚠ 副作用：采购/销售/供应商在 RLS own 档按负责人隔离，财务「有写权但未必看得到他人单据」，
  //   可见性错配留待强哥二次确认是否给财务加全组织可见性。
  { role: 'finance_manager', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'finance_manager', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'finance_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'finance_manager', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },

  // ★ V3.51.0 修「供应商门户倒挂」：供应商可改自身资质（update），仍不能建/删档案。
  //   create 走「门户申请 → 财务建档」（财务上面已拿到 vendor.create），RLS own 档保证只改本人。
  { role: 'vendor', module: 'vendor', operations: { create: false, read: true, update: true, delete: false } },

  // ★ V3.55.0 前后端矩阵统一：补齐 13 条「后端 BUILTIN_ROLE_OPS 已放行、前端默认缺失」的条目，
  //   使前端默认矩阵与后端逐条一致（铁律㉛同口径对齐）——界面显示哪些按钮 = 后端真正放行哪些，
  //   消除"有按钮却 403"与"后端放行但前端找不到入口"两类毛病（后端仍是权威守卫，前端多显示绝不越权）。
  // V3.45.0 序列号/采购申请接入守卫后，库管、采购员对这两个新模块的写权需显式给出：
  { role: 'warehouse_keeper', module: 'serial', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'buyer', module: 'purchase-request', operations: { create: true, read: true, update: true, delete: true } },
  // 只读兜底角色（无 `*` 行会被 `?? false` 判成全零权限，须显式补只读行）：
  { role: 'process_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'qa_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  // V3.51.0 与菜单权限对齐，修「生产主管/工艺工程师能建单却被拒」（P1）：
  { role: 'prod_manager', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'process_engineer', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'prod_manager', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  // V3.48.0 审批流定义 = 公司级公共配置（组织内业务运维角色协作维护：读+改，建/删归管理员）：
  { role: 'buyer', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'warehouse_keeper', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'prod_leader', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'sales_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'finance_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'qa_inspector', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
];

// V2.86.0 字段权限覆盖全部模块：默认角色×字段矩阵（8 模块）
// 规则：仅对"不应看到该金额/成本/授信"的角色隐藏；系统管理员/财务主管/会计等特权角色不在此表即全部可见。
const defaultSensitiveFields: SensitiveFieldConfig[] = [
  // 物料：标准价/移动平均价（成本）对非成本/采购角色隐藏
  { role: 'warehouse_keeper', module: 'material', fields: ['standardPrice', 'movingAvgPrice'] },
  { role: 'qa_inspector', module: 'material', fields: ['standardPrice', 'movingAvgPrice'] },
  { role: 'prod_leader', module: 'material', fields: ['standardPrice', 'movingAvgPrice'] },
  { role: 'logistics', module: 'material', fields: ['standardPrice', 'movingAvgPrice'] },
  { role: 'vendor', module: 'material', fields: ['standardPrice', 'movingAvgPrice'] },

  // 供应商：授信额度对库管/质检/班长/物流隐藏
  { role: 'warehouse_keeper', module: 'vendor', fields: ['creditLimit'] },
  { role: 'qa_inspector', module: 'vendor', fields: ['creditLimit'] },
  { role: 'prod_leader', module: 'vendor', fields: ['creditLimit'] },
  { role: 'logistics', module: 'vendor', fields: ['creditLimit'] },

  // 客户：授信额度对采购/库管/质检/班长/物流隐藏
  { role: 'buyer', module: 'customer', fields: ['creditLimit'] },
  { role: 'warehouse_keeper', module: 'customer', fields: ['creditLimit'] },
  { role: 'qa_inspector', module: 'customer', fields: ['creditLimit'] },
  { role: 'prod_leader', module: 'customer', fields: ['creditLimit'] },
  { role: 'logistics', module: 'customer', fields: ['creditLimit'] },

  // 采购：单价/订单金额对库管/质检/班长/物流隐藏（采购员可见）
  { role: 'warehouse_keeper', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },
  { role: 'qa_inspector', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },
  { role: 'prod_leader', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },
  { role: 'logistics', module: 'purchase', fields: ['unitPrice', 'orderAmount'] },

  // 销售：单价/金额/客户名对采购/库管/质检/班长/物流隐藏
  { role: 'buyer', module: 'sales', fields: ['unitPrice', 'orderAmount', 'customerName'] },
  { role: 'warehouse_keeper', module: 'sales', fields: ['unitPrice', 'orderAmount', 'customerName'] },
  { role: 'qa_inspector', module: 'sales', fields: ['unitPrice', 'orderAmount', 'customerName'] },
  { role: 'prod_leader', module: 'sales', fields: ['unitPrice', 'orderAmount', 'customerName'] },
  { role: 'logistics', module: 'sales', fields: ['unitPrice', 'orderAmount', 'customerName'] },

  // 仓储：库存价值（stockValue）对质检/采购/班长/物流/供应商隐藏
  { role: 'qa_inspector', module: 'warehouse', fields: ['stockValue'] },
  { role: 'buyer', module: 'warehouse', fields: ['stockValue'] },
  { role: 'prod_leader', module: 'warehouse', fields: ['stockValue'] },
  { role: 'logistics', module: 'warehouse', fields: ['stockValue'] },
  { role: 'vendor', module: 'warehouse', fields: ['stockValue'] },

  // 质量：检验费用（inspectionCost）对库管/采购/班长/物流/供应商隐藏
  { role: 'warehouse_keeper', module: 'quality', fields: ['inspectionCost'] },
  { role: 'buyer', module: 'quality', fields: ['inspectionCost'] },
  { role: 'prod_leader', module: 'quality', fields: ['inspectionCost'] },
  { role: 'logistics', module: 'quality', fields: ['inspectionCost'] },
  { role: 'vendor', module: 'quality', fields: ['inspectionCost'] },

  // 生产：生产成本（cost）对质检/采购/库管/物流/供应商隐藏
  { role: 'qa_inspector', module: 'production', fields: ['cost'] },
  { role: 'buyer', module: 'production', fields: ['cost'] },
  { role: 'warehouse_keeper', module: 'production', fields: ['cost'] },
  { role: 'logistics', module: 'production', fields: ['cost'] },
  { role: 'vendor', module: 'production', fields: ['cost'] },

  // 财务：凭证金额（voucherAmount）对非财务角色隐藏（财务主管/会计/系统管理员可见）
  { role: 'rd_engineer', module: 'finance', fields: ['voucherAmount'] },
  { role: 'process_engineer', module: 'finance', fields: ['voucherAmount'] },
  { role: 'qa_engineer', module: 'finance', fields: ['voucherAmount'] },
  { role: 'qa_inspector', module: 'finance', fields: ['voucherAmount'] },
  { role: 'warehouse_keeper', module: 'finance', fields: ['voucherAmount'] },
  { role: 'logistics', module: 'finance', fields: ['voucherAmount'] },
  { role: 'buyer', module: 'finance', fields: ['voucherAmount'] },
  { role: 'prod_manager', module: 'finance', fields: ['voucherAmount'] },
  { role: 'prod_leader', module: 'finance', fields: ['voucherAmount'] },
  { role: 'vendor', module: 'finance', fields: ['voucherAmount'] },
];

export const useDataPermissionStore = create<DataPermissionState>()(
  persist(
    (set, get) => ({
      enabled: false,
      mode: 'all',
      modules: { ...seedModules },
      sensitiveFields: [...defaultSensitiveFields],
      roleModuleOps: [...defaultRoleModuleOps],

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
      hasOperation: (userRole, module, operation) =>
        checkRoleOperation(get().roleModuleOps, userRole, module, operation),
      setRoleModuleOp: (role, module, operations) =>
        set((s) => {
          const idx = s.roleModuleOps.findIndex(
            (r) => r.role === role && r.module === module
          );
          if (idx >= 0) {
            const next = [...s.roleModuleOps];
            next[idx] = { ...next[idx], operations };
            return { roleModuleOps: next };
          }
          return { roleModuleOps: [...s.roleModuleOps, { role, module, operations }] };
        }),
      reset: () =>
        set({
          enabled: false,
          mode: 'all',
          modules: { ...seedModules },
          sensitiveFields: [...defaultSensitiveFields],
          roleModuleOps: [...defaultRoleModuleOps],
        }),
      maskValue,
    }),
    { storage: backendStorage,

      name: 'ssa-erp-data-permission',
      version: 8,
      // V2.91.0：版本升级强制刷入「操作权限默认矩阵」
      migrate: (persisted, version) => {
        if (!persisted) return persisted;
        const state = persisted as any;
        // v3 → v4：补全操作权限字段
        if (version < 4) {
          state.roleModuleOps = [...defaultRoleModuleOps, ...(state.roleModuleOps ?? [])];
        }
        // v4 → v5：角色集收口——剔除无效的 owner/boss 行，补齐 super_admin / user 行，
        // 否则已登录用户浏览器里的旧矩阵会让新角色显示为「全零权限」。
        // 在既有（可能已被用户自定义过的）矩阵上做增删，而非用默认值整体覆盖，避免丢失已保存的配置。
        if (version < 5) {
          const rows: RoleModuleOperation[] = Array.isArray(state.roleModuleOps) ? state.roleModuleOps : [];
          let next = rows.filter((r) => r.role !== 'owner' && r.role !== 'boss');
          if (!next.some((r) => r.role === 'super_admin')) next = [SUPER_ADMIN_ROLE_OPS, ...next];
          if (!next.some((r) => r.role === 'user')) next = [...next, PLAIN_USER_ROLE_OPS];
          state.roleModuleOps = next;
        }
        // v5 → v6：补齐销售写角色（sales_manager / salesperson），否则旧矩阵会让销售员显示为「全零权限」
        if (version < 6) {
          const rows6: RoleModuleOperation[] = Array.isArray(state.roleModuleOps) ? state.roleModuleOps : [];
          const needed6: RoleModuleOperation[] = [
            { role: 'sales_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'salesperson', module: 'sales', operations: { create: true, read: true, update: true, delete: false } },
          ];
          for (const n of needed6) {
            if (!rows6.some((r) => r.role === n.role && r.module === n.module)) rows6.push(n);
          }
          state.roleModuleOps = rows6;
        }
        // v6 → v7：对标三大 ERP 补齐「财务族 4 模块写权 + 供应商门户自身资质改」。
        //   在既有（可能已被管理员自定义过）矩阵上「缺则补」，不整体覆盖（避免丢失已保存配置）。
        //   这 9 条对应后端 BUILTIN_ROLE_OPS 的 V3.51.0 新增条目，保证前后端默认口径一致（铁律㉛）。
        if (version < 7) {
          const rows7: RoleModuleOperation[] = Array.isArray(state.roleModuleOps) ? state.roleModuleOps : [];
          const needed7: RoleModuleOperation[] = [
            { role: 'finance_manager', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'finance_manager', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'finance_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'finance_manager', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'accountant', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'accountant', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'accountant', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'accountant', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'vendor', module: 'vendor', operations: { create: false, read: true, update: true, delete: false } },
          ];
          let changed7 = false;
          for (const n of needed7) {
            const idx7 = rows7.findIndex((r) => r.role === n.role && r.module === n.module);
            if (idx7 < 0) { rows7.push(n); changed7 = true; }
          }
          if (changed7) state.roleModuleOps = rows7;
        }
        // v7 → v8：前后端矩阵统一——补齐 13 条「后端已放行、前端默认缺失」的条目
        //   （序列号/采购申请写权 + 只读兜底 + 生产主管/工艺工程师生产写权 + 审批流协作维护 6 条），
        //   使前端默认矩阵与后端 BUILTIN_ROLE_OPS 逐条一致（铁律㉛）。同 v7：缺则补、不整体覆盖。
        if (version < 8) {
          const rows8: RoleModuleOperation[] = Array.isArray(state.roleModuleOps) ? state.roleModuleOps : [];
          const needed8: RoleModuleOperation[] = [
            { role: 'warehouse_keeper', module: 'serial', operations: { create: true, read: true, update: true, delete: false } },
            { role: 'buyer', module: 'purchase-request', operations: { create: true, read: true, update: true, delete: true } },
            { role: 'process_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
            { role: 'qa_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
            { role: 'prod_manager', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
            { role: 'process_engineer', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
            { role: 'prod_manager', module: '*', operations: { create: false, read: true, update: false, delete: false } },
            { role: 'buyer', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
            { role: 'warehouse_keeper', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
            { role: 'prod_leader', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
            { role: 'sales_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
            { role: 'finance_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
            { role: 'qa_inspector', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
          ];
          let changed8 = false;
          for (const n of needed8) {
            const idx8 = rows8.findIndex((r) => r.role === n.role && r.module === n.module);
            if (idx8 < 0) { rows8.push(n); changed8 = true; }
          }
          if (changed8) state.roleModuleOps = rows8;
        }
        return state;
      },
      partialize: (state) => ({
        enabled: state.enabled,
        mode: state.mode,
        modules: state.modules,
        sensitiveFields: state.sensitiveFields,
        roleModuleOps: state.roleModuleOps,
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
 *                       - role:    当前用户角色（super_admin/admin 豁免）
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

// ── V3.77.0 全模块联动审计整改：dataPermission 写穿 D1 + 组织共享 ──
// 保留本地 persist（含 v3→v8 migrate）作离线缓存；D1 data_permissions 表（资源 dataPermission）
// 作组织共享权威源。挂载时 hydrate 拉取覆盖；变更时写穿。不动 passDataPermission 等纯逻辑。
const DP_RES = 'dataPermission';
const DP_ID = 'default';
let dpHydrating = false;

/** 从 D1 拉取组织共享的数据权限配置，覆盖本地（无则回写本地当前值） */
export const hydrateDataPermission = async (): Promise<void> => {
  if (!isAuthed()) return;
  dpHydrating = true;
  try {
    const res = await entityRepo.list(DP_RES, { page: 1, pageSize: 50 });
    const rows = parsePayload<Partial<DataPermissionState>>(res?.data || []);
    const cfg = rows[0];
    if (cfg) {
      useDataPermissionStore.setState({
        enabled: cfg.enabled ?? false,
        mode: cfg.mode ?? 'all',
        modules: cfg.modules ?? { ...seedModules },
        sensitiveFields: cfg.sensitiveFields ?? [...defaultSensitiveFields],
        roleModuleOps: cfg.roleModuleOps ?? [...defaultRoleModuleOps],
      });
    } else {
      // 首次：把本地当前值回写 D1，供同组织其它设备共享
      const s = useDataPermissionStore.getState();
      writeConfig(DP_RES, DP_ID, {
        enabled: s.enabled, mode: s.mode, modules: s.modules,
        sensitiveFields: s.sensitiveFields, roleModuleOps: s.roleModuleOps,
      });
    }
  } catch {
    /* 离线兜底：保持本地值 */
  } finally {
    dpHydrating = false;
  }
};

// 变更写穿（跳过 hydrate 自身触发的 set，避免回写抖动）
useDataPermissionStore.subscribe((s) => {
  if (dpHydrating) return;
  writeConfig(DP_RES, DP_ID, {
    enabled: s.enabled, mode: s.mode, modules: s.modules,
    sensitiveFields: s.sensitiveFields, roleModuleOps: s.roleModuleOps,
  });
});

void hydrateDataPermission();

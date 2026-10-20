import { BaseEntity } from './common';

export interface User extends BaseEntity {
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  status: 'active' | 'inactive';
  avatar?: string;
  lastLoginAt?: string;
}

export type UserRole =
  | 'super_admin'     // 超级管理员（平台级，跨组织）
  | 'admin'           // 系统管理员
  | 'rd_engineer'     // 研发工程师
  | 'process_engineer'// 工艺工程师
  | 'qa_engineer'     // 质量工程师
  | 'qa_inspector'    // 质量检验员
  | 'warehouse_keeper'// 库管员
  | 'logistics'       // 物流调度
  | 'finance_manager' // 财务主管
  | 'accountant'      // 会计
  | 'buyer'           // 采购员
  | 'prod_manager'    // 生产主管
  | 'prod_leader'     // 班长
  | 'vendor'          // 供应商
  | 'sales_manager'   // 销售管理员（V3.51.0 正式纳入词表，消除"悬空角色"）
  | 'salesperson'     // 销售员（V3.51.0 正式纳入词表，消除"悬空角色"）
  | 'user';           // 普通用户（新注册未分配角色的兜底身份）

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'super_admin',
    name: '超级管理员',
    description: '系统最高权限，可管理全部组织与用户，不可被降级或删除',
    permissions: ['*'],
    color: '#BE185D',
  },
  {
    id: 'admin',
    name: '系统管理员',
    description: '拥有所有权限，负责系统配置与维护',
    permissions: ['*'],
    color: '#EF4444',
  },
  {
    id: 'rd_engineer',
    name: '研发工程师',
    description: '负责物料编码维护、BOM管理，参与质量改进',
    permissions: [
      'material.view', 'material.create', 'material.edit',
      'bom.view', 'bom.create', 'bom.edit',
      'quality.view',
    ],
    color: '#3B82F6',
  },
  {
    id: 'process_engineer',
    name: '工艺工程师',
    description: '负责工艺路线定义、生产计划与MRP建议',
    permissions: [
      'material.view', 'material.edit',
      'bom.view',
      'production.view', 'production.create', 'production.edit',
      'quality.view', 'quality.consult',
    ],
    color: '#8B5CF6',
  },
  {
    id: 'qa_engineer',
    name: '质量工程师',
    description: '负责质量体系管理、PDCA改进、检验标准',
    permissions: [
      'quality.view', 'quality.create', 'quality.edit', 'quality.approve',
      'material.view',
      'production.view',
      'purchase.view',
    ],
    color: '#F59E0B',
  },
  {
    id: 'qa_inspector',
    name: '质量检验员',
    description: '执行来料/过程/成品检验任务',
    permissions: [
      'quality.view', 'quality.create', 'quality.edit',
      'material.view',
    ],
    color: '#10B981',
  },
  {
    id: 'warehouse_keeper',
    name: '库管员',
    description: '负责收货入库、拣货出库、盘点',
    permissions: [
      'warehouse.view', 'warehouse.create', 'warehouse.edit',
      'material.view',
      'quality.view',
      'purchase.view',
      'export',
    ],
    color: '#06B6D4',
  },
  {
    id: 'logistics',
    name: '物流调度',
    description: '负责运单生成与物流追踪',
    permissions: [
      'warehouse.view', 'warehouse.create', 'warehouse.edit',
      'purchase.view',
    ],
    color: '#6366F1',
  },
  {
    id: 'finance_manager',
    name: '财务主管',
    description: '负责财务管理全链路，审批财务事项',
    permissions: [
      'finance.view', 'finance.create', 'finance.edit', 'finance.approve',
      'purchase.view',
      'vendor.view',
      'export',
    ],
    color: '#EC4899',
  },
  {
    id: 'accountant',
    name: '会计',
    description: '执行账务处理、费用报销',
    permissions: [
      'finance.view', 'finance.create', 'finance.edit',
      'purchase.view',
      'export',
    ],
    color: '#F97316',
  },
  {
    id: 'buyer',
    name: '采购员',
    description: '负责寻源比价、采购订单全流程',
    permissions: [
      'purchase.view', 'purchase.create', 'purchase.edit',
      'vendor.view',
      'material.view', 'material.approve',
      'export',
    ],
    color: '#84CC16',
  },
  {
    id: 'prod_manager',
    name: '生产主管',
    description: '负责生产计划审批与工单下达',
    permissions: [
      'production.view', 'production.create', 'production.edit', 'production.approve',
      'material.view',
      'warehouse.view',
      'export',
    ],
    color: '#14B8A6',
  },
  {
    id: 'prod_leader',
    name: '班长',
    description: '负责班组生产执行与工时上报',
    permissions: [
      'production.view', 'production.edit',
      'material.view',
      'warehouse.view',
    ],
    color: '#A78BFA',
  },
  {
    id: 'vendor',
    name: '供应商',
    description: '外部供应商，可更新资质和查看订单',
    permissions: [
      'vendor.self.view', 'vendor.self.edit',
      'purchase.view',
    ],
    color: '#94A3B8',
  },
  // ★ V3.51.0 对标三大 ERP「销售域需独立角色」：正式把销售管理员/销售员纳入词表。
  //   权限点严格对应后端 BUILTIN_ROLE_OPS 的销售模块授权（铁律㊴：菜单不能给按钮却 403）：
  //     · sales_manager 后端 sales 全权（含 delete）→ 菜单给 view/create/edit/delete
  //     · salesperson   后端 sales 增改不可删 → 菜单给 view/create/edit（不给 delete）
  {
    id: 'sales_manager',
    name: '销售管理员',
    description: '负责销售订单全生命周期管理，可作废销售订单',
    permissions: [
      'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
      'customer.view', 'customer.create', 'customer.edit',
      'export',
    ],
    color: '#0EA5E9',
  },
  {
    id: 'salesperson',
    name: '销售员',
    description: '负责开单与跟进，不可作废销售订单（作废归销售管理员）',
    permissions: [
      'sales.view', 'sales.create', 'sales.edit',
      'customer.view',
      'export',
    ],
    color: '#14B8A6',
  },
];

export const ROLE_PERMISSIONS: Record<string, string[]> = Object.fromEntries(
  ROLE_DEFINITIONS.map(r => [r.id, r.permissions])
);

export const ROLE_NAMES: Record<UserRole, string> = Object.fromEntries(
  ROLE_DEFINITIONS.map(r => [r.id, r.name])
) as Record<UserRole, string>;

export interface SystemSettings {
  systemName: string;
  companyName: string;
  adminEmail: string;
  adminPhone: string;
  logo?: string;
  timezone: string;
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

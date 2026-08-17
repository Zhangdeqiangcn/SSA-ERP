import { BaseEntity } from './common';

// ==================== 多组织 / 多账套（P2-2）====================

export type OrgType = 'company' | 'plant' | 'department';
export type OrgStatus = 'active' | 'disabled';

export interface Organization extends BaseEntity {
  id: string;
  code: string; // 组织编码
  name: string; // 组织名称
  type: OrgType; // 公司 / 工厂 / 部门
  parentOrgId?: string; // 上级组织
  parentId?: string; // 上级组织（兼容旧字段）
  ledgerCode: string; // 账套编码
  currency: string; // 本位币
  taxNo?: string; // 税号
  address?: string;
  contact?: string;
  status: OrgStatus;
  /** P1-01: 组织间交易开关 */
  intercompanyEnabled?: boolean;
}

// ==================== 仓库 / 库位主数据（P2-2，替代硬编码仓库）====================

export type WarehouseType = 'raw' | 'finished' | 'wip' | 'aux' | 'transit';

export interface WarehouseLocation extends BaseEntity {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  zone?: string; // 库区
  remark?: string;
}

export interface Warehouse extends BaseEntity {
  id: string;
  code: string;
  name: string;
  orgId: string; // 所属组织
  type: WarehouseType;
  address?: string;
  manager?: string;
  status: 'active' | 'disabled';
  locations: WarehouseLocation[];
}

/**
 * 软组织过滤：无 orgId 的遗留数据在任一组织下均可见（迁移兼容），
 * 新建数据按 currentOrgId 严格隔离。返回 true 表示该项应显示在当前组织。
 */
export const matchOrg = <T extends { orgId?: string }>(item: T, orgId?: string): boolean =>
  !item.orgId || !orgId || item.orgId === orgId;

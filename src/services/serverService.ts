import { recordAudit, type AuditAction } from '@/stores/auditStore';
import { currentUser } from '@/stores/sessionStore';

/**
 * C7 服务端化雏形 · 持久化抽象层
 * ------------------------------------------------------------
 * 当前后端 = 浏览器 localStorage（driver: 'local'）。
 * 所有写操作统一从这里走，好处有两点：
 *   1. 写操作自动落审计（谁在什么时候改了什么）；
 *   2. 将来接真实数据库/HTTP API 时，只需把 driver 换成 'remote'，
 *      页面与 store 侧调用方式不用动。
 *
 * 之所以不直接改 zustand persist：现有 200+ 条 E2E 依赖 localStorage 行为，
 * 抽象层采取「叠加而非替换」策略，保证零回归。
 */

export type StorageDriver = 'local' | 'remote';

const STORAGE_PREFIX = 'ssa-erp-';

let driver: StorageDriver = 'local';

export const getDriver = (): StorageDriver => driver;
export const setDriver = (d: StorageDriver) => {
  driver = d;
};

/** 当前"服务端"里属于本系统的数据表数量（localStorage key 数） */
export const listCollections = (): string[] => {
  if (typeof localStorage === 'undefined') return [];
  return Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX)).sort();
};

/** 估算已用存储体积（KB），给运维面板看 */
export const estimateStorageKB = (): number => {
  if (typeof localStorage === 'undefined') return 0;
  const bytes = listCollections().reduce((sum, k) => sum + (localStorage.getItem(k)?.length || 0), 0);
  return Math.round((bytes / 1024) * 10) / 10;
};

/** 读取一张"表" */
export const readCollection = <T>(name: string, fallback: T): T => {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${name}`);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/**
 * 带审计的写操作包装：业务侧传入真正的写函数，这里负责记审计。
 * 用法：withAudit({ entity: 'salesPrice', action: 'create', summary: '新增价目表项 钢板' }, () => addPriceItem(x))
 */
export const withAudit = <T>(
  meta: { entity: string; entityId?: string; action: AuditAction; summary: string },
  mutate: () => T
): T => {
  const result = mutate();
  recordAudit(meta);
  return result;
};

/** 服务端状态摘要，供设置页面板展示 */
export interface ServerStatus {
  driver: StorageDriver;
  collections: number;
  storageKB: number;
  user: string;
  token: string;
}

export const getServerStatus = (): ServerStatus => {
  const u = currentUser();
  return {
    driver,
    collections: listCollections().length,
    storageKB: estimateStorageKB(),
    user: u.userName,
    token: u.token,
  };
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { UserRole } from '@/types/settings';

/**
 * 系统用户列表单一数据源（全面 store 化 · V2.14）
 * ------------------------------------------------------------
 * 将设置页「用户管理」里硬编码的 mockUsers 收敛到唯一 zustand persist store。
 * 支持新增 / 编辑 / 删除 / 启停，数据持久化到 localStorage（key = ssa-erp-users）。
 * 首次启动播种 8 条默认用户。
 */

export type UserStatus = 'active' | 'inactive';

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  email: string;
}

export const DEFAULT_USERS: SystemUser[] = [
  { id: 'u1', name: '张德强', username: 'zhangdq', role: 'admin', department: '信息技术部', status: 'active', email: 'zhangdq@ssa.com' },
  { id: 'u2', name: '李明', username: 'liming', role: 'qa_engineer', department: '质量部', status: 'active', email: 'liming@ssa.com' },
  { id: 'u3', name: '王芳', username: 'wangfang', role: 'buyer', department: '采购部', status: 'active', email: 'wangfang@ssa.com' },
  { id: 'u4', name: '赵磊', username: 'zhaolei', role: 'warehouse_keeper', department: '仓储部', status: 'active', email: 'zhaolei@ssa.com' },
  { id: 'u5', name: '陈静', username: 'chenjing', role: 'finance_manager', department: '财务部', status: 'active', email: 'chenjing@ssa.com' },
  { id: 'u6', name: '刘洋', username: 'liuyang', role: 'prod_manager', department: '生产部', status: 'active', email: 'liuyang@ssa.com' },
  { id: 'u7', name: '周敏', username: 'zhoumin', role: 'rd_engineer', department: '研发部', status: 'inactive', email: 'zhoumin@ssa.com' },
  { id: 'u8', name: '吴强', username: 'wuqiang', role: 'process_engineer', department: '工艺部', status: 'active', email: 'wuqiang@ssa.com' },
];

interface UserState {
  users: SystemUser[];
  setUsers: (users: SystemUser[]) => void;
  addUser: (user: SystemUser) => void;
  updateUser: (id: string, patch: Partial<Omit<SystemUser, 'id'>>) => void;
  removeUser: (id: string) => void;
  toggleStatus: (id: string) => void;
  /** 按 id 取用户姓名，找不到时回退为原 id（用于展示责任人姓名） */
  getUserName: (id: string) => string;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS.map((u) => ({ ...u })),
      setUsers: (users) => set({ users }),
      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, patch) =>
        set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUser: (id) => set((state) => ({ users: state.users.filter((u) => u.id !== id) })),
      toggleStatus: (id) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
          ),
        })),

      getUserName: (id) => get().users.find((u) => u.id === id)?.name ?? id,
    }),
    { storage: backendStorage,
     name: 'ssa-erp-users', version: 1 }
  )
);

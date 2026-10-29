import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { UserRole } from '@/types/settings';

/**
 * 系统用户列表单一数据源（V3.77.0 P0-2：Blob → D1 关系表）
 *
 * 整改前：persist(backendStorage, 'ssa-erp-users') 纯本地——
 *   设置页「用户管理」增删改只在本机生效，其他终端/重新部署看不到（审计 P0-2）。
 * 整改后：落 D1 关系表 system_users（迁移 0101，resource systemUser，rls 'all'）。
 *   注意：与鉴权 users 表**解耦**（避免触碰登录），本 store 是设置侧用户目录。
 *   数据流：登录态 D1 权威源 + 挂载水合；未登录本地种子兜底；
 *   CRUD 本地即时 + 登录态写穿。getUserName 仍同步读本地缓存（显示责任人姓名）。
 */

const RES = 'systemUser';

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
  /** V3.77.0：从 D1 水合 */
  hydrateUsers: () => Promise<void>;
}

function parse(rows: any[]): SystemUser[] {
  return (rows || []).map((r: any) => (typeof r?.payload === 'string' ? JSON.parse(r.payload) : r?.payload)) as SystemUser[];
}

export const useUserStore = create<UserState>()((set, get) => ({
  users: DEFAULT_USERS.map((u) => ({ ...u })),

  setUsers: (users) => {
    set({ users });
    if (isAuthed()) for (const u of users) void entityRepo.update(RES, u.id, { payload: u } as any).catch(() => {});
  },
  addUser: (user) => {
    set((state) => ({ users: [...state.users, user] }));
    if (isAuthed()) void entityRepo.create(RES, { payload: user } as any).catch(() => {});
  },
  updateUser: (id, patch) => {
    let updated: SystemUser | undefined;
    set((state) => ({
      users: state.users.map((u) => {
        if (u.id !== id) return u;
        updated = { ...u, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update(RES, id, { payload: updated } as any).catch(() => {});
  },
  removeUser: (id) => {
    set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },
  toggleStatus: (id) => {
    const cur = get().users.find((u) => u.id === id);
    if (!cur) return;
    get().updateUser(id, { status: cur.status === 'active' ? 'inactive' : 'active' });
  },

  getUserName: (id) => get().users.find((u) => u.id === id)?.name ?? id,

  hydrateUsers: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list<SystemUser>(RES, { page: 1, pageSize: 500 });
      const rows = parse(res?.data || []);
      if (rows.length === 0) {
        for (const u of DEFAULT_USERS) { try { await entityRepo.create(RES, { payload: u } as any); } catch {} }
        const rf = await entityRepo.list<SystemUser>(RES, { page: 1, pageSize: 500 });
        const r2 = parse(rf?.data || []);
        if (r2.length) set({ users: r2 });
        return;
      }
      set({ users: rows });
    } catch {
      // 离线/异常：保留种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useUserStore.getState().hydrateUsers();

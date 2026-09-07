import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { MobileMessage, MessageType } from '@/types/message';
import { useAuthStore } from '@/stores/authStore';

/**
 * V2.80.0 W2：移动端即时消息 store（根治双通道，真存云端 D1）。
 * 复用 entityRepo（通用 /entities/[resource] 端点，org 隔离 + 审计）。
 * 推送机制：移动端轮询拉取（每 30 秒），复用预警列表那种拉取模式，简单稳，无需长连接。
 * 可见性：recipientId 指定用户 / recipientRole 指定角色 / 二者皆空=全员可见。
 * 触发入口：send() 可被审批流、预警规则等业务调用（预留 push 接入点）；本版提供「发布全员公告」演示真多人同步。
 */
const RES = 'mobileMsg';
const flagKey = 'ssa-erp-backfilled-messages';

const newId = () => `msg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** 当前用户是否可见该消息（指定用户 / 角色 / 全员） */
export function isMine(m: MobileMessage, user: { id?: string; role?: string } | null | undefined): boolean {
  if (!user) return false;
  if (m.recipientId) return m.recipientId === user.id;
  if (m.recipientRole) return m.recipientRole === user.role;
  return true; // 全员
}

interface MessageState {
  all: MobileMessage[];
  loaded: boolean;
  load: () => Promise<void>;
  send: (m: {
    title: string;
    body: string;
    type?: MessageType;
    recipientId?: string | null;
    recipientRole?: string | null;
    refModule?: string;
    refId?: string;
  }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  all: [],
  loaded: false,

  load: async () => {
    try {
      const r = await entityRepo.list<MobileMessage>(RES, { page: 1, pageSize: 500 });
      const list = (r?.data || []) as MobileMessage[];
      if (list.length === 0 && !localStorage.getItem(flagKey)) {
        localStorage.setItem(flagKey, '1');
        const seed: MobileMessage = {
          id: newId(),
          senderId: undefined,
          senderName: '系统',
          recipientId: null,
          recipientRole: null,
          title: '欢迎使用移动消息',
          body: '审批与预警将推送至此；点击消息可标记已读，数据直连云端 D1 多人共享。',
          type: 'system',
          read: 0,
          createdAt: new Date().toISOString(),
        };
        try { await entityRepo.create<MobileMessage>(RES, seed); } catch { /* 尽力回填 */ }
        const r2 = await entityRepo.list<MobileMessage>(RES, { page: 1, pageSize: 500 });
        set({ all: (r2?.data || []) as MobileMessage[], loaded: true });
        return;
      }
      set({ all: list, loaded: true });
    } catch {
      set({ all: [], loaded: true });
    }
  },

  send: async (m) => {
    const user = useAuthStore.getState().currentUser;
    const msg: MobileMessage = {
      id: newId(),
      senderId: user?.id || undefined,
      senderName: user?.name || '系统',
      recipientId: m.recipientId ?? null,
      recipientRole: m.recipientRole ?? null,
      title: m.title,
      body: m.body,
      type: m.type || 'announce',
      refModule: m.refModule,
      refId: m.refId,
      read: 0,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ all: [msg, ...s.all] }));
    try {
      await entityRepo.create<MobileMessage>(RES, msg);
    } catch {
      set((s) => ({ all: s.all.filter((x) => x.id !== msg.id) }));
    }
  },

  markRead: async (id) => {
    const now = new Date().toISOString();
    set((s) => ({ all: s.all.map((x) => (x.id === id ? { ...x, read: 1, readAt: now } : x)) }));
    try { await entityRepo.update<MobileMessage>(RES, id, { read: 1, readAt: now }); } catch { /* 尽力同步 */ }
  },

  markAllRead: async () => {
    const user = useAuthStore.getState().currentUser;
    const mine = get().all.filter((x) => !x.read && isMine(x, user));
    if (mine.length === 0) return;
    const now = new Date().toISOString();
    set((s) => ({
      all: s.all.map((x) => (mine.find((m) => m.id === x.id) ? { ...x, read: 1, readAt: now } : x)),
    }));
    await Promise.all(
      mine.map((m) => entityRepo.update<MobileMessage>(RES, m.id, { read: 1, readAt: now }).catch(() => {})),
    );
  },
}));

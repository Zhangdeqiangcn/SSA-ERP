// 采购员定向邀请供应商注册（V3.100.0）— 前端 store
//
// 职责：采购员生成 / 吊销 / 查看自己发出的邀请（RLS 'own' 保证只看自己的）。
// 邀请码本地生成（32 位字母数字表，12 位 → 32^12 空间，碰撞可忽略；若仍撞库 UNIQUE 冲突则重试）。
import { create } from 'zustand';
import { inviteApi, VendorInvitation } from '@/services/inviteApi';
import { useAuthStore } from './authStore';

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const genCode = (len = 12): string => {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
};

interface InviteState {
  invitations: VendorInvitation[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (input: { salesOrg?: string; expiresInDays?: number | null }) => Promise<{ ok: boolean; error?: string; item?: VendorInvitation }>;
  revoke: (id: string) => Promise<void>;
}

export const useInviteStore = create<InviteState>()((set, get) => ({
  invitations: [],
  loaded: false,

  load: async () => {
    try {
      const res = await inviteApi.list({ page: 1, pageSize: 100 });
      set({ invitations: (res?.data || []) as VendorInvitation[], loaded: true });
    } catch {
      set({ invitations: [], loaded: true });
    }
  },

  create: async ({ salesOrg, expiresInDays }) => {
    const user = useAuthStore.getState().currentUser;
    if (!user) return { ok: false, error: '未登录，无法生成邀请链接' };
    const expiresAt =
      expiresInDays && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString().slice(0, 19).replace('T', ' ')
        : null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const item: Partial<VendorInvitation> = {
        id: `vinv-${Date.now()}-${attempt}`,
        code: genCode(),
        buyerId: user.id,
        buyerName: user.name,
        salesOrg: salesOrg || '',
        status: 'active',
        expiresAt,
        ownerId: user.id,
      };
      try {
        const created = await inviteApi.create(item);
        set((s) => ({ invitations: [created as VendorInvitation, ...s.invitations] }));
        return { ok: true, item: created as VendorInvitation };
      } catch (e: any) {
        const msg: string = e?.response?.data?.error || '';
        // 仅「邀请码唯一冲突」才重试，其余错误直接报出
        if (e?.response?.status === 500 && /UNIQUE|unique|code/i.test(msg) && attempt < 2) continue;
        return { ok: false, error: msg || '生成邀请链接失败，请重试' };
      }
    }
    return { ok: false, error: '生成邀请链接失败，请重试' };
  },

  revoke: async (id: string) => {
    const prev = get().invitations;
    set((s) => ({ invitations: s.invitations.map((x) => (x.id === id ? { ...x, status: 'revoked' } : x)) }));
    try {
      await inviteApi.update(id, { status: 'revoked' });
    } catch {
      set({ invitations: prev });
    }
  },
}));

/** 生成完整的邀请链接（前端拼装，含邀请码） */
export function buildInviteLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/vendor-portal/register?invite=${encodeURIComponent(code)}`;
}

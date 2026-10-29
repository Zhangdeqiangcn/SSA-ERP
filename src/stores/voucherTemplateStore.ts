// 凭证模板状态管理（V3.26.0 常用凭证）
// ------------------------------------------------------------------
// 独立的轻量 store，避免触碰 financeStore（该 store 有 33 个同步消费方，回归风险高）。
// 模板是组织级基础配置，不做乐观回滚——保存失败直接提示，不影响凭证录入主流程。
import { create } from 'zustand';
import { financeApi } from '@/services/financeApi';
import type { VoucherTemplate } from '@/types/finance';
import { useGlobalToastStore } from '@/stores/globalToastStore';

interface VoucherTemplateState {
  templates: VoucherTemplate[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (t: Partial<VoucherTemplate>) => Promise<{ ok: boolean; message: string }>;
  update: (id: string, t: Partial<VoucherTemplate>) => Promise<{ ok: boolean; message: string }>;
  remove: (id: string) => Promise<{ ok: boolean; message: string }>;
}

export const useVoucherTemplateStore = create<VoucherTemplateState>((set, get) => ({
  templates: [],
  loaded: false,

  load: async () => {
    try {
      const res = await financeApi.voucherTemplates.list({ pageSize: 200 });
      set({ templates: (res.data || []) as VoucherTemplate[], loaded: true });
    } catch (e) {
      // 模板加载失败不阻塞凭证录入：仅标记已加载，界面静默降级（无模板可选）
      set({ loaded: true });
    }
  },

  create: async (t) => {
    try {
      await financeApi.voucherTemplates.create(t as Partial<VoucherTemplate>);
      await get().load();
      return { ok: true, message: '凭证模板已保存' };
    } catch (e: any) {
      const msg = e?.response?.data?.error || '保存失败';
      useGlobalToastStore.getState().showError?.(msg);
      return { ok: false, message: msg };
    }
  },

  update: async (id, t) => {
    try {
      await financeApi.voucherTemplates.update(id, t as Partial<VoucherTemplate>);
      await get().load();
      return { ok: true, message: '凭证模板已更新' };
    } catch (e: any) {
      const msg = e?.response?.data?.error || '更新失败';
      useGlobalToastStore.getState().showError?.(msg);
      return { ok: false, message: msg };
    }
  },

  remove: async (id) => {
    try {
      await financeApi.voucherTemplates.remove(id);
      await get().load();
      return { ok: true, message: '凭证模板已删除' };
    } catch (e: any) {
      const msg = e?.response?.data?.error || '删除失败';
      useGlobalToastStore.getState().showError?.(msg);
      return { ok: false, message: msg };
    }
  },
}));

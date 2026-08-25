// AI大模型配置Store（使用localStorage持久化）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIModelConfig } from '@/types/ai';

interface AIState {
  // 模型配置
  models: AIModelConfig[];
  activeModelId: string | null;
  
  // 设置操作
  addModel: (config: AIModelConfig) => void;
  updateModel: (id: string, config: Partial<AIModelConfig>) => void;
  deleteModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  setModels: (models: AIModelConfig[]) => void;
  
  // 便捷方法
  getActiveModel: () => AIModelConfig | null;
  isConfigured: () => boolean;
}

const STORAGE_KEY = 'ssa-erp-ai-models';
const ACTIVE_KEY = 'ssa-erp-ai-active-model';

// 默认配置（Agnes 2.5 Flash）
const DEFAULT_MODEL: AIModelConfig = {
  id: 'default',
  name: 'Agnes 2.5 Flash',
  provider: 'custom',
  baseUrl: 'http://localhost:8080/v1',
  apiKey: '',
  modelId: 'agnes-2.5-flash',
  default: true,
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      models: [DEFAULT_MODEL],
      activeModelId: 'default',

      addModel: (config) => set((state) => ({
        models: [...state.models, config],
      })),

      updateModel: (id, updates) => set((state) => ({
        models: state.models.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),

      deleteModel: (id) => set((state) => ({
        models: state.models.filter((m) => m.id !== id),
        activeModelId: state.activeModelId === id ? null : state.activeModelId,
      })),

      setActiveModel: (id) => set({ activeModelId: id }),

      setModels: (models) => set({ models }),

      getActiveModel: () => {
        const { models, activeModelId } = get();
        return models.find((m) => m.id === activeModelId) || null;
      },

      isConfigured: () => {
        const model = get().getActiveModel();
        return !!model && !!model.apiKey;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        models: state.models,
        activeModelId: state.activeModelId,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import {
  setOverrideReader,
  setRuntimeLocale,
  translate as translateRaw,
  CATALOG_SIZE,
} from '@/i18n';
import type { Locale } from '@/i18n';

// 兼容旧引用：旧的 I18N_DICT 常量已被 src/i18n/catalog.ts 的词条注册表取代。
// 保留这个别名，避免历史代码 import 报错。
export { I18N_CATALOG as I18N_DICT } from '@/i18n/catalog';

interface I18nState {
  locale: Locale;
  /** 管理员在「多语言」页补录的词条：key → 文本（对当前语言生效） */
  customTranslations: Record<string, string>;
  setLocale: (locale: Locale) => void;
  setCustom: (key: string, value: string) => void;
  removeCustom: (key: string) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      customTranslations: {},
      setLocale: (locale) => {
        setRuntimeLocale(locale);
        set({ locale });
      },
      setCustom: (key, value) =>
        set((s) => ({ customTranslations: { ...s.customTranslations, [key]: value } })),
      removeCustom: (key) =>
        set((s) => {
          const next = { ...s.customTranslations };
          delete next[key];
          return { customTranslations: next };
        }),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-i18n' },
  ),
);

// 把持久化状态与语言切换接到运行时。
// persist 是异步回填的（云端拉取），所以既订阅未来变化，也立刻用当前值同步一次。
setOverrideReader((key) => useI18nStore.getState().customTranslations[key]);
setRuntimeLocale(useI18nStore.getState().locale);
useI18nStore.subscribe((s) => setRuntimeLocale(s.locale));

/**
 * 翻译函数（向后兼容旧签名 translate(key, locale)）。
 * 新代码建议直接用 `useTranslation()`，可传中文原文兜底，避免界面出现裸 key。
 */
export function translate(key: string, locale?: Locale): string {
  return translateRaw(key, undefined, locale ?? useI18nStore.getState().locale);
}

/** 词条总量（「多语言」设置页展示用） */
export const dictionarySize = CATALOG_SIZE;

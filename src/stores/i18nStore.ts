import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import type { Locale } from '@/types';

// 基础字典（演示用，覆盖 OA 流程定制 / 平台能力关键文案）
export const I18N_DICT: Record<string, Record<Locale, string>> = {
  'app.title': { 'zh-CN': 'SSA ERP 企业资源管理平台', 'en-US': 'SSA ERP Enterprise Resource Platform' },
  'nav.platform': { 'zh-CN': 'OA流程定制', 'en-US': 'OA Process Studio' },
  'page.lowcode': { 'zh-CN': '低代码设计器', 'en-US': 'Low-code Designer' },
  'page.workflow': { 'zh-CN': '工作流引擎', 'en-US': 'Workflow Engine' },
  'page.integration': { 'zh-CN': '集成中心', 'en-US': 'Integration Hub' },
  'page.fieldPerm': { 'zh-CN': '字段级权限', 'en-US': 'Field Permissions' },
  'page.i18n': { 'zh-CN': '多语言', 'en-US': 'Localization' },
  'page.reportPerm': { 'zh-CN': '报表权限与订阅', 'en-US': 'Report Access & Subscription' },
  'common.save': { 'zh-CN': '保存', 'en-US': 'Save' },
  'common.add': { 'zh-CN': '新增', 'en-US': 'Add' },
  'common.delete': { 'zh-CN': '删除', 'en-US': 'Delete' },
  'common.submit': { 'zh-CN': '提交', 'en-US': 'Submit' },
};

interface I18nState {
  locale: Locale;
  customTranslations: Record<string, string>;
  setLocale: (locale: Locale) => void;
  setCustom: (key: string, value: string) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'zh-CN',
      customTranslations: {},
      setLocale: (locale) => set({ locale }),
      setCustom: (key, value) =>
        set((s) => ({ customTranslations: { ...s.customTranslations, [key]: value } })),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-i18n' },
  ),
);

// 翻译函数：自定义覆盖 > 字典 > key 本身
export function translate(key: string, locale?: Locale): string {
  const state = useI18nStore.getState();
  const loc = locale ?? state.locale;
  if (state.customTranslations[key]) return state.customTranslations[key];
  return I18N_DICT[key]?.[loc] ?? key;
}

/**
 * 多语言 React 钩子（A4 底座）
 *
 * 为什么要单独做钩子而不是直接调 translate()：
 *   translate() 是命令式的，读取的是 zustand 的 snapshot。切换语言时组件不会自动重渲染，
 *   界面会出现「语言已切但文案没变」的假故障。这里订阅 locale，保证切换即刷新。
 */
import { useCallback } from 'react';
import { useI18nStore } from '@/stores/i18nStore';
import {
  translate,
  navLabel as navLabelRaw,
  formatDate as formatDateRaw,
  formatNumber as formatNumberRaw,
  formatMoney as formatMoneyRaw,
  LOCALES,
  getMissingEntries,
  localeLabel as localeLabelRaw,
} from '@/i18n';
import type { Locale } from '@/i18n';

export interface UseTranslation {
  /** 当前语言 */
  locale: Locale;
  /** 切换语言 */
  setLocale: (l: Locale) => void;
  /** 翻译词条；第二个参数是中文原文兜底（强烈建议传，保证永不显示裸 key） */
  t: (key: string, fallbackZh?: string) => string;
  /** 导航名：按路由路径取 */
  nav: (path: string, fallbackZh: string) => string;
  /** 日期格式化（随语言） */
  date: (v: string | Date | undefined | null) => string;
  /** 数字格式化（随语言） */
  num: (v: number | undefined | null, digits?: number) => string;
  /** 货币格式化（随语言） */
  money: (v: number | undefined | null, currency?: string) => string;
  /** 语言显示名 */
  localeName: (l: Locale) => string;
  /** 可选语言列表 */
  locales: typeof LOCALES;
}

export function useTranslation(): UseTranslation {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const t = useCallback((key: string, fallbackZh?: string) => translate(key, fallbackZh, locale), [locale]);
  const nav = useCallback((path: string, fallbackZh: string) => navLabelRaw(path, fallbackZh, locale), [locale]);
  const date = useCallback((v: string | Date | undefined | null) => formatDateRaw(v, locale), [locale]);
  const num = useCallback((v: number | undefined | null, digits?: number) => formatNumberRaw(v, locale, digits), [locale]);
  const money = useCallback((v: number | undefined | null, currency?: string) => formatMoneyRaw(v, currency, locale), [locale]);

  return {
    locale,
    setLocale,
    t,
    nav,
    date,
    num,
    money,
    localeName: localeLabelRaw,
    locales: LOCALES,
  };
}

/**
 * 缺失词条（英文未翻译）清单 —— 「多语言」设置页展示与补录用。
 * 订阅 locale 变化，保证切换语言后立刻刷新清单。
 */
export function useMissingTranslations() {
  const locale = useI18nStore((s) => s.locale);
  const custom = useI18nStore((s) => s.customTranslations);
  const setCustom = useI18nStore((s) => s.setCustom);
  const removeCustom = useI18nStore((s) => s.removeCustom);
  // custom 参与依赖：补录后清单应立刻缩短
  void custom;
  return {
    locale,
    missing: locale === 'zh-CN' ? [] : getMissingEntries(),
    overrides: custom,
    setCustom,
    removeCustom,
  };
}

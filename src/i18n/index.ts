/**
 * 多语言运行时（D5 适配性 · A4 底座）
 *
 * 三条铁律：
 *  1. 缺失词条回退中文原文，**绝不显示裸 key** —— 显示 key 比显示中文更糟。
 *  2. 缺失词条自动登记到 missing 集合（去重），由「多语言」设置页暴露，管理员可现场补录，
 *     补录结果写入 i18nStore.customTranslations 并随云端持久化，不依赖改代码重新发版。
 *  3. 格式化随语言走：日期、数字千分位、货币符号都按 locale 输出，
 *     避免出现「英文界面 + 中文日期格式」这种一眼假的组合。
 */
import { I18N_CATALOG, LOCALES, CATALOG_SIZE as CATALOG_SIZE_INNER } from './catalog';
import type { Locale } from './catalog';

export { LOCALES };
export { CATALOG_SIZE } from './catalog';
export type { Locale };

/** 词条总量（设置页展示用） */
export const CATALOG_SIZE_VALUE = CATALOG_SIZE_INNER;

/** 缺失词条登记表：key → 命中的原始中文（用于设置页「一键补录」） */
const missing = new Map<string, string>();

export function getMissingEntries(): { key: string; zh: string }[] {
  return [...missing.entries()].map(([key, zh]) => ({ key, zh }));
}
export function clearMissingEntries() {
  missing.clear();
}

/** 供 store 注入的自定义词条读取器（避免 runtime 反向依赖 store 形成循环） */
type OverrideReader = (key: string, locale: Locale) => string | undefined;
let overrideReader: OverrideReader | null = null;
export function setOverrideReader(fn: OverrideReader | null) {
  overrideReader = fn;
}

/** 当前语言（供非 React 环境调用，由 store 同步写入） */
let currentLocale: Locale = 'zh-CN';
export function setRuntimeLocale(l: Locale) {
  currentLocale = l;
}
export function getRuntimeLocale(): Locale {
  return currentLocale;
}

/**
 * 翻译。
 * @param key   词条 key（如 nav./material/list）
 * @param fallbackZh 中文原文兜底 —— 调用方把界面上原本写死的中文传进来，
 *                   这样即使词条没登记，界面也显示中文而不是 key。
 * @param locale 指定语言，缺省用当前语言
 */
export function translate(key: string, fallbackZh?: string, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  const override = overrideReader?.(key, loc);
  if (override) return override;

  const entry = I18N_CATALOG[key];
  if (entry) {
    const v = loc === 'zh-CN' ? entry['zh-CN'] : (entry['en-US'] ?? entry['zh-CN']);
    // 英文缺失时回退中文，并登记缺失（让管理员知道还有哪些没翻）
    if (loc !== 'zh-CN' && !entry['en-US']) {
      missing.set(key, entry['zh-CN']);
    }
    return v;
  }

  // 词条根本没登记：回退调用方给的中文原文；没有原文才显示 key
  const zh = fallbackZh ?? key;
  if (loc !== 'zh-CN') missing.set(key, zh);
  return zh;
}

/** 便捷：按路由路径取导航名（侧栏/面包屑/标签页统一入口） */
export function navLabel(path: string, fallbackZh: string, locale?: Locale): string {
  return translate(`nav.${path}`, fallbackZh, locale);
}

/** 通用词条：t('common.save') 形式，key 自动补 common. 前缀 */
export function t(key: string, fallbackZh?: string, locale?: Locale): string {
  const full = key.includes('.') ? key : `common.${key}`;
  return translate(full, fallbackZh, locale);
}

// ── 格式化（随语言变化） ──

/** 语言 → 区域标识（Intl 用） */
function intlTag(locale: Locale): string {
  return locale === 'en-US' ? 'en-US' : 'zh-CN';
}

/** 日期：中文 2026-09-15 / 英文 Sep 15, 2026 */
export function formatDate(value: string | Date | undefined | null, locale?: Locale): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const loc = locale ?? currentLocale;
  if (loc === 'zh-CN') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** 数字：按语言加千分位 */
export function formatNumber(value: number | undefined | null, locale?: Locale, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '';
  const loc = locale ?? currentLocale;
  return value.toLocaleString(intlTag(loc), {
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
    maximumFractionDigits: digits,
  });
}

/** 货币：中文 ¥1,234.00 / 英文 CN¥1,234.00（币种缺省人民币） */
export function formatMoney(
  value: number | undefined | null,
  currency = 'CNY',
  locale?: Locale,
): string {
  if (value == null || !Number.isFinite(value)) return '';
  const loc = locale ?? currentLocale;
  try {
    return new Intl.NumberFormat(intlTag(loc), {
      style: 'currency',
      currency: currency || 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // 非法币种代码（脏数据）不抛异常，退化为数字 + 代码
    return `${formatNumber(value, loc)} ${currency}`;
  }
}

/** 语言显示名（设置页下拉用） */
export function localeLabel(locale: Locale): string {
  return LOCALES.find((l) => l.value === locale)?.nativeLabel ?? locale;
}

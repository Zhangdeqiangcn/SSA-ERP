import dayjs from 'dayjs';

export const formatDate = (date: string | Date | undefined | null, format = 'YYYY-MM-DD'): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

/** 本地时区当天日期 yyyy-mm-dd（dayjs 走本地时间；切勿用 toISOString——UTC 会把 UTC+8 的凌晨算成前一天） */
export const todayLocal = (): string => dayjs().format('YYYY-MM-DD');

/** 从 ISO 时间串取本地日期部分（yyyy-mm-dd）；空值兜底为当天 */
export const localDateOf = (iso: string | Date | undefined | null): string =>
  iso ? dayjs(iso).format('YYYY-MM-DD') : todayLocal();

export const formatDateTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatCurrency = (amount: number | undefined | null, currency = 'CNY'): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number | undefined | null, decimals = 2): string => {
  if (num === undefined || num === null) return '-';
  return num.toFixed(decimals);
};

export const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-';
  return `${(value * 100).toFixed(1)}%`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const formatPhone = (phone: string | undefined): string => {
  if (!phone) return '-';
  return phone;
};

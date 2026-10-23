// V3.102.0 申请日期工具单测：todayLocal / localDateOf
// 背景：采购申请表头「期望日期」改为「申请日期」（提交时自动拉取当天）。
// 关键防坑：不能用 new Date().toISOString() 取日期——UTC 会把 UTC+8 的凌晨算成前一天。
import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { todayLocal, localDateOf } from '@/utils/format';

describe('todayLocal（申请日期取当天）', () => {
  it('返回 yyyy-mm-dd 格式', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('与 dayjs 本地当天一致', () => {
    expect(todayLocal()).toBe(dayjs().format('YYYY-MM-DD'));
  });

  it('不受 UTC 偏移影响（本地时区语义）', () => {
    // 构造一个本地当天 00:30 的时刻：toISOString 在 UTC+8 下会落到前一天，
    // todayLocal 必须仍返回本地当天——这正是本工具存在的意义
    const local = new Date();
    local.setHours(0, 30, 0, 0);
    expect(todayLocal()).toBe(
      `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
    );
  });
});

describe('localDateOf（ISO 串取本地日期）', () => {
  it('正常 ISO 串取本地日期部分', () => {
    const d = new Date(2026, 9, 22, 15, 0, 0); // 本地 2026-10-22 15:00
    expect(localDateOf(d.toISOString())).toBe('2026-10-22');
  });

  it('UTC+8 凌晨的 UTC 串按本地换算（不丢一天）', () => {
    // 本地 2026-10-23 00:30 → UTC 2026-10-22T16:30Z，应还原为 10-23
    const d = new Date(2026, 9, 23, 0, 30, 0);
    expect(localDateOf(d.toISOString())).toBe('2026-10-23');
  });

  it('空值兜底为当天', () => {
    expect(localDateOf(undefined)).toBe(todayLocal());
    expect(localDateOf(null)).toBe(todayLocal());
    expect(localDateOf('')).toBe(todayLocal());
  });
});

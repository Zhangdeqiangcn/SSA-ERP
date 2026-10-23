import fs from 'node:fs';
import path from 'node:path';
import dayjs from 'dayjs';
import { describe, test, expect } from 'vitest';
import { todayLocal, formatDate } from '@/utils/format';

const ROOT = path.resolve(__dirname, '../../src/pages');

// V3.103.0：业务发生类日期字段全部改为提交时系统自动抓取当天（本地时区），
// 表单只读，不再用手填、不再用 toISOString 的 UTC 写法取日期。
const TARGETS = [
  'Sales/SalesOrderForm.tsx',
  'Sales/SalesInvoice.tsx',
  'Sales/SalesReturn.tsx',
  'Sales/TripartySalesList.tsx',
  'Warehouse/StockTransfer.tsx',
  'Warehouse/InboundForm.tsx',
  'Warehouse/BatchManage.tsx',
  'Finance/VoucherForm.tsx',
  'Finance/AccountingEntries.tsx',
  'Finance/CashMgmtList.tsx',
  'Finance/InvoiceList.tsx',
  'Finance/FixedAssets.tsx',
  'Purchase/PurchaseReturn.tsx',
  'Production/Equipment.tsx',
  'Vendor/DeliveryShipment.tsx',
];

describe('V3.103.0 自动抓取日期字段回归', () => {
  for (const rel of TARGETS) {
    const file = path.join(ROOT, rel);
    const src = fs.readFileSync(file, 'utf8');
    test(`${rel}：使用 todayLocal 且不再用 toISOString 取日期`, () => {
      expect(src).toContain('todayLocal');
      expect(src).not.toContain('toISOString().slice(0, 10)');
      expect(src).not.toContain("toISOString().split('T')[0]");
      expect(src).not.toContain('toISOString().split("T")[0]');
    });
  }

  test('todayLocal 返回本地时区当天（规避 UTC+8 凌晨落到前一天）', () => {
    const day = todayLocal();
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 本地当天应等于 dayjs 本地格式化，而非 toISOString（UTC）截取
    const viaUtc = new Date().toISOString().slice(0, 10);
    // 仅当本地时区非 UTC 且当前处于「本地日期 != UTC 日期」窗口时两者才不同；
    // 此处只断言 todayLocal 与 dayjs 本地一致，且格式正确。
    expect(day).toBe(dayjs().format('YYYY-MM-DD'));
  });

  test('formatDate 接受 Date 对象并按本地时区格式化', () => {
    const d = new Date(2026, 0, 15, 10, 0, 0); // 2026-01-15 本地
    expect(formatDate(d)).toBe('2026-01-15');
  });
});

/**
 * 通用导出工具（CSV / Excel）— V2.73 纯前端快赢
 * ------------------------------------------------------------
 * 统一各分析/报表页的导出口径，避免每处各写一遍 Blob/XLSX 样板代码：
 * - BISelfService（BI 自助分析结果，支持多 sheet + 分析配置元数据）
 * - ChatBI（对话式分析结果图表数据）
 * - AlertMonitor（预警明细）
 * - InvoiceVerification（数电票核验结果/核验历史）
 *
 * xlsx / file-saver 均为动态 import，不进首屏主包。
 */

export interface ExportColumn<T = any> {
  /** 列标识（用于取默认取值 row[key]） */
  key: string;
  /** 表头文字 */
  label: string;
  /** 自定义取值；默认取 row[key] */
  format?: (row: T) => string | number;
}

export interface ExportSheet<T = any> {
  /** sheet 名（Excel）/ 文件名主体（CSV 仅取第一个 sheet） */
  name: string;
  rows: T[];
  columns: ExportColumn<T>[];
}

/** 单元格文本化：null/undefined → 空串；对象/数组 → JSON */
function cellText(v: unknown): string | number {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/** 导出矩阵：首行为表头 */
export function toMatrix<T>(sheet: ExportSheet<T>): (string | number)[][] {
  const head = sheet.columns.map((c) => c.label);
  const body = sheet.rows.map((row) =>
    sheet.columns.map((c) => {
      const raw = c.format ? c.format(row) : (row as Record<string, unknown>)?.[c.key];
      return cellText(raw);
    })
  );
  return [head, ...body];
}

/** 导出对象数组（供 XLSX json_to_sheet 使用，保留数值类型便于 Excel 求和） */
export function toObjects<T>(sheet: ExportSheet<T>): Record<string, string | number>[] {
  return sheet.rows.map((row) => {
    const out: Record<string, string | number> = {};
    sheet.columns.forEach((c) => {
      const raw = c.format ? c.format(row) : (row as Record<string, unknown>)?.[c.key];
      out[c.label] = cellText(raw);
    });
    return out;
  });
}

function escapeCsvCell(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 文件名/时间戳：YYYYMMDD-HHmm */
export function exportStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 拼装导出文件名：<base>_<stamp>.<ext> */
export function withStamp(base: string, ext: 'csv' | 'xlsx', d: Date = new Date()): string {
  return `${base}_${exportStamp(d)}.${ext}`;
}

/**
 * 导出 CSV（UTF-8 BOM，Excel 直接打开不乱码）
 * 多 sheet 时仅导出第一个。
 */
export async function exportCsv<T>(
  sheets: ExportSheet<T> | ExportSheet<T>[],
  filename: string
): Promise<void> {
  const list = Array.isArray(sheets) ? sheets : [sheets];
  if (list.length === 0 || list[0].rows.length === 0) return;
  const matrix = toMatrix(list[0]);
  const text = matrix.map((line) => line.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/** 导出 Excel（支持多 sheet） */
export async function exportExcel<T>(
  sheets: ExportSheet<T>[],
  filename: string
): Promise<void> {
  const valid = sheets.filter((s) => s.rows.length > 0);
  if (valid.length === 0) return;
  const [XLSX, { saveAs }] = await Promise.all([import('xlsx'), import('file-saver')]);
  const wb = XLSX.utils.book_new();
  valid.forEach((s) => {
    // sheet 名需 ≤31 字符且不含 []:*?/\
    const safeName = s.name.replace(/[[\]:*?/\\]/g, '_').slice(0, 31) || 'Sheet';
    const ws = XLSX.utils.json_to_sheet(toObjects(s));
    // 自适应列宽（取表头与内容的最大显示宽度，上限 40）
    const header = s.columns.map((c) => c.label);
    const widths = header.map((h, i) => {
      const maxBody = valid
        ? Math.max(
            0,
            ...s.rows.slice(0, 200).map((row) => {
              const c = s.columns[i];
              const raw = c.format ? c.format(row) : (row as Record<string, unknown>)?.[c.key];
              return String(cellText(raw)).length;
            })
          )
        : 0;
      return Math.min(40, Math.max(String(h).length + 2, maxBody + 2, 8));
    });
    ws['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // 释放
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

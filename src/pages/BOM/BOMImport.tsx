import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Chip, Stack, Snackbar,
} from '@mui/material';
import * as XLSX from 'xlsx';
import { FileDownload, FileUpload, Download } from '@mui/icons-material';
import { useBOMStore } from '@/stores/bomStore';
import { useMaterialStore } from '@/stores/materialStore';
import { BOMHeader, BOMItem, BOMType, BOMStatus } from '@/types/bom';

/**
 * BOM 导入（Excel）
 * ------------------------------------------------------------
 * 强哥诉求：
 *   ① 给用户一个「BOM 导入模板」下载 → 填 → 导入；
 *   ② 模板里把「必填项」标识清楚；
 *   ③ 必填项不完整时，明确「导入失败 + 失败原因（定位到行/字段）」，而不是静默吞掉。
 *
 * 设计（平铺多行法，多行同 BOM 编号 = 一个 BOM 的多条物料行）：
 *   · 数据主源仍走 useBOMStore.addBOM（D1 落库，表头+明细一次写入）；
 *   · 纯解析/校验函数独立可测；模板、解析、校验共用同一份列定义（BOM_IMPORT_COLUMNS），
 *     避免「模板里的列」和「实际读的列」漂移。
 *   · 必填项 = BOM编号/产品名称/产品编码/物料编码/物料名称/单位/用量，用量须 > 0；
 *     任一缺失 → 整批原子失败（不导入任何一条），逐行逐字段列出原因。
 */

/** 模板列定义（表头文字 = 必填项加「（必填）」；key 用于解析时按表头反查） */
interface ImportColumn {
  key: string;        // 内部字段键
  label: string;     // 模板表头文字（含必填标识，解析时以此精确匹配）
  required: boolean;
  type: 'text' | 'number' | 'date' | 'enum';
  width: number;     // 模板列宽（字符）
  placeholder?: string;
}

export const BOM_IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'bomNo', label: 'BOM编号（必填）', required: true, type: 'text', width: 14, placeholder: 'B-2024-001（同一 BOM 多行填相同编号）' },
  { key: 'productName', label: '产品名称（必填）', required: true, type: 'text', width: 16, placeholder: '桥梁支座' },
  { key: 'productCode', label: '产品编码（必填）', required: true, type: 'text', width: 14, placeholder: 'P-001' },
  { key: 'bomType', label: 'BOM类型', required: false, type: 'enum', width: 10, placeholder: 'EBOM / MBOM，默认 EBOM' },
  { key: 'version', label: '版本', required: false, type: 'text', width: 8, placeholder: '默认 V1.0' },
  { key: 'effectiveDate', label: '生效日期', required: false, type: 'date', width: 12, placeholder: 'YYYY-MM-DD，默认今天' },
  { key: 'materialCode', label: '物料编码（必填）', required: true, type: 'text', width: 14, placeholder: 'M-1001（本行物料；须已存在于物料主数据）' },
  { key: 'parentMaterialCode', label: '父件物料编码', required: false, type: 'text', width: 14, placeholder: '留空=顶层件；填=挂在哪个物料编码之下（支持多级嵌套）' },
  { key: 'materialName', label: '物料名称（必填）', required: true, type: 'text', width: 16, placeholder: '钢板 Q235B' },
  { key: 'materialSpec', label: '规格', required: false, type: 'text', width: 16, placeholder: '12mm' },
  { key: 'unit', label: '单位（必填）', required: true, type: 'text', width: 8, placeholder: '张 / 米 / 件' },
  { key: 'quantity', label: '用量（必填）', required: true, type: 'number', width: 10, placeholder: '> 0 的数字' },
  { key: 'scrapRate', label: '废品率(%)', required: false, type: 'number', width: 10, placeholder: '0~100，默认 0' },
  { key: 'source', label: '来源', required: false, type: 'enum', width: 10, placeholder: '外购 / 自制 / 虚项，默认外购' },
  { key: 'unitCost', label: '单价(¥)', required: false, type: 'number', width: 10, placeholder: '默认 0' },
  { key: 'isCritical', label: '关键件', required: false, type: 'enum', width: 8, placeholder: '是 / 否，默认否' },
  { key: 'remark', label: '备注', required: false, type: 'text', width: 20 },
];

/** 必填列 key（提示文案/校验用） */
const REQUIRED_KEYS = BOM_IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);

/** 解析后的一行（已规整，保留原始单元格 + 规范化值） */
interface ParsedRow {
  seq: number;                 // 1 基的行号（Excel 第 2 行起，便于报错定位）
  raw: Record<string, unknown>;
  // 规范化
  bomNo: string;
  productName: string;
  productCode: string;
  bomType: BOMType;
  version: string;
  effectiveDate: string;
  materialCode: string;
  /** 父件物料编码（多级嵌套用；空 = 顶层件）。父件须能在本 BOM 内找到对应物料编码 */
  parentMaterialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  quantity: number;
  scrapRate: number;
  source: BOMItem['source'];
  unitCost: number;
  isCritical: boolean;
  remark: string;
  /** 命中的物料主数据 id（存在性校验通过后回填，构建 item 用） */
  materialIdMatch?: string;
}

/** 一条校验错误（定位到 行号 + 字段 + 原因） */
export interface ImportErrorItem {
  seq: number;
  field: string;   // 列 label
  reason: string;
}

const toStr = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
const toNum = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toDateStr = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '';
  // Excel 日期可能是 Excel 序列号
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s;
};

/** 枚举规整（中文/英文都认） */
function normType(v: string): BOMType {
  const s = v.toLowerCase();
  if (s === 'mbom' || s === '制造' || s === 'mbom') return 'MBOM';
  return 'EBOM';
}
function normSource(v: string): BOMItem['source'] {
  const s = v.trim();
  if (s === '自制' || s === '生产' || s === '制造' || s.toLowerCase() === 'manufacture') return 'manufacture';
  if (s === '虚项' || s === '虚拟' || s.toLowerCase() === 'phantom') return 'phantom';
  return 'purchase';
}
function normBool(v: string): boolean {
  return ['是', 'true', '1', 'Y', 'y', '√'].includes(v.trim());
}

/** 必填标识：表头文字里带「（必填）」的列即为必填 */
export function requiredHeaders(): string[] {
  return BOM_IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.label);
}

/** 生成可下载的导入模板（数据页 + 填写说明页，必填项用「（必填）」+ 示例行 + 说明页三重标识） */
export function buildBomTemplate() {
  const [XLSXmod] = [XLSX];
  const wb = XLSXmod.utils.book_new();

  // ── Sheet 1：BOM导入（示例数据，必填项在表头已标「（必填）」） ──
  const header = BOM_IMPORT_COLUMNS.map((c) => c.label);
  const rowObj = (o: Record<string, string | number>) => BOM_IMPORT_COLUMNS.map((c) => o[c.key] ?? '');
  const example1 = rowObj({ bomNo: 'B-2024-001', productName: '桥梁支座', productCode: 'P-001', bomType: 'EBOM', version: 'V1.0', effectiveDate: '2024-01-01', materialCode: 'M-1001', materialName: '钢板 Q235B', materialSpec: '12mm', unit: '张', quantity: 10, scrapRate: 5, source: '外购', unitCost: 150, isCritical: '是', remark: '主材' });
  const example2 = rowObj({ bomNo: 'B-2024-001', productName: '桥梁支座', productCode: 'P-001', materialCode: 'M-1002', materialName: 'H型钢 Q345B', materialSpec: 'H300×300', unit: '米', quantity: 20, scrapRate: 3, source: '外购', unitCost: 85, isCritical: '否' });
  // 多级嵌套示例：M-3001 是顶层子件，M-3002 挂在 M-3001 下（填「父件物料编码」），M-3003 挂在 M-3002 下 → 3 层
  const example3 = rowObj({ bomNo: 'B-2024-002', productName: '钢结构梁', productCode: 'P-002', bomType: 'MBOM', materialCode: 'M-3001', materialName: '梁组件', unit: '件', quantity: 2, source: '自制', remark: '顶层子件' });
  const example4 = rowObj({ bomNo: 'B-2024-002', productName: '钢结构梁', productCode: 'P-002', materialCode: 'M-3002', parentMaterialCode: 'M-3001', materialName: '主梁', unit: '根', quantity: 4, source: '自制', remark: '挂在 M-3001 下' });
  const example5 = rowObj({ bomNo: 'B-2024-002', productName: '钢结构梁', productCode: 'P-002', materialCode: 'M-3003', parentMaterialCode: 'M-3002', materialName: '焊条', unit: '把', quantity: 8, source: '外购', remark: '挂在 M-3002 下（第 3 层）' });
  const matrix = [header, example1, example2, example3, example4, example5];
  const ws = XLSXmod.utils.aoa_to_sheet(matrix as (string | number)[][]);
  ws['!cols'] = BOM_IMPORT_COLUMNS.map((c) => ({ wch: c.width }));
  XLSXmod.utils.book_append_sheet(wb, ws, 'BOM导入');

  // ── Sheet 2：填写说明（逐项说明 + 必填清单 + 规则） ──
  const descLines: (string | number)[][] = [
    ['BOM 导入填写说明'],
    [''],
    ['一、必填项（不填 / 填错 → 整批导入失败，并按行逐条提示原因）：'],
    ...REQUIRED_KEYS.map((k) => {
      const col = BOM_IMPORT_COLUMNS.find((c) => c.key === k)!;
      return [col.label, col.placeholder || ''];
    }),
    [''],
    ['二、同一 BOM 的多条物料行：'],
    ['  · 「BOM编号（必填）」相同的若干行，会被合并成同一个 BOM 的多条物料行；'],
    ['  · 同一 BOM 编号内，产品名称 / 产品编码必须一致，否则该 BOM 记为错误；'],
    ['  · 一个 BOM 至少要有 1 条物料行（物料编码/名称/单位/用量齐全）。'],
    [''],
    ['二·补充：多级嵌套（子件下面再带子件）'],
    ['  · 「父件物料编码」留空 = 该行是顶层件（直接挂在成品下）；'],
    ['  · 「父件物料编码」填某物料编码 = 该行挂在该物料之下（子件），支持任意层深；'],
    ['  · 父件物料编码必须能在「本 BOM 内」找到对应物料行，否则该行记为错误；'],
    ['  · 不能出现环（A 挂 B、B 又挂 A）或指向自身，否则记为错误；'],
    ['  · 示例：M-3001（顶层）← M-3002（父件填 M-3001）← M-3003（父件填 M-3002），共 3 层。'],
    [''],
    ['二·补充：物料主数据存在性校验'],
    ['  · 每行「物料编码」必须已存在于系统「物料管理」主数据中，否则该行记为错误、整批不导入；'],
    ['  · 请先在「物料管理」建好物料，再导入 BOM；物料编码需与主数据编码一致（忽略大小写/首尾空格）。'],
    [''],
    ['三、可选项（留空走默认值）：'],
    ['  · BOM类型：EBOM / MBOM，默认 EBOM；'],
    ['  · 版本：默认 V1.0；'],
    ['  · 生效日期：默认今天；'],
    ['  · 废品率(%)：0~100，默认 0；'],
    ['  · 来源：外购 / 自制 / 虚项，默认外购；'],
    ['  · 单价(¥)：默认 0；'],
    ['  · 关键件：是 / 否，默认否；'],
    ['  · 规格 / 备注：自由文本，可留空。'],
    [''],
    ['四、导入流程：下载本模板 → 按示例填写 → 在 BOM 管理页点「导入 BOM」选择文件 →'],
    ['   系统先做校验（必填项 + 数量>0 + 物料主数据存在 + 父件可挂接 + 同 BOM 字段一致），全部通过才创建；'],
    ['   任一行不合规 → 导入失败，并列出「第几行 / 哪个字段 / 什么原因」，修正后重新导入。'],
  ];
  const ws2 = XLSXmod.utils.aoa_to_sheet(descLines);
  ws2['!cols'] = [{ wch: 40 }, { wch: 44 }];
  XLSXmod.utils.book_append_sheet(wb, ws2, '填写说明');

  const buf = XLSXmod.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** 下载模板文件 */
export function downloadBomTemplate() {
  const blob = buildBomTemplate();
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BOM导入模板_${stamp}.xlsx`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

/** 把「一行原始数据」校验 + 规范化；返回 { ok, row?, errors[] }。
 *  raw 的键 = 模板表头文字（由我们生成的模板保证精确匹配），故按列 label 直接取值。 */
export function validateRow(
  raw: Record<string, unknown>,
  seq: number,
): { ok: boolean; parsed?: ParsedRow; errors: ImportErrorItem[] } {
  const errors: ImportErrorItem[] = [];
  const g = (k: string) => {
    const col = BOM_IMPORT_COLUMNS.find((c) => c.key === k)!;
    return raw[col.label];
  };

  const requiredMissing = REQUIRED_KEYS.filter((k) => toStr(g(k)) === '');
  for (const k of requiredMissing) {
    const col = BOM_IMPORT_COLUMNS.find((c) => c.key === k)!;
    errors.push({ seq, field: col.label, reason: `「${col.label}」为必填项，但第 ${seq} 行未填写` });
  }

  let quantity = toNum(g('quantity'));
  // 用量必须 > 0（有物料编码但数量 0/负/空 → 失败）
  const hasMaterial = toStr(g('materialCode')) !== '';
  if (hasMaterial && (quantity <= 0 || toStr(g('quantity')) === '')) {
    const col = BOM_IMPORT_COLUMNS.find((c) => c.key === 'quantity')!;
    errors.push({ seq, field: col.label, reason: `第 ${seq} 行「用量」必须为大于 0 的数字` });
  }

  // 废品率区间
  let scrapRate = toNum(g('scrapRate'));
  if (scrapRate < 0 || scrapRate > 100) scrapRate = Math.min(100, Math.max(0, scrapRate));

  if (errors.length > 0) return { ok: false, errors };

  const parsed: ParsedRow = {
    seq,
    raw,
    bomNo: toStr(g('bomNo')),
    productName: toStr(g('productName')),
    productCode: toStr(g('productCode')),
    bomType: normType(toStr(g('bomType'))),
    version: toStr(g('version')) || 'V1.0',
    effectiveDate: toDateStr(g('effectiveDate')) || new Date().toISOString().slice(0, 10),
    materialCode: toStr(g('materialCode')),
    parentMaterialCode: toStr(g('parentMaterialCode')),
    materialName: toStr(g('materialName')),
    materialSpec: toStr(g('materialSpec')),
    unit: toStr(g('unit')),
    quantity,
    scrapRate,
    source: normSource(toStr(g('source'))),
    unitCost: toNum(g('unitCost')),
    isCritical: normBool(toStr(g('isCritical'))),
    remark: toStr(g('remark')),
  };

  // 多级嵌套一致性：父件不能是本行自身（会形成自环，构不出树）
  if (parsed.parentMaterialCode && parsed.parentMaterialCode === parsed.materialCode) {
    errors.push({ seq, field: '父件物料编码', reason: `第 ${seq} 行「父件物料编码」与「物料编码」相同，父件不能指向自身` });
  }

  return { ok: errors.length === 0, parsed, errors };
}

/**
 * 解析整份工作簿 → 分组（同 bomNo = 一个 BOM）+ 逐行校验 + 同 BOM 字段一致性校验
 * + **多级嵌套**（按「父件物料编码」把物料挂到父件下）+ **物料主数据存在性校验**。
 * 纯函数（materials 用于回填 materialId + 校验物料是否存在，可为空数组 → 存在性校验放行但无法回填），可单测。
 */
export function parseBomWorkbook(
  rawRows: Record<string, unknown>[],
  materials: Array<{ id: string; code: string }>,
): { boms: { bomNo: string; header: Omit<BOMHeader, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'currency' | 'items'> ; items: BOMItem[]; }[]; errors: ImportErrorItem[]; rowCount: number } {
  const errors: ImportErrorItem[] = [];
  const boms: { bomNo: string; header: any; items: BOMItem[] }[] = [];
  // 物料主数据 code → materialId（大小写/首尾空格规整后精确匹配）
  const codeToId = new Map<string, string>();
  materials.forEach((m) => { if (m.code) codeToId.set(String(m.code).trim().toLowerCase(), m.id); });

  /** 一行 raw → 已规范化的 ParsedRow（含本 BOM 上下文）；物料主数据缺失在此报错 */
  const normRow = (raw: Record<string, unknown>, seq: number): ParsedRow | null => {
    const { ok, parsed, errors: rowErrs } = validateRow(raw, seq);
    if (!ok || !parsed) { errors.push(...rowErrs); return null; }
    // ★ 物料主数据存在性校验：物料编码必须在系统物料主数据里查得到，否则阻断（强哥要求）
    if (codeToId.size > 0) {
      const matched = codeToId.get(parsed.materialCode.trim().toLowerCase());
      if (!matched) {
        errors.push({ seq, field: '物料编码（必填）', reason: `第 ${seq} 行物料编码「${parsed.materialCode}」在系统物料主数据中不存在，请先在「物料管理」建立该物料，再导入 BOM` });
        return null;
      }
      parsed.materialIdMatch = matched; // 记录命中（供构建 item 用）
    }
    return parsed;
  };

  /** 先按 bomNo 收集全部有效行（保序），再做嵌套与一致性 */
  const bomRows = new Map<string, ParsedRow[]>();
  rawRows.forEach((raw, idx) => {
    const seq = idx + 2;
    const hasAny = BOM_IMPORT_COLUMNS.some((c) => toStr(raw[c.label]) !== '');
    if (!hasAny) return;
    const parsed = normRow(raw, seq);
    if (!parsed) return;
    const arr = bomRows.get(parsed.bomNo) || [];
    arr.push(parsed);
    bomRows.set(parsed.bomNo, arr);
  });

  bomRows.forEach((rows, key) => {
    const first = rows[0];
    // 同 BOM 字段一致性：产品名称 / 产品编码 必须与本 BOM 首行一致（否则记错）
    rows.forEach((p) => {
      if (p.productName !== first.productName) {
        errors.push({ seq: p.seq, field: '产品名称（必填）', reason: `第 ${p.seq} 行 BOM「${key}」的产品名称「${p.productName}」与本 BOM 首行「${first.productName}」不一致` });
      }
      if (p.productCode !== first.productCode) {
        errors.push({ seq: p.seq, field: '产品编码（必填）', reason: `第 ${p.seq} 行 BOM「${key}」的产品编码「${p.productCode}」与本 BOM 首行「${first.productCode}」不一致` });
      }
    });
    const bom: { bomNo: string; header: any; items: BOMItem[] } = {
      bomNo: key,
      header: {
        bomNo: key,
        name: first.productName,
        type: first.bomType,
        status: 'draft' as BOMStatus,
        productId: first.productCode,
        productCode: first.productCode,
        productName: first.productName,
        version: first.version,
        effectiveDate: first.effectiveDate,
      },
      items: [],
    };

    // 逐行 → BOMItem（顶层或挂到父件下）；父件缺失在此报错
    const buildItem = (p: ParsedRow, idx: number): BOMItem => {
      const materialId = p.materialIdMatch || codeToId.get(p.materialCode.trim().toLowerCase()) || `M-${p.materialCode}`;
      const totalCost = Math.round(p.quantity * p.unitCost * 100) / 100;
      return {
        id: `bom-itm-${Date.now().toString(36)}-${key.replace(/\W/g, '')}-${idx}`,
        bomId: '', // 创建 BOM 时回填
        level: 1,
        sequence: 1,
        materialId,
        materialCode: p.materialCode,
        materialName: p.materialName,
        materialSpec: p.materialSpec || undefined,
        unit: p.unit,
        quantity: p.quantity,
        scrapRate: p.scrapRate,
        source: p.source,
        unitCost: p.unitCost,
        totalCost,
        isCritical: p.isCritical,
        children: [],
      };
    };

    // 顶层节点：父件编码为空的行
    const topLevel: BOMItem[] = [];
    const nodeByCode = new Map<string, BOMItem>();
    rows.forEach((p, idx) => {
      const node = buildItem(p, idx);
      nodeByCode.set(p.materialCode.trim().toLowerCase(), node);
      if (!p.parentMaterialCode) {
        topLevel.push(node);
      } else {
        const pkey = p.parentMaterialCode.trim().toLowerCase();
        const parent = nodeByCode.get(pkey);
        if (!parent || parent === node) {
          errors.push({ seq: p.seq, field: '父件物料编码', reason: `第 ${p.seq} 行父件物料编码「${p.parentMaterialCode}」在本 BOM 中不存在对应物料行（或指向自身），无法挂接子件` });
          return;
        }
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    });

    // 环/重复挂接检测：把每个节点标记它归属的顶层根；若某子件挂到「自己是其后代」的节点上，则该子件永远走不到任何顶层根。
    const reachable = new Set<string>();
    const markReachable = (root: BOMItem) => {
      const stack = [root];
      while (stack.length) {
        const n = stack.pop()!;
        if (reachable.has(n.id)) continue;
        reachable.add(n.id);
        (n.children || []).forEach((c) => stack.push(c));
      }
    };
    const allNodes: BOMItem[] = [];
    const collect = (n: BOMItem) => { allNodes.push(n); (n.children || []).forEach(collect); };
    topLevel.forEach(collect);
    topLevel.forEach(markReachable);
    // 未被任何顶层根到达到的节点 = 参与环或被环挡住 → 阻断
    allNodes.forEach((n) => {
      if (!reachable.has(n.id)) {
        const p = rows.find((r) => r.materialCode.trim().toLowerCase() === n.materialCode.toLowerCase());
        errors.push({ seq: p?.seq ?? 0, field: '父件物料编码', reason: `物料「${n.materialCode}」与其父件「${p?.parentMaterialCode || ''}」之间存在环或重复挂接，无法构成合法树，请检查父件关系` });
      }
    });

    // 层级深度 + 每层内序号（BOM 关系表按 level/sequence 表达层级；子件序号各自从 1 起）
    const assign = (node: BOMItem, level: number, seqInLevel: number) => {
      node.level = level;
      node.sequence = seqInLevel;
      (node.children || []).forEach((c, i) => assign(c, level + 1, i + 1));
    };
    topLevel.forEach((t, i) => assign(t, 1, i + 1));

    bom.items = topLevel;
    boms.push(bom);
  });

  // 只保留没有行级错误的 BOM（items.length>0）
  const validBoms = boms.filter((b) => b.items.length > 0);
  return { boms: validBoms, errors, rowCount: rawRows.length };
}

/** 导入结果（供组件展示） */
export interface BOMImportOutcome {
  ok: boolean;
  createdBoms: number;
  createdItems: number;
  errors: ImportErrorItem[];
  fileName: string;
}

/**
 * 导入面板组件：下载模板 + 选择文件解析校验 + 预览 + 原子导入。
 * 用法：在 BOM 列表页工具栏放 <BOMImportPanel /> 即可。
 */
export const BOMImportPanel: React.FC = () => {
  const addBOM = useBOMStore((s) => s.addBOM);
  const fileRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<BOMImportOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'info' });

  const handleDownloadTemplate = () => {
    downloadBomTemplate();
    setSnack({ open: true, msg: '已下载 BOM 导入模板（含「BOM导入」+「填写说明」两个页签，必填项已标注）', sev: 'info' });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重选同一文件
    if (!file) return;
    setBusy(true);
    try {
      // 物料主数据存在性校验依赖物料主数据已加载；先确保拉到最新（离线/失败则沿用已有内存态，不阻断）
      try { await useMaterialStore.getState().loadMaterials(); } catch { /* 离线时保留内存态 */ }
      const freshMaterials = useMaterialStore.getState().materials as Array<{ id: string; code: string }>;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      // raw: true 保留原始值（数字/日期序列号），表头第 1 行
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' });
      if (rawRows.length === 0) {
        setResult({ ok: false, createdBoms: 0, createdItems: 0, errors: [{ seq: 0, field: '文件', reason: '文件中没有任何数据行，请参照模板填写后再导入' }], fileName: file.name });
        setDialogOpen(true);
        return;
      }
      const { boms, errors } = parseBomWorkbook(rawRows, freshMaterials);
      // 逐行校验失败 或 同 BOM 字段冲突 → 整批原子失败，不导入
      if (errors.length > 0) {
        setResult({ ok: false, createdBoms: 0, createdItems: 0, errors, fileName: file.name });
        setDialogOpen(true);
        return;
      }
      // 校验通过：创建 BOM（递归回填 bomId 到各级 children，含嵌套子件）
      let createdBoms = 0;
      let createdItems = 0;
      const stamp = Date.now().toString(36);
      const backfill = (item: BOMItem, bomId: string): BOMItem => {
        const copy: BOMItem = { ...item, bomId };
        if (copy.children?.length) copy.children = copy.children.map((c) => backfill(c, bomId));
        return copy;
      };
      const countAll = (items: BOMItem[]): number =>
        items.reduce((s, it) => s + 1 + (it.children ? countAll(it.children) : 0), 0);
      boms.forEach((b, bi) => {
        const bomId = `bom-import-${stamp}-${bi}`;
        const items = b.items.map((it) => backfill(it, bomId));
        const bom: BOMHeader = {
          ...b.header,
          id: bomId,
          currency: 'CNY',
          totalCost: items.reduce((s, it) => s + (it.totalCost || 0), 0),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '导入',
          updatedBy: '导入',
          items,
        };
        addBOM(bom);
        createdBoms += 1;
        createdItems += countAll(items);
      });
      setResult({ ok: true, createdBoms, createdItems, errors: [], fileName: file.name });
      setDialogOpen(true);
    } catch (err: any) {
      setResult({
        ok: false, createdBoms: 0, createdItems: 0,
        errors: [{ seq: 0, field: '文件', reason: `文件解析失败：${err?.message || '无法读取该文件，请确认为 .xlsx / .csv 格式且未加密'}` }],
        fileName: file.name,
      });
      setDialogOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    if (result?.ok) setSnack({ open: true, msg: `导入成功：已创建 ${result.createdBoms} 个 BOM（共 ${result.createdItems} 条物料行）`, sev: 'success' });
    else if (result) setSnack({ open: true, msg: `导入失败（${result.errors.length} 项）：${result.errors[0]?.reason}`, sev: 'error' });
  };

  const errCount = result?.errors.length ?? 0;

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplate} data-testid="bom-download-template">
        下载导入模板
      </Button>
      <Button variant="outlined" startIcon={<FileUpload />} onClick={() => fileRef.current?.click()} disabled={busy} data-testid="bom-import-btn">
        导入 BOM
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} data-testid="bom-import-input" />

      {/* 结果 / 预览对话框：成功=汇总+确认；失败=逐条失败原因 */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {result?.ok ? 'BOM 导入成功' : 'BOM 导入失败'}
          {result && <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, ml: 1 }}>（{result.fileName}）</Typography>}
        </DialogTitle>
        <DialogContent>
          {result?.ok ? (
            <Alert severity="success" sx={{ borderRadius: 1.5 }}>
              已创建 <b>{result.createdBoms}</b> 个 BOM，共 <b>{result.createdItems}</b> 条物料行（均为草稿，可在 BOM 列表继续编辑/发布）。
            </Alert>
          ) : (
            <>
              <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>
                共 <b>{errCount}</b> 项不合规，本次<b>未导入任何数据</b>。请按下述原因修正模板后重新导入：
              </Alert>
              <TableContainer sx={{ maxHeight: 320, border: '1px solid #EF444433', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#FEF2F2' }}>
                      <TableCell width={70}>行号</TableCell>
                      <TableCell width={180}>字段</TableCell>
                      <TableCell>失败原因</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(result?.errors || []).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell><Chip size="small" color="error" label={e.seq > 0 ? `第 ${e.seq} 行` : '—'} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{e.field}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{e.reason}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack direction="row" sx={{ mt: 1.5, gap: 1 }}>
                <Chip size="small" label={`必填项：${requiredHeaders().join('、').replace(/（必填）/g, '')}`} />
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{result?.ok ? '完成' : '关闭'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.sev} variant="filled" sx={{ width: '100%', borderRadius: 1.5 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BOMImportPanel;

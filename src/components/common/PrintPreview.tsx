import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  PrintTemplate, PrintEntity, PRINT_FIELD_CATALOG,
  HeaderFooterConfig, DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG, textToHtml,
} from '@/stores/printTemplateStore';
import { useCustomFieldStore } from '@/stores/customFieldStore';
import { formatCurrency } from '@/utils/format';

/**
 * P0 修复：浏览器端净化（利用真实 DOM，零依赖）。
 * 即便后端净化被绕过，前端在 dangerouslySetInnerHTML 之前再净化一次，
 * 从渲染侧彻底断掉存储型 XSS 的执行链。
 * 规则：删除 script/iframe/object/embed/link/meta/style/base/form/svg 等危险标签；
 * 删除所有 on* 事件属性；href/src 仅放行安全协议（http/https/mailto，
 * 图片 src 额外放行 data:image 非 svg），并净化 style 中的危险表达式。
 */
function sanitizeBrowserHtml(dirty: string): string {
  const el = document.createElement('div');
  el.innerHTML = dirty;
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== 1) return; // 只处理元素节点
      const e = child as Element;
      const tag = e.tagName.toLowerCase();
      if (['script', 'iframe', 'object', 'embed', 'link', 'meta', 'style', 'base', 'form', 'svg'].includes(tag)) {
        e.remove();
        return;
      }
      Array.from(e.attributes).forEach((attr) => {
        const n = attr.name.toLowerCase();
        const v = attr.value.toLowerCase();
        if (n.startsWith('on')) {
          e.removeAttribute(attr.name);
        } else if (n === 'href' || n === 'src') {
          // 放行：http/https/mailto；图片 src 额外放行 data:image（且禁止可含脚本的 svg）
          const safe =
            v.startsWith('http:') ||
            v.startsWith('https:') ||
            v.startsWith('mailto:') ||
            (tag === 'img' && /^data:image\/(?!svg)/i.test(attr.value));
          if (!safe) e.removeAttribute(attr.name);
        } else if (n === 'style' && /expression\(|javascript:|@import/i.test(attr.value)) {
          e.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };
  walk(el);
  return el.innerHTML;
}

interface PrintPreviewProps {
  template: PrintTemplate;
  /** 业务数据对象（订单/物料/供应商） */
  record: Record<string, any>;
  onClose?: () => void;
}

const PRINT_STYLE_ID = 'ssa-print-style';

/**
 * 可打印单据预览：按模板渲染字段，并提供浏览器打印（仅打印单据区域）。
 */
const PrintPreview: React.FC<PrintPreviewProps> = ({ template, record, onClose }) => {
  const customDefs = useCustomFieldStore((s) => s.fields[template.entity] || []);

  useEffect(() => {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.innerHTML = `
@media print {
  body * { visibility: hidden !important; }
  .ssa-print-area, .ssa-print-area * { visibility: visible !important; }
  .ssa-print-area {
    position: absolute !important; left: 0; top: 0; width: 100% !important;
    box-shadow: none !important; margin: 0 !important; padding: 0 !important;
  }
  .no-print { display: none !important; }
  @page { margin: 14mm; }
  .ssa-print-page-num::after { content: counter(page); }
  .ssa-print-page-total::after { content: counter(pages); }
  .ssa-print-area img { max-width: 100%; height: auto; }
}`;
    document.head.appendChild(style);
  }, []);

  const catalog = PRINT_FIELD_CATALOG[template.entity];
  const paperWidth = template.paperSize === 'A4' ? 794 : 559;
  const now = new Date().toLocaleString('zh-CN');

  const formatValue = (key: string, type: string | undefined, value: any) => {
    if (value === undefined || value === null || value === '') return '—';
    if (type === 'money') return formatCurrency(Number(value));
    if (key === 'materialType') {
      const map: Record<string, string> = { raw: '原材料', semi: '半成品', finished: '成品', purchased: '外购件', service: '服务' };
      return map[value] || value;
    }
    return String(value);
  };

  /**
   * 渲染页眉/页脚（V2.89.0 富文本版）
   * config.html 为 mui-tiptap 产出的富文本 HTML（含内联样式 + 图片 base64）。
   * 兼容旧模板：无 html 时用 fallbackText 兜底。
   * {now} 占位符替换为打印时间；showDate 勾选时追加一行打印时间。
   */
  const renderHeaderFooter = (config: HeaderFooterConfig | undefined, fallbackText: string, isHeader: boolean) => {
    const cfg = config || (isHeader ? DEFAULT_HEADER_CONFIG : DEFAULT_FOOTER_CONFIG);
    const html = (cfg.html && cfg.html.trim()) || (fallbackText ? textToHtml(fallbackText) : '');
    if (!html) return null;
    const nowStr = new Date().toLocaleString('zh-CN');
    // P0 修复：渲染前再净化一次，断掉存储型 XSS 执行链（即便后端被绕过也不会执行脚本）
    const processed = sanitizeBrowserHtml(html.replace(/\{now\}/g, nowStr));

    return (
      <Box
        sx={{
          fontSize: isHeader ? 13 : 12,
          color: '#475569',
          ...(isHeader
            ? { mb: 3 }
            : { mt: 4, pt: 2, borderTop: '1px solid #E2E8F0' }),
          '& img': { maxWidth: '100%', height: 'auto' },
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: processed }} />
        {cfg.showDate && (
          <div style={{ textAlign: 'right', fontSize: isHeader ? 12 : 11, color: '#94A3B8', marginTop: 2 }}>
            打印时间：{nowStr}
          </div>
        )}
      </Box>
    );
  };

  const renderItems = () => {
    const items: any[] = record.items || [];
    if (items.length === 0) {
      return <Box sx={{ fontSize: 12, color: '#64748B', mt: 1 }}>无明细</Box>;
    }
    // 通用明细表：优先展示常见中文字段，缺失则回退到对象实际键名
    const labelMap: Record<string, string> = {
      materialCode: '物料编码', materialName: '物料名称', name: '名称', code: '编码',
      specification: '规格', unit: '单位', quantity: '数量', orderedQuantity: '数量',
      unitPrice: '单价', amount: '金额', price: '单价', deliveryDate: '交期',
      remark: '备注', requirementQty: '需求数量',
    };
    const moneyKeys = new Set(['unitPrice', 'amount', 'price', 'totalAmount', 'subtotal', 'grandTotal']);
    const baseKeys = Object.keys(items[0]).filter((k) => k !== 'id' && k !== 'materialId');
    const ordered = [
      'materialCode', 'materialName', 'name', 'code', 'specification', 'unit',
      'quantity', 'orderedQuantity', 'unitPrice', 'amount', 'deliveryDate', 'remark',
    ].filter((k) => baseKeys.includes(k));
    const rest = baseKeys.filter((k) => !ordered.includes(k));
    const cols = [...ordered, ...rest];

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F1F5F9' }}>
            {cols.map((k) => <th key={k} style={th}>{labelMap[k] || k}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i}>
              {cols.map((k) => (
                <td key={k} style={td}>
                  {moneyKeys.has(k) ? formatCurrency(Number(it[k]) || 0) : (it[k] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  /**
   * 渲染打印附加信息（V2.89.0）：审批记录 / 制单人 / 制单时间 / 审核人 / 审核时间 / 页码
   * 数据来自 record（业务单据字段），预览缺字段时显示占位。
   */
  const renderExtraOptions = () => {
    const opts = template.extraOptions;
    if (!opts) return null;
    const nowStr = new Date().toLocaleString('zh-CN');
    const blocks: React.ReactNode[] = [];

    if (opts.createdBy || opts.createdAt) {
      const parts: string[] = [];
      if (opts.createdBy) parts.push(`制单人：${record.createdBy || '—'}`);
      if (opts.createdAt) parts.push(`制单时间：${record.createdAt || nowStr}`);
      blocks.push(<Box key="created" sx={{ fontSize: 12, color: '#475569' }}>{parts.join('　')}</Box>);
    }
    if (opts.approvedBy || opts.approvedAt) {
      const parts: string[] = [];
      if (opts.approvedBy) parts.push(`审核人：${record.approvedBy || '—'}`);
      if (opts.approvedAt) parts.push(`审核时间：${record.approvedAt || '—'}`);
      blocks.push(<Box key="approved" sx={{ fontSize: 12, color: '#475569', mt: 0.5 }}>{parts.join('　')}</Box>);
    }
    if (opts.approvalRecord) {
      const approvals: any[] = Array.isArray(record.approvals) ? record.approvals : [];
      blocks.push(
        <Box key="approval" sx={{ mt: 2 }}>
          <Box sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>审批记录</Box>
          {approvals.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  <th style={th}>审批节点</th>
                  <th style={th}>审批人</th>
                  <th style={th}>审批时间</th>
                  <th style={th}>状态</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a: any, i: number) => (
                  <tr key={i}>
                    <td style={td}>{a.node || `节点${i + 1}`}</td>
                    <td style={td}>{a.approver || '—'}</td>
                    <td style={td}>{a.time || '—'}</td>
                    <td style={td}>{a.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Box sx={{ fontSize: 12, color: '#64748B' }}>暂无审批记录</Box>
          )}
        </Box>
      );
    }
    if (opts.pageNumber) {
      blocks.push(
        <Box key="page" sx={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', mt: 3 }}>
          第 <span className="ssa-print-page-num" /> 页 / 共 <span className="ssa-print-page-total" /> 页
        </Box>
      );
    }
    if (blocks.length === 0) return null;
    return <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed #E2E8F0' }}>{blocks}</Box>;
  };

  const th: React.CSSProperties = {
    border: '1px solid #E2E8F0', padding: '6px 8px', textAlign: 'left', fontWeight: 600,
  };
  const td: React.CSSProperties = { border: '1px solid #E2E8F0', padding: '6px 8px' };

  return (
    <Box>
      <Box className="no-print" sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
          打印
        </Button>
        {onClose && (
          <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose}>
            关闭
          </Button>
        )}
      </Box>

      <Box
        className="ssa-print-area"
        sx={{
          width: paperWidth,
          maxWidth: '100%',
          mx: 'auto',
          bgcolor: '#fff',
          color: '#111',
          p: 4,
          boxShadow: 3,
          fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        }}
      >
        <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 1 }}>
          {template.title}
        </Typography>

        {renderHeaderFooter(template.headerConfig, template.headerText, true)}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 24px',
            mb: 2,
            fontSize: 13,
          }}
        >
          {template.fieldKeys.filter((k) => k !== 'items').map((key) => {
            const cat = catalog.find((c) => c.key === key);
            const label = cat?.label || key;
            const value = formatValue(key, cat?.type, record[key]);
            return (
              <Box key={key} sx={{ display: 'flex', borderBottom: '1px dotted #E2E8F0', py: 0.5 }}>
                <Box sx={{ width: 110, color: '#64748B', flexShrink: 0 }}>{label}：</Box>
                <Box sx={{ flex: 1, fontWeight: 500 }}>{value}</Box>
              </Box>
            );
          })}
        </Box>

        {template.fieldKeys.includes('items') && renderItems()}

        {/* 自定义字段 */}
        {customDefs.length > 0 && record.customFields && Object.keys(record.customFields).length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ fontWeight: 600, mb: 1, fontSize: 13 }}>自定义字段</Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 13 }}>
              {customDefs.map((def) => (
                <Box key={def.key} sx={{ display: 'flex', borderBottom: '1px dotted #E2E8F0', py: 0.5 }}>
                  <Box sx={{ width: 110, color: '#64748B', flexShrink: 0 }}>{def.label}：</Box>
                  <Box sx={{ flex: 1, fontWeight: 500 }}>{String(record.customFields[def.key] ?? '—')}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {renderExtraOptions()}

        {renderHeaderFooter(template.footerConfig, template.footerText, false)}
      </Box>
    </Box>
  );
};

export default PrintPreview;

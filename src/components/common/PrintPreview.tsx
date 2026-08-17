import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  PrintTemplate, PrintEntity, PRINT_FIELD_CATALOG,
} from '@/stores/printTemplateStore';
import { useCustomFieldStore } from '@/stores/customFieldStore';
import { formatCurrency } from '@/utils/format';

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

        {template.headerText && (
          <Box sx={{ whiteSpace: 'pre-line', textAlign: 'center', color: '#475569', mb: 3, fontSize: 13 }}>
            {template.headerText}
          </Box>
        )}

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

        {template.footerText && (
          <Box sx={{ whiteSpace: 'pre-line', textAlign: 'center', color: '#475569', mt: 4, pt: 2, borderTop: '1px solid #E2E8F0', fontSize: 12 }}>
            {template.footerText.replace('{now}', now)}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PrintPreview;

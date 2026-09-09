import React, { useState } from 'react';
import {
  Button, Dialog, DialogContent, DialogTitle, Stack, Box, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { usePrintTemplateStore, PrintEntity, PrintTemplate } from '@/stores/printTemplateStore';
import PrintPreview from './PrintPreview';

interface PrintPreviewButtonProps {
  entity: PrintEntity;
  record: Record<string, any>;
  /** 同时渲染「打印」与「打印预览」两个按钮 */
  showBoth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'contained';
}

/**
 * 通用打印/打印预览按钮：打开按模板渲染的可打印单据弹窗。
 * - 「打印预览」：打开预览弹窗（弹窗内另有「打印」按钮可直接打印）；
 * - 「打印」：打开预览弹窗并立即调用浏览器打印。
 * 若对应实体未配置模板，则自动生成一份基于记录字段的默认模板。
 */
const PrintPreviewButton: React.FC<PrintPreviewButtonProps> = ({
  entity,
  record,
  showBoth = true,
  size = 'small',
  variant = 'outlined',
}) => {
  const [open, setOpen] = useState(false);
  const getTemplateByEntity = usePrintTemplateStore((s) => s.getTemplateByEntity);

  const template: PrintTemplate | undefined = getTemplateByEntity(entity) || buildFallback(entity, record);

  const openPreview = () => setOpen(true);
  const handlePrint = () => {
    setOpen(true);
    setTimeout(() => window.print(), 300);
  };

  return (
    <>
      {showBoth && (
        <Button variant={variant} size={size} startIcon={<PrintIcon />} onClick={handlePrint} data-testid="print-button">
          打印
        </Button>
      )}
      <Button variant={variant} size={size} startIcon={<VisibilityIcon />} onClick={openPreview} data-testid="print-preview-button">
        打印预览
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>打印预览</span>
        </DialogTitle>
        <DialogContent dividers>
          {template ? (
            <PrintPreview template={template} record={record} onClose={() => setOpen(false)} />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">暂无可用的打印模板。</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

/** 未配置模板时，依据记录字段生成默认模板（字段按顺序展示，含 items 则渲染明细表）。 */
const buildFallback = (entity: PrintEntity, record: Record<string, any>): PrintTemplate => {
  const rawKeys = Object.keys(record || {}).filter((k) => k !== 'items' && typeof record[k] !== 'object');
  return {
    id: `fallback-${entity}`,
    name: '默认模板',
    entity,
    title: entity,
    paperSize: 'A4',
    orientation: 'portrait',
    headerText: '',
    footerText: '打印时间：{now}',
    headerConfig: { html: '', showDate: false },
    footerConfig: { html: '', showDate: true },
    fieldKeys: [...rawKeys, 'items'].filter((k) => k !== 'items' || (record.items && record.items.length)),
    extraOptions: { approvalRecord: false, createdBy: true, createdAt: true, approvedBy: false, approvedAt: false, pageNumber: false },
  };
};

export default PrintPreviewButton;

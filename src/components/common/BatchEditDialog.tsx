import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import EditNote from '@mui/icons-material/EditNote';

/**
 * 批量修改字段定义
 * - type: 'text'（默认，单行文本）| 'select'（下拉，需提供 options）| 'number'
 * - 留空（空字符串）的字段不会被提交到 updates
 */
export interface BatchEditField {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface BatchEditDialogProps {
  open: boolean;
  title?: string;
  /** 已选记录数（标题展示） */
  count: number;
  /** 可批量修改的字段配置 */
  fields: BatchEditField[];
  /** 确认回调：updates 只包含非空字段 */
  onConfirm: (updates: Record<string, unknown>) => void;
  onCancel: () => void;
  /** 确认按钮文案 */
  confirmText?: string;
}

/**
 * 通用批量修改对话框（V2.90.0）
 * 所有列表页勾选行后点「批量修改」弹出的统一入口：
 * 列出可修改字段，留空的字段不修改，仅把填写的字段应用到所选记录。
 */
export const BatchEditDialog: React.FC<BatchEditDialogProps> = ({
  open,
  title = '批量修改',
  count,
  fields,
  onConfirm,
  onCancel,
  confirmText = '应用到所选记录',
}) => {
  const [values, setValues] = useState<Record<string, string>>({});

  // 每次打开重置为全空
  useEffect(() => {
    if (open) setValues({});
  }, [open]);

  const filledKeys = Object.keys(values).filter((k) => values[k] !== '' && values[k] !== undefined && values[k] !== null);

  const handleConfirm = () => {
    const updates: Record<string, unknown> = {};
    filledKeys.forEach((k) => {
      const field = fields.find((f) => f.key === k);
      updates[k] = field?.type === 'number' ? Number(values[k]) : values[k];
    });
    onConfirm(updates);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditNote color="primary" />
        {title}（已选 {count} 条）
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          留空的字段将不修改；仅把下方填写了内容的字段统一应用到所选的 {count} 条记录。
        </DialogContentText>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {fields.map((field) => (
            <TextField
              key={field.key}
              select={field.type === 'select'}
              type={field.type === 'number' ? 'number' : 'text'}
              label={field.label}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              fullWidth
              size="small"
            >
              {field.type === 'select' && (
                <MenuItem value="">不修改</MenuItem>
              )}
              {field.type === 'select' && field.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={filledKeys.length === 0}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BatchEditDialog;

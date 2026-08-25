import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  Help,
} from '@mui/icons-material';

type ConfirmType = 'warning' | 'danger' | 'info' | 'confirm';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  content: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  /** 显式指定确认按钮颜色（覆盖 type 的默认配色） */
  confirmColor?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const typeConfig = {
  warning: {
    icon: <Warning color="warning" />,
    confirmColor: 'warning' as const,
  },
  danger: {
    icon: <Error color="error" />,
    confirmColor: 'error' as const,
  },
  info: {
    icon: <Info color="info" />,
    confirmColor: 'primary' as const,
  },
  confirm: {
    icon: <Help color="primary" />,
    confirmColor: 'primary' as const,
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = '确认操作',
  content,
  confirmText = '确定',
  cancelText = '取消',
  type = 'confirm',
  confirmColor,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const config = typeConfig[type];

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {config.icon}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor ?? config.confirmColor}
          disabled={loading}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;

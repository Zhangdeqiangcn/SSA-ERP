// 全局错误提示挂载组件（V3.23.0 · #5）
// 唯一的全局 Snackbar 出口，由 globalToastStore 驱动；
// 仅在服务端 5xx / 网络失败时弹出，让「静默失败」变为可见。
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useGlobalToastStore } from '@/stores/globalToastStore';

const GlobalErrorToast: React.FC = () => {
  const { open, message, close } = useGlobalToastStore();
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={close} severity="error" variant="filled" sx={{ width: '100%', maxWidth: 420 }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalErrorToast;

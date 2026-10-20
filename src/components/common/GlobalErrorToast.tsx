// 全局提示挂载组件（V3.23.0 起为唯一全局 Snackbar 出口；V3.92.0 支持四级提示）
// 由 globalToastStore 驱动；替代全站浏览器原生 alert/confirm 弹窗。
// 文件名/导出名保持不变，App.tsx 的引入方式零改动。
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useGlobalToastStore } from '@/stores/globalToastStore';

const GlobalErrorToast: React.FC = () => {
  const { open, message, severity, close } = useGlobalToastStore();
  const duration = severity === 'error' ? 6000 : 3000;
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={close}
        severity={severity}
        variant="filled"
        data-testid="global-toast"
        sx={{ width: '100%', maxWidth: 480, whiteSpace: 'pre-line' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalErrorToast;
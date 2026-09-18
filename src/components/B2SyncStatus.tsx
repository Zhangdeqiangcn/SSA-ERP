// B2SyncStatus —— P1 FE-002 修复的「失败可观测」UI 组件。
//
// 订阅 b2Api 的失败记录（fire-and-forget 双写失败时不再静默消失）：
//   - 当有「本地修改未同步到服务器」的失败时，右下角弹出非阻塞 Snackbar；
//   - 用户点击「重试」调用 b2Api.retryAll() 重放写操作，成功后自动清空；
//   - 重试期间显示 loading；组件自行管理订阅生命周期（挂载订阅 / 卸载退订）。
//
// 设计约束：非阻塞、不挡操作；仅订阅 + 重试，不改动任何业务调用约定。

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, CircularProgress, Link, Snackbar } from '@mui/material';
import { b2Api, type B2Failure } from '@/services/b2Api';

/**
 * 右下角非阻塞状态条：提示本地修改未同步到 D1，并提供一键重试。
 */
const B2SyncStatus: React.FC = () => {
  const [failures, setFailures] = useState<B2Failure[]>([]);
  const [retrying, setRetrying] = useState<boolean>(false);

  // 订阅 b2Api 失败列表；组件卸载时退订
  useEffect(() => {
    const unsubscribe = b2Api.subscribe(setFailures);
    return unsubscribe;
  }, []);

  // 仅「本地修改」（写操作，非 GET）计入未同步条数
  const unsyncedCount = failures.filter((f) => f.method !== 'GET').length;

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await b2Api.retryAll();
    } finally {
      setRetrying(false);
    }
  }, []);

  // 用户手动关闭（忽略）：清空失败记录，视为已读
  const handleDismiss = useCallback(() => {
    b2Api.clearFailures();
  }, []);

  const open = unsyncedCount > 0 || retrying;

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      // 手动关闭（不自动消失），避免用户还没看到就隐藏
      autoHideDuration={null}
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={handleDismiss}
        icon={retrying ? <CircularProgress size={18} color="inherit" /> : undefined}
        action={
          <Link
            component="button"
            variant="body2"
            onClick={handleRetry}
            underline="always"
            sx={{ color: 'inherit', cursor: 'pointer', ml: 1, whiteSpace: 'nowrap' }}
          >
            {retrying ? '重试中…' : '点击重试'}
          </Link>
        }
      >
        {retrying
          ? '正在将本地修改重试同步到服务器…'
          : `${unsyncedCount} 条本地修改未同步到服务器（点击重试）`}
      </Alert>
    </Snackbar>
  );
};

export default B2SyncStatus;

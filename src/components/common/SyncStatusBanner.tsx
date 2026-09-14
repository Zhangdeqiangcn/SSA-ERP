// 云同步状态提示条（V3.1.0 · 评测 H-02 / M-13 整改）
//
// 过去的做法：云端保存失败被静默吞掉，界面永远显示「保存成功」，
//   用户直到换台设备或第二天打开才发现改动没了。
// 现在的做法：任何一次云端保存失败都会在这里常驻显示，直到重试成功或用户确认忽略；
//   多端冲突也会明确告知「谁的数据被覆盖、该怎么做」，而不是无声替换。

import React, { useCallback } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useSyncStatusStore } from '@/stores/syncStatusStore';
import { flushPendingWrites } from '@/stores/persistStorage';

const SyncStatusBanner: React.FC = () => {
  const failures = useSyncStatusStore((s) => s.failures);
  const conflicts = useSyncStatusStore((s) => s.conflicts);
  const clearFailures = useSyncStatusStore((s) => s.clearFailures);
  const clearConflicts = useSyncStatusStore((s) => s.clearConflicts);

  // 重放队列：成功的项会自动从提示中移除，仍失败的项继续保留（含最新失败原因）
  const retry = useCallback(async () => {
    const { failed } = await flushPendingWrites();
    if (failed === 0) clearFailures();
  }, [clearFailures]);

  const hasError = failures.some((f) => f.severity === 'error');

  if (!failures.length && !conflicts.length) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: 420,
      }}
    >
      <Stack spacing={1}>
        {failures.length > 0 && (
          <Alert
            severity={hasError ? 'error' : 'warning'}
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={retry}>
                  立即重试
                </Button>
                <Button color="inherit" size="small" onClick={clearFailures}>
                  忽略
                </Button>
              </Stack>
            }
          >
            <Typography variant="subtitle2" fontWeight={700}>
              有 {failures.length} 项改动尚未保存到云端
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              {hasError
                ? '系统会在后台自动重试；在重试成功前，其他设备看到的仍是旧数据。'
                : '多为权限限制（普通成员无法改写组织级配置），不影响你的本地操作。'}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {failures.slice(0, 3).map((f) => (
                <Typography key={f.key} variant="caption" component="div">
                  · {f.label}：{f.message}
                </Typography>
              ))}
              {failures.length > 3 && (
                <Typography variant="caption" component="div">
                  · 其余 {failures.length - 3} 项……
                </Typography>
              )}
            </Box>
          </Alert>
        )}

        {conflicts.length > 0 && (
          <Alert
            severity="warning"
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                  刷新页面
                </Button>
                <Button color="inherit" size="small" onClick={clearConflicts}>
                  知道了
                </Button>
              </Stack>
            }
          >
            <Typography variant="subtitle2" fontWeight={700}>
              数据在其他设备已被修改
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              为避免覆盖他人改动，你的这次保存未生效；本机已载入云端最新版本，请刷新页面后重新修改。
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {conflicts.map((c) => (
                <Typography key={c.key} variant="caption" component="div">
                  · {c.label}
                </Typography>
              ))}
            </Box>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default SyncStatusBanner;

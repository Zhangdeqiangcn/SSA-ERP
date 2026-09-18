import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Chip, Alert, Snackbar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Divider, Tooltip,
} from '@mui/material';
import {
  ContentCopy, Refresh, EventAvailable, Block, CheckCircle, VpnKey, Warning,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';

/**
 * 公司与邀请码（V3.15.5）
 * ------------------------------------------------------------
 * 把「公司码」升级为可轮换、带有效期的「公司邀请码」：
 *   · 由公司管理员（或超级管理员）在此查看、生成新码、设置有效期、暂停/恢复加入；
 *   · 邀请码只是「加入凭证」，公司身份由公司名称承载，因此可定期更换而不影响公司本身；
 *   · 生成新码后旧码「立即失效」——旧码会写入服务端历史表，注册时被明确拒绝。
 * 仅管理员 / 超级管理员可见（服务端同样会做角色校验，越权一律 403）。
 */

interface CodeState {
  orgId: string;
  orgName: string;
  orgStatus: string;
  companyCode: string;
  expiresAt: string | null;
  rotatedAt: string | null;
  disabled: boolean;
}

/** 有效期预设（天）；'forever' = 永久；'custom' = 自定义 */
type ExpiryMode = '30' | '90' | '180' | '365' | 'forever' | 'custom';

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400_000);
}

function expiryText(expiresAt: string | null): { text: string; expired: boolean; soon: boolean } {
  if (!expiresAt) return { text: '永久有效', expired: false, soon: false };
  const d = daysLeft(expiresAt);
  const date = expiresAt.slice(0, 10);
  if (d === null) return { text: `至 ${date}`, expired: false, soon: false };
  if (d <= 0) return { text: `已于 ${date} 过期`, expired: true, soon: false };
  return { text: `至 ${date}（剩余 ${d} 天）`, expired: false, soon: d <= 7 };
}

const OrgInviteCodeTab: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [state, setState] = useState<CodeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({
    open: false, msg: '', severity: 'success',
  });

  // 轮换确认
  const [rotateOpen, setRotateOpen] = useState(false);
  // 有效期设置
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('30');
  const [customDays, setCustomDays] = useState('60');

  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const load = useCallback(async () => {
    if (!token) {
      setError('未登录或无法连接服务器，本页需要登录后使用');
      setState(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orgs/company-code', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `加载失败，请稍后重试（HTTP ${res.status}）`);
        setState(null);
        return;
      }
      setState(data?.data ?? null);
    } catch {
      setError('未登录或无法连接服务器，本页需要登录后使用');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 统一的 PUT 调用 */
  const patch = useCallback(
    async (body: Record<string, unknown>, okMsg: string): Promise<boolean> => {
      if (!token) return false;
      setActing(true);
      try {
        const res = await fetch('/api/orgs/company-code', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSnack({ open: true, msg: data?.error || `操作失败（HTTP ${res.status}）`, severity: 'error' });
          return false;
        }
        if (data?.data) setState(data.data);
        setSnack({ open: true, msg: okMsg, severity: 'success' });
        return true;
      } catch {
        setSnack({ open: true, msg: '操作失败，请检查网络后重试', severity: 'error' });
        return false;
      } finally {
        setActing(false);
      }
    },
    [token]
  );

  const copyCode = async () => {
    if (!state?.companyCode) return;
    try {
      await navigator.clipboard.writeText(state.companyCode);
      setSnack({ open: true, msg: '邀请码已复制到剪贴板', severity: 'success' });
    } catch {
      setSnack({ open: true, msg: '复制失败，请手动选中复制', severity: 'error' });
    }
  };

  const doRotate = async () => {
    const okDone = await patch({ rotate: true }, '已生成新的邀请码，旧码已立即失效');
    if (okDone) setRotateOpen(false);
  };

  const doSetExpiry = async () => {
    let payload: Record<string, unknown>;
    if (expiryMode === 'forever') {
      payload = { expiresInDays: null };
    } else if (expiryMode === 'custom') {
      const n = Number(customDays);
      if (!Number.isFinite(n) || n <= 0 || n > 3650) {
        setSnack({ open: true, msg: '自定义天数需为 1~3650 之间的数字', severity: 'error' });
        return;
      }
      payload = { expiresInDays: n };
    } else {
      payload = { expiresInDays: Number(expiryMode) };
    }
    const okDone = await patch(payload, '有效期已更新');
    if (okDone) setExpiryOpen(false);
  };

  const e = state ? expiryText(state.expiresAt) : null;

  if (!canManage) {
    return (
      <Box>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          当前账号无权管理公司邀请码。仅「管理员」或「超级管理员」可查看与修改。
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        公司邀请码用于<strong>新同事注册时填写</strong>，等同于「加入本公司的凭证」。它由管理员统一发放、可设有效期、
        也可定期更换；<strong>更换后旧码立即失效</strong>，请及时把新码发给待加入的同事。
      </Alert>

      {error && (
        <Alert
          severity="error" sx={{ mb: 2, borderRadius: 2 }}
          action={<Button size="small" onClick={() => void load()}>重试</Button>}
        >
          {error}
        </Alert>
      )}

      {loading && !state ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : state ? (
        <>
          <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <VpnKey fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>当前邀请码</Typography>
              <Chip size="small" label={state.orgName} sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} />
              {state.orgStatus === 'pending' && (
                <Chip size="small" label="新公司待超级管理员批准" sx={{ bgcolor: '#F59E0B18', color: '#B45309', fontWeight: 600 }} />
              )}
            </Stack>

            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
              <Typography
                variant="h4"
                fontFamily="monospace"
                fontWeight={700}
                sx={{ letterSpacing: 2, color: '#1E3A8A' }}
                data-testid="invite-code-value"
              >
                {state.companyCode}
              </Typography>
              <Tooltip title="复制邀请码">
                <Button size="small" variant="outlined" startIcon={<ContentCopy />} onClick={() => void copyCode()} data-testid="invite-code-copy">
                  复制
                </Button>
              </Tooltip>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">有效期</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {e?.expired ? <Warning fontSize="small" color="error" />
                    : e?.soon ? <Warning fontSize="small" sx={{ color: '#F59E0B' }} />
                      : <EventAvailable fontSize="small" sx={{ color: '#10B981' }} />}
                  <Typography variant="body2" fontWeight={500} data-testid="invite-code-expiry">
                    {e?.text}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">加入状态</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {state.disabled
                    ? <><Block fontSize="small" color="error" /><Typography variant="body2" fontWeight={500} color="error.main">已暂停接受新成员</Typography></>
                    : <><CheckCircle fontSize="small" sx={{ color: '#10B981' }} /><Typography variant="body2" fontWeight={500}>正常接受新成员加入</Typography></>}
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">上次更换</Typography>
                <Typography variant="body2" fontWeight={500}>{state.rotatedAt ? state.rotatedAt.slice(0, 19).replace('T', ' ') : '从未更换'}</Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>管理操作</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={acting ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                disabled={acting}
                onClick={() => setRotateOpen(true)}
                data-testid="invite-code-rotate"
              >
                生成新邀请码
              </Button>
              <Button
                variant="outlined"
                startIcon={<EventAvailable />}
                disabled={acting}
                onClick={() => {
                  setExpiryMode('30');
                  setExpiryOpen(true);
                }}
                data-testid="invite-code-expiry-btn"
              >
                设置有效期
              </Button>
              <Button
                variant="outlined"
                color={state.disabled ? 'success' : 'warning'}
                startIcon={state.disabled ? <CheckCircle /> : <Block />}
                disabled={acting}
                onClick={() => void patch({ disabled: !state.disabled }, state.disabled ? '已恢复接受新成员加入' : '已暂停接受新成员加入')}
                data-testid="invite-code-toggle"
              >
                {state.disabled ? '恢复接受加入' : '暂停接受加入'}
              </Button>
            </Stack>
          </Paper>
        </>
      ) : null}

      {/* 轮换确认 */}
      <Dialog open={rotateOpen} onClose={() => setRotateOpen(false)} maxWidth="xs" fullWidth data-testid="invite-rotate-dialog">
        <DialogTitle sx={{ fontWeight: 600 }}>生成新的邀请码？</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            生成后<strong>当前邀请码会立即失效</strong>，已发出的旧码将无法再用于注册。
            请务必将新邀请码发送给仍在等待加入的同事。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRotateOpen(false)}>取消</Button>
          <Button variant="contained" disabled={acting} onClick={() => void doRotate()} data-testid="invite-rotate-confirm">
            确认生成
          </Button>
        </DialogActions>
      </Dialog>

      {/* 有效期设置 */}
      <Dialog open={expiryOpen} onClose={() => setExpiryOpen(false)} maxWidth="xs" fullWidth data-testid="invite-expiry-dialog">
        <DialogTitle sx={{ fontWeight: 600 }}>设置邀请码有效期</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            到期后该邀请码将无法再用于注册（已加入的成员不受影响）。
          </Typography>
          <Stack spacing={2}>
            <TextField
              select fullWidth label="有效期" value={expiryMode}
              onChange={(ev) => setExpiryMode(ev.target.value as ExpiryMode)}
              data-testid="invite-expiry-select"
            >
              <MenuItem value="30">30 天（默认）</MenuItem>
              <MenuItem value="90">90 天</MenuItem>
              <MenuItem value="180">180 天</MenuItem>
              <MenuItem value="365">365 天</MenuItem>
              <MenuItem value="forever">永久有效</MenuItem>
              <MenuItem value="custom">自定义天数</MenuItem>
            </TextField>
            {expiryMode === 'custom' && (
              <TextField
                fullWidth type="number" label="自定义天数（1~3650）" value={customDays}
                onChange={(ev) => setCustomDays(ev.target.value)}
                inputProps={{ min: 1, max: 3650 }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExpiryOpen(false)}>取消</Button>
          <Button variant="contained" disabled={acting} onClick={() => void doSetExpiry()} data-testid="invite-expiry-confirm">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.msg}
      />
    </Box>
  );
};

export default OrgInviteCodeTab;

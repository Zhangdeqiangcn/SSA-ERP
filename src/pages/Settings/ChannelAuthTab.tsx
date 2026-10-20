import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Paper, Card, CardContent, Typography, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, Snackbar, Alert, Divider,
  CircularProgress,
} from '@mui/material';
import {
  LinkOff, CheckCircle, Key, VpnKey, Launch, HelpOutline,
} from '@mui/icons-material';
import DemoBanner from '@/components/common/DemoBanner';
import { channelApi, type ChannelOAuthStatus } from '@/services/channelApi';
import { CHANNEL_LABELS } from '@/services/channels';

// 展示顺序（manual=手工录入，不算可授权平台，跳过）
const PLATFORM_ORDER = ['douyin', 'pinduoduo', 'taobao', 'jd', 'kuaishou'];
// status-color-exception: 平台品牌色（Logo 色）仅用于头像底色，非业务状态色，故不收敛到 StatusBadge
const PLATFORM_COLORS: Record<string, string> = {
  douyin: '#FE2C55',
  pinduoduo: '#E22E1F',
  taobao: '#FF6A00',
  jd: '#E1251B',
  kuaishou: '#FF4906',
};

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'default' | 'info' }> = {
  connected: { label: '已连接', color: 'success' },
  expired: { label: '令牌过期', color: 'warning' },
  disconnected: { label: '未连接', color: 'default' },
  coming: { label: '即将支持', color: 'info' },
};

// 从 axios 异常里取出后端返回的真实错误信息
function errMsg(e: any): string {
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || '操作失败';
}

const ChannelAuthTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [list, setList] = useState<ChannelOAuthStatus[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  // 配置应用密钥
  const [appOpen, setAppOpen] = useState(false);
  const [appPlatform, setAppPlatform] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');

  // 手动填令牌
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPlatform, setManualPlatform] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [manualExpiresIn, setManualExpiresIn] = useState('');
  const [manualShopId, setManualShopId] = useState('');
  const [manualShopName, setManualShopName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await channelApi.oauthStatus();
      const platforms: ChannelOAuthStatus[] = r?.platforms ?? [];
      const supported = new Map(platforms.map((p) => [p.platform, p]));
      const merged: ChannelOAuthStatus[] = PLATFORM_ORDER.map((pf) => {
        const found = supported.get(pf);
        if (found) return found;
        return {
          platform: pf,
          label: CHANNEL_LABELS[pf] || pf,
          status: 'coming',
          authMode: null,
          tokenExpire: null,
          shopName: null,
          isMock: false,
          hasApp: false,
        };
      });
      setList(merged);
    } catch (e: any) {
      setSnackbar({ open: true, msg: errMsg(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const oauth = searchParams.get('oauth');
    const pf = searchParams.get('platform');
    if (oauth === 'success' && pf) setSnackbar({ open: true, msg: `「${pf}」已连接` });
    if (oauth === 'fail' && pf) setSnackbar({ open: true, msg: `「${pf}」授权未成功，请重试` });
    if (oauth) navigate('/settings?tab=channel-auth', { replace: true });
  }, [load, searchParams, navigate]);

  const handleConnect = async (platform: string) => {
    setBusy(platform);
    try {
      const r: any = await channelApi.oauthStart(platform);
      if (r?.authorizeUrl) {
        window.location.href = r.authorizeUrl; // 跳转平台授权页（或模拟登录页）
      } else {
        setSnackbar({ open: true, msg: '未获取到授权地址' });
        setBusy('');
      }
    } catch (e: any) {
      setSnackbar({ open: true, msg: errMsg(e) });
      setBusy('');
    }
  };

  const handleDisconnect = async (platform: string) => {
    setBusy(platform);
    try {
      const r: any = await channelApi.oauthDisconnect(platform);
      if (r?.ok) {
        setSnackbar({ open: true, msg: '已断开连接' });
        await load();
      } else {
        setSnackbar({ open: true, msg: r?.message || '断开失败' });
      }
    } catch (e: any) {
      setSnackbar({ open: true, msg: errMsg(e) });
    } finally {
      setBusy('');
    }
  };

  const openApp = (platform: string) => {
    setAppPlatform(platform);
    setAppKey('');
    setAppSecret('');
    setAppOpen(true);
  };
  const saveApp = async () => {
    try {
      const r: any = await channelApi.oauthSaveApp(appPlatform, appKey.trim(), appSecret.trim());
      if (r?.ok) {
        setSnackbar({ open: true, msg: '应用密钥已保存（仅存服务端）' });
        setAppOpen(false);
        await load();
      } else {
        setSnackbar({ open: true, msg: r?.message || '保存失败' });
      }
    } catch (e: any) {
      setSnackbar({ open: true, msg: errMsg(e) });
    }
  };

  const openManual = (platform: string) => {
    setManualPlatform(platform);
    setManualToken('');
    setManualExpiresIn('');
    setManualShopId('');
    setManualShopName('');
    setManualOpen(true);
  };
  const saveManual = async () => {
    try {
      const r: any = await channelApi.oauthSaveManual(manualPlatform, manualToken.trim(), {
        expiresIn: manualExpiresIn ? Number(manualExpiresIn) : undefined,
        shopId: manualShopId.trim() || undefined,
        shopName: manualShopName.trim() || undefined,
      });
      if (r?.ok) {
        setSnackbar({ open: true, msg: '令牌已保存' });
        setManualOpen(false);
        await load();
      } else {
        setSnackbar({ open: true, msg: r?.message || '保存失败' });
      }
    } catch (e: any) {
      setSnackbar({ open: true, msg: errMsg(e) });
    }
  };

  const connectedCount = list.filter((p) => p.status === 'connected').length;

  return (
    <Box>
      <DemoBanner reason="「登录即连接」采用 OAuth 2.0 授权码流程（与 Shopify/抖音/拼多多开放平台一致）。**未配置真实应用密钥时走模拟授权**（界面与流程全真、令牌标“模拟”，绝不冒充真实平台）；在开放平台注册应用并填入 AppKey/Secret 后，自动切换为真实 OAuth 登录授权。" />

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}>
        在系统设置中完成电商平台的「登录即连接」。点击「连接」会跳转到平台登录授权页，授权后自动回写令牌（<strong>密钥与令牌仅存于服务端，前端永远不可见</strong>）。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <CheckCircle sx={{ color: '#16A34A' }} />
            <Typography variant="h5" fontWeight={700}>{connectedCount}</Typography>
            <Typography variant="caption" color="text.secondary">已连接平台</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <LinkOff sx={{ color: '#94A3B8' }} />
            <Typography variant="h5" fontWeight={700}>{list.length - connectedCount}</Typography>
            <Typography variant="caption" color="text.secondary">未连接 / 待支持</Typography>
          </Paper>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {list.map((p) => {
            const meta = STATUS_META[p.status] || STATUS_META.disconnected;
            const color = PLATFORM_COLORS[p.platform] || '#64748B';
            const isComing = p.status === 'coming';
            return (
              <Grid item xs={12} sm={6} md={4} key={p.platform}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <Avatar2 color={color}>{p.label.slice(0, 1)}</Avatar2>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>{p.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.platform}</Typography>
                      </Box>
                      <Chip
                        label={meta.label}
                        size="small"
                        color={meta.color}
                        icon={p.status === 'connected' ? <CheckCircle /> : undefined}
                      />
                    </Stack>

                    <Divider sx={{ my: 1.2 }} />

                    {p.status === 'connected' && (
                      <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {p.shopName && (
                          <Typography variant="caption" color="text.secondary">店铺：{p.shopName}</Typography>
                        )}
                        {p.tokenExpire && (
                          <Typography variant="caption" color="text.secondary">
                            令牌过期：{new Date(p.tokenExpire).toLocaleString('zh-CN')}
                          </Typography>
                        )}
                        {p.isMock && (
                          <Chip label="模拟令牌" size="small" color="warning" variant="outlined" />
                        )}
                        {p.authMode === 'oauth' && !p.isMock && (
                          <Chip label="OAuth 授权" size="small" color="success" variant="outlined" />
                        )}
                        {p.authMode === 'manual' && !p.isMock && (
                          <Chip label="手动录入" size="small" color="info" variant="outlined" />
                        )}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      {isComing ? (
                        <Button size="small" disabled startIcon={<HelpOutline />}>即将支持</Button>
                      ) : (
                        <>
                          {(p.status === 'disconnected' || p.status === 'expired') && (
                            <Button
                              size="small" variant="contained" startIcon={<Launch />}
                              disabled={busy === p.platform}
                              onClick={() => handleConnect(p.platform)}
                            >
                              {busy === p.platform ? <CircularProgress size={16} /> : (p.status === 'expired' ? '重新连接' : '连接')}
                            </Button>
                          )}
                          {p.status === 'connected' && (
                            <Button
                              size="small" color="error" variant="outlined" startIcon={<LinkOff />}
                              disabled={busy === p.platform}
                              onClick={() => handleDisconnect(p.platform)}
                            >
                              {busy === p.platform ? <CircularProgress size={16} /> : '断开'}
                            </Button>
                          )}
                          <Button size="small" variant="text" startIcon={<Key />} onClick={() => openApp(p.platform)}>
                            配置应用
                          </Button>
                          <Button size="small" variant="text" startIcon={<VpnKey />} onClick={() => openManual(p.platform)}>
                            手动填令牌
                          </Button>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 配置应用密钥 */}
      <Dialog open={appOpen} onClose={() => setAppOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          配置应用密钥 · {CHANNEL_LABELS[appPlatform] || appPlatform}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: '0.8125rem' }}>
            在对应开放平台注册「自用型应用」后获取 AppKey / AppSecret。
            <strong>仅存于服务端，前端不可见</strong>。配置后点「连接」才会走真实 OAuth 授权。
          </Alert>
          <Stack spacing={2}>
            <TextField
              label="AppKey（Client ID）" value={appKey}
              onChange={(e) => setAppKey(e.target.value)} fullWidth
            />
            <TextField
              label="AppSecret（Client Secret）" type="password" value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)} fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAppOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveApp} disabled={!appKey.trim() || !appSecret.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 手动填令牌 */}
      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          手动录入令牌 · {CHANNEL_LABELS[manualPlatform] || manualPlatform}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="access_token" value={manualToken} multiline minRows={2}
              onChange={(e) => setManualToken(e.target.value)} fullWidth
            />
            <TextField
              label="有效期（秒，可选）" type="number" value={manualExpiresIn}
              onChange={(e) => setManualExpiresIn(e.target.value)} fullWidth
              helperText="例如抖音 1296000（15天）、拼多多按平台文档"
            />
            <TextField
              label="店铺 ID（可选）" value={manualShopId}
              onChange={(e) => setManualShopId(e.target.value)} fullWidth
            />
            <TextField
              label="店铺名称（可选）" value={manualShopName}
              onChange={(e) => setManualShopName(e.target.value)} fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setManualOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveManual} disabled={!manualToken.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示：重定向 URI 配置 */}
      <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2, fontSize: '0.8rem' }}>
        真实接入时，需在开放平台把<strong>回调地址</strong>配置为
        <Typography component="code" sx={{ mx: 0.5, fontFamily: 'monospace', fontSize: '0.78rem' }}>
          https://ssa-erp.pages.dev/api/channels/oauth/callback
        </Typography>
        （须与系统实际域名一致）。
      </Alert>

      <Snackbar
        open={snackbar.open} autoHideDuration={2800}
        onClose={() => setSnackbar({ open: false, msg: '' })} message={snackbar.msg}
      />
    </Box>
  );
};

// 平台色头像（内联，避免额外依赖）
function Avatar2({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: 38, height: 38, borderRadius: '10px', bgcolor: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem',
      }}
    >
      {children}
    </Box>
  );
}

export default ChannelAuthTab;

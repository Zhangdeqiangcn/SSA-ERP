import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Button, Stack, Switch, Divider, Chip, Alert,
  List, ListItem, ListItemIcon, ListItemText, TextField,
} from '@mui/material';
import {
  PhoneAndroid, Inventory2, LocalShipping,
  PlaylistAddCheck, SwapHoriz, Bolt, Description, OpenInNew, QrCodeScanner, Verified,
} from '@mui/icons-material';
import { useSettingsStore, type MobileConfig } from '@/stores/settingsStore';
import QrCodeImage from '@/components/common/QrCodeImage';

/** 能力清单：状态如实标注（已上线的不夸大、未上线的标「规划中」，不再像旧版全部伪装成已支持） */
const FEATURES = [
  { icon: <Inventory2 />, title: '扫码入库', status: 'live' as const, desc: '扫物料/批次标签 → 录实收 → 过账库存/滚成本/生成暂估凭证，数据写回云端 D1' },
  { icon: <SwapHoriz />, title: '扫码出库', status: 'live' as const, desc: '拣货下架扫描校验 → 过账扣库存、回写销售订单、结转销售成本凭证' },
  { icon: <PlaylistAddCheck />, title: '移动盘点', status: 'live' as const, desc: '按物料扫码盘点，按「实盘 − 账面」差异自动生成库存调整单' },
  { icon: <Verified />, title: '移动质检', status: 'live' as const, desc: '检验录入（合格/不合格），不合格自动生成不合格品并联动四类处置（报废/返工/退货/让步接收）+ 凭证' },
  { icon: <LocalShipping />, title: '发货确认', status: 'live' as const, desc: '移动端扫码出库即发货过账（扣库存+回写销售订单发货状态+结转销售成本凭证），数据写回云端 D1' },
  { icon: <Bolt />, title: '即时消息', status: 'live' as const, desc: '云端 D1 消息中心，审批/预警推送、全员公告，移动端每 30 秒轮询拉取，多人实时共享' },
];

const MobileTab: React.FC = () => {
  const nav = useNavigate();
  const config = useSettingsStore((s) => s.mobileConfig);
  const setMobileConfig = useSettingsStore((s) => s.setMobileConfig);

  // 二维码编码「实际部署地址」——只有编码真实可访问的 URL，扫码才有意义。
  // 自定义域名场景可在下方输入框覆盖（写入配置后二维码跟随更新）。
  const originUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/m';
    return `${window.location.origin}/m`;
  }, []);
  const [qrValue, setQrValue] = useState(originUrl);

  const applyConfig = (c: MobileConfig) => {
    setMobileConfig(c);
    // 访问地址留空 / 等于默认占位时，二维码回退到真实部署地址
    const u = c.accessUrl.trim();
    setQrValue(u && !u.includes('erp.ssa.com') ? u : originUrl);
  };

  return (
    <Box>
      <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}>
        移动门户已上线（V2.79.0，PWA）：手机 / PDA 浏览器打开下方地址即可使用「扫码入库 / 出库 / 盘点 / 质检」真功能——数据直连云端 D1，
        与桌面版完全同源。支持「添加到主屏幕」像 App 一样全屏运行；发货确认、即时消息已随移动门户同步上线。
      </Alert>

      <Grid container spacing={3}>
        {/* 左侧：真二维码 + 访问入口 */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>移动端访问</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <QrCodeImage value={qrValue} size={168} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              用 PDA / 手机扫码，或直接访问
            </Typography>
            <Chip label={qrValue} sx={{ mt: 1, fontFamily: 'monospace', maxWidth: '100%' }} />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Switch
                checked={config.enabled}
                onChange={(e) => applyConfig({ ...config, enabled: e.target.checked })}
                aria-label="启用移动端访问"
              />
              <Typography variant="body2">启用移动端访问</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<OpenInNew />}
              sx={{ mt: 1 }}
              disabled={!config.enabled}
              onClick={() => nav('/m')}
            >
              打开移动门户（/m）
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1, ml: 1 }}
              disabled={!config.enabled}
              onClick={() => window.open('/m', '_blank')}
            >
              新标签页打开
            </Button>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'left', mb: 0.5 }}>
              访问地址（自定义域名时修改，二维码跟随更新）
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={config.accessUrl}
              onChange={(e) => applyConfig({ ...config, accessUrl: e.target.value })}
              placeholder={originUrl}
            />
          </Paper>
        </Grid>

        {/* 右侧：能力清单 + PWA 安装说明 */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>现场作业能力</Typography>
          <Grid container spacing={2}>
            {FEATURES.map((f) => (
              <Grid item xs={12} sm={6} key={f.title}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2, height: '100%', opacity: f.status === 'live' ? 1 : 0.78 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{ color: f.status === 'live' ? 'primary.main' : '#94A3B8', display: 'flex' }}>{f.icon}</Box>
                    <Typography variant="subtitle2" fontWeight={600}>{f.title}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      size="small"
                      color={f.status === 'live' ? 'success' : 'default'}
                      label={f.status === 'live' ? '已上线' : '规划中'}
                      icon={f.status === 'live' ? <QrCodeScanner /> : undefined}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>安装与使用说明</Typography>
          <List dense sx={{ bgcolor: '#F8FAFC', borderRadius: 2, px: 1 }}>
            {[
              '安装：Android Chrome / 鸿蒙浏览器 → 菜单「添加到主屏幕」；iOS Safari → 分享 →「添加到主屏幕」。安装后全屏独立运行、有专属图标。',
              '扫码：优先调用摄像头（需 HTTPS 安全上下文——生产部署已满足）；老设备自动降级 ZXing 软件解码；外接扫码枪在输入框直接扫码回车即可。',
              '条码：物料标签用「仓库 → 条码打印」生成的 Code 39 编码（内容 = 物料编码），扫码按物料编码 / 批次号匹配。',
              '数据：作业数据直连云端 D1，与桌面版实时同源；提交入库即过账库存、滚动成本、生成暂估凭证。',
              '权限：移动端复用系统角色权限矩阵；未登录时仅本机演示数据，不会写入云端。',
            ].map((t, i) => (
              <ListItem key={i}>
                <ListItemIcon sx={{ minWidth: 28 }}><Description fontSize="small" sx={{ color: '#64748B' }} /></ListItemIcon>
                <ListItemText primary={t} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
            <PhoneAndroid fontSize="small" sx={{ color: '#94A3B8' }} />
            <Typography variant="caption" color="text.secondary">
              建议 PDA / 手机系统：Android 8+ / iOS 16+（Chrome、Edge、Safari 均可）。
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MobileTab;

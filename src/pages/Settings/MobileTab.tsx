import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Stack, Switch, Divider, Chip, Alert,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  QrCode2, PhoneAndroid, CameraAlt, Inventory2, LocalShipping,
  PlaylistAddCheck, SwapHoriz, Bolt, Description, Sync, OpenInNew,
} from '@mui/icons-material';
import { useSettingsStore, type MobileConfig } from '@/stores/settingsStore';

// 简易伪二维码（确定性点阵，仅作占位展示）
function FakeQR({ seed = 'ssa-erp-m' }: { seed?: string }) {
  const size = 21;
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < size * size; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h >> 16) % 2 === 0);
  }
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
  };
  return (
    <svg width={140} height={140} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff', borderRadius: 8 }}>
      {Array.from({ length: size * size }).map((_, i) => {
        const r = Math.floor(i / size), c = i % size;
        if (isFinder(r, c)) {
          const br = r < 7 ? 0 : size - 7;
          const bc = c < 7 ? 0 : size - 7;
          const lr = r - br, lc = c - bc;
          const onBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const inCore = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          if (onBorder || inCore) return <rect key={i} x={c} y={r} width={1} height={1} fill="#0F172A" />;
          return null;
        }
        if (cells[i]) return <rect key={i} x={c} y={r} width={1} height={1} fill="#0F172A" />;
        return null;
      })}
    </svg>
  );
}

const FEATURES = [
  { icon: <Inventory2 />, title: '扫码入库', desc: 'PDA 扫描物料/批次条码，快速确认实收数量' },
  { icon: <SwapHoriz />, title: '扫码出库', desc: '拣货下架扫描校验，防错发漏发' },
  { icon: <PlaylistAddCheck />, title: '移动盘点', desc: '按库位扫码盘点，实时上传差异' },
  { icon: <CameraAlt />, title: '质检拍照', desc: '现场拍照上传不合格品，关联检验单' },
  { icon: <LocalShipping />, title: '发货确认', desc: '销售发货扫码校验，同步物流状态' },
  { icon: <Bolt />, title: '即时消息', desc: '审批/预警推送到移动端，随时处理' },
];

const MobileTab: React.FC = () => {
  const config = useSettingsStore((s) => s.mobileConfig);
  const setMobileConfig = useSettingsStore((s) => s.setMobileConfig);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}>
        移动端 / PDA 接入说明。仓库与质检人员可通过 PDA 或手机浏览器访问移动门户，执行扫码收发、盘点、质检等现场作业。对应 Phase 3「移动端 / PDA」能力。
      </Alert>

      <Grid container spacing={3}>
        {/* 左侧：PDA 模拟屏 + 访问入口 */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>移动端访问</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <FakeQR seed={config.accessUrl} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              使用 PDA / 手机扫码或访问下方地址
            </Typography>
            <Chip label={config.accessUrl} sx={{ mt: 1, fontFamily: 'monospace' }} />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Switch checked={config.enabled}
                onChange={e => setMobileConfig({ ...config, enabled: e.target.checked })} />
              <Typography variant="body2">启用移动端访问</Typography>
            </Box>
            <Button variant="outlined" startIcon={<OpenInNew />} sx={{ mt: 1 }} disabled={!config.enabled}>
              打开移动门户
            </Button>

            <Divider sx={{ my: 2.5 }} />

            {/* PDA 模拟屏 */}
            <Typography variant="caption" color="text.secondary">PDA 操作示意</Typography>
            <Box sx={{
              width: 150, mx: 'auto', mt: 1, p: 1.5, borderRadius: 3,
              border: '3px solid #1E293B', bgcolor: '#0F172A', color: '#E2E8F0',
            }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <PhoneAndroid fontSize="small" />
                <Typography variant="caption">SSA PDA</Typography>
                <Sync fontSize="small" />
              </Stack>
              <Paper sx={{ bgcolor: '#1E293B', color: '#E2E8F0', p: 1, borderRadius: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>待办：入库单 RK-2048</Typography>
              </Paper>
              <Paper sx={{ bgcolor: '#1E293B', color: '#E2E8F0', p: 1, borderRadius: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>扫码：钢板 Q235B</Typography>
              </Paper>
              <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                <QrCode2 sx={{ color: '#3B82F6' }} fontSize="small" />
                <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>扫描中…</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 右侧：能力清单 */}
        <Grid item xs={12} md={7}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>支持的现场作业</Typography>
          <Grid container spacing={2}>
            {FEATURES.map(f => (
              <Grid item xs={12} sm={6} key={f.title}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{ color: '#3B82F6', display: 'flex' }}>{f.icon}</Box>
                    <Typography variant="subtitle2" fontWeight={600}>{f.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1 }}>部署说明</Typography>
          <List dense sx={{ bgcolor: '#F8FAFC', borderRadius: 2, px: 1 }}>
            {[
              'PDA 设备需安装 SSA 移动客户端或配置 WebClip 指向移动门户地址。',
              '通过 WMS / TMS 对接通道（见「对接配置」）同步库存与单据数据。',
              '扫码作业依赖物料/批次条码（见「条码打印」）生成标签。',
              '离线作业数据在恢复网络后自动上送，避免现场断网丢失。',
              '移动端权限复用系统角色权限矩阵，敏感操作需二次确认。',
            ].map((t, i) => (
              <ListItem key={i}>
                <ListItemIcon sx={{ minWidth: 28 }}><Description fontSize="small" sx={{ color: '#64748B' }} /></ListItemIcon>
                <ListItemText primary={t} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MobileTab;

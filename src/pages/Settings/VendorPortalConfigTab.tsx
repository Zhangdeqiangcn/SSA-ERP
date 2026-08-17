/**
 * 系统设置 —— 供应商门户配置 Tab
 * 控制：订单确认自动确认时限、询价附件下载策略（技术保密）
 */
import React from 'react';
import {
  Box, Paper, Typography, Grid, TextField, FormControl, InputLabel,
  Select, MenuItem, Stack, Divider, Alert, InputAdornment,
} from '@mui/material';
import { Storefront, Schedule, Lock } from '@mui/icons-material';
import { useSettingsStore } from '@/stores/settingsStore';

const VendorPortalConfigTab: React.FC = () => {
  const { vendorPortalConfig, setVendorPortalConfig } = useSettingsStore();
  const { vendorOrderAutoConfirmHours, inquiryAttachmentPolicy, inquiryAttachmentDownloadHours } = vendorPortalConfig;

  const update = (patch: Partial<typeof vendorPortalConfig>) =>
    setVendorPortalConfig({ ...vendorPortalConfig, ...patch });

  const policyLabel: Record<string, string> = {
    always: '一直允许下载',
    timed: `限时允许（${inquiryAttachmentDownloadHours} 小时内）`,
    viewOnly: '仅在线查看（禁止下载）',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>供应商门户配置</Typography>
      <Typography variant="caption" color="text.secondary">
        面向供应商门户的订单确认时限与询价附件安全策略。修改即时生效并持久化。
      </Typography>

      {/* 订单确认自动确认时限 */}
      <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Schedule color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>订单确认自动确认时限</Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
          供应商收到订单确认后，若超过设定时限仍未手动处理，系统将自动确认（状态置为「已确认」）。
        </Alert>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" type="number" label="默认确认时限"
              value={vendorOrderAutoConfirmHours}
              InputProps={{ endAdornment: <InputAdornment position="end">小时</InputAdornment> }}
              inputProps={{ min: 0, step: 1 }}
              onChange={(e) => update({ vendorOrderAutoConfirmHours: Number(e.target.value) || 0 })}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Typography variant="body2" color="text.secondary">
              当前设置：{vendorOrderAutoConfirmHours} 小时（0 表示不自动确认）。
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 询价附件下载策略 */}
      <Paper variant="outlined" sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Lock color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>询价附件下载策略（技术保密）</Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
          控制供应商对询价附件（图纸/规格书等）的下载权限，防范技术资料外泄。在线预览仅对图片、PDF 等常见格式开放。
        </Alert>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <FormControl fullWidth size="small">
              <InputLabel>下载策略</InputLabel>
              <Select
                value={inquiryAttachmentPolicy}
                label="下载策略"
                onChange={(e) => update({ inquiryAttachmentPolicy: e.target.value as typeof inquiryAttachmentPolicy })}
              >
                <MenuItem value="always">一直允许下载</MenuItem>
                <MenuItem value="timed">限时允许下载</MenuItem>
                <MenuItem value="viewOnly">仅在线查看（禁止下载）</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {inquiryAttachmentPolicy === 'timed' && (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small" type="number" label="允许下载时长"
                value={inquiryAttachmentDownloadHours}
                InputProps={{ endAdornment: <InputAdornment position="end">小时</InputAdornment> }}
                inputProps={{ min: 1 }}
                onChange={(e) => update({ inquiryAttachmentDownloadHours: Number(e.target.value) || 1 })}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              当前生效策略：<b>{policyLabel[inquiryAttachmentPolicy]}</b>
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <Storefront fontSize="small" />
        <Typography variant="caption">以上设置保存于本地（ssa-erp-settings），刷新后仍然有效。</Typography>
      </Box>
    </Box>
  );
};

export default VendorPortalConfigTab;

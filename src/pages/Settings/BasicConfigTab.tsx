import React from 'react';
import {
  Box, Typography, TextField, Grid, Paper, FormControl, InputLabel, Select, MenuItem, Alert,
} from '@mui/material';
import { useDataDictStore } from '@/stores/dataDictStore';

/**
 * 基础配置 Tab
 * ------------------------------------------------------------
 * P2-1 后：各枚举/下拉选项（货币、语言、单位、付款方式等）统一由「数据字典」Tab
 * 维护并写入单一数据源（ssa-erp-datadict）。本 Tab 仅保留系统信息展示与区域/格式，
 * 其中货币、语言的可选项实时取自数据字典，不再各自维护独立副本。
 */
const BasicConfigTab: React.FC = () => {
  const currencies = useDataDictStore((s) => s.currencies);
  const languages = useDataDictStore((s) => s.languages);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B', mb: 3 }}>基础配置</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>系统信息</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="系统名称" defaultValue="SSA ERP 企业资源管理平台" fullWidth size="small" />
              <TextField label="企业名称" defaultValue="SSA Corporation" fullWidth size="small" />
              <TextField label="统一社会信用代码" defaultValue="91110000XXXXXXXX10" fullWidth size="small" />
            </Box>
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              版本信息统一在「帮助中心 → 系统信息」查询（界面其他地方不再展示版本号，避免显示过期版本号造成误导）。
            </Alert>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>区域与格式</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>时区</InputLabel>
                <Select defaultValue="Asia/Shanghai" label="时区">
                  <MenuItem value="Asia/Shanghai">中国标准时间 (UTC+8)</MenuItem>
                  <MenuItem value="Asia/Tokyo">日本标准时间 (UTC+9)</MenuItem>
                  <MenuItem value="UTC">协调世界时 (UTC)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>默认货币</InputLabel>
                <Select defaultValue="人民币 (CNY)" label="默认货币">
                  {currencies.map((c, i) => (
                    <MenuItem key={i} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>默认语言</InputLabel>
                <Select defaultValue="简体中文" label="默认语言">
                  {languages.map((l, i) => (
                    <MenuItem key={i} value={l}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
        货币、语言、计量单位、付款方式、贸易条款等下拉选项现已统一在「数据字典」中维护，
        修改后各业务表单将自动同步，无需在本页重复配置。
      </Alert>
    </Box>
  );
};

export default BasicConfigTab;

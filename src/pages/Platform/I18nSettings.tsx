import React from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, Chip,
} from '@mui/material';
import { useI18nStore, translate, I18N_DICT } from '@/stores';
import type { Locale } from '@/types';

const I18nSettings: React.FC = () => {
  const { locale, setLocale } = useI18nStore();

  return (
    <Box sx={{ p: 3 }} data-testid="i18n">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>多语言 (i18n)</Typography>
      <Paper sx={{ p: 2, mb: 2, maxWidth: 320 }}>
        <FormControl fullWidth>
          <InputLabel>界面语言</InputLabel>
          <Select data-testid="i18n-locale" value={locale} label="界面语言"
            onChange={(e) => setLocale(e.target.value as Locale)}>
            <MenuItem value="zh-CN">简体中文</MenuItem>
            <MenuItem value="en-US">English (US)</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="caption" sx={{ color: '#64748B' }}>实时翻译预览（导航·OA流程定制）</Typography>
        <Typography data-testid="i18n-demo" variant="h6" sx={{ mt: 1 }}>
          {translate('nav.platform')}
        </Typography>
        <Chip size="small" sx={{ mt: 1 }} label={`当前语言：${locale}`} color="primary" />
      </Paper>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>字典预览</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Key</TableCell>
            <TableCell>简体中文</TableCell>
            <TableCell>English</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(I18N_DICT).map((k) => (
            <TableRow key={k} data-testid="i18n-dict-row">
              <TableCell>{k}</TableCell>
              <TableCell>{I18N_DICT[k]['zh-CN']}</TableCell>
              <TableCell>{I18N_DICT[k]['en-US']}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default I18nSettings;

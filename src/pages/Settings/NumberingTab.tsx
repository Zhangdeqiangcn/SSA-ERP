import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, MenuItem, Stack, Chip, Divider,
} from '@mui/material';
import { Refresh, Casino } from '@mui/icons-material';
import { useNumberingStore, DOC_TYPES, type DatePattern, type DocType } from '@/stores/numberingStore';

const DATE_PATTERN_LABELS: Record<DatePattern, string> = {
  none: '无日期',
  YYYY: '年 (2026)',
  YYYYMM: '年月 (202608)',
  YYYYMMDD: '年月日 (20260805)',
};

/**
 * 统一编号规则中心配置页（C3）
 *  - 每个单据类型可改前缀 / 分隔符 / 日期格式 / 序号位数，实时预览；
 *  - 预览（previewNext）不消耗序号，试生成（nextNo）消耗序号，便于演示。
 */
const NumberingTab: React.FC = () => {
  const { rules, updateRule, resetSeq, previewNext, nextNo } = useNumberingStore();
  const [sample, setSample] = useState('');

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>统一编号规则中心</Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
        集中维护所有单据的编号规则。修改前缀/日期格式后下方预览实时更新；试生成会占用一个序号。
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 700 }}>单据类型</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>前缀</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>分隔符</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>日期格式</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>序号位数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>实时预览</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DOC_TYPES.map((dt: DocType) => {
              const rule = rules[dt];
              return (
                <TableRow key={dt} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{rule.label}</Typography>
                      <Chip label={dt} size="small" sx={{ mt: 0.5, bgcolor: '#EFF6FF', color: '#2563EB', fontFamily: 'monospace' }} />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={rule.prefix}
                      onChange={(e) => updateRule(dt, { prefix: e.target.value })}
                      data-testid={`nr-prefix-${dt}`}
                      sx={{ width: 110, '& input': { fontFamily: 'monospace' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={rule.separator}
                      onChange={(e) => updateRule(dt, { separator: e.target.value })}
                      sx={{ width: 70, '& input': { fontFamily: 'monospace' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={rule.datePattern}
                      onChange={(e) => updateRule(dt, { datePattern: e.target.value as DatePattern })}
                      sx={{ minWidth: 150 }}
                    >
                      {(Object.keys(DATE_PATTERN_LABELS) as DatePattern[]).map((p) => (
                        <MenuItem key={p} value={p}>{DATE_PATTERN_LABELS[p]}</MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={rule.seqLength}
                      onChange={(e) => updateRule(dt, { seqLength: Math.max(1, Number(e.target.value) || 1) })}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      data-testid={`nr-preview-${dt}`}
                      sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#0F766E' }}
                    >
                      {previewNext(dt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={() => resetSeq(dt)}
                      data-testid={`nr-reset-${dt}`}
                    >
                      重置序号
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          startIcon={<Casino />}
          onClick={() => setSample(nextNo('WO'))}
          data-testid="nr-sample"
        >
          试生成工单号（消耗序号）
        </Button>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B' }}>试生成结果</Typography>
          <Typography
            variant="body1"
            data-testid="nr-sample-result"
            sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}
          >
            {sample || '—'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default NumberingTab;

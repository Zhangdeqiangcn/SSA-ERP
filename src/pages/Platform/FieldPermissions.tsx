import React, { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  FormControl, InputLabel, Select, MenuItem, Switch, Chip, Paper,
} from '@mui/material';
import { useFieldPermissionStore } from '@/stores';
import type { PlatformModule, FieldMode } from '@/types';
import { FIELD_MODE_LABELS } from '@/types';

const MODULES: PlatformModule[] = ['material', 'vendor', 'purchase', 'sales', 'warehouse', 'quality', 'production', 'finance'];
const MODULE_LABELS: Record<PlatformModule, string> = {
  material: '物料', vendor: '供应商', purchase: '采购', sales: '销售',
  warehouse: '仓储', quality: '质量', production: '生产', finance: '财务',
};
const FIELD_MODES: FieldMode[] = ['visible', 'readonly', 'required', 'mask'];
const MODE_COLORS: Record<FieldMode, 'success' | 'info' | 'warning' | 'secondary'> = {
  visible: 'success',
  readonly: 'info',
  required: 'warning',
  mask: 'secondary',
};

const FieldPermissions: React.FC = () => {
  const { moduleFields, setFieldVisible, setFieldMode } = useFieldPermissionStore();
  const [module, setModule] = useState<PlatformModule>('material');
  const fields = moduleFields[module] ?? [];

  return (
    <Box sx={{ p: 3 }} data-testid="field-permissions">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>字段级权限</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
        支持「显示 / 只读 / 必填 / 脱敏」四种字段模式。脱敏字段在业务列表（如销售订单）中以掩码呈现。
      </Typography>
      <Paper sx={{ p: 2, mb: 2, maxWidth: 320 }}>
        <FormControl fullWidth>
          <InputLabel>业务模块</InputLabel>
          <Select data-testid="fp-module" value={module} label="业务模块"
            onChange={(e) => setModule(e.target.value as PlatformModule)}>
            {MODULES.map((m) => <MenuItem key={m} value={m}>{MODULE_LABELS[m]}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>字段</TableCell>
            <TableCell>显示名</TableCell>
            <TableCell>可见</TableCell>
            <TableCell>权限模式</TableCell>
            <TableCell>状态</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.length === 0 && (
            <TableRow><TableCell colSpan={5} align="center" sx={{ color: '#94A3B8' }}>该模块暂未配置字段权限</TableCell></TableRow>
          )}
          {fields.map((f) => (
            <TableRow key={f.field} data-testid={`fp-field-${f.field}`}>
              <TableCell>{f.field}</TableCell>
              <TableCell>{f.label}</TableCell>
              <TableCell>
                <Switch data-testid={`fp-switch-${f.field}`} checked={f.visible}
                  onChange={(e) => setFieldVisible(module, f.field, e.target.checked)} />
              </TableCell>
              <TableCell>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select data-testid={`fp-mode-${f.field}`} value={f.mode ?? 'visible'}
                    onChange={(e) => setFieldMode(module, f.field, e.target.value as FieldMode)}>
                    {FIELD_MODES.map((m) => (
                      <MenuItem key={m} value={m}>{FIELD_MODE_LABELS[m]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell>
                <Chip size="small" data-testid={`fp-chip-${f.field}`}
                  label={!f.visible ? '隐藏' : FIELD_MODE_LABELS[f.mode ?? 'visible']}
                  color={!f.visible ? 'default' : MODE_COLORS[f.mode ?? 'visible']} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default FieldPermissions;

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Stack, FormControl, InputLabel, Select, MenuItem,
  Chip, Alert, Divider, Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useDataPermissionStore } from '@/stores/dataPermissionStore';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_DEFINITIONS, ROLE_NAMES, UserRole } from '@/types/settings';
import type { SensitiveFieldConfig, FieldMode } from '@/stores/dataPermissionStore';

// V2.86.0 统一到 dataPermissionStore 引擎（消除原 fieldPermissionStore 孤儿配置）
// 字段键与 SecureField 包裹处、默认矩阵严格一致
const MODULE_LABELS: Record<string, string> = {
  material: '物料', vendor: '供应商', customer: '客户', purchase: '采购',
  sales: '销售', warehouse: '仓储', quality: '质量', production: '生产', finance: '财务',
};

const MODULE_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  material: [
    { value: 'standardPrice', label: '标准价' },
    { value: 'movingAvgPrice', label: '移动平均价' },
  ],
  vendor: [
    { value: 'creditLimit', label: '授信额度' },
    { value: 'bankAccount', label: '银行账号' },
    { value: 'taxCode', label: '税码' },
  ],
  customer: [
    { value: 'creditLimit', label: '授信额度' },
    { value: 'bankAccount', label: '银行账号' },
    { value: 'taxCode', label: '税号' },
  ],
  purchase: [
    { value: 'unitPrice', label: '采购单价' },
    { value: 'orderAmount', label: '采购金额' },
    { value: 'vendorTaxCode', label: '供应商税码' },
    { value: 'vendorBankAccount', label: '供应商银行账号' },
  ],
  sales: [
    { value: 'unitPrice', label: '销售单价' },
    { value: 'orderAmount', label: '销售金额' },
    { value: 'customerName', label: '客户名称' },
    { value: 'customerTaxId', label: '客户税号' },
    { value: 'customerBankAccount', label: '客户银行账号' },
  ],
  warehouse: [{ value: 'stockValue', label: '库存价值' }],
  quality: [{ value: 'inspectionCost', label: '检验费用' }],
  production: [{ value: 'cost', label: '生产成本' }],
  finance: [{ value: 'voucherAmount', label: '凭证金额' }],
};

const MODULES = Object.keys(MODULE_LABELS);

const FieldPermissions: React.FC = () => {
  const { sensitiveFields, addSensitiveFieldConfig, removeSensitiveFieldConfig } = useDataPermissionStore();
  const { currentUser } = useAuthStore();
  // 字段级权限写入 ssa-erp-data-permission，已收口到管理员；非管理员仅展示无权限提示，避免被后端 403 静默拦截
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }} data-testid="field-permissions">
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>字段级权限</Typography>
        <Alert severity="info" sx={{ borderRadius: 2, maxWidth: 720 }}>
          字段级权限仅对<strong>系统管理员</strong>开放配置。当前账号角色为
          「{ROLE_NAMES[currentUser?.role as UserRole] || currentUser?.role || '未知'}」，
          如需调整敏感字段掩码规则，请联系系统管理员。
        </Alert>
      </Box>
    );
  }
  const [role, setRole] = useState<string>(ROLE_DEFINITIONS[0]?.id ?? '');
  const [module, setModule] = useState<string>('purchase');
  // 字段模式：hidden(隐藏) / readonly(只读)
  const [fieldMode, setFieldMode] = useState<FieldMode>('hidden');

  const current = sensitiveFields.find((c) => c.role === role && c.module === module);
  // 兼容旧数据（无 mode 字段时视为 hidden）
  const currentMode = current?.mode || 'hidden' as FieldMode;
  const hidden = new Set(current?.fields ?? []);
  const options = MODULE_FIELD_OPTIONS[module] ?? [];

  const toggle = (field: string, checked: boolean) => {
    const base = sensitiveFields.find((c) => c.role === role && c.module === module);
    const fields = new Set(base?.fields ?? []);
    if (checked) fields.add(field); else fields.delete(field);
    const next: SensitiveFieldConfig = { role, module, fields: [...fields], mode: fieldMode };
    if (fields.size === 0) removeSensitiveFieldConfig(role, module);
    else addSensitiveFieldConfig(next);
  };

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: FieldMode) => {
    if (!newMode) return;
    setFieldMode(newMode);
    // 更新当前配置的 mode（如有）
    const base = sensitiveFields.find((c) => c.role === role && c.module === module);
    if (base && base.mode !== newMode) {
      addSensitiveFieldConfig({ ...base, mode: newMode });
    }
  };

  return (
    <Box sx={{ p: 3 }} data-testid="field-permissions">
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>字段级权限</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
        按「角色 × 模块 × 字段」配置敏感字段隐藏规则。被隐藏的字段对该角色在业务页面中显示为「***」掩码。
        系统管理员、财务主管、会计等特权角色不在规则内即默认可见。
      </Typography>

      <Paper sx={{ p: 2, mb: 2, maxWidth: 720 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>角色</InputLabel>
            <Select data-testid="fp-role" value={role} label="角色"
              onChange={(e) => setRole(e.target.value)}>
              {ROLE_DEFINITIONS.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>业务模块</InputLabel>
            <Select data-testid="fp-module" value={module} label="业务模块"
              onChange={(e) => setModule(e.target.value)}>
              {MODULES.map((m) => (
                <MenuItem key={m} value={m}>{MODULE_LABELS[m]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          对「{ROLE_DEFINITIONS.find((r) => r.id === role)?.name}」配置「{MODULE_LABELS[module]}」字段的权限模式：
        </Typography>
        <ToggleButtonGroup
          value={fieldMode}
          exclusive
          onChange={handleModeChange}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="hidden" data-testid="fp-mode-hidden">
            隐藏（该角色完全看不到）
          </ToggleButton>
          <ToggleButton value="readonly" data-testid="fp-mode-readonly">
            只读（该角色可查看但不可修改）
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          选择需要{fieldMode === 'hidden' ? '隐藏' : '设为只读'}的字段（当前模式：{fieldMode === 'hidden' ? '隐藏' : '只读'}）：
        </Typography>
        {options.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>该模块暂无可配置敏感字段</Typography>
        ) : (
          <Stack spacing={1}>
            {options.map((o) => (
              <FormControlLabel key={o.value}
                control={
                  <Checkbox data-testid={`fp-hide-${o.value}`} checked={hidden.has(o.value)}
                    onChange={(e) => toggle(o.value, e.target.checked)} />
                }
                label={o.label}
              />
            ))}
          </Stack>
        )}
      </Paper>

      <Alert severity="info" sx={{ mb: 2, maxWidth: 720 }}>
        提示：字段级权限独立于「启用数据权限」总开关，常开生效；行级/组织级过滤请在「设置 → 数据权限」配置。
        <br/>
        <strong>隐藏</strong>：该角色在界面上完全看不到此字段。<br/>
        <strong>只读</strong>：该角色可以看到字段值，但服务端会拦截修改请求（返回 403）。
      </Alert>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>当前已配置规则（{sensitiveFields.length}）</Typography>
      <Stack spacing={1} sx={{ maxWidth: 720 }}>
        {sensitiveFields.length === 0 && (
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>暂无自定义规则，全部按默认矩阵生效。</Typography>
        )}
        {sensitiveFields.map((cfg) => {
          const roleName = ROLE_DEFINITIONS.find((r) => r.id === cfg.role)?.name || cfg.role;
          return (
            <Box key={`${cfg.role}-${cfg.module}`} data-testid={`fp-rule-${cfg.role}-${cfg.module}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#F8FAFC' }}>
              <Chip label={roleName} size="small" color="primary" variant="outlined" />
              <Typography variant="body2" color="text.secondary">{MODULE_LABELS[cfg.module] || cfg.module}</Typography>
              <Typography variant="body2" sx={{ color: '#EF4444', flex: 1 }}>
                隐藏：{cfg.fields.map((f) => MODULE_FIELD_OPTIONS[cfg.module]?.find((o) => o.value === f)?.label || f).join('、')}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default FieldPermissions;

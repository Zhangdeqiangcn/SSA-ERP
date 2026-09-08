import React, { useState } from 'react';
import {
  Box, Typography, Paper, Stack, Switch, FormControlLabel, Button,
  ButtonGroup, Chip, Alert, Divider, Select, MenuItem, FormControl,
  InputLabel, OutlinedInput, IconButton,
} from '@mui/material';
import { Business, Visibility, Lock, Delete, Add } from '@mui/icons-material';
import { useDataPermissionStore, type SensitiveFieldConfig } from '@/stores/dataPermissionStore';
import { useCurrentOrg } from '@/stores/orgStore';
import { ROLE_DEFINITIONS } from '@/types/settings';

const MODULE_LABELS: Record<string, string> = {
  material: '物料',
  vendor: '供应商',
  customer: '客户',
  purchase: '采购',
  sales: '销售',
  warehouse: '仓储',
  quality: '质量',
  production: '生产',
  finance: '财务',
};

// V2.86.0 字段键与 SecureField 包裹处、默认矩阵严格一致（避免配了不生效）
const MODULE_FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  material: [
    { value: 'standardPrice', label: '标准价' },
    { value: 'movingAvgPrice', label: '移动平均价' },
  ],
  vendor: [
    { value: 'creditLimit', label: '授信额度' },
  ],
  customer: [
    { value: 'creditLimit', label: '授信额度' },
  ],
  purchase: [
    { value: 'unitPrice', label: '采购单价' },
    { value: 'orderAmount', label: '采购金额' },
  ],
  sales: [
    { value: 'unitPrice', label: '销售单价' },
    { value: 'orderAmount', label: '销售金额' },
    { value: 'customerName', label: '客户名称' },
  ],
  warehouse: [
    { value: 'stockValue', label: '库存价值' },
  ],
  quality: [
    { value: 'inspectionCost', label: '检验费用' },
  ],
  production: [
    { value: 'cost', label: '生产成本' },
  ],
  finance: [
    { value: 'voucherAmount', label: '凭证金额' },
  ],
};

/**
 * 数据权限（行级 / 组织级）配置页（C3）
 *  - 总开关 enabled：关闭时全部数据可见；
 *  - 模式 mode：'all' 组织级全部可见 / 'current-org' 仅显示当前组织数据；
 *  - modules：按业务模块控制哪些域纳入过滤。
 * 顶栏组织切换器修改 currentOrgId，本页展示当前组织上下文。
 */
const DataPermissionTab: React.FC = () => {
  const {
    enabled, mode, modules, sensitiveFields,
    setEnabled, setMode, toggleModule,
    addSensitiveFieldConfig, removeSensitiveFieldConfig,
  } = useDataPermissionStore();
  const currentOrg = useCurrentOrg();

  const [newRole, setNewRole] = useState<string>('');
  const [newModule, setNewModule] = useState<string>('');
  const [newFields, setNewFields] = useState<string[]>([]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>数据权限（行级 / 组织级）</Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
        在多组织基础上落地数据过滤：开启后，业务列表按当前组织（{currentOrg?.name ?? '—'}）过滤行级数据。
      </Typography>

      <Paper sx={{ borderRadius: 3, p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>启用数据权限</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              关闭则全部数据可见（默认兼容旧逻辑）
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                data-testid="dp-switch"
              />
            }
            label={enabled ? '已开启' : '已关闭'}
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>组织级模式</Typography>
        <ButtonGroup variant="outlined" sx={{ mb: 1 }}>
          <Button
            variant={mode === 'all' ? 'contained' : 'outlined'}
            startIcon={<Visibility />}
            onClick={() => setMode('all')}
            data-testid="dp-mode-all"
          >
            全部组织可见
          </Button>
          <Button
            variant={mode === 'current-org' ? 'contained' : 'outlined'}
            startIcon={<Lock />}
            onClick={() => setMode('current-org')}
            data-testid="dp-mode-current-org"
          >
            仅当前组织
          </Button>
        </ButtonGroup>

        <Alert severity="info" sx={{ mt: 1, alignItems: 'center' }}>
          <Business fontSize="small" sx={{ mr: 1 }} />
          当前组织：
          <Box component="span" data-testid="dp-current-org" sx={{ fontWeight: 700, mx: 0.5 }}>
            {currentOrg?.name ?? currentOrg?.id ?? '—'}
          </Box>
          （{mode === 'current-org' ? '仅显示归属该组织的行级数据，遗留数据仍可见' : '显示全部组织数据'}）
        </Alert>
      </Paper>

      <Paper sx={{ borderRadius: 3, p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>纳入过滤的业务模块</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Object.keys(MODULE_LABELS).map((key) => (
            <Chip
              key={key}
              label={MODULE_LABELS[key]}
              clickable
              color={modules[key] ? 'primary' : 'default'}
              variant={modules[key] ? 'filled' : 'outlined'}
              onClick={() => toggleModule(key)}
              data-testid={`dp-module-${key}`}
            />
          ))}
        </Stack>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1 }}>
          未勾选的模块即使开启数据权限也显示全部数据；无组织标记的遗留数据始终可见。
        </Typography>
      </Paper>

      {/* 敏感字段配置 */}
      <Paper sx={{ borderRadius: 3, p: 2, mt: 2 }} data-testid="dp-sensitive-fields">
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          敏感字段屏蔽（按角色隐藏模块字段）
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
          例如：仓库员看不到采购单价、采购员看不到销售价等。配置后对应角色在页面中看到「***」掩码。
        </Typography>

        {/* 已配置列表 */}
        {sensitiveFields.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {sensitiveFields.map((cfg) => {
              const roleName = ROLE_DEFINITIONS.find((r) => r.id === cfg.role)?.name || cfg.role;
              return (
                <Box
                  key={`${cfg.role}-${cfg.module}`}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1, border: '1px solid', borderColor: 'divider',
                    borderRadius: 2, bgcolor: '#F8FAFC',
                  }}
                  data-testid={`dp-sf-${cfg.role}-${cfg.module}`}
                >
                  <Chip label={roleName} size="small" color="primary" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    {MODULE_LABELS[cfg.module] || cfg.module}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#EF4444', flex: 1 }}>
                    隐藏：{cfg.fields.map((f) => {
                      const opts = MODULE_FIELD_OPTIONS[cfg.module] || [];
                      return opts.find((o) => o.value === f)?.label || f;
                    }).join('、')}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeSensitiveFieldConfig(cfg.role, cfg.module)}
                    data-testid={`dp-sf-delete-${cfg.role}-${cfg.module}`}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* 新建配置 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>角色</InputLabel>
            <Select
              value={newRole}
              label="角色"
              onChange={(e) => setNewRole(e.target.value)}
              data-testid="dp-sf-role-select"
            >
              {ROLE_DEFINITIONS.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>模块</InputLabel>
            <Select
              value={newModule}
              label="模块"
              onChange={(e) => setNewModule(e.target.value)}
              data-testid="dp-sf-module-select"
            >
              {Object.entries(MODULE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>隐藏字段</InputLabel>
            <Select
              multiple
              value={newFields}
              label="隐藏字段"
              onChange={(e) => setNewFields(e.target.value as string[])}
              input={<OutlinedInput label="隐藏字段" />}
              data-testid="dp-sf-fields-select"
              renderValue={(selected) =>
                selected
                  .map((v) => {
                    const opts = MODULE_FIELD_OPTIONS[newModule] || [];
                    return opts.find((o) => o.value === v)?.label || v;
                  })
                  .join(', ')
              }
            >
              {(MODULE_FIELD_OPTIONS[newModule] || []).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            disabled={!newRole || !newModule || newFields.length === 0}
            onClick={() => {
              const config: SensitiveFieldConfig = {
                role: newRole,
                module: newModule,
                fields: [...newFields],
              };
              addSensitiveFieldConfig(config);
              setNewRole('');
              setNewModule('');
              setNewFields([]);
            }}
            data-testid="dp-sf-add-btn"
          >
            添加
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DataPermissionTab;

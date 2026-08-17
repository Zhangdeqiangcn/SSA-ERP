import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Button, Chip, Select,
  MenuItem, FormControl, InputLabel, Stack, Alert, Divider, Paper,
} from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import { useSettingsStore, DEFAULT_MATERIAL_BUY_STEPS, DEFAULT_MATERIAL_MAKE_STEPS, MaterialApprovalConfig } from '@/stores/settingsStore';
import { ROLE_NAMES, UserRole } from '@/types/settings';

/** 单步配置行（步骤标题 + 角色选择 + 字段 Chip 勾选） */
interface StepConfigRowProps {
  step: { role: string; label: string; fields: string[] };
  idx: number;
  defaultFields: string[];
  isMakePath?: boolean;
  onRoleChange: (idx: number, role: string) => void;
  onToggleField: (idx: number, field: string) => void;
}

const StepConfigRow: React.FC<StepConfigRowProps> = ({
  step, idx, defaultFields, isMakePath, onRoleChange, onToggleField,
}) => (
  <>
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        步骤 {idx + 1}：{step.label}
      </Typography>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>处理角色</InputLabel>
        <Select
          label="处理角色"
          value={step.role}
          onChange={e => onRoleChange(idx, e.target.value as string)}
        >
          {(Object.keys(ROLE_NAMES) as UserRole[]).map(r => (
            <MenuItem key={r} value={r}>{ROLE_NAMES[r]}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>

    <Divider sx={{ my: 1 }} />
    <Typography variant="caption" color="text.secondary">可编辑字段</Typography>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
      {defaultFields.length === 0 ? (
        <Typography variant="body2" color="text.secondary">（批准步骤，无可编辑字段）</Typography>
      ) : (
        defaultFields.map(field => {
          const on = step.fields.includes(field);
          return (
            <Chip
              key={field}
              label={field}
              color={on ? (isMakePath ? 'secondary' : 'primary') : 'default'}
              variant={on ? 'filled' : 'outlined'}
              clickable
              onClick={() => onToggleField(idx, field)}
              sx={{ mb: 1 }}
            />
          );
        })
      )}
    </Stack>
  </>
);

const MaterialApprovalTab: React.FC = () => {
  const { materialApprovalConfig, setMaterialApprovalConfig } = useSettingsStore();
  const [local, setLocal] = useState<MaterialApprovalConfig>(materialApprovalConfig);

  // 同步 store → 本地（如外部恢复默认）
  useEffect(() => {
    setLocal(materialApprovalConfig);
  }, [materialApprovalConfig]);

  const handleEnabledChange = (checked: boolean) => {
    setLocal(prev => ({ ...prev, enabled: checked }));
  };

  const handleRoleChange = (stepIdx: number, role: string) => {
    setLocal(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === stepIdx ? { ...s, role } : s)),
    }));
  };

  const handleToggleField = (stepIdx: number, field: string) => {
    setLocal(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => {
        if (i !== stepIdx) return s;
        const has = s.fields.includes(field);
        return {
          ...s,
          fields: has ? s.fields.filter(f => f !== field) : [...s.fields, field],
        };
      }),
    }));
  };

  // ── 自制件路径 handlers ──
  const handleMakeRoleChange = (stepIdx: number, role: string) => {
    const currentMake = local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS.map(s => ({ ...s, fields: [...s.fields] }));
    setLocal(prev => ({
      ...prev,
      makeSteps: currentMake.map((s, i) => (i === stepIdx ? { ...s, role } : s)),
    }));
  };

  const handleMakeToggleField = (stepIdx: number, field: string) => {
    const currentMake = local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS.map(s => ({ ...s, fields: [...s.fields] }));
    setLocal(prev => ({
      ...prev,
      makeSteps: currentMake.map((s, i) => {
        if (i !== stepIdx) return s;
        const has = s.fields.includes(field);
        return {
          ...s,
          fields: has ? s.fields.filter(f => f !== field) : [...s.fields, field],
        };
      }),
    }));
  };

  const handleSave = () => {
    setMaterialApprovalConfig(local);
  };

  const handleRestore = () => {
    const def: MaterialApprovalConfig = {
      enabled: true,
      steps: DEFAULT_MATERIAL_BUY_STEPS.map(s => ({ ...s, fields: [...s.fields] })),
      makeSteps: DEFAULT_MATERIAL_MAKE_STEPS.map(s => ({ ...s, fields: [...s.fields] })),
    };
    setMaterialApprovalConfig(def);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>物料新增审批</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        启用后，新增物料将进入分步审批流程，最终批准才生成正式物料档案。
        系统根据「自制/外购」字段自动选择审批路径：
        外购件 → 发起申请 → <strong>采购审核</strong> → 批准生效；
        自制件 → 发起申请 → <strong>工艺审核</strong> → 批准生效。
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              data-testid="approval-enabled"
              checked={local.enabled}
              onChange={e => handleEnabledChange(e.target.checked)}
            />
          }
          label={local.enabled ? '审批已启用' : '审批已关闭（新增物料直接保存）'}
        />
      </Paper>

      <Stack spacing={3}>
        {/* 外购件审批路径 */}
        <Box>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 600 }}>
            📦 外购件路径（makeOrBuy = 外购）
          </Typography>
          {local.steps.map((step, idx) => {
            const defaultFields = DEFAULT_MATERIAL_BUY_STEPS[idx]?.fields ?? [];
            return (
              <Paper key={`buy-${idx}`} sx={{ p: 2, mb: 1 }}>
                <StepConfigRow
                  step={step} idx={idx} defaultFields={defaultFields}
                  onRoleChange={handleRoleChange} onToggleField={handleToggleField}
                />
              </Paper>
            );
          })}
        </Box>

        {/* 自制件审批路径 */}
        <Box>
          <Typography variant="subtitle2" color="secondary" sx={{ mb: 1, fontWeight: 600 }}>
            🔧 自制件路径（makeOrBuy = 自制）
          </Typography>
          {(local.makeSteps || DEFAULT_MATERIAL_MAKE_STEPS).map((step, idx) => {
            const defaultFields = DEFAULT_MATERIAL_MAKE_STEPS[idx]?.fields ?? [];
            return (
              <Paper key={`make-${idx}`} sx={{ p: 2, mb: 1 }}>
                <StepConfigRow
                  step={step} idx={idx} defaultFields={defaultFields}
                  isMakePath
                  onRoleChange={(i, role) => handleMakeRoleChange(i, role)}
                  onToggleField={(i, field) => handleMakeToggleField(i, field)}
                />
              </Paper>
            );
          })}
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
          保存
        </Button>
        <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleRestore}>
          恢复默认
        </Button>
      </Stack>
    </Box>
  );
};

export default MaterialApprovalTab;

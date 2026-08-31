import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Button, Chip, Select,
  MenuItem, FormControl, InputLabel, Stack, Alert, Divider, Paper,
} from '@mui/material';
import { Save, RestartAlt } from '@mui/icons-material';
import {
  useApprovalFlowStore,
  DEFAULT_APPROVAL_FLOWS,
  type ApprovalFlowNode,
} from '@/stores/approvalFlowStore';
import { ROLE_NAMES, UserRole } from '@/types/settings';

/**
 * 物料新增审批配置（B7-2 · 统一引擎）
 * ------------------------------------------------------------
 * 审批步骤（外购 / 自制双路径）现已统一收敛到审批流引擎的
 * `material` / `material_make` 两个模块（src/stores/approvalFlowStore.ts），
 * 不再使用独立的 settingsStore.materialApprovalConfig。本 Tab 直接编辑引擎
 * 模块的节点（角色 + 可编辑字段），保存写回 approvalFlowStore，与
 * MaterialApprovalQueue（审批队列）同源。
 */
interface StepConfigRowProps {
  step: ApprovalFlowNode;
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
        步骤 {idx + 1}：{step.name}
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
          const on = step.fields?.includes(field) ?? false;
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

interface LocalConfig {
  enabled: boolean;
  steps: ApprovalFlowNode[];
  makeSteps: ApprovalFlowNode[];
}

const MaterialApprovalTab: React.FC = () => {
  const flows = useApprovalFlowStore(s => s.flows);
  const setFlows = useApprovalFlowStore(s => s.setFlows);

  const buyFlow = flows.find(f => f.module === 'material');
  const makeFlow = flows.find(f => f.module === 'material_make');

  const [local, setLocal] = useState<LocalConfig>({
    enabled: buyFlow?.enabled ?? true,
    steps: (buyFlow?.nodes ?? []).map(n => ({ ...n })),
    makeSteps: (makeFlow?.nodes ?? []).map(n => ({ ...n })),
  });

  // 同步引擎 → 本地（如外部恢复默认 / 重置）
  useEffect(() => {
    setLocal({
      enabled: buyFlow?.enabled ?? true,
      steps: (buyFlow?.nodes ?? []).map(n => ({ ...n })),
      makeSteps: (makeFlow?.nodes ?? []).map(n => ({ ...n })),
    });
  }, [buyFlow, makeFlow]);

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
        const has = s.fields?.includes(field) ?? false;
        return { ...s, fields: has ? (s.fields || []).filter(f => f !== field) : [...(s.fields || []), field] };
      }),
    }));
  };

  // ── 自制件路径 handlers ──
  const handleMakeRoleChange = (stepIdx: number, role: string) => {
    setLocal(prev => ({
      ...prev,
      makeSteps: prev.makeSteps.map((s, i) => (i === stepIdx ? { ...s, role } : s)),
    }));
  };

  const handleMakeToggleField = (stepIdx: number, field: string) => {
    setLocal(prev => ({
      ...prev,
      makeSteps: prev.makeSteps.map((s, i) => {
        if (i !== stepIdx) return s;
        const has = s.fields?.includes(field) ?? false;
        return { ...s, fields: has ? (s.fields || []).filter(f => f !== field) : [...(s.fields || []), field] };
      }),
    }));
  };

  const handleSave = () => {
    setFlows(prev => prev.map(f => {
      if (f.module === 'material') {
        return { ...f, enabled: local.enabled, nodes: local.steps.map(n => ({ ...n })) };
      }
      if (f.module === 'material_make') {
        return { ...f, nodes: local.makeSteps.map(n => ({ ...n })) };
      }
      return f;
    }));
  };

  const handleRestore = () => {
    const defBuy = (DEFAULT_APPROVAL_FLOWS.find(f => f.module === 'material')?.nodes ?? []).map(n => ({ ...n }));
    const defMake = (DEFAULT_APPROVAL_FLOWS.find(f => f.module === 'material_make')?.nodes ?? []).map(n => ({ ...n }));
    setLocal({ enabled: true, steps: defBuy, makeSteps: defMake });
    setFlows(prev => prev.map(f => {
      if (f.module === 'material') return { ...f, enabled: true, nodes: defBuy };
      if (f.module === 'material_make') return { ...f, nodes: defMake };
      return f;
    }));
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>物料新增审批</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        启用后，新增物料将进入分步审批流程，最终批准才生成正式物料档案。
        系统根据「自制/外购」字段自动选择审批路径（统一由审批流引擎驱动）：
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
            const defaultFields = DEFAULT_APPROVAL_FLOWS.find(f => f.module === 'material')?.nodes[idx]?.fields ?? [];
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
          {(local.makeSteps || []).map((step, idx) => {
            const defaultFields = DEFAULT_APPROVAL_FLOWS.find(f => f.module === 'material_make')?.nodes[idx]?.fields ?? [];
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

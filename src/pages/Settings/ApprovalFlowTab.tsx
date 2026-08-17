import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, Stack, Tooltip, Switch,
  FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
  Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Add, Edit, Delete, Save, PlayArrow, Stop, ExpandMore, Person,
  ArrowForward, Close, Rule,
} from '@mui/icons-material';
import { ROLE_DEFINITIONS } from '@/types/settings';
import { useUserStore, type SystemUser } from '@/stores/userStore';
import {
  useApprovalFlowStore,
  type ApprovalFlowConfig,
  type ApprovalNode,
  type ApproverType,
  type ApprovalMode,
  type ConditionGroup,
  type ApprovalCondition,
  type ConditionOperator,
  type SkipRule,
  type EscalationRule,
  type ApprovalProfile,
} from '@/stores/approvalFlowStore';
import {
  CONDITION_FIELDS,
  OPERATOR_LABELS,
  getEffectiveSteps,
  type ApprovalContext,
} from '@/data/approvalFlowConfig';

type ApprovalFlow = ApprovalFlowConfig;

/* —— 选项常量 —— */
const APPROVER_TYPES: { value: ApproverType; label: string }[] = [
  { value: 'role', label: '角色' },
  { value: 'position', label: '职位' },
  { value: 'supervisor', label: '发起人上级' },
  { value: 'dept_head', label: '部门负责人' },
  { value: 'specific_user', label: '指定用户' },
];

const MODES: { value: ApprovalMode; label: string }[] = [
  { value: 'serial', label: '串签' },
  { value: 'parallel', label: '并签' },
  { value: 'or', label: '或签' },
];

const NUM_OPERATORS: ConditionOperator[] = ['>', '>=', '<', '<=', '==', '!='];
const STR_OPERATORS: ConditionOperator[] = ['==', '!=', 'in', 'not_in'];

const approverTypeLabel = (t?: ApproverType) =>
  APPROVER_TYPES.find((x) => x.value === t)?.label ?? '角色';
const modeLabel = (m?: ApprovalMode) => MODES.find((x) => x.value === m)?.label ?? '串签';
const modeColor = (m?: ApprovalMode): 'default' | 'primary' | 'success' =>
  m === 'parallel' ? 'primary' : m === 'or' ? 'success' : 'default';

/** 条件组摘要文本 */
const summarizeGroup = (g?: ConditionGroup): string => {
  if (!g || g.conditions.length === 0) return '无条件';
  const joiner = g.logic === 'and' ? ' 且 ' : ' 或 ';
  return g.conditions
    .map((c) => {
      const meta = CONDITION_FIELDS.find((f) => f.key === c.field);
      return `${meta?.label ?? c.field}${OPERATOR_LABELS[c.operator]}${c.value}`;
    })
    .join(joiner);
};

/* ==========================================================================
 * 结构化条件组编辑器（复用：审批条件 / 跳过规则）
 * ========================================================================== */
const ConditionGroupEditor: React.FC<{
  group: ConditionGroup;
  onChange: (g: ConditionGroup) => void;
  showLogic?: boolean;
}> = ({ group, onChange, showLogic = true }) => {
  const setLogic = (logic: 'and' | 'or') => onChange({ ...group, logic });
  const updateCond = (idx: number, cond: ApprovalCondition) =>
    onChange({ ...group, conditions: group.conditions.map((c, i) => (i === idx ? cond : c)) });
  const addCond = () =>
    onChange({
      ...group,
      conditions: [...group.conditions, { field: CONDITION_FIELDS[0].key, operator: '>', value: '' }],
    });
  const removeCond = (idx: number) =>
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) });

  const opsFor = (fieldKey: string): ConditionOperator[] => {
    const meta = CONDITION_FIELDS.find((f) => f.key === fieldKey);
    return meta?.type === 'number' ? NUM_OPERATORS : STR_OPERATORS;
  };

  return (
    <Box>
      {showLogic && group.conditions.length > 1 && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={group.logic}
          onChange={(_, v) => v && setLogic(v)}
          sx={{ mb: 1 }}
        >
          <ToggleButton value="and">并且 (AND)</ToggleButton>
          <ToggleButton value="or">或者 (OR)</ToggleButton>
        </ToggleButtonGroup>
      )}
      <Stack spacing={1}>
        {group.conditions.map((cond, idx) => {
          const meta = CONDITION_FIELDS.find((f) => f.key === cond.field);
          const operators = opsFor(cond.field);
          return (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>字段</InputLabel>
                <Select
                  label="字段"
                  value={cond.field}
                  onChange={(e) =>
                    updateCond(idx, {
                      field: e.target.value,
                      operator: '>',
                      value: '',
                    })
                  }
                >
                  {CONDITION_FIELDS.map((f) => (
                    <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>运算符</InputLabel>
                <Select
                  label="运算符"
                  value={cond.operator}
                  onChange={(e) => updateCond(idx, { ...cond, operator: e.target.value as ConditionOperator })}
                >
                  {operators.map((op) => (
                    <MenuItem key={op} value={op}>{OPERATOR_LABELS[op]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {meta?.type === 'enum' ? (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>值</InputLabel>
                  <Select
                    label="值"
                    value={String(cond.value)}
                    onChange={(e) => updateCond(idx, { ...cond, value: e.target.value })}
                  >
                    {meta.options?.map((o) => (
                      <MenuItem key={o} value={o}>{o}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  size="small"
                  type={meta?.type === 'number' ? 'number' : 'text'}
                  label={`值${meta?.unit ? `(${meta.unit})` : ''}`}
                  value={cond.value}
                  onChange={(e) =>
                    updateCond(idx, {
                      ...cond,
                      value: meta?.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value,
                    })
                  }
                  sx={{ minWidth: 120 }}
                />
              )}
              <IconButton size="small" color="error" onClick={() => removeCond(idx)} disabled={group.conditions.length === 1}>
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
      <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={addCond}>
        添加条件
      </Button>
    </Box>
  );
};

/* ==========================================================================
 * 主组件
 * ========================================================================== */
const ApprovalFlowTab: React.FC = () => {
  const flows = useApprovalFlowStore((s) => s.flows);
  const setFlows = useApprovalFlowStore((s) => s.setFlows);
  const resetFlows = useApprovalFlowStore((s) => s.resetFlows);
  const users = useUserStore((s) => s.users);
  const userMap = React.useMemo<Record<string, string>>(
    () => Object.fromEntries(users.map((u: SystemUser) => [u.id, u.name])),
    [users]
  );

  const [editFlow, setEditFlow] = useState<ApprovalFlow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | false>(false);

  /* —— 主页面操作 —— */
  const handleToggleFlow = (flowId: string) => {
    setFlows(flows.map((f) => (f.id === flowId ? { ...f, enabled: !f.enabled } : f)));
  };

  const handleProfileChange = (flowId: string, profile: ApprovalProfile) => {
    setFlows(flows.map((f) => (f.id === flowId ? { ...f, profile } : f)));
  };

  const handleEditFlow = (flow: ApprovalFlow) => {
    setEditFlow({ ...flow, nodes: flow.nodes.map((n) => ({ ...n })) });
    setExpanded(flow.nodes[0]?.id ?? false);
    setDialogOpen(true);
  };

  const handleSaveFlow = () => {
    if (!editFlow) return;
    setFlows(flows.map((f) => (f.id === editFlow.id ? editFlow : f)));
    setDialogOpen(false);
    setEditFlow(null);
  };

  const handleReset = () => {
    resetFlows();
    setEditFlow(null);
  };

  /* —— 节点编辑 —— */
  const updateNode = (nodeId: string, patch: Partial<ApprovalNode>) => {
    if (!editFlow) return;
    setEditFlow({
      ...editFlow,
      nodes: editFlow.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    });
  };

  const handleAddNode = () => {
    if (!editFlow) return;
    const newNode: ApprovalNode = {
      id: `${editFlow.module}-${Date.now()}`,
      name: '新审批节点',
      role: 'buyer',
      roleName: '采购员',
      order: editFlow.nodes.length + 1,
      approverType: 'role',
      mode: 'serial',
      conditions: { logic: 'and', conditions: [] },
      timeout: 24,
    };
    setEditFlow({ ...editFlow, nodes: [...editFlow.nodes, newNode] });
    setExpanded(newNode.id);
  };

  const handleRemoveNode = (nodeId: string) => {
    if (!editFlow) return;
    setEditFlow({
      ...editFlow,
      nodes: editFlow.nodes
        .filter((n) => n.id !== nodeId)
        .map((n, i) => ({ ...n, order: i + 1 })),
    });
  };

  const onApproverTypeChange = (node: ApprovalNode, value: ApproverType) => {
    const patch: Partial<ApprovalNode> = { approverType: value };
    if (value === 'role' || value === 'position') {
      const role = node.role || 'buyer';
      patch.approverUserIds = undefined;
      patch.role = role;
      patch.roleName = ROLE_DEFINITIONS.find((r) => r.id === role)?.name || role;
    } else if (value === 'supervisor') {
      patch.role = 'supervisor';
      patch.roleName = '发起人上级';
      patch.approverUserIds = undefined;
    } else if (value === 'dept_head') {
      patch.role = 'dept_head';
      patch.roleName = '部门负责人';
      patch.approverUserIds = undefined;
    } else if (value === 'specific_user') {
      patch.approverUserIds = node.approverUserIds && node.approverUserIds.length ? node.approverUserIds : [];
      patch.roleName = node.approverUserIds?.map((id) => userMap[id] || id).join('、') || '';
    }
    updateNode(node.id, patch);
  };

  const onRoleChange = (nodeId: string, value: string) => {
    const roleName = ROLE_DEFINITIONS.find((r) => r.id === value)?.name || value;
    updateNode(nodeId, { role: value, roleName });
  };

  const onUserIdsChange = (nodeId: string, ids: string[]) => {
    const roleName = ids.map((id) => userMap[id] || id).join('、');
    updateNode(nodeId, { approverUserIds: ids, roleName });
  };

  const onModeChange = (node: ApprovalNode, value: ApprovalMode) => {
    const patch: Partial<ApprovalNode> = { mode: value };
    // 切到单签时清掉多角色会签配置
    if (value === 'serial') patch.approverRoles = undefined;
    updateNode(node.id, patch);
  };

  const renderApproverEditor = (node: ApprovalNode) => {
    const type = node.approverType ?? 'role';
    if (type === 'specific_user') {
      return (
        <FormControl size="small" fullWidth>
          <InputLabel>指定用户（可多选）</InputLabel>
          <Select
            multiple
            label="指定用户（可多选）"
            value={node.approverUserIds ?? []}
            onChange={(e) => onUserIdsChange(node.id, e.target.value as string[])}
            renderValue={(sel) => (sel as string[]).map((id) => userMap[id] || id).join('、') || '未选择'}
          >
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.name}（{u.department}）</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (type === 'supervisor' || type === 'dept_head') {
      return (
        <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
          {type === 'supervisor' ? '系统自动解析发起人上级' : '系统自动解析发起人所在部门负责人'}
        </Alert>
      );
    }
    // role / position：主角色 +（多签时）会签角色
    return (
      <Stack spacing={1}>
        <FormControl size="small" fullWidth>
          <InputLabel>主审批{type === 'position' ? '职位' : '角色'}</InputLabel>
          <Select
            label={`主审批${type === 'position' ? '职位' : '角色'}`}
            value={node.role}
            onChange={(e) => onRoleChange(node.id, e.target.value)}
          >
            {ROLE_DEFINITIONS.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                  {r.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {(node.mode === 'parallel' || node.mode === 'or') && (
          <FormControl size="small" fullWidth>
            <InputLabel>会签角色（可多选）</InputLabel>
            <Select
              multiple
              label="会签角色（可多选）"
              value={node.approverRoles ?? []}
              onChange={(e) => updateNode(node.id, { approverRoles: e.target.value as string[] })}
              renderValue={(sel) =>
                (sel as string[]).map((id) => ROLE_DEFINITIONS.find((r) => r.id === id)?.name || id).join('、') || '无'
              }
            >
              {ROLE_DEFINITIONS.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>审批流程设置</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={handleReset}>恢复默认</Button>
        </Stack>
      </Box>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: '0.8125rem' }}>
        深度定制各业务模块审批流：审批人类型（角色/职位/上级/部门负责人/指定用户）、会签模式（串/并/或签）、
        结构化条件、跳过规则、超时升级，以及模块级「标准 / 简化」开关。点击「编辑」进入流程编辑器。
      </Alert>

      <Stack spacing={1.5}>
        {flows.map((flow) => {
          const effective = getEffectiveSteps(flow.module);
          const isSimplified = (flow.profile ?? 'standard') === 'simplified';
          return (
            <Paper key={flow.id} variant="outlined" sx={{ borderRadius: 2, p: 2, opacity: flow.enabled ? 1 : 0.6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>{flow.moduleLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">{flow.module}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    icon={flow.enabled ? <PlayArrow sx={{ fontSize: 14 }} /> : <Stop sx={{ fontSize: 14 }} />}
                    label={flow.enabled ? '启用' : '停用'}
                    size="small"
                    color={flow.enabled ? 'success' : 'default'}
                    onClick={() => handleToggleFlow(flow.id)}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={flow.profile ?? 'standard'}
                    onChange={(_, v) => v && handleProfileChange(flow.id, v as ApprovalProfile)}
                  >
                    <ToggleButton value="standard">标准</ToggleButton>
                    <ToggleButton value="simplified">简化</ToggleButton>
                  </ToggleButtonGroup>
                  <IconButton size="small" onClick={() => handleEditFlow(flow)} data-testid={`edit-flow-${flow.module}`}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>

              {/* 有效节点链预览 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 1.5 }}>
                {effective.map((step, i) => (
                  <React.Fragment key={step.id}>
                    {i > 0 && <ArrowForward sx={{ fontSize: 16, color: '#94A3B8' }} />}
                    <Tooltip
                      title={
                        <Box>
                          <div>审批人类型：{approverTypeLabel(step.approverType)}</div>
                          <div>会签模式：{modeLabel(step.mode)}</div>
                          <div>条件：{summarizeGroup(step.conditions)}</div>
                          {step.timeout ? <div>超时：{step.timeout}h</div> : null}
                          {step.optional ? <div>简化模式可省略</div> : null}
                          {!step.active ? <div style={{ color: '#FCA5A5' }}>{step.skipReason}</div> : null}
                        </Box>
                      }
                    >
                      <Chip
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{step.name}</span>
                            <span style={{ opacity: 0.7, fontSize: 11 }}>
                              ·{modeLabel(step.mode)}
                              {step.optional ? '·可省' : ''}
                            </span>
                          </Box>
                        }
                        size="small"
                        variant={step.active ? 'filled' : 'outlined'}
                        color={step.active ? modeColor(step.mode) : 'default'}
                        sx={{ fontSize: '0.7rem', height: 26, opacity: step.active ? 1 : 0.5 }}
                      />
                    </Tooltip>
                  </React.Fragment>
                ))}
                {effective.length === 0 && (
                  <Typography variant="caption" color="text.secondary">无审批节点</Typography>
                )}
              </Box>
              {isSimplified && (
                <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
                  简化模式：可选节点（可省）在生效链中已省略。
                </Typography>
              )}
            </Paper>
          );
        })}
      </Stack>

      {/* 流程编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>编辑审批流程 - {editFlow?.moduleLabel}</span>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {editFlow && (
            <Stack spacing={1.5}>
              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                当前模式：
                <b>{editFlow.profile === 'simplified' ? '简化（可选节点可省略）' : '标准'}</b>
                。逐一配置节点审批人、会签模式、条件、跳过与升级规则。
              </Alert>
              {editFlow.nodes.map((node) => (
                <Accordion
                  key={node.id}
                  expanded={expanded === node.id}
                  onChange={(_, isExp) => setExpanded(isExp ? node.id : false)}
                  variant="outlined"
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip label={node.order} size="small" sx={{ width: 28, height: 22, fontSize: '0.7rem' }} />
                      <Typography variant="body2" fontWeight={500}>{node.name || '未命名节点'}</Typography>
                      <Chip size="small" label={modeLabel(node.mode)} color={modeColor(node.mode)} sx={{ fontSize: '0.65rem', height: 20 }} />
                      {node.optional && <Chip size="small" label="可省" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                      <Box sx={{ flexGrow: 1 }} />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                          size="small"
                          label="节点名称"
                          value={node.name}
                          onChange={(e) => updateNode(node.id, { name: e.target.value })}
                          sx={{ minWidth: 200 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 140 }} data-testid={`af-approver-type-${node.id}`}>
                          <InputLabel>审批人类型</InputLabel>
                          <Select
                            label="审批人类型"
                            value={node.approverType ?? 'role'}
                            onChange={(e) => onApproverTypeChange(node, e.target.value as ApproverType)}
                          >
                            {APPROVER_TYPES.map((t) => (
                              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 120 }} data-testid={`af-mode-${node.id}`}>
                          <InputLabel>会签模式</InputLabel>
                          <Select
                            label="会签模式"
                            value={node.mode ?? 'serial'}
                            onChange={(e) => onModeChange(node, e.target.value as ApprovalMode)}
                          >
                            {MODES.map((m) => (
                              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          type="number"
                          label="超时(小时)"
                          value={node.timeout ?? ''}
                          onChange={(e) => updateNode(node.id, { timeout: parseInt(e.target.value) || 0 })}
                          sx={{ width: 130 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!node.optional}
                              onChange={(e) => updateNode(node.id, { optional: e.target.checked })}
                            />
                          }
                          label="简化可省略"
                        />
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Person fontSize="inherit" /> 审批人
                        </Typography>
                        {renderApproverEditor(node)}
                      </Box>

                      <Divider />

                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }} data-testid={`af-conditions-${node.id}`}>
                          <Rule fontSize="inherit" /> 审批条件（结构化）
                        </Typography>
                        <ConditionGroupEditor
                          group={node.conditions ?? { logic: 'and', conditions: [] }}
                          onChange={(g) => updateNode(node.id, { conditions: g })}
                        />
                      </Box>

                      <Divider />

                      <Box>
                        <FormControlLabel
                          data-testid={`af-skip-${node.id}`}
                          control={
                            <Switch
                              checked={!!node.skipRule}
                              onChange={(e) =>
                                updateNode(node.id, {
                                  skipRule: e.target.checked
                                    ? { when: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 0 }] }, action: 'skip' }
                                    : undefined,
                                })
                              }
                            />
                          }
                          label="启用跳过规则（满足条件时跳过 / 自动通过本节点）"
                        />
                        {node.skipRule && (
                          <Box sx={{ mt: 1, pl: 1, borderLeft: '3px solid', borderColor: 'divider' }}>
                            <FormControl size="small" sx={{ minWidth: 160, mb: 1 }}>
                              <InputLabel>命中动作</InputLabel>
                              <Select
                                label="命中动作"
                                value={node.skipRule.action}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    skipRule: { ...node.skipRule!, action: e.target.value as SkipRule['action'] },
                                  })
                                }
                              >
                                <MenuItem value="skip">跳过本节点</MenuItem>
                                <MenuItem value="auto_approve">自动通过</MenuItem>
                              </Select>
                            </FormControl>
                            <ConditionGroupEditor
                              group={node.skipRule.when}
                              onChange={(g) =>
                                updateNode(node.id, { skipRule: { ...node.skipRule!, when: g } })
                              }
                            />
                          </Box>
                        )}
                      </Box>

                      <Divider />

                      <Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!!node.escalation}
                              onChange={(e) =>
                                updateNode(node.id, {
                                  escalation: e.target.checked
                                    ? { timeout: node.timeout ?? 24, escalateTo: 'role', targetRole: 'admin', notify: ['admin'] }
                                    : undefined,
                                })
                              }
                            />
                          }
                          label="启用超时升级（超时后升级给指定审批人）"
                        />
                        {node.escalation && (
                          <Box sx={{ mt: 1, pl: 1, borderLeft: '3px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <TextField
                                size="small"
                                type="number"
                                label="升级触发(小时)"
                                value={node.escalation.timeout}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    escalation: { ...node.escalation!, timeout: parseInt(e.target.value) || 0 },
                                  })
                                }
                                sx={{ width: 150 }}
                              />
                              <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>升级给</InputLabel>
                                <Select
                                  label="升级给"
                                  value={node.escalation.escalateTo}
                                  onChange={(e) =>
                                    updateNode(node.id, {
                                      escalation: { ...node.escalation!, escalateTo: e.target.value as ApproverType },
                                    })
                                  }
                                >
                                  {APPROVER_TYPES.map((t) => (
                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              {node.escalation.escalateTo === 'role' && (
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                  <InputLabel>升级角色</InputLabel>
                                  <Select
                                    label="升级角色"
                                    value={node.escalation.targetRole ?? 'admin'}
                                    onChange={(e) =>
                                      updateNode(node.id, {
                                        escalation: { ...node.escalation!, targetRole: e.target.value as ApprovalNode['role'] },
                                      })
                                    }
                                  >
                                    {ROLE_DEFINITIONS.map((r) => (
                                      <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                              {node.escalation.escalateTo === 'specific_user' && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                  <InputLabel>升级用户</InputLabel>
                                  <Select
                                    label="升级用户"
                                    value={node.escalation.targetUserId ?? ''}
                                    onChange={(e) =>
                                      updateNode(node.id, {
                                        escalation: { ...node.escalation!, targetUserId: e.target.value },
                                      })
                                    }
                                  >
                                    {users.map((u) => (
                                      <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
              <Button size="small" startIcon={<Add />} variant="outlined" onClick={handleAddNode}>
                添加审批节点
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSaveFlow}>保存流程</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalFlowTab;

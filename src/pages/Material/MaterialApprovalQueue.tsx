import React, { useState, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Typography, Stack, Table, TableBody, TableRow,
  TableCell, TableHead, TableContainer, Paper, TextField, Alert, Grid, Autocomplete,
} from '@mui/material';
import { Visibility, ThumbUp, Clear, Close } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import FlowTracker from '@/components/common/FlowTracker';
import { getApprovalSteps, resolveApprovalAdvance, type ApprovalFlowNode } from '@/data/approvalFlowConfig';
import { useMaterialApprovalStore, buildMaterialFromApplication } from '@/stores/materialApprovalStore';
import { useMaterialStore } from '@/stores';
import { useVendorStore } from '@/stores/vendorStore';
import { useAuthStore } from '@/stores/authStore';
import { Material, MaterialApplication, MaterialApprovalStatus } from '@/types';
import { ROLE_NAMES } from '@/types/settings';

const STATUS_LABEL: Record<MaterialApprovalStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已批准',
  rejected: '已驳回',
};
const STATUS_COLOR: Record<MaterialApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const FIELD_LABELS: Record<string, string> = {
  name: '物料名称', unit: '单位', specification: '规格型号', model: '型号',
  makeOrBuy: '自制/外购', materialType: '物料类型', categoryId: '物料分类',
  safetyStock: '安全库存', minStock: '最小库存', maxStock: '最大库存',
  price: '单价', currency: '币种', remarks: '备注',
  leadTime: '采购提前期(天)', moq: '最小订单量', mpq: '最小包装量',
  defaultVendorId: '默认供应商ID', defaultVendorName: '默认供应商名称',
  purchaseUnit: '采购单位', unitConversion: '单位换算系数',
  // 工艺属性（自制件路径）
  routing: '工艺路线', workCenter: '工作中心', cycleTime: '周期时间(天)',
  scrapRate: '报废率(%)', inspectionPoint: '检验点',
};
const NUMERIC_FIELDS = new Set([
  'safetyStock', 'minStock', 'maxStock', 'price',
  'leadTime', 'moq', 'mpq', 'unitConversion',
  'cycleTime', 'scrapRate',
]);
const MAKE_OR_BUY_OPTIONS = [
  { value: 'make', label: '自制' },
  { value: 'buy', label: '外购' },
];
const MATERIAL_TYPE_OPTIONS = [
  { value: 'raw', label: '原材料' },
  { value: 'semi', label: '半成品' },
  { value: 'finished', label: '成品' },
  { value: 'purchased', label: '外购件' },
  { value: 'service', label: '服务' },
];

// 当前步骤 → 流程节点 id（供 FlowTracker 高亮）
const BUY_STEP_NODE_IDS = ['mat-1', 'mat-2', 'mat-3'];
const MAKE_STEP_NODE_IDS = ['matm-1', 'matm-2', 'matm-3'];

const roleName = (role?: string) =>
  role ? (ROLE_NAMES[role as keyof typeof ROLE_NAMES] || role) : '-';

const MaterialApprovalQueue: React.FC = () => {
  const { materialApplications, updateMaterialApplication } = useMaterialApprovalStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const vendors = useVendorStore(s => s.vendors);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // 每个申请的可编辑字段值（按申请 id 索引）
  const [editValues, setEditValues] = useState<Record<string, Record<string, any>>>({});

  const selectedApp = materialApplications.find(a => a.id === selectedId) || null;

  // 根据草稿的 makeOrBuy 字段动态选择审批步骤（外购→采购审核，自制→工艺审核）
  const effectiveSteps = useMemo<ApprovalFlowNode[]>(() => {
    const isMake = selectedApp?.draft?.makeOrBuy === 'make';
    const cfg = getApprovalSteps(isMake ? 'material_make' : 'material');
    return cfg.length ? cfg : getApprovalSteps('material');
  }, [selectedApp?.draft?.makeOrBuy]);

  const steps = effectiveSteps; // 向后兼容：后续代码仍用 steps 引用

  // 动态流程节点 ID（根据自制/外购切换 FlowTracker 高亮）
  const stepNodeIds = selectedApp?.draft?.makeOrBuy === 'make' ? MAKE_STEP_NODE_IDS : BUY_STEP_NODE_IDS;
  // 动态 FlowTracker module（统一引擎 module：material / material_make）
  const flowModule = selectedApp?.draft?.makeOrBuy === 'make' ? 'material_make' : 'material';

  const canEdit = useMemo(() => {
    if (!selectedApp) return false;
    const step = steps[selectedApp.currentStep];
    return !!step && (
      currentUser?.role === step.role ||
      currentUser?.role === 'admin' ||
      (currentUser ? useAuthStore.getState().hasPermission('material.approve') : false)
    );
  }, [selectedApp, steps, currentUser]);

  const openDialog = (app: MaterialApplication) => {
    setSelectedId(app.id);
    setRejectComment('');
    setSuccessMsg('');
    // 用当前步骤字段初始化编辑值（取自草稿）
    const init: Record<string, any> = {};
    (steps[app.currentStep]?.fields ?? []).forEach(f => {
      init[f] = (app.draft as any)[f] ?? '';
    });
    setEditValues(prev => ({ ...prev, [app.id]: init }));
  };
  const closeDialog = () => setSelectedId(null);

  const setFieldValue = (appId: string, field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || {}), [field]: value },
    }));
  };

  const handleSubmitNext = (app: MaterialApplication) => {
    const isMake = app.draft?.makeOrBuy === 'make';
    const cfg = getApprovalSteps(isMake ? 'material_make' : 'material');
    // B7-3：运行时条件执行——计算真正的下一步（物料审批默认无 skipRule，等价于 currentStep + 1）
    const { nextStep, autoApprovedNodes } = resolveApprovalAdvance(
      isMake ? 'material_make' : 'material', app.currentStep, cfg
    );
    const nextCfg = cfg[nextStep];
    const edited = editValues[app.id] || {};
    const fieldNames = Object.keys(edited).filter(k => edited[k] !== '' && edited[k] !== undefined && edited[k] !== null);
    const mergedDraft: Partial<Material> = { ...app.draft, ...edited };
    const now = new Date().toISOString();
    // 被自动通过的节点：追加系统自动审批历史（默认配置为空，不改变既有行为）
    const autoHistory = autoApprovedNodes.map((n) => ({
      step: cfg.indexOf(n), role: n.role, label: n.name, action: 'approve' as const, at: now,
    }));
    updateMaterialApplication(app.id, {
      draft: mergedDraft,
      currentStep: nextStep,
      stepHistory: [
        ...app.stepHistory,
        ...autoHistory,
        {
          step: nextStep,
          role: currentUser?.role || 'admin',
          label: nextCfg?.name || '审核',
          action: 'submit',
          fields: nextCfg?.fields ?? [],
          at: now,
        },
      ],
      updatedAt: now,
    });
    const savedFields = fieldNames.length > 0
      ? `（已保存：${fieldNames.map(f => FIELD_LABELS[f] || f).join('、')}）`
      : '';
    setSuccessMsg(`✅ 已提交至下一步「${nextCfg?.name || '审核'}」${savedFields}，等待处理`);
  };

  const handleApprove = (app: MaterialApplication) => {
    const materialState = useMaterialStore.getState();
    const material = buildMaterialFromApplication(app, {
      categories: materialState.categories as any,
      existingCodes: materialState.materials.map(m => m.code),
    });
    materialState.addMaterial(material);
    const now = new Date().toISOString();
    updateMaterialApplication(app.id, {
      status: 'approved',
      stepHistory: [
        ...app.stepHistory,
        {
          step: app.currentStep,
          role: currentUser?.role || 'admin',
          label: steps[app.currentStep]?.name || '批准生效',
          action: 'approve',
          at: now,
        },
      ],
      updatedAt: now,
    });
    setSuccessMsg(`✅ 物料已批准生效！编码：${material.code}，采购属性（LT/MOQ/MPQ/供应商等）已写入物料主数据`);
  };

  const handleReject = (app: MaterialApplication) => {
    const now = new Date().toISOString();
    updateMaterialApplication(app.id, {
      status: 'rejected',
      stepHistory: [
        ...app.stepHistory,
        {
          step: app.currentStep,
          role: currentUser?.role || 'admin',
          label: steps[app.currentStep]?.name || '驳回',
          action: 'reject',
          comment: rejectComment || undefined,
          at: now,
        },
      ],
      updatedAt: now,
    });
    setSuccessMsg('已驳回该申请');
  };

  const currentStepFields: string[] = selectedApp ? (steps[selectedApp.currentStep]?.fields ?? []) : [];
  const isLastStep = selectedApp ? selectedApp.currentStep >= steps.length - 1 : false;
  const currentEdit = selectedApp ? (editValues[selectedApp.id] || {}) : {};

  return (
    <PageWrapper title="物料新增审批队列">
      {materialApplications.length === 0 ? (
        <Alert severity="info">暂无物料新增审批申请。</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>申请单号</TableCell>
                <TableCell>申请人</TableCell>
                <TableCell>物料名称</TableCell>
                <TableCell>当前步骤</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell width={100}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materialApplications.map(app => (
                <TableRow key={app.id}>
                  <TableCell>{app.applicationNo}</TableCell>
                  <TableCell>{app.applicant}</TableCell>
                  <TableCell>{app.draft?.name || '-'}</TableCell>
                  <TableCell>{steps[app.currentStep]?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABEL[app.status]} color={STATUS_COLOR[app.status]} size="small" />
                  </TableCell>
                  <TableCell>{app.createdAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Visibility />} onClick={() => openDialog(app)}>
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!selectedApp} onClose={closeDialog} maxWidth="md" fullWidth>
        {selectedApp && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">物料新增审批 · {selectedApp.applicationNo}</Typography>
                <Typography variant="caption" color="text.secondary">
                  申请人：{selectedApp.applicant}（{roleName(selectedApp.applicantRole)}）
                </Typography>
              </Box>
              <Button onClick={closeDialog} size="small"><Close /></Button>
            </DialogTitle>
            <DialogContent dividers>
              <FlowTracker
                module={flowModule}
                currentStatus={stepNodeIds[Math.min(selectedApp.currentStep, stepNodeIds.length - 1)]}
                documentNo={selectedApp.applicationNo}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  当前步骤：{steps[selectedApp.currentStep]?.name}
                  <Chip sx={{ ml: 1 }} label={STATUS_LABEL[selectedApp.status]} color={STATUS_COLOR[selectedApp.status]} size="small" />
                </Typography>

                {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

                {selectedApp.status !== 'pending' ? (
                  <Alert severity="info">该申请已{STATUS_LABEL[selectedApp.status]}，审批流程结束。</Alert>
                ) : canEdit ? (
                  <>
                    {/* 物料基本信息（只读，供审批人员参考上下文） */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        📋 物料基本信息
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2"><strong>物料名称：</strong>{selectedApp.draft?.name || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2"><strong>规格型号：</strong>{selectedApp.draft?.specification || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>自制/外购：</strong>
                            {selectedApp.draft?.makeOrBuy === 'buy' ? '📦 外购' : selectedApp.draft?.makeOrBuy === 'make' ? '🔧 自制' : '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2">
                            <strong>物料类型：</strong>
                            {MATERIAL_TYPE_OPTIONS.find(o => o.value === selectedApp.draft?.materialType)?.label || (selectedApp.draft?.materialType || '—')}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2"><strong>基本单位：</strong>{selectedApp.draft?.unit || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2"><strong>型号：</strong>{selectedApp.draft?.model || '—'}</Typography>
                        </Grid>
                        {selectedApp.draft?.price != null && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2"><strong>单价：</strong>{selectedApp.draft.price} {selectedApp.draft?.currency || 'CNY'}</Typography>
                          </Grid>
                        )}
                        {selectedApp.draft?.remarks && (
                          <Grid item xs={12}>
                            <Typography variant="body2"><strong>备注：</strong>{selectedApp.draft.remarks}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>

                    {/* 当前步骤可编辑字段 */}
                    <Grid container spacing={2}>
                    {currentStepFields.map(field => {
                      // defaultVendorName 由供应商联动自动填充，不再单独渲染
                      if (field === 'defaultVendorName') return null;

                      const value = currentEdit[field] ?? (selectedApp.draft as any)[field] ?? '';

                      if (field === 'makeOrBuy') {
                        return (
                          <Grid item xs={12} md={6} key={field}>
                            <TextField select fullWidth label={FIELD_LABELS[field] || field}
                              value={value}
                              onChange={e => setFieldValue(selectedApp.id, field, e.target.value)}>
                              {MAKE_OR_BUY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </TextField>
                          </Grid>
                        );
                      }
                      if (field === 'materialType') {
                        return (
                          <Grid item xs={12} md={6} key={field}>
                            <TextField select fullWidth label={FIELD_LABELS[field] || field}
                              value={value}
                              onChange={e => setFieldValue(selectedApp.id, field, e.target.value)}>
                              {MATERIAL_TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </TextField>
                          </Grid>
                        );
                      }
                      // 供应商选择：Autocomplete 联动填充 ID + 名称
                      if (field === 'defaultVendorId') {
                        const vendorIdValue = currentEdit['defaultVendorId'] ?? (selectedApp.draft as any)?.defaultVendorId ?? '';
                        const vendorNameValue = currentEdit['defaultVendorName'] ?? (selectedApp.draft as any)?.defaultVendorName ?? '';
                        const selectedVendor = vendors.find(v => v.id === vendorIdValue) ||
                          (vendorNameValue ? vendors.find(v => v.name === vendorNameValue) : null);
                        return (
                          <Grid item xs={12} md={6} key="vendor-select">
                            <Autocomplete
                              options={vendors}
                              getOptionLabel={(v) => `${v.name} (${v.code})`}
                              isOptionEqualToValue={(a, b) => a.id === b.id}
                              value={selectedVendor || null}
                              onChange={(_, newVendor) => {
                                setFieldValue(selectedApp.id, 'defaultVendorId', newVendor?.id || '');
                                setFieldValue(selectedApp.id, 'defaultVendorName', newVendor?.name || '');
                              }}
                              renderInput={(params) => (
                                <TextField {...params} label="默认供应商" placeholder="搜索并选择供应商" />
                              )}
                              noOptionsText="未找到匹配的供应商"
                            />
                          </Grid>
                        );
                      }
                      return (
                        <Grid item xs={12} md={6} key={field}>
                          <TextField
                            fullWidth
                            type={NUMERIC_FIELDS.has(field) ? 'number' : 'text'}
                            label={FIELD_LABELS[field] || field}
                            value={value}
                            onChange={e => setFieldValue(
                              selectedApp.id,
                              field,
                              NUMERIC_FIELDS.has(field) ? Number(e.target.value) : e.target.value
                            )}
                          />
                        </Grid>
                      );
                    })}
                    {currentStepFields.length === 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">本步骤无可编辑字段。</Typography>
                      </Grid>
                    )}
                  </Grid>
                  </>
                ) : (
                  <Box>
                    <Alert severity="info" sx={{ mb: 1 }}>
                      当前角色（{roleName(currentUser?.role)}）无编辑权限，仅可查看。
                    </Alert>
                    <Stack spacing={0.5}>
                      {Object.entries(selectedApp.draft).map(([k, v]) => (
                        <Typography key={k} variant="body2">
                          <strong>{FIELD_LABELS[k] || k}：</strong> {v === undefined || v === '' ? '—' : String(v)}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2, gap: 1 }}>
              {selectedApp.status === 'pending' && canEdit && (
                <>
                  {!isLastStep ? (
                    <Button
                      variant="contained"
                      startIcon={<ThumbUp />}
                      data-testid="ma-approve-btn"
                      onClick={() => handleSubmitNext(selectedApp)}
                    >
                      提交下一步
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ThumbUp />}
                      data-testid="ma-approve-btn"
                      onClick={() => handleApprove(selectedApp)}
                    >
                      批准生效
                    </Button>
                  )}
                  <TextField size="small" label="驳回意见" value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Clear />}
                    data-testid="ma-reject-btn"
                    onClick={() => handleReject(selectedApp)}
                  >
                    驳回
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageWrapper>
  );
};

export default MaterialApprovalQueue;

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  CheckCircle, Cancel, Business, ContactPage,
  AccountBalance, AttachFile, CalendarToday,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';
import { getApprovalSteps, resolveApprovalAdvance } from '@/data/approvalFlowConfig';
import type { VendorApplication, Vendor } from '@/types';
import { formatDate } from '@/utils/format';
import { approvalStatusColor, approvalStatusLabel, approvalStatusOptions, isApprovalInFlight } from '@/constants/approvalEnums';

const VENDOR_MODULE = 'vendor_register';

/** 各审批角色在当前步骤可编辑的供应商字段（由配置步骤的 role 决定） */
const VENDOR_ROLE_FIELDS: Record<string, string[]> = {
  buyer:       ['contact', 'contactPhone', 'contactEmail', 'address', 'mainProducts'],
  qa_engineer: ['certifications', 'supplyCategories', 'annualRevenue'],
  admin:       [],
};
const VENDOR_ARRAY_FIELDS = new Set(['certifications', 'supplyCategories']);
const VENDOR_FIELD_LABELS: Record<string, string> = {
  contact: '联系人', contactPhone: '联系电话', contactEmail: '联系邮箱', address: '地址',
  mainProducts: '主营产品', certifications: '认证资质', supplyCategories: '供货类目', annualRevenue: '年营收',
};

/** 申请详情+审批弹窗 */
const ApprovalDialog: React.FC<{
  open: boolean;
  app: VendorApplication | null;
  steps: { id: string; name: string; role: string; roleName: string }[];
  canAct: boolean;
  onClose: () => void;
  onDecision: (action: 'approve' | 'reject' | 'supplement', comment: string) => void;
  onAdvance: (comment: string, edited: Record<string, unknown>) => void;
}> = ({ open, app, steps, canAct, onClose, onDecision, onAdvance }) => {
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState(0);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  // V3.96.0 组织与会计：统驭科目/税码是财务视角信息，供应商不了解，改由采购/财务审批时从主数据指定
  const { chartOfAccounts, taxCodes } = useFinanceStore();
  const [acct, setAcct] = useState({ salesOrg: '', reconciliationAccount: '', taxCode: '' });

  // 注意：所有 hooks 必须无条件调用（不能放在条件 return 之后），否则会在 app 由 null 变为有值时触发
  // "Rendered more hooks than during the previous render" 白屏。下方统一用可选链取值，末尾再 return null。
  const currentStep = app?.currentStep ?? 0;
  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;
  const inProgress = app ? ['submitted', 'reviewing', 'supplement'].includes(app.status) : false;
  const stepFields = step ? (VENDOR_ROLE_FIELDS[step.role] || []) : [];

  const initEditValues = (a: VendorApplication) => {
    const init: Record<string, unknown> = {};
    (VENDOR_ROLE_FIELDS[step?.role || ''] || []).forEach((f) => {
      const raw = (a as unknown as Record<string, unknown>)[f];
      init[f] = Array.isArray(raw) ? raw.join('、') : (raw ?? '');
    });
    setEditValues(init);
    // 组织与会计预填：已指定过则回填，未指定则留空待审批人选择
    setAcct({ salesOrg: a.salesOrg || '', reconciliationAccount: a.reconciliationAccount || '', taxCode: a.taxCode || '' });
  };

  // 切换申请时初始化可编辑字段
  React.useEffect(() => {
    if (app) initEditValues(app);
    setComment('');
    setTab(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app?.id]);

  if (!app) return null;

  const setField = (field: string, value: unknown) =>
    setEditValues((prev) => ({ ...prev, [field]: value }));

  const handleAdvance = () => {
    const edited: Record<string, unknown> = {};
    stepFields.forEach((f) => {
      const v = editValues[f];
      edited[f] = VENDOR_ARRAY_FIELDS.has(f) && typeof v === 'string'
        ? v.split('、').map((s) => s.trim()).filter(Boolean)
        : v;
    });
    // V3.96.0：把组织与会计的指定值合并进 edited（审批环节写入申请单，终审随档案落库）
    edited.salesOrg = acct.salesOrg;
    edited.reconciliationAccount = acct.reconciliationAccount;
    edited.taxCode = acct.taxCode;
    onAdvance(comment, edited);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Business />
          <Box>
            {app.companyName}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{app.applicationNo}</Typography>
          </Box>
          <Chip label={approvalStatusLabel('vendor_application', app.status)} size="small" color={approvalStatusColor('vendor_application', app.status)} />
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {/* V3.100.0 定向邀请来源横幅：邀请注册的申请显式标注邀请采购员 */}
        {app.buyerId && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
              该申请由采购员「{app.buyerName || app.buyerId}」邀请注册{app.salesOrg ? `（采购组织：${app.salesOrg}）` : ''}，请由对应采购员审核。
            </Alert>
          </Box>
        )}
        {/* 流程追踪（配置驱动） */}
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <FlowTracker
            module="vendor-register"
            currentStatus={step?.id || steps[0]?.id || 'vr-1'}
            documentNo={app.applicationNo}
          />
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid rgba(226,232,240,.8)', px: 3,
            '& .MuiTab-root': { fontSize: '0.875rem', textTransform: 'none', minHeight: 44 } }}>
          <Tab icon={<Business sx={{ fontSize: 16 }} />} iconPosition="start" label="企业信息" />
          <Tab icon={<ContactPage sx={{ fontSize: 16 }} />} iconPosition="start" label="联系人" />
          <Tab icon={<AttachFile sx={{ fontSize: 16 }} />} iconPosition="start" label="附件" />
          <Tab icon={<CalendarToday sx={{ fontSize: 16 }} />} iconPosition="start" label="审批记录" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* 企业信息 */}
          {tab === 0 && (
            <Grid container spacing={2}>
              {[
                ['企业全称', app.companyName], ['统一社会信用代码', app.unifiedCode],
                ['法定代表人', app.legalRepresentative], ['注册资本', app.registeredCapital],
                ['联系人', app.contact], ['电话', app.contactPhone],
                ['邮箱', app.contactEmail], ['地址', app.address],
                ['主要产品', app.mainProducts],
                ['供货类目', app.supplyCategories.join('、')],
                ['年营收', app.annualRevenue || '-'],
                ['认证资质', app.certifications?.join('、') || '无'],
                ['开户银行', app.bankName], ['银行账号', app.bankAccount],
                ['账户名称', app.bankAccountName],
              ].map(([label, value]) => (
                <Grid item xs={6} key={String(label)}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ fontFamily: label === '统一社会信用代码' || label === '银行账号' ? 'monospace' : 'inherit' }}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
          {/* 联系人 */}
          {tab === 1 && (
            <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#3B82F6', width: 48, height: 48 }}>{app.contact[0]}</Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>{app.contact}</Typography>
                  <Typography variant="body2" color="text.secondary">📞 {app.contactPhone}</Typography>
                  <Typography variant="body2" color="text.secondary">✉️ {app.contactEmail}</Typography>
                </Box>
              </Stack>
            </Paper>
          )}
          {/* 附件 */}
          {tab === 2 && (
            <Stack spacing={1}>
              {app.attachments.map(att => (
                <Box key={att.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5,
                  border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
                  <AttachFile sx={{ color: '#3B82F6' }} />
                  <Typography variant="body2" flex={1}>{att.name}</Typography>
                  <Chip label={att.type} size="small" sx={{ fontSize: '0.75rem' }} />
                  <Button size="small" variant="outlined">查看</Button>
                </Box>
              ))}
            </Stack>
          )}
          {/* 审批记录 */}
          {tab === 3 && (
            <Box>
              {app.approvalRecords?.map((r, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#10B981', fontSize: '0.8rem' }}>{r.approver[0]}</Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{r.approver}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(r.at)}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{r.comment}</Typography>
                  </Box>
                </Box>
              )) || <Typography color="text.secondary" variant="body2">暂无审批记录</Typography>}
              {/* 审批意见输入 */}
              {inProgress && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>填写审批意见</Typography>
                  <TextField fullWidth multiline rows={3} size="small"
                    placeholder="请输入审批意见..."
                    value={comment} onChange={(e) => setComment(e.target.value)} />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {!inProgress ? (
          <Alert severity="info">该申请已{approvalStatusLabel('vendor_application', app.status)}，审批流程结束。</Alert>
        ) : !canAct ? (
          <Alert severity="info">
            当前角色无「{step?.name}」步骤的审批权限，仅可查看。
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle2" fontWeight={600}>
              当前步骤：{step?.name}
              <Chip sx={{ ml: 1 }} size="small" label={step?.roleName} color="primary" variant="outlined" />
            </Typography>
            {/* 当前步骤可编辑字段（按角色过滤） */}
            {stepFields.length > 0 && (
              <Grid container spacing={2} sx={{ my: 0.5 }}>
                {stepFields.map((f) => (
                  <Grid item xs={12} md={6} key={f}>
                    <TextField fullWidth size="small" label={VENDOR_FIELD_LABELS[f] || f}
                      value={(editValues[f] as string) ?? ''}
                      onChange={(e) => setField(f, e.target.value)} />
                  </Grid>
                ))}
              </Grid>
            )}
            {stepFields.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                本步骤（{step?.name}）无可编辑字段，仅作审批判定。
              </Typography>
            )}
            {/* V3.96.0 组织与会计：统驭科目/税码是财务视角信息，供应商不了解，
                改由采购/财务在审批环节从主数据里【选择】，不再让供应商注册时填 */}
            <Box sx={{ mt: 1.5, p: 2, bgcolor: '#F8FAFC', border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                组织与会计（采购/财务指定，注册后供应商无法再改）
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>采购组织</InputLabel>
                    <Select value={acct.salesOrg} label="采购组织"
                      onChange={(e) => setAcct({ ...acct, salesOrg: e.target.value })}>
                      <MenuItem value="">（未指定）</MenuItem>
                      <MenuItem value="采购部">采购部</MenuItem>
                      <MenuItem value="制造采购部">制造采购部</MenuItem>
                      <MenuItem value="设备采购部">设备采购部</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>统驭科目</InputLabel>
                    <Select value={acct.reconciliationAccount} label="统驭科目"
                      onChange={(e) => setAcct({ ...acct, reconciliationAccount: e.target.value })}
                      inputProps={{ 'data-testid': 'approval-recon-account' }}>
                      <MenuItem value="">（未指定）</MenuItem>
                      {chartOfAccounts
                        .filter((a) => a.type === 'liability' || a.code === '2202')
                        .map((a) => (
                          <MenuItem key={a.id} value={a.code}>{a.code} {a.name}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>税码</InputLabel>
                    <Select value={acct.taxCode} label="税码"
                      onChange={(e) => setAcct({ ...acct, taxCode: e.target.value })}
                      inputProps={{ 'data-testid': 'approval-tax-code' }}>
                      <MenuItem value="">（未指定）</MenuItem>
                      {taxCodes.map((t) => (
                        <MenuItem key={t.id} value={t.code}>{t.code} {t.name}（{t.taxRate}%）</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
            {!isLastStep ? (
              <Button variant="contained" startIcon={<CheckCircle />}
                data-testid="vendor-approve-btn" onClick={handleAdvance}>
                提交下一步
              </Button>
            ) : (
              <Button variant="contained" color="success" startIcon={<CheckCircle />}
                data-testid="vendor-approve-btn" onClick={handleAdvance}>
                批准注册
              </Button>
            )}
            <Button variant="outlined" color="error" startIcon={<Cancel />}
              data-testid="vendor-reject-btn"
              onClick={() => { onDecision('reject', comment); onClose(); }}>
              拒绝
            </Button>
            <Button variant="outlined" onClick={() => { onDecision('supplement', comment); onClose(); }}>
              要求补充资料
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const ApprovalQueue: React.FC = () => {
  const { vendorApplications, updateVendorApplication } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<VendorApplication | null>(null);

  // 由 ApprovalFlowTab 配置驱动的步骤（vendor_register）
  const steps = useMemo(() => {
    const cfg = getApprovalSteps(VENDOR_MODULE);
    return cfg.length
      ? cfg
      : [{ id: 'default', name: '审批', role: 'admin', roleName: '系统管理员', order: 1 }];
  }, []);

  const currentUser = useAuthStore((s) => s.currentUser);

  const canAct = useMemo(() => {
    if (!selected || !currentUser) return false;
    const step = steps[selected.currentStep ?? 0];
    return !!step && (
      currentUser.role === step.role ||
      currentUser.role === 'admin' ||
      useAuthStore.getState().hasPermission('vendor.approve')
    );
  }, [selected, steps, currentUser]);

  // V3.100.0 弱定向：是否特权（管理员/超管/有 vendor.approve 权限）—— 可看可审全部
  const isPrivileged = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'super_admin' ||
      useAuthStore.getState().hasPermission('vendor.approve');
  }, [currentUser]);

  const buildVendorFromApp = (app: VendorApplication, extra?: Record<string, unknown>): Vendor => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // V3.96.0：组织与会计（采购组织/统驭科目/税码）由采购/财务在审批环节指定，
    //   优先取审批人本次指定的 extra，其次取申请单里已有值，最终写入供应商档案
    const org = (extra?.salesOrg as string) || app.salesOrg || undefined;
    const recon = (extra?.reconciliationAccount as string) || app.reconciliationAccount || undefined;
    const tax = (extra?.taxCode as string) || app.taxCode || undefined;
    return {
      id: `ven-${app.id}`,
      code: `V${dateStr}${Math.floor(Math.random() * 900 + 100)}`,
      name: app.companyName,
      shortName: app.companyName,
      type: 'trader',
      contact: app.contact,
      phone: app.contactPhone,
      email: app.contactEmail,
      address: app.address,
      status: 'approved',
      taxId: '',
      bankAccount: app.bankAccount,
      createdAt: now,
      updatedAt: now,
      createdBy: 'approval',
      updatedBy: 'approval',
      salesOrg: org,
      reconciliationAccount: recon,
      taxCode: tax,
    };
  };

  const applyEditedFields = (app: VendorApplication, edited: Record<string, unknown>) => {
    if (!edited || Object.keys(edited).length === 0) return;
    updateVendorApplication(app.id, { ...(edited as Partial<VendorApplication>) });
  };

  const handleAdvance = (_comment: string, edited: Record<string, unknown>) => {
    if (!selected) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const currentStep = selected.currentStep ?? 0;
    // B7-3：运行时条件执行——计算真正的下一步（供应商准入默认无 skipRule，等价于 currentStep + 1）
    const { nextStep, autoApprovedNodes } = resolveApprovalAdvance(VENDOR_MODULE, currentStep, steps);
    const isLast = nextStep >= steps.length;
    const step = steps[currentStep];
    const record = { approver: currentUser?.name || 'admin', action: 'submit' as const, comment: '', at: now };
    const historyEntry = {
      step: currentStep, role: step?.role || 'admin', label: step?.name || '审批', action: 'submit' as const, at: now,
    };
    // 被自动通过的节点：追加系统自动审批记录（默认配置为空，不改变既有行为）
    const autoRecords = autoApprovedNodes.map((n) => ({
      approver: '系统自动', action: 'approve' as const, comment: `命中自动通过规则（${n.name}）`, at: now,
    }));
    const autoHistory = autoApprovedNodes.map((n) => ({
      step: steps.indexOf(n), role: n.role, label: n.name, action: 'approve' as const, at: now,
    }));
    applyEditedFields(selected, edited);
    if (!isLast) {
      updateVendorApplication(selected.id, {
        status: 'reviewing',
        currentStep: nextStep,
        reviewedAt: now,
        approvalRecords: [
          ...(selected.approvalRecords || []),
          { ...record, action: 'submit', comment: record.comment },
          ...autoRecords,
        ],
        stepHistory: [...(selected.stepHistory || []), historyEntry, ...autoHistory],
      });
    } else {
      // 终审：批准注册并生成供应商档案
      updateVendorApplication(selected.id, {
        status: 'approved',
        reviewedAt: now,
        approvalRecords: [...(selected.approvalRecords || []), { ...record, action: 'approve' }],
        stepHistory: [...(selected.stepHistory || []), { ...historyEntry, action: 'approve' }],
      });
      const vendors = useVendorStore.getState().vendors;
      if (!vendors.some((v) => v.id === `ven-${selected.id}`)) {
        useVendorStore.getState().addVendor(buildVendorFromApp(selected, edited));
      }
    }
  };

  const handleDecision = (action: 'approve' | 'reject' | 'supplement', comment: string) => {
    if (!selected) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const currentStep = selected.currentStep ?? 0;
    const step = steps[currentStep];
    const record = { approver: currentUser?.name || 'admin', action, comment, at: now };
    const historyEntry = {
      step: currentStep, role: step?.role || 'admin', label: step?.name || '审批',
      action: (action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'supplement') as 'approve' | 'reject' | 'supplement',
      comment: comment || undefined, at: now,
    };
    if (action === 'approve') {
      // 兼容直接批准（无步骤推进时）场景：终审创建供应商
      updateVendorApplication(selected.id, {
        status: 'approved', reviewedAt: now, reviewComment: comment,
        approvalRecords: [...(selected.approvalRecords || []), record],
        stepHistory: [...(selected.stepHistory || []), historyEntry],
      });
      const vendors = useVendorStore.getState().vendors;
      if (!vendors.some((v) => v.id === `ven-${selected.id}`)) {
        useVendorStore.getState().addVendor(buildVendorFromApp(selected));
      }
    } else if (action === 'reject') {
      updateVendorApplication(selected.id, {
        status: 'rejected', reviewedAt: now, reviewComment: comment,
        approvalRecords: [...(selected.approvalRecords || []), record],
        stepHistory: [...(selected.stepHistory || []), historyEntry],
      });
    } else {
      updateVendorApplication(selected.id, {
        status: 'supplement', reviewedAt: now, reviewComment: comment,
        approvalRecords: [...(selected.approvalRecords || []), record],
        stepHistory: [...(selected.stepHistory || []), historyEntry],
      });
    }
  };

  const columns: ColumnDef<VendorApplication, unknown>[] = useMemo(() => [
    { accessorKey: 'applicationNo', header: '申请编号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.applicationNo}</Typography>,
    },
    { accessorKey: 'companyName', header: '企业名称',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: '#3B82F6', fontSize: '0.75rem' }}>{row.original.companyName[0]}</Avatar>
          <Typography variant="body2" fontWeight={500}>{row.original.companyName}</Typography>
        </Stack>
      ),
    },
    { accessorKey: 'source', header: '来源',
      cell: ({ row }) => row.original.buyerId
        ? <Chip size="small" color="primary" variant="outlined"
            label={row.original.buyerName ? `由 ${row.original.buyerName} 邀请` : '邀请注册'}
            sx={{ fontSize: '0.7rem' }} />
        : <Chip size="small" variant="outlined" label="自主注册" sx={{ fontSize: '0.7rem' }} />,
    },
    { accessorKey: 'contact', header: '联系人',
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.original.contact}</Typography>
          <Typography variant="caption" color="text.secondary">{row.original.contactPhone}</Typography>
        </Box>
      ),
    },
    { accessorKey: 'supplyCategories', header: '供货类目',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
          {row.original.supplyCategories.slice(0, 2).map(c => (
            <Chip key={c} label={c} size="small" sx={{ fontSize: '0.7rem' }} />
          ))}
          {row.original.supplyCategories.length > 2 && (
            <Chip label={`+${row.original.supplyCategories.length - 2}`} size="small" sx={{ fontSize: '0.7rem' }} />
          )}
        </Box>
      ),
    },
    { accessorKey: 'certifications', header: '认证',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
          {row.original.certifications?.slice(0, 2).map(c => (
            <Chip key={c} label={c} size="small" color="success" sx={{ fontSize: '0.7rem' }} />
          ))}
        </Box>
      ),
    },
    { accessorKey: 'currentStep', header: '当前步骤',
      cell: ({ row }) => {
        const step = steps[row.original.currentStep ?? 0];
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip label={step?.name || '审批'} size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            {step?.roleName && <Typography variant="caption" color="text.secondary">{step.roleName}</Typography>}
          </Stack>
        );
      },
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => (
        <Chip label={approvalStatusLabel('vendor_application', row.original.status)} size="small"
          color={approvalStatusColor('vendor_application', row.original.status)} />
      ),
    },
    { accessorKey: 'submittedAt', header: '提交时间', cell: ({ row }) => formatDate(row.original.submittedAt) },
  ], [steps]);

  const filterFields = [
    { name: 'companyName', label: '企业名称', type: 'text' as const },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        ...approvalStatusOptions('vendor_application'),
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...vendorApplications];
    // V3.100.0 弱定向：普通采购员仅看「自己邀请的」+ 历史未归属（自由注册）申请；
    //   管理员/超管/有 vendor.approve 权限者看全部。
    if (currentUser?.role === 'buyer' && !isPrivileged) {
      data = data.filter((d) => !d.buyerId || d.buyerId === currentUser.id);
    }
    if (filterData.companyName) data = data.filter(d => d.companyName.includes(filterData.companyName as string));
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
    // vendorApplications 必须进入依赖：审批推进后队列需即时反映最新步骤/状态
  }, [filterData, vendorApplications, currentUser, isPrivileged]);

  // 统计
  const stats = useMemo(() => ({
    reviewing: vendorApplications.filter(a => a.status === 'reviewing').length,
    submitted: vendorApplications.filter(a => a.status === 'submitted').length,
    approved: vendorApplications.filter(a => a.status === 'approved').length,
    rejected: vendorApplications.filter(a => a.status === 'rejected').length,
  }), [vendorApplications]);

  return (
    <PageWrapper title="供应商注册审批">
      {/* 配置驱动的审批流程概览 */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          审批流程（{steps.length} 步，按设置中心配置驱动）
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <Typography variant="caption" sx={{ color: '#94A3B8', mx: 0.5 }}>→</Typography>}
              <Chip
                icon={<AccountBalance sx={{ fontSize: 14 }} />}
                label={`${s.name}（${s.roleName}）`}
                size="small"
                color={i === 0 ? 'primary' : 'default'}
                variant="outlined"
                sx={{ fontSize: '0.72rem', height: 24 }}
              />
            </React.Fragment>
          ))}
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '待审核', value: stats.submitted + stats.reviewing, color: '#F59E0B', bg: '#FFFBEB' },
          { label: '审核中', value: stats.reviewing, color: '#6366F1', bg: '#EEF2FF' },
          { label: '已批准', value: stats.approved, color: '#10B981', bg: '#ECFDF5' },
          { label: '已拒绝', value: stats.rejected, color: '#EF4444', bg: '#FEF2F2' },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper elevation={0} sx={{ p: 1.5, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, textAlign: 'center', bgcolor: s.bg }}>
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onView={(row) => setSelected(row)}
        onEdit={(row) => setSelected(row)}
      />
      <ApprovalDialog
        open={Boolean(selected)}
        app={selected}
        steps={steps}
        canAct={canAct}
        onClose={() => setSelected(null)}
        onDecision={handleDecision}
        onAdvance={handleAdvance}
      />
    </PageWrapper>
  );
};

export default ApprovalQueue;

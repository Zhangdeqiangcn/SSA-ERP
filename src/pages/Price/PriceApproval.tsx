import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Stack, Button,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Stepper, Step, StepLabel,
} from '@mui/material';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import { ArrowBack, Check, Close, Send } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { useAuthStore } from '@/stores/authStore';
import { getApprovalSteps, resolveApprovalAdvance, type ApprovalFlowNode } from '@/data/approvalFlowConfig';
import { PriceApprovalRecord, PriceApproval as PriceApprovalType, PriceApprovalItem } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const PRICE_MODULE = 'price_approval';

interface ApprovalStateItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  selectedVendorId: string;
  selectedVendorName: string;
  selectedUnitPrice: number;
  selectedAmount: number;
  deliveryDays: number;
  deliveryDate?: string;
  paymentTerms?: string;
}

const PriceApproval: React.FC = () => {
  const { priceApprovals } = usePriceStore();
  const approvePriceApproval = usePriceStore((s) => s.approvePriceApproval);
  const addPriceApproval = usePriceStore((s) => s.addPriceApproval);
  const updatePriceApproval = usePriceStore((s) => s.updatePriceApproval);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 由统一审批引擎驱动的步骤（price_approval）
  const steps = useMemo<ApprovalFlowNode[]>(() => {
    const cfg = getApprovalSteps(PRICE_MODULE);
    return cfg.length
      ? cfg
      : [{ id: 'pa-1', name: '审批', role: 'buyer', roleName: '采购员', order: 1 } as ApprovalFlowNode];
  }, []);

  const currentUser = useAuthStore((s) => s.currentUser);

  // 从比价单传入或从 mock 加载
  const [items, setItems] = useState<ApprovalStateItem[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const [comparisonId, setComparisonId] = useState('');
  const [comparisonNo, setComparisonNo] = useState('');
  const [inquiryId, setInquiryId] = useState('');
  const [inquiryNo, setInquiryNo] = useState('');
  const [title, setTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [approvalNo, setApprovalNo] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<string>('pending');
  const [approvalRecords, setApprovalRecords] = useState<PriceApprovalRecord[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    // 优先从路由参数加载已有审批单
    if (id && id !== 'new') {
      const existing = priceApprovals.find((a) => a.id === id);
      if (existing) {
        setItems(existing.items);
        setComparisonId(existing.comparisonId);
        setComparisonNo(existing.comparisonNo);
        setInquiryId(existing.inquiryId);
        setInquiryNo(existing.inquiryNo);
        setTitle(existing.title);
        setRemarks(existing.remarks || '');
        setApprovalNo(existing.approvalNo);
        setApprovalStatus(existing.status);
        // 已批准/已驳回则定位到流程末尾，避免「当前步骤」误显首节点
        setCurrentStep(
          existing.status === 'approved' || existing.status === 'rejected'
            ? steps.length
            : (existing.currentStep ?? 0)
        );
        setApprovalRecords(existing.approvalRecords || []);
        return;
      }
    }

    // 其次从 location state 加载（新建模式）
    const state = location.state as { items?: ApprovalStateItem[]; comparisonId?: string; comparisonNo?: string; inquiryId?: string; inquiryNo?: string; title?: string } | null;
    if (state?.items) {
      setItems(state.items);
      setComparisonId(state.comparisonId || '');
      setComparisonNo(state.comparisonNo || '');
      setInquiryId(state.inquiryId || '');
      setInquiryNo(state.inquiryNo || '');
      setTitle(state.title || '');
      setCurrentStep(0);
    }
  }, [id, location.state, steps]);

  const totalAmount = items.reduce((sum, item) => sum + item.selectedAmount, 0);

  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;
  const inProgress = !['approved', 'rejected'].includes(approvalStatus);
  const canAct = inProgress && !!step && !!currentUser && (
    currentUser.role === step.role ||
    currentUser.role === 'admin' ||
    useAuthStore.getState().hasPermission('price.approve')
  );

  const handleSubmitForApproval = () => {
    setSnackbar({ open: true, message: '价格审批单已提交！将按设置中心配置的审批流依次审批', severity: 'info' });
    navigate('/price/approvals');
  };

  const handleApprove = () => {
    setApprovalAction('approve');
    setShowApprovalDialog(true);
  };

  const handleReject = () => {
    setApprovalAction('reject');
    setShowApprovalDialog(true);
  };

  const handleConfirmApproval = (comments: string) => {
    if (approvalAction === 'approve') {
      const now = new Date().toISOString();
      const stepNode = steps[currentStep];
      const record: PriceApprovalRecord = {
        id: `par-${Date.now()}`,
        approver: currentUser?.name || '当前用户',
        action: 'approve',
        comments,
        operatedAt: now,
        nodeName: stepNode?.name || '审批',
      };

      const target = priceApprovals.find((a) => a.id === id);
      let approvalId = id ?? target?.id ?? '';
      let baseRecords: PriceApprovalRecord[] = target?.approvalRecords || [];

      // 新建模式的审批单：先落库再推进
      if (!target) {
        const newApproval: PriceApprovalType = {
          id: `pa-${Date.now()}`,
          approvalNo: `PA${now.slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-4)}`,
          comparisonId,
          comparisonNo,
          inquiryId,
          inquiryNo,
          title,
          applicant: currentUser?.name || '当前用户',
          applicationDate: now.slice(0, 10),
          items: items.map(
            (it): PriceApprovalItem => ({
              materialId: it.materialId,
              materialCode: it.materialCode,
              materialName: it.materialName,
              specification: it.specification,
              unit: it.unit,
              quantity: it.quantity,
              selectedVendorId: it.selectedVendorId,
              selectedVendorName: it.selectedVendorName,
              selectedUnitPrice: it.selectedUnitPrice,
              selectedAmount: it.selectedAmount,
              deliveryDays: it.deliveryDays,
              deliveryDate: it.deliveryDate,
              paymentTerms: it.paymentTerms,
            })
          ),
          totalAmount,
          approvalRecords: [record],
          status: 'reviewing',
          currentStep: 0,
          remarks,
          currency: 'CNY',
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser?.name || '当前用户',
        };
        addPriceApproval(newApproval);
        approvalId = newApproval.id;
        baseRecords = [record];
      }

      // 运行时条件执行：计算真正的下一步（默认配置等价于 currentStep + 1）
      const { nextStep, autoApprovedNodes } = resolveApprovalAdvance(PRICE_MODULE, currentStep, steps, { amount: totalAmount });
      const autoRecords: PriceApprovalRecord[] = autoApprovedNodes.map((n) => ({
        id: `par-auto-${Date.now()}-${n.id}`,
        approver: '系统自动',
        action: 'approve',
        comments: `命中自动通过规则（${n.name}）`,
        operatedAt: now,
        nodeName: n.name,
      }));

      if (nextStep < steps.length) {
        updatePriceApproval(approvalId, {
          currentStep: nextStep,
          status: 'reviewing',
          approvalRecords: [...baseRecords, ...autoRecords, record],
        });
        setCurrentStep(nextStep);
        setApprovalStatus('reviewing');
      } else {
        // 终审：触发价目表自动生成（事件驱动）
        approvePriceApproval(approvalId, record);
        setApprovalStatus('approved');
      }
      setSnackbar({ open: true, message: '审批通过！价格已生效，已自动生成价目表记录。', severity: 'success' });
    } else {
      const now = new Date().toISOString();
      const stepNode = steps[currentStep];
      const record: PriceApprovalRecord = {
        id: `par-${Date.now()}`,
        approver: currentUser?.name || '当前用户',
        action: 'reject',
        comments,
        operatedAt: now,
        nodeName: stepNode?.name || '审批',
      };
      const target = priceApprovals.find((a) => a.id === id);
      if (target) {
        updatePriceApproval(target.id, {
          status: 'rejected',
          approvalRecords: [...(target.approvalRecords || []), record],
        });
      }
      setApprovalStatus('rejected');
      setSnackbar({ open: true, message: '审批驳回！请重新比价。', severity: 'info' });
    }
    setShowApprovalDialog(false);
    navigate('/price/approvals');
  };

  const isReadonly = approvalStatus === 'approved' || approvalStatus === 'rejected';
  const flowStatus = approvalStatus === 'approved' || approvalStatus === 'rejected'
    ? (steps[steps.length - 1]?.id ?? 'pa-3')
    : (steps[currentStep]?.id ?? 'pa-1');

  return (
    <>
    <PageWrapper
      title={`价格审批单 ${approvalNo ? approvalNo : ''}`}
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="price_approval" currentStatus={flowStatus}
            documentNo={approvalNo || comparisonNo} />
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/price/approvals')}>返回列表</Button>
        </Stack>
      }
    >
      {/* 审批进度（统一引擎驱动） */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>审批进度（{steps.length} 步，按设置中心配置驱动）</Typography>
        <Stepper activeStep={approvalStatus === 'approved' ? steps.length : currentStep} alternativeLabel>
          {steps.map((s, idx) => (
            <Step key={s.id} completed={approvalStatus === 'approved' ? true : idx < currentStep}>
              <StepLabel>{s.name}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* 基本信息 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>基本信息</Typography>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box><Typography variant="caption" color="text.secondary">比价单号</Typography>
            <Typography variant="body2" fontWeight={600}>{comparisonNo}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">询价单号</Typography>
            <Typography variant="body2">{inquiryNo}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">标题</Typography>
            <Typography variant="body2">{title}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">申请人</Typography>
            <Typography variant="body2">{currentUser?.name || '张华'}（采购部）</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">申请日期</Typography>
            <Typography variant="body2">{formatDate(new Date().toISOString().split('T')[0])}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">状态</Typography>
            <Chip
              label={approvalStatus === 'approved' ? '已通过' : approvalStatus === 'rejected' ? '已驳回' : '待审批'}
              size="small"
              color={approvalStatus === 'approved' ? 'success' : approvalStatus === 'rejected' ? 'error' : 'warning'} /></Box>
        </Stack>
        {remarks && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">备注</Typography>
            <Typography variant="body2">{remarks}</Typography>
          </Box>
        )}
      </Paper>

      {/* 选定物料明细 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>选定价格明细</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>物料编码</TableCell>
                <TableCell>物料名称</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>单位</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell>选定供应商</TableCell>
                <TableCell align="right">单价</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell align="center">交期(天)</TableCell>
                <TableCell>预计交期</TableCell>
                <TableCell>付款条件</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.materialCode}</TableCell>
                  <TableCell>{item.materialName}</TableCell>
                  <TableCell>{item.specification}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell>
                    <Chip label={item.selectedVendorName} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.selectedUnitPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.selectedAmount)}</TableCell>
                  <TableCell align="center">{item.deliveryDays}</TableCell>
                  <TableCell>{item.deliveryDate ? formatDate(item.deliveryDate) : '-'}</TableCell>
                  <TableCell>{item.paymentTerms || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider sx={{ mt: 2, mb: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">共 {items.length} 项物料</Typography>
          <Typography variant="h6" color="primary">总金额：{formatCurrency(totalAmount)}</Typography>
        </Stack>
      </Paper>

      {/* 审批记录 */}
      {approvalRecords.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>审批记录</Typography>
          {approvalRecords.map((record, idx) => (
            <Box key={record.id || idx} sx={{ mb: 1, pb: 1, borderBottom: idx < approvalRecords.length - 1 ? 1 : 0, borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  label={record.action === 'approve' ? '通过' : '驳回'}
                  size="small"
                  color={record.action === 'approve' ? 'success' : 'error'}
                />
                <Typography variant="body2" fontWeight={600}>{record.approver}</Typography>
                <Typography variant="caption" color="text.secondary">{record.nodeName}</Typography>
                <Typography variant="caption" color="text.secondary">{record.operatedAt}</Typography>
              </Stack>
              {record.comments && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  "{record.comments}"
                </Typography>
              )}
            </Box>
          ))}
        </Paper>
      )}

      {/* 操作区 */}
      {!isReadonly && (
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" color="error" startIcon={<Close />}
            onClick={handleReject}>驳回</Button>
          <Button variant="contained" color="success" startIcon={<Check />}
            onClick={handleApprove}>审批通过</Button>
        </Paper>
      )}

      {/* 审批确认对话框 */}
      <Dialog open={showApprovalDialog} onClose={() => setShowApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? '确认审批通过' : '确认驳回'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="审批意见"
            placeholder={approvalAction === 'approve' ? '如：价格合理，同意采购' : '如：价格偏高，请重新比价'}
            id="approval-comments"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApprovalDialog(false)}>取消</Button>
          <Button variant="contained" color={approvalAction === 'approve' ? 'success' : 'error'}
            onClick={() => {
              const input = document.getElementById('approval-comments') as HTMLInputElement;
              handleConfirmApproval(input?.value || '');
            }}>
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default PriceApproval;

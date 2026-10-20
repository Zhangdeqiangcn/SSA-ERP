import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Stack, Grid, Divider,
  MenuItem, Autocomplete, Alert,
} from '@mui/material';
import { Add, Delete, Save, Send, ArrowBack } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { MaterialLineItemsGrid, GridColumn, PrintPreviewButton } from '@/components/common';
import { useMaterialStore } from '@/stores/materialStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useAuthStore } from '@/stores/authStore';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { Customer, ContractStatus } from '@/types';
import { formatCurrency } from '@/utils/format';
import { notifyError } from '@/utils/notify';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿', active: '执行中', suspended: '已暂停',
  completed: '已完成', terminated: '已终止',
};

interface FormContractItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  deliveryDate: string;
}

interface FormPaymentItem {
  id: string;
  stage: string;
  percentage: number;
  amount: number;
  dueDate: string;
  receivedDate: string;
  received: boolean;
}

const SalesContractForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const materials = useMaterialStore((s) => s.materials);
  const customers = useCustomerStore((s) => s.customers);
  const { contracts, addContract, updateContract } = useSalesContractStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  const existing = useMemo(() =>
    id ? contracts.find((c) => c.id === id) : null,
    [id, contracts]
  );

  // --- 头部 ---
  const [name, setName] = useState(existing?.name || '');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (!existing) return null;
    return customers.find((c: any) => c.id === existing.customerId) || null;
  });
  const [startDate, setStartDate] = useState(existing?.startDate || '');
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [salesPerson, setSalesPerson] = useState(existing?.salesPerson || currentUser?.name || currentUser?.username || '');
  const [status, setStatus] = useState<ContractStatus>(existing?.status || 'draft');
  const [terms, setTerms] = useState(existing?.terms || '');
  const [remarks, setRemarks] = useState(existing?.remarks || '');

  // --- 明细 ---
  const [items, setItems] = useState<FormContractItem[]>(() => {
    if (!existing?.items) return [];
    return existing.items.map((item) => ({
      id: item.id, materialId: item.materialId, materialCode: item.materialCode || '',
      materialName: item.materialName || '', specification: item.specification || '',
      unit: item.unit || '吨', quantity: item.quantity, unitPrice: item.unitPrice,
      amount: item.amount, deliveryDate: item.deliveryDate || '',
    }));
  });

  // --- 收款计划 ---
  const [payments, setPayments] = useState<FormPaymentItem[]>(() => {
    if (!existing?.paymentSchedule) return [];
    return existing.paymentSchedule.map((p) => ({
      id: p.id,
      stage: p.stage,
      percentage: p.percentage,
      amount: p.amount,
      dueDate: p.dueDate || '',
      receivedDate: p.receivedDate || '',
      received: p.received,
    }));
  });

  const materialOptions = materials.map((m) => ({
    id: m.id, code: m.code, name: m.name, specification: m.specification || '', unit: m.unit, price: m.price,
  }));

  // 合同总金额 = 明细金额合计
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  // ── 物料明细：Excel 式网格（多行复制粘贴 / 列显隐 / 物料号名称分列）──
  const computeContractRow = (row: any) => ({
    ...row,
    amount: (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0),
  });

  const handleContractMaterialPricing = (_rowId: string, materialId: string): Record<string, any> => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    return { unitPrice: mat.price };
  };

  const contractColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 140, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 200, fixed: true },
    { key: 'specification', label: '规格', fillFromMaterial: 'specification', width: 140, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 70, hideable: true },
    { key: 'quantity', label: '数量', type: 'number', align: 'right', width: 90, min: 1, step: 1 },
    { key: 'unitPrice', label: '单价', type: 'number', align: 'right', width: 110, min: 0, step: 0.01 },
    { key: 'amount', label: '金额', type: 'readonly', align: 'right', width: 110 },
    { key: 'deliveryDate', label: '交货日期', type: 'date', width: 150, hideable: true },
  ];

  const makeContractRow = () => ({
    id: '', materialId: '', materialCode: '', materialName: '', specification: '',
    unit: '吨', quantity: 1, unitPrice: 0, amount: 0, deliveryDate: '',
  });

  // --- 收款计划操作 ---
  const handleAddPayment = () => {
    setPayments((prev) => [...prev, {
      id: `pay-${Date.now()}`, stage: '', percentage: 0,
      amount: 0, dueDate: '', receivedDate: '', received: false,
    }]);
  };

  const handleDeletePayment = (payId: string) => setPayments((prev) => prev.filter((p) => p.id !== payId));

  const handlePaymentChange = (payId: string, field: keyof FormPaymentItem, value: any) => {
    setPayments((prev) => prev.map((p) => {
      if (p.id !== payId) return p;
      const updated = { ...p, [field]: value };
      if (field === 'percentage') {
        updated.amount = totalAmount * updated.percentage / 100;
      }
      return updated;
    }));
  };

  // --- 保存 ---
  const handleSave = () => {
    if (!name.trim()) { notifyError('请输入合同名称'); return; }
    if (!selectedCustomer) { notifyError('请选择客户'); return; }
    if (items.length === 0) { notifyError('请添加至少一项物料明细'); return; }

    const now = new Date().toISOString();
    const formData = {
      name, customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code, salesPerson, amount: totalAmount,
      startDate, endDate, status, items, paymentSchedule: payments,
      terms, remarks,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (isEditMode && existing) {
      updateContract(existing.id, formData);
    } else {
      const contractNo = `SC-${dayjs().format('YYYY')}-${String(contracts.length + 1).padStart(3, '0')}`;
      addContract({ id: `sc-${Date.now()}`, contractNo, ...formData });
    }
    navigate('/sales/contracts');
  };

  // --- 提交 ---
  const handleSubmit = () => {
    if (!name.trim()) { notifyError('请输入合同名称'); return; }
    if (!selectedCustomer) { notifyError('请选择客户'); return; }
    if (items.length === 0) { notifyError('请添加至少一项物料明细'); return; }

    const now = new Date().toISOString();
    const formData = {
      name, customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code, salesPerson, amount: totalAmount,
      startDate, endDate, status: (status === 'draft' ? 'active' : status) as ContractStatus,
      items, paymentSchedule: payments,
      terms, remarks,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (isEditMode && existing) {
      updateContract(existing.id, formData);
    } else {
      const contractNo = `SC-${dayjs().format('YYYY')}-${String(contracts.length + 1).padStart(3, '0')}`;
      addContract({ id: `sc-${Date.now()}`, contractNo, ...formData });
    }
    navigate('/sales/contracts');
  };

  const buildPrintRecord = (): Record<string, any> => ({
    contractNo: existing?.contractNo || '(尚未保存)',
    name,
    customerName: selectedCustomer?.name || '',
    customerCode: selectedCustomer?.code || '',
    startDate,
    endDate,
    salesPerson,
    status,
    terms,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate,
    })),
    payments: payments.map((p) => ({
      stage: p.stage,
      percentage: p.percentage,
      amount: p.amount,
      dueDate: p.dueDate,
    })),
  });

  return (
    <PageWrapper
      title={isEditMode ? `编辑合同${existing ? ' - ' + existing.contractNo : ''}` : '新建销售合同'}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/contracts')}>返回</Button>
          <PrintPreviewButton entity="salesContract" record={buildPrintRecord()} showBoth />
          <Button variant="outlined" startIcon={<Save />} onClick={handleSave}>暂存</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handleSubmit} data-testid="sc-submit">
            {isEditMode ? '保存修改' : '提交合同'}
          </Button>
        </Stack>
      }
    >
      {/* 合同头 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>合同基本信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="合同名称" value={name}
              onChange={(e) => setName(e.target.value)} required
              inputProps={{ 'data-testid': 'sc-name' }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={customers}
              getOptionLabel={(c) => `${c.name} (${c.code})`}
              value={selectedCustomer}
              onChange={(_, v) => {
                setSelectedCustomer(v);
              }}
              renderInput={(params) => (
                <TextField {...params} label="客户" placeholder="选择或搜索客户" required
                  inputProps={{ ...params.inputProps, 'data-testid': 'sc-customer' }} />
              )}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              noOptionsText="未找到匹配客户"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="合同金额" value={formatCurrency(totalAmount)}
              disabled InputProps={{ inputProps: { 'data-testid': 'sc-amount' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="销售员" value={salesPerson}
              onChange={(e) => setSalesPerson(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="开始日期" type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }} inputProps={{ 'data-testid': 'sc-start' }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="结束日期" type="date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} inputProps={{ 'data-testid': 'sc-end' }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth label="合同状态" value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* 物料明细 — Excel 式网格 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <MaterialLineItemsGrid
          columns={contractColumns}
          value={items}
          onChange={(rows) => setItems(rows as any)}
          materials={materialOptions}
          onMaterialChange={handleContractMaterialPricing}
          computeRow={computeContractRow}
          newRow={makeContractRow}
          storageKey="ssa-contract-material-columns"
          addLabel="添加物料"
          testIdPrefix="sc"
          footer={
            <Stack spacing={0.5} alignItems="flex-end" px={1}>
              <Typography variant="subtitle1" fontWeight={700} color="primary">
                合同总金额：{formatCurrency(totalAmount)}
              </Typography>
            </Stack>
          }
        />
      </Paper>

      {/* 收款计划 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>收款计划</Typography>
          <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddPayment} data-testid="sc-add-payment">
            添加节点
          </Button>
        </Stack>
        {payments.length === 0 ? (
          <Alert severity="info">请添加收款计划节点</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>里程碑</TableCell>
                  <TableCell align="right">比例(%)</TableCell>
                  <TableCell align="right">金额</TableCell>
                  <TableCell>计划收款日</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <TextField size="small" placeholder="如：合同签订" value={p.stage}
                        onChange={(e) => handlePaymentChange(p.id, 'stage', e.target.value)}
                        sx={{ width: 160 }} />
                    </TableCell>
                    <TableCell align="right">
                      <TextField size="small" type="number" value={p.percentage}
                        onChange={(e) => handlePaymentChange(p.id, 'percentage', Number(e.target.value))}
                        sx={{ width: 80 }} inputProps={{ min: 0, max: 100 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>{formatCurrency(p.amount)}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="date" value={p.dueDate}
                        onChange={(e) => handlePaymentChange(p.id, 'dueDate', e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 主要条款 & 备注 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>其他信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="主要条款" value={terms}
              onChange={(e) => setTerms(e.target.value)} multiline rows={4} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="备注" value={remarks}
              onChange={(e) => setRemarks(e.target.value)} multiline rows={2} />
          </Grid>
        </Grid>
      </Paper>
    </PageWrapper>
  );
};

export default SalesContractForm;

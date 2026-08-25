import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Grid, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Typography, Divider, Stack, Alert,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useCustomerStore } from '@/stores/customerStore';
import { Customer, CustomerStatus, CustomerType, CreditLevel } from '@/types';
import {
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CREDIT_LEVEL_OPTIONS,
  SETTLEMENT_TERM_OPTIONS,
  TAX_RATE_OPTIONS,
  CURRENCY_OPTIONS,
} from '@/constants/options';
import { getNextSequence } from '@/utils/codeGenerator';

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const genId = (prefix: string) => `${prefix}-${Date.now()}`;

interface FormState {
  code: string;
  name: string;
  shortName: string;
  type: CustomerType;
  status: CustomerStatus;
  creditLevel: CreditLevel | '';
  creditLimit: string;
  usedCredit: number;
  settlementTermDays: number;
  taxId: string;
  invoiceTitle: string;
  invoiceAddress: string;
  invoicePhone: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  defaultCurrency: string;
  defaultTaxRate: number | '';
  remarks: string;
  salesOrg: string;
  reconciliationAccount: string;
  taxCode: string;
}

const emptyForm = (code: string): FormState => ({
  code,
  name: '',
  shortName: '',
  type: 'direct',
  status: 'active',
  creditLevel: '',
  creditLimit: '',
  usedCredit: 0,
  settlementTermDays: 0,
  taxId: '',
  invoiceTitle: '',
  invoiceAddress: '',
  invoicePhone: '',
  bankName: '',
  bankAccount: '',
  bankAccountName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  defaultCurrency: 'CNY',
  defaultTaxRate: 13,
  remarks: '',
  salesOrg: '',
  reconciliationAccount: '',
  taxCode: '',
});

const CustomerForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const customers = useCustomerStore((s) => s.customers);
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const existing = useCustomerStore((s) => (id ? s.customers.find((c) => c.id === id) : undefined));

  const nextCode = useMemo(
    () => `C${getNextSequence(customers.map((c) => c.code), 'C', 3)}`,
    [customers]
  );

  const [form, setForm] = useState<FormState>(() => {
    if (existing) {
      return {
        code: existing.code,
        name: existing.name,
        shortName: existing.shortName || '',
        type: existing.type,
        status: existing.status,
        creditLevel: existing.creditLevel || '',
        creditLimit: existing.creditLimit != null ? String(existing.creditLimit) : '',
        usedCredit: existing.usedCredit || 0,
        settlementTermDays: existing.settlementTermDays ?? 0,
        taxId: existing.taxId || '',
        invoiceTitle: existing.invoiceTitle || '',
        invoiceAddress: existing.invoiceAddress || '',
        invoicePhone: existing.invoicePhone || '',
        bankName: existing.bankName || '',
        bankAccount: existing.bankAccount || '',
        bankAccountName: existing.bankAccountName || '',
        contactName: existing.contactName || '',
        contactPhone: existing.contactPhone || '',
        contactEmail: existing.contactEmail || '',
        address: existing.address || '',
        defaultCurrency: existing.defaultCurrency || 'CNY',
        defaultTaxRate: existing.defaultTaxRate ?? 13,
        remarks: existing.remarks || '',
        salesOrg: existing.salesOrg || '',
        reconciliationAccount: existing.reconciliationAccount || '',
        taxCode: existing.taxCode || '',
      };
    }
    return emptyForm(nextCode);
  });

  const [error, setError] = useState('');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError('客户名称（企业全称）为必填项');
      return;
    }
    const creditLimitNum = form.creditLimit === '' ? undefined : Number(form.creditLimit);
    if (form.creditLimit !== '' && (Number.isNaN(creditLimitNum!) || creditLimitNum! < 0)) {
      setError('授信额度必须为非负数字');
      return;
    }

    const base: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> = {
      code: form.code,
      name: form.name.trim(),
      shortName: form.shortName.trim() || undefined,
      type: form.type,
      status: form.status,
      creditLevel: form.creditLevel || undefined,
      creditLimit: creditLimitNum,
      usedCredit: isEdit ? form.usedCredit : 0,
      settlementTermDays: form.settlementTermDays,
      taxId: form.taxId.trim() || undefined,
      invoiceTitle: form.invoiceTitle.trim() || undefined,
      invoiceAddress: form.invoiceAddress.trim() || undefined,
      invoicePhone: form.invoicePhone.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      bankAccountName: form.bankAccountName.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      address: form.address.trim() || undefined,
      defaultCurrency: form.defaultCurrency,
      defaultTaxRate: form.defaultTaxRate === '' ? undefined : form.defaultTaxRate,
      remarks: form.remarks.trim() || undefined,
      salesOrg: form.salesOrg.trim() || undefined,
      reconciliationAccount: form.reconciliationAccount.trim() || undefined,
      taxCode: form.taxCode.trim() || undefined,
    };

    if (isEdit && existing) {
      updateCustomer(existing.id, { ...base, updatedAt: stamp() });
      navigate(`/sales/customers/${existing.id}`);
    } else {
      const newCustomer: Customer = {
        ...base,
        id: genId('cus'),
        createdAt: stamp(),
        updatedAt: stamp(),
        createdBy: '当前用户',
        updatedBy: '当前用户',
      };
      addCustomer(newCustomer);
      navigate(`/sales/customers/${newCustomer.id}`);
    }
  };

  return (
    <PageWrapper
      title={isEdit ? `编辑客户 - ${form.code}` : '新建客户'}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/sales/customers')}>
            取消
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSubmit}>
            保存
          </Button>
        </Stack>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>基础信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="客户编码" value={form.code} disabled
              helperText={isEdit ? '编码不可修改' : '自动生成'} />
          </Grid>
          <Grid item xs={8}>
            <TextField fullWidth required size="small" label="客户名称（企业全称）" value={form.name}
              onChange={(e) => set('name', e.target.value)} />
          </Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="简称" value={form.shortName} onChange={(e) => set('shortName', e.target.value)} /></Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>客户类型</InputLabel>
              <Select value={form.type} label="客户类型" onChange={(e) => set('type', e.target.value as CustomerType)}>
                {CUSTOMER_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>状态</InputLabel>
              <Select value={form.status} label="状态" onChange={(e) => set('status', e.target.value as CustomerStatus)}>
                {CUSTOMER_STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>信用等级</InputLabel>
              <Select value={form.creditLevel} label="信用等级" onChange={(e) => set('creditLevel', e.target.value as CreditLevel | '')}>
                <MenuItem value=""><em>未评定</em></MenuItem>
                {CREDIT_LEVEL_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="授信额度" type="number" value={form.creditLimit}
            onChange={(e) => set('creditLimit', e.target.value)} InputProps={{ inputProps: { min: 0 } }} /></Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>账期</InputLabel>
              <Select value={form.settlementTermDays} label="账期" onChange={(e) => set('settlementTermDays', e.target.value as number)}>
                {SETTLEMENT_TERM_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>联系人 / 地址</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}><TextField fullWidth size="small" label="联系人" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="联系电话" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="邮箱" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="地址" value={form.address} onChange={(e) => set('address', e.target.value)} /></Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>开票信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}><TextField fullWidth size="small" label="纳税人识别号" value={form.taxId} onChange={(e) => set('taxId', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="发票抬头" value={form.invoiceTitle} onChange={(e) => set('invoiceTitle', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="开票电话" value={form.invoicePhone} onChange={(e) => set('invoicePhone', e.target.value)} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="开票地址" value={form.invoiceAddress} onChange={(e) => set('invoiceAddress', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="开户银行" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="开户名称" value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} /></Grid>
          <Grid item xs={4}><TextField fullWidth size="small" label="银行账号" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} /></Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>组织与会计</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="销售组织" value={form.salesOrg}
              onChange={(e) => set('salesOrg', e.target.value)}
              inputProps={{ 'data-testid': 'cf-sales-org' }} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="统驭科目" value={form.reconciliationAccount}
              onChange={(e) => set('reconciliationAccount', e.target.value)}
              inputProps={{ 'data-testid': 'cf-recon-account' }} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="税码" value={form.taxCode}
              onChange={(e) => set('taxCode', e.target.value)}
              inputProps={{ 'data-testid': 'cf-tax-code' }} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>默认交易选项</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>结算币种</InputLabel>
              <Select value={form.defaultCurrency} label="结算币种" onChange={(e) => set('defaultCurrency', e.target.value)}>
                {CURRENCY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth size="small">
              <InputLabel>默认税率</InputLabel>
              <Select value={form.defaultTaxRate} label="默认税率" onChange={(e) => set('defaultTaxRate', e.target.value as number | '')}>
                <MenuItem value={''}><em>不预设</em></MenuItem>
                {TAX_RATE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" multiline minRows={2} label="备注" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </Grid>
        </Grid>
      </Paper>
    </PageWrapper>
  );
};

export default CustomerForm;

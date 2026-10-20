import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Stepper, Step, StepLabel, StepContent,
  TextField, Grid, Chip, FormControl, InputLabel, Select, MenuItem,
  Divider, Alert, Stack, IconButton, Tooltip, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, FormHelperText,
} from '@mui/material';
import {
  Business, ContactPage, AccountBalance, AttachFile,
  Add, Delete, Send, ArrowBack, ArrowForward, CheckCircle,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { VendorApplication } from '@/types';

const steps = [
  { label: '企业基本信息', icon: <Business /> },
  { label: '联系人信息', icon: <ContactPage /> },
  { label: '供货能力', icon: <Business /> },
  { label: '银行与资质', icon: <AccountBalance /> },
  { label: '附件上传', icon: <AttachFile /> },
];

const VendorRegister: React.FC = () => {
  const navigate = useNavigate();
  const addVendorApplication = useFlowStore((s) => s.addVendorApplication);
  const [activeStep, setActiveStep] = useState(0);
  const [appNo, setAppNo] = useState('');
  const [form, setForm] = useState({
    // Step 0 企业基本信息
    companyName: '',
    unifiedCode: '',
    businessLicense: '',
    legalRepresentative: '',
    registeredCapital: '',
    establishedDate: '',
    companyType: '',
    address: '',
    website: '',
    // Step 1 联系人
    contact: '',
    contactPhone: '',
    contactEmail: '',
    contactPosition: '',
    // Step 2 供货能力
    supplyCategories: [] as string[],
    mainProducts: '',
    annualRevenue: '',
    employeeCount: '',
    productionArea: '',
    certifications: [] as string[],
    // Step 3 银行与资质
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    taxId: '',
    taxRate: '13',
    qualificationExpiry: '',
    // Step 4 备注
    remarks: '',
    // 组织与会计
    salesOrg: '',
    reconciliationAccount: '',
    taxCode: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const categoryOptions = ['钢材', '有色金属', '紧固件', '五金工具', '电气元件', '电子元器件',
    '机械零件', '精密加工件', '化工材料', '包装材料', '劳保用品', '办公用品', '设备配件', '服务类'];
  const certOptions = ['ISO9001', 'ISO14001', 'IATF16949', 'CE认证', 'CCC认证', 'RoHS认证', 'SGS认证'];

  const update = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleArray = (k: 'supplyCategories' | 'certifications', v: string) => {
    setForm(f => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v],
    }));
  };

  if (submitted) {
    return (
      <PageWrapper title="供应商注册">
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid rgba(226,232,240,.8)', borderRadius: 3 }}>
          <CheckCircle sx={{ fontSize: 64, color: '#10B981', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>注册申请已提交！</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            您的供应商注册申请已成功提交，申请编号：<strong>VA{new Date().toISOString().slice(0,10).replace(/-/g,'')}001</strong><br />
            我们将在 3-5 个工作日内完成审核，审核结果将通过邮件通知您。
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => navigate('/vendor/list')}>查看供应商列表</Button>
            <Button variant="contained" onClick={() => { setSubmitted(false); setActiveStep(0); }}>重新提交</Button>
          </Stack>
        </Paper>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="供应商注册申请"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="vendor-registration" currentStatus="vr_submitted" />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/vendor/list')}>
          返回列表
          </Button>
        </Box>
      }
    >
      <Grid container spacing={3}>
        {/* 左侧步骤条 */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, position: 'sticky', top: 80 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: '#475569' }}>填写步骤</Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((s, i) => (
                <Step key={s.label}>
                  <StepLabel
                    StepIconProps={{ sx: { fontSize: 22 } }}
                    sx={{ cursor: i <= activeStep ? 'pointer' : 'default' }}
                    onClick={() => i <= activeStep && setActiveStep(i)}
                  >
                    <Typography variant="body2" fontWeight={activeStep === i ? 600 : 400}>
                      {s.label}
                    </Typography>
                  </StepLabel>
                  <StepContent />
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>

        {/* 右侧表单 */}
        <Grid item xs={12} md={9}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
            {/* ── Step 0 企业基本信息 ── */}
            {activeStep === 0 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>企业基本信息</Typography>
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
                  请如实填写企业信息，与营业执照保持一致，信息将用于资质审核。
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField fullWidth size="small" label="企业全称 *" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="统一社会信用代码 *" value={form.unifiedCode} onChange={(e) => update('unifiedCode', e.target.value)} inputProps={{ style: { fontFamily: 'monospace' } }} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="营业执照号" value={form.businessLicense} onChange={(e) => update('businessLicense', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="法定代表人 *" value={form.legalRepresentative} onChange={(e) => update('legalRepresentative', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="注册资本（万元）" type="number" value={form.registeredCapital} onChange={(e) => update('registeredCapital', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="成立日期" type="date" InputLabelProps={{ shrink: true }} value={form.establishedDate} onChange={(e) => update('establishedDate', e.target.value)} /></Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>企业类型</InputLabel>
                      <Select value={form.companyType} label="企业类型" onChange={(e) => update('companyType', e.target.value)}>
                        {['生产商', '贸易商', '代理商', '服务商', '其他'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth size="small" label="注册地址 *" value={form.address} onChange={(e) => update('address', e.target.value)} /></Grid>
                  <Grid item xs={12}><TextField fullWidth size="small" label="企业官网" value={form.website} onChange={(e) => update('website', e.target.value)} /></Grid>
                </Grid>
              </>
            )}

            {/* ── Step 1 联系人 ── */}
            {activeStep === 1 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>联系人信息</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}><TextField fullWidth size="small" label="联系人姓名 *" value={form.contact} onChange={(e) => update('contact', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="职位" value={form.contactPosition} onChange={(e) => update('contactPosition', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="联系电话 *" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="联系邮箱 *" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></Grid>
                </Grid>
              </>
            )}

            {/* ── Step 2 供货能力 ── */}
            {activeStep === 2 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>供货能力</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>供货类目（可多选）</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                      {categoryOptions.map(c => (
                        <Chip key={c} label={c} size="small"
                          color={form.supplyCategories.includes(c) ? 'primary' : 'default'}
                          onClick={() => toggleArray('supplyCategories', c)}
                          sx={{ cursor: 'pointer' }} />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth size="small" label="主要产品 *" multiline rows={2} value={form.mainProducts} onChange={(e) => update('mainProducts', e.target.value)} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="年销售额（万元）" value={form.annualRevenue} onChange={(e) => update('annualRevenue', e.target.value)} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="员工人数" type="number" value={form.employeeCount} onChange={(e) => update('employeeCount', e.target.value)} /></Grid>
                  <Grid item xs={4}><TextField fullWidth size="small" label="生产面积（㎡）" type="number" value={form.productionArea} onChange={(e) => update('productionArea', e.target.value)} /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>已获得认证</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                      {certOptions.map(c => (
                        <Chip key={c} label={c} size="small"
                          color={form.certifications.includes(c) ? 'success' : 'default'}
                          onClick={() => toggleArray('certifications', c)}
                          sx={{ cursor: 'pointer' }} />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </>
            )}

            {/* ── Step 3 银行与资质 ── */}
            {activeStep === 3 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>银行与财税信息</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}><TextField fullWidth size="small" label="开户银行 *" value={form.bankName} onChange={(e) => update('bankName', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="银行账号 *" value={form.bankAccount} onChange={(e) => update('bankAccount', e.target.value)} inputProps={{ style: { fontFamily: 'monospace' } }} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="账户名称 *" value={form.bankAccountName} onChange={(e) => update('bankAccountName', e.target.value)} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="纳税人识别号" value={form.taxId} onChange={(e) => update('taxId', e.target.value)} inputProps={{ style: { fontFamily: 'monospace' } }} /></Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>增值税税率</InputLabel>
                      <Select value={form.taxRate} label="增值税税率" onChange={(e) => update('taxRate', e.target.value)}>
                        {['13', '9', '6', '3', '0'].map(r => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="资质有效期" type="date" InputLabelProps={{ shrink: true }} value={form.qualificationExpiry} onChange={(e) => update('qualificationExpiry', e.target.value)} /></Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>组织与会计</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="采购组织" value={form.salesOrg}
                      onChange={(e) => update('salesOrg', e.target.value)}
                      inputProps={{ 'data-testid': 'vr-sales-org' }} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="统驭科目" value={form.reconciliationAccount}
                      onChange={(e) => update('reconciliationAccount', e.target.value)}
                      inputProps={{ 'data-testid': 'vr-recon-account' }} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="税码" value={form.taxCode}
                      onChange={(e) => update('taxCode', e.target.value)}
                      inputProps={{ 'data-testid': 'vr-tax-code' }} />
                  </Grid>
                </Grid>
              </>
            )}

            {/* ── Step 4 附件 ── */}
            {activeStep === 4 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>附件上传</Typography>
                <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8125rem' }}>
                  请上传以下必要文件：营业执照副本（必填）、质量认证证书（如有）、银行开户许可证（如有）
                </Alert>
                {[
                  { label: '营业执照副本 *', key: 'license', required: true },
                  { label: '质量认证证书', key: 'cert', required: false },
                  { label: '银行开户许可证', key: 'bank', required: false },
                  { label: '其他资质文件', key: 'other', required: false },
                ].map(f => (
                  <Box key={f.key} sx={{ mb: 2, p: 2, border: '2px dashed rgba(226,232,240,.8)', borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                    '&:hover': { borderColor: '#3B82F6', bgcolor: '#EFF6FF' } }}>
                    <AttachFile sx={{ fontSize: 24, color: '#94A3B8', mb: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">{f.label}</Typography>
                    <Typography variant="caption" color="text.secondary">点击或拖拽上传 PDF/JPG/PNG，单文件≤10MB</Typography>
                  </Box>
                ))}
                <TextField fullWidth size="small" label="补充说明" multiline rows={3}
                  value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
              </>
            )}

            {/* 底部按钮 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button variant="outlined" disabled={activeStep === 0} onClick={() => setActiveStep(s => s - 1)} startIcon={<ArrowBack />}>上一步</Button>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={() => setActiveStep(s => s + 1)} endIcon={<ArrowForward />}>下一步</Button>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" color="success" startIcon={<Send />} onClick={() => {
                  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
                  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                  const applicationNo = `VA${dateStr}${Math.floor(Math.random() * 900 + 100)}`;
                  const newApp: VendorApplication = {
                    id: `app-${Date.now()}`,
                    applicationNo,
                    companyName: form.companyName || '未命名供应商',
                    unifiedCode: form.unifiedCode,
                    businessLicense: form.businessLicense,
                    legalRepresentative: form.legalRepresentative,
                    registeredCapital: form.registeredCapital,
                    contact: form.contact,
                    contactPhone: form.contactPhone,
                    contactEmail: form.contactEmail,
                    address: form.address,
                    supplyCategories: form.supplyCategories,
                    mainProducts: form.mainProducts,
                    annualRevenue: form.annualRevenue,
                    certifications: form.certifications,
                    bankName: form.bankName,
                    bankAccount: form.bankAccount,
                    bankAccountName: form.bankAccountName,
                    attachments: [],
                    status: 'submitted',
                    submittedAt: now,
                    createdAt: now,
                    updatedAt: now,
                  };
                  addVendorApplication(newApp);
                  setAppNo(applicationNo);
                  setSubmitted(true);
                }}>提交注册申请</Button>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default VendorRegister;

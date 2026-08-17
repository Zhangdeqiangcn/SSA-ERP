/**
 * 供应商门户 — 自助注册页
 * 路由：/vendor-portal/register
 * 独立页面，不在 VendorPortalLayout 内（未注册用户无登录态）
 * 提交后写入 flowStore.vendorApplications → 进入审批流程
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography, Stepper, Step, StepLabel,
  Grid, Chip, FormControl, InputLabel, Select, MenuItem,
  Alert, Stack, IconButton, CircularProgress, Divider,
} from '@mui/material';
import {
  Business, ContactPage, AccountBalance, AttachFile,
  ArrowBack, ArrowForward, Send, CheckCircle, Login,
  Visibility, VisibilityOff, HowToReg,
} from '@mui/icons-material';
import { useFlowStore } from '@/stores/flowStore';

const REG_STEPS = [
  { label: '企业基本信息', icon: <Business /> },
  { label: '联系人信息', icon: <ContactPage /> },
  { label: '供货能力', icon: <Business /> },
  { label: '银行与财税', icon: <AccountBalance /> },
  { label: '附件与提交', icon: <AttachFile /> },
];

const CATEGORY_OPTIONS = [
  '钢材', '有色金属', '紧固件', '五金工具', '电气元件', '电子元器件',
  '机械零件', '精密加工件', '化工材料', '包装材料', '劳保用品',
  '办公用品', '设备配件', '服务类',
];
const CERT_OPTIONS = [
  'ISO9001', 'ISO14001', 'IATF16949', 'CE认证', 'CCC认证', 'RoHS认证', 'SGS认证',
];

/** 暗色主题 TextField 统一样式 */
const darkFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#E2E8F0',
    '& fieldset': { borderColor: 'rgba(100,116,139,0.5)' },
    '&:hover fieldset': { borderColor: '#3B82F6' },
    '&.Mui-focused fieldset': { borderColor: '#3B82F6' },
  },
  '& .MuiInputLabel-root': { color: '#94A3B8' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3B82F6' },
  '& .MuiSelect-icon': { color: '#94A3B8' },
};

const VendorPortalRegister: React.FC = () => {
  const navigate = useNavigate();
  const addVendorApp = useFlowStore((s) => s.addVendorApplication);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appNo, setAppNo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // Step 0 企业基本信息
    companyName: '',
    unifiedCode: '',
    businessLicense: '',
    legalRepresentative: '',
    registeredCapital: '',
    companyType: '',
    address: '',
    // Step 1 联系人
    contact: '',
    contactPhone: '',
    contactEmail: '',
    // Step 2 供货能力
    supplyCategories: [] as string[],
    mainProducts: '',
    annualRevenue: '',
    certifications: [] as string[],
    // Step 3 银行
    bankName: '',
    bankAccount: '',
    bankAccountName: '',
    taxId: '',
    taxRate: '13',
    // Step 4 备注
    remarks: '',
  });

  const update = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArray = (k: 'supplyCategories' | 'certifications', v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v] }));

  /** 校验当前步骤必填项 */
  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (activeStep === 0) {
      if (!form.companyName.trim()) e.companyName = '请填写企业全称';
      if (!form.unifiedCode.trim()) e.unifiedCode = '请填写统一社会信用代码';
      if (!form.legalRepresentative.trim()) e.legalRepresentative = '请填写法定代表人';
      if (!form.address.trim()) e.address = '请填写注册地址';
    }
    if (activeStep === 1) {
      if (!form.contact.trim()) e.contact = '请填写联系人姓名';
      if (!form.contactPhone.trim()) e.contactPhone = '请填写联系电话';
      if (!form.contactEmail.trim() || !/^\S+@\S+\.\S+$/.test(form.contactEmail)) e.contactEmail = '请填写有效邮箱';
    }
    if (activeStep === 2) {
      if (!form.mainProducts.trim()) e.mainProducts = '请填写主要产品';
    }
    if (activeStep === 3) {
      if (!form.bankName.trim()) e.bankName = '请填写开户银行';
      if (!form.bankAccount.trim()) e.bankAccount = '请填写银行账号';
      if (!form.bankAccountName.trim()) e.bankAccountName = '请填写账户名称';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setActiveStep((s) => s + 1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (!validateStep()) return;
    setLoading(true);
    // 模拟异步提交
    setTimeout(() => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const no = `VA${dateStr}${String(Math.floor(Math.random() * 900 + 100)).padStart(3, '0')}`;
      addVendorApp({
        id: `vpa-${Date.now()}`,
        applicationNo: no,
        companyName: form.companyName.trim(),
        unifiedCode: form.unifiedCode.trim(),
        businessLicense: form.businessLicense.trim(),
        legalRepresentative: form.legalRepresentative.trim(),
        registeredCapital: form.registeredCapital,
        contact: form.contact.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        address: form.address.trim(),
        supplyCategories: form.supplyCategories,
        mainProducts: form.mainProducts.trim(),
        annualRevenue: form.annualRevenue,
        certifications: form.certifications,
        bankName: form.bankName.trim(),
        bankAccount: form.bankAccount.trim(),
        bankAccountName: form.bankAccountName.trim(),
        taxId: form.taxId.trim(),
        taxRate: form.taxRate,
        attachments: [],
        status: 'submitted',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
        currentStep: 0,
        stepHistory: [{ step: 0, role: 'supplier', label: '提交申请', action: 'submit', at: now }],
      });
      setAppNo(no);
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  // ── 已提交：成功页 ──
  if (submitted) {
    return (
      <Box sx={{
        minHeight: '100vh', bgcolor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.12) 0%, transparent 60%)',
        }} />
        <Paper sx={{
          position: 'relative', zIndex: 1, p: 5, borderRadius: 3, maxWidth: 520, width: '100%', mx: 2,
          border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(30,41,59,0.9)',
          backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', textAlign: 'center',
        }}>
          <CheckCircle sx={{ fontSize: 64, color: '#10B981', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', mb: 1 }}>
            注册申请已提交！
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>
            您的供应商准入申请已成功提交
          </Typography>
          <Paper sx={{ display: 'inline-block', px: 3, py: 1.5, my: 2, borderRadius: 2,
            bgcolor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
          }}>
            <Typography variant="caption" sx={{ color: '#64748B' }}>申请编号</Typography><br />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#3B82F6', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {appNo}
            </Typography>
          </Paper>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 2, mb: 3 }}>
            我们将在 3-5 个工作日内完成资质审核、现场考察及综合评审。<br />
            审核结果将通过邮件通知您，您也可以联系采购部门查询进度。
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" startIcon={<Login />}
              onClick={() => navigate('/vendor-portal/login')}
              sx={{ borderColor: 'rgba(100,116,139,0.5)', color: '#CBD5E1', '&:hover': { borderColor: '#3B82F6', bgcolor: 'rgba(59,130,246,0.08)' } }}
            >
              返回登录
            </Button>
            <Button variant="contained" onClick={() => { setSubmitted(false); setActiveStep(0); }}
              sx={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', borderRadius: 2 }}
            >
              继续注册
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ── 主表单 ──
  const renderField = (field: string, label: string, opts?: { type?: string; select?: boolean; options?: string[]; rows?: number; required?: boolean }) => {
    const value = (form as any)[field];
    const err = errors[field];
    if (opts?.select) {
      return (
        <FormControl fullWidth size="small" error={!!err}>
          <InputLabel>{label}</InputLabel>
          <Select value={value || ''} label={label} onChange={(e) => update(field, e.target.value)} sx={darkFieldSx}>
            {(opts.options || []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
          {err && <Typography variant="caption" color="error">{err}</Typography>}
        </FormControl>
      );
    }
    return (
      <TextField fullWidth size="small" label={label} type={opts?.type || 'text'}
        value={value || ''} onChange={(e) => update(field, e.target.value)}
        multiline={!!opts?.rows} rows={opts?.rows} error={!!err} helperText={err}
        InputProps={{ ...(opts?.type === 'number' ? {} : {}), style: opts?.type === undefined ? {} : {} }}
        inputProps={{ style: ['unifiedCode', 'bankAccount', 'taxId'].includes(field) ? { fontFamily: 'monospace' } : {} }}
        InputLabelProps={{ shrink: opts?.type === 'date' ? true : undefined }}
        sx={darkFieldSx}
      />
    );
  };

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: '#0F172A',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.1) 0%, transparent 50%)',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, px: 2 }}>
        {/* 头部 */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HowToReg sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1 }}>供应商注册</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', letterSpacing: '0.05em' }}>SSA ERP 供应商协同门户</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            填写以下信息完成供应商准入申请，提交后将进入审核流程
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {/* 左侧步骤条 */}
          <Grid item xs={12} md={3}>
            <Paper elevation={0} sx={{
              p: 2, borderRadius: 2, position: 'sticky', top: 16,
              border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(30,41,59,0.85)',
            }}>
              <Stepper activeStep={activeStep} orientation="vertical" sx={{ '& .MuiStepLabel-label': { color: '#94A3B8 !important' } }}>
                {REG_STEPS.map((s, i) => (
                  <Step key={s.label}>
                    <StepLabel
                      StepIconProps={{ sx: { fontSize: 22 } }}
                      sx={{ cursor: i <= activeStep ? 'pointer' : 'default' }}
                      onClick={() => i <= activeStep && setActiveStep(i)}
                    >
                      <Typography variant="body2" fontWeight={activeStep === i ? 600 : 400}
                        sx={{ color: activeStep === i ? '#E2E8F0' : '#94A3B8' }}>
                        {s.label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Divider sx={{ my: 2, borderColor: 'rgba(100,116,139,0.3)' }} />
              <Button size="small" startIcon={<ArrowBack />} component={Link} to="/vendor-portal/login"
                sx={{ color: '#64748B', fontSize: '0.75rem' }}>
                返回登录
              </Button>
            </Paper>
          </Grid>

          {/* 右侧表单 */}
          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(30,41,59,0.85)',
            }}>

              {/* Step 0 企业基本信息 */}
              {activeStep === 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#E2E8F0', mb: 1 }}>企业基本信息</Typography>
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem', '& .MuiAlert-message': { fontSize: '0.8125rem' } }}>
                    请如实填写企业信息，与营业执照保持一致。标 * 为必填。
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>{renderField('companyName', '企业全称 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('unifiedCode', '统一社会信用代码 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('businessLicense', '营业执照号')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('legalRepresentative', '法定代表人 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('registeredCapital', '注册资本（万元）', { type: 'number' })}</Grid>
                    <Grid item xs={12} sm={6}>
                      {renderField('companyType', '企业类型', { select: true, options: ['生产商', '贸易商', '代理商', '服务商', '其他'] })}
                    </Grid>
                    <Grid item xs={12}>{renderField('address', '注册地址 *')}</Grid>
                  </Grid>
                </>
              )}

              {/* Step 1 联系人 */}
              {activeStep === 1 && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#E2E8F0', mb: 1 }}>联系人信息</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>{renderField('contact', '联系人姓名 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('contactPhone', '联系电话 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('contactEmail', '联系邮箱 *', { type: 'email' })}</Grid>
                  </Grid>
                </>
              )}

              {/* Step 2 供货能力 */}
              {activeStep === 2 && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#E2E8F0', mb: 1 }}>供货能力</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>供货类目（可多选）</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {CATEGORY_OPTIONS.map((c) => (
                          <Chip key={c} label={c} size="small"
                            color={form.supplyCategories.includes(c) ? 'primary' : 'default'}
                            onClick={() => toggleArray('supplyCategories', c)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>{renderField('mainProducts', '主要产品 *', { rows: 2 })}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('annualRevenue', '年销售额（万元）')}</Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>已获得认证（可多选）</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {CERT_OPTIONS.map((c) => (
                          <Chip key={c} label={c} size="small"
                            color={form.certifications.includes(c) ? 'success' : 'default'}
                            onClick={() => toggleArray('certifications', c)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </>
              )}

              {/* Step 3 银行与财税 */}
              {activeStep === 3 && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#E2E8F0', mb: 1 }}>银行与财税信息</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>{renderField('bankName', '开户银行 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('bankAccount', '银行账号 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('bankAccountName', '账户名称 *')}</Grid>
                    <Grid item xs={12} sm={6}>{renderField('taxId', '纳税人识别号')}</Grid>
                    <Grid item xs={12} sm={6}>
                      {renderField('taxRate', '增值税税率', { select: true, options: ['13', '9', '6', '3', '0'] })}
                    </Grid>
                  </Grid>
                </>
              )}

              {/* Step 4 附件与提交 */}
              {activeStep === 4 && (
                <>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#E2E8F0', mb: 1 }}>附件与提交</Typography>
                  <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8125rem', '& .MuiAlert-message': { fontSize: '0.8125rem' } }}>
                    请准备好以下文件备查：营业执照副本、质量体系认证证书、银行开户许可证。正式环境将支持在线上传。
                  </Alert>
                  {[
                    { label: '营业执照副本 *', desc: 'PDF/JPG/PNG，单文件≤10MB' },
                    { label: '质量认证证书', desc: 'ISO9001 / IATF16949 等' },
                    { label: '银行开户许可证', desc: '基本户开户证明' },
                    { label: '其他资质文件', desc: '行业许可证等' },
                  ].map((f) => (
                    <Box key={f.label} sx={{
                      mb: 1.5, p: 2, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                      border: '2px dashed rgba(100,116,139,0.4)', bgcolor: 'rgba(15,23,42,0.5)',
                      transition: 'all 0.15s', '&:hover': { borderColor: '#3B82F6', bgcolor: 'rgba(59,130,246,0.06)' },
                    }}>
                      <AttachFile sx={{ fontSize: 22, color: '#64748B', mb: 0.5 }} />
                      <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{f.label}</Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>{f.desc}</Typography>
                    </Box>
                  ))}
                  <TextField fullWidth size="small" label="补充说明" multiline rows={2}
                    value={form.remarks} onChange={(e) => update('remarks', e.target.value)}
                    sx={{ mt: 1, ...darkFieldSx }}
                    InputProps={{ sx: { color: '#E2E8F0' } }}
                  />
                </>
              )}

              {/* 底部导航按钮 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button variant="outlined" disabled={activeStep === 0}
                  onClick={() => { setActiveStep((s) => s - 1); setErrors({}); }}
                  startIcon={<ArrowBack />}
                  sx={{ borderColor: 'rgba(100,116,139,0.5)', color: '#CBD5E1',
                    '&:hover': { borderColor: '#3B82F6', bgcolor: 'rgba(59,130,246,0.08)' } }}
                >上一步</Button>

                {activeStep < REG_STEPS.length - 1 ? (
                  <Button variant="contained" onClick={handleNext} endIcon={<ArrowForward />}
                    sx={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)', borderRadius: 2 }}
                  >下一步</Button>
                ) : (
                  <Button variant="contained" color="success" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
                    disabled={loading} onClick={handleSubmit}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >{loading ? '提交中...' : '提交注册申请'}</Button>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* 底部版权 */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#334155', mt: 2 }}>
          SSA ERP V2.27 · 钢材供应链管理平台 · &copy; 2026
        </Typography>
      </Box>
    </Box>
  );
};

export default VendorPortalRegister;

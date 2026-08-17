/**
 * 供应商门户 —— 供应商资料管理
 * 路由：/vendor-portal/profile
 * 供应商维护自己的资料，甲方确认的信息（账期/评级等）只读
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Divider,
  TextField, Alert, Snackbar, IconButton, Tabs, Tab, Card,
  CardContent, Avatar, InputAdornment, Tooltip, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
} from '@mui/material';
import {
  Person, Business, Article, AccountBalance, Receipt, VerifiedUser,
  Save, Edit, CloudUpload, Download, Add, Delete, CheckCircle,
  Cancel, Lock, Info, Warning, Description, Image,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { formatDate } from '@/utils/format';
import { useVendorStore } from '@/stores/vendorStore';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';

// ── 供应商资料数据结构 ──────────────────────────────────
interface VendorProfile {
  // ── 基础资料（供应商可编辑）──
  companyName: string;
  shortName: string;
  unifiedCode: string;
  businessLicense: string;
  legalRepresentative: string;
  registeredCapital: string;
  establishedDate: string;
  companyType: string;
  address: string;
  website: string;
  contact: string;
  contactPhone: string;
  contactEmail: string;
  emergencyContact: string;
  emergencyPhone: string;
  supplyCategories: string[];
  mainProducts: string;
  annualRevenue: string;
  employeeCount: string;

  // ── 证书资质（供应商可管理）──
  certifications: { id: string; name: string; certNo: string; issuingAuthority: string; issueDate: string; expiryDate: string; fileUrl: string }[];

  // ── 银行资料（供应商可编辑）──
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  bankBranch: string;
  swiftCode: string;

  // ── 开票资料（供应商可编辑）──
  invoiceTitle: string;
  taxId: string;
  invoiceAddress: string;
  invoicePhone: string;
  invoiceBank: string;
  invoiceBankAccount: string;

  // ── 甲方确认信息（只读）────────────
  buyerConfirmed: {
    accountPeriod: string;      // 账期
    creditLimit: string;        // 信用额度
    rating: string;             // 评级
    ratingDate: string;
    approvedStatus: string;     // 准入状态
    approvedDate: string;
    contractStart: string;
    contractEnd: string;
    qualityScore: string;       // 质量评分
    deliveryScore: string;      // 交付评分
    assignedCategories: string[]; // 分配供货品类
    remarks: string;
    confirmedBy: string;
    confirmedAt: string;
  };
}

// ── 默认资料（模拟供应商「钢铁联合集团」数据）──────────
const DEFAULT_PROFILE: VendorProfile = {
  companyName: '钢铁联合集团',
  shortName: '钢铁联合',
  unifiedCode: '91310000MA1FLXXXXX',
  businessLicense: 'SH-2015-123456',
  legalRepresentative: '陈志远',
  registeredCapital: '5000万元人民币',
  establishedDate: '2015-03-15',
  companyType: '有限责任公司',
  address: '上海市宝山区宝钢路100号',
  website: 'https://www.ironunion.com',
  contact: '张建国',
  contactPhone: '13800138001',
  contactEmail: 'zhangjg@ironunion.com',
  emergencyContact: '李明辉',
  emergencyPhone: '13800138002',
  supplyCategories: ['钢材', '板材', '型材', '管材'],
  mainProducts: '热轧钢板 Q235B、H型钢 Q345B、冷轧板 SPCC、镀锌板 DX51D',
  annualRevenue: '12亿元',
  employeeCount: '500-1000人',

  certifications: [
    { id: 'cert-1', name: 'ISO 9001:2015 质量管理体系', certNo: 'ISO9001-2023-001234', issuingAuthority: 'SGS通标标准技术服务有限公司', issueDate: '2023-01-15', expiryDate: '2026-01-14', fileUrl: '/uploads/certs/iso9001.pdf' },
    { id: 'cert-2', name: 'ISO 14001:2015 环境管理体系', certNo: 'ISO14001-2023-005678', issuingAuthority: '中国质量认证中心', issueDate: '2023-02-20', expiryDate: '2026-02-19', fileUrl: '/uploads/certs/iso14001.pdf' },
    { id: 'cert-3', name: 'OHSAS 18001 职业健康安全', certNo: 'OHS-2023-009012', issuingAuthority: '德国莱茵TÜV', issueDate: '2022-06-10', expiryDate: '2025-06-09', fileUrl: '/uploads/certs/ohsas.pdf' },
  ],

  bankName: '中国工商银行上海宝山支行',
  bankAccount: '6222031234567890001',
  bankAccountName: '钢铁联合集团',
  bankBranch: '上海市宝山区宝钢路50号',
  swiftCode: 'ICBKCNBJBJG',

  invoiceTitle: '钢铁联合集团',
  taxId: '91310000MA1FLXXXXX',
  invoiceAddress: '上海市宝山区宝钢路100号',
  invoicePhone: '021-56667890',
  invoiceBank: '中国工商银行上海宝山支行',
  invoiceBankAccount: '6222031234567890001',

  // 甲方确认的信息 —— 供应商不可编辑
  buyerConfirmed: {
    accountPeriod: '月结60天',
    creditLimit: '¥500万元',
    rating: 'A级',
    ratingDate: '2024-01-15',
    approvedStatus: '已准入',
    approvedDate: '2023-05-10',
    contractStart: '2024-01-01',
    contractEnd: '2024-12-31',
    qualityScore: '96.5分',
    deliveryScore: '94.2分',
    assignedCategories: ['钢材', '板材', '型材'],
    remarks: '年度框架协议供应商，享受优先采购权',
    confirmedBy: '采购部主管 — 王采购',
    confirmedAt: '2024-01-15 10:00:00',
  },
};

/**
 * B5-T4：以供应商主数据（vendorStore）为基线合成门户展示资料
 * 主数据字段优先，主数据没有的演示字段沿用 DEFAULT_PROFILE；
 * 若此前已在门户提交过待审资料（profilePending），则叠加显示待审值。
 */
const buildProfileFromMaster = (vendorId: string): VendorProfile => {
  const vendor = useVendorStore.getState().vendors.find(v => v.id === vendorId);
  if (!vendor) return DEFAULT_PROFILE;
  const pending = (vendor.profilePending || {}) as Partial<VendorProfile>;
  const base: VendorProfile = {
    ...DEFAULT_PROFILE,
    companyName: vendor.name,
    shortName: vendor.shortName || DEFAULT_PROFILE.shortName,
    unifiedCode: vendor.taxId || DEFAULT_PROFILE.unifiedCode,
    contact: vendor.contact || DEFAULT_PROFILE.contact,
    contactPhone: vendor.phone || DEFAULT_PROFILE.contactPhone,
    contactEmail: vendor.email || DEFAULT_PROFILE.contactEmail,
    address: vendor.address || DEFAULT_PROFILE.address,
    bankAccount: vendor.bankAccount || DEFAULT_PROFILE.bankAccount,
    bankAccountName: vendor.name,
    invoiceTitle: vendor.name,
    taxId: vendor.taxId || DEFAULT_PROFILE.taxId,
    invoiceBankAccount: vendor.bankAccount || DEFAULT_PROFILE.invoiceBankAccount,
    buyerConfirmed: {
      ...DEFAULT_PROFILE.buyerConfirmed,
      creditLimit: vendor.creditLimit != null ? `¥${vendor.creditLimit.toLocaleString('zh-CN')}` : DEFAULT_PROFILE.buyerConfirmed.creditLimit,
      rating: vendor.creditLevel || (vendor.rating != null ? `${vendor.rating} 分` : DEFAULT_PROFILE.buyerConfirmed.rating),
      approvedStatus: vendor.status === 'approved' ? '已准入' : vendor.status === 'blacklisted' ? '已拉黑' : '审核中',
    },
  };
  // 待审资料只覆盖供应商可编辑区，甲方确认信息始终以主数据为准
  const { buyerConfirmed: _ignored, ...editable } = pending as VendorProfile;
  return { ...base, ...editable, buyerConfirmed: base.buyerConfirmed };
};

// ── 主页面 ─────────────────────────────────────────────
const VendorProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const identity = getVendorPortalIdentity();
  const vendorId = identity?.vendorId || 'ven-001';
  const updateVendor = useVendorStore(s => s.updateVendor);
  const vendorRecord = useVendorStore(s => s.vendors.find(v => v.id === vendorId));

  const initial = React.useMemo(() => buildProfileFromMaster(vendorId), [vendorId]);
  const [profile, setProfile] = useState<VendorProfile>(initial);
  const [editing, setEditing] = useState(false);
  const [tabIdx, setTabIdx] = useState(0);
  const [snackbar, setSnackbar] = useState('');
  const [editCache, setEditCache] = useState<VendorProfile>(initial);

  useEffect(() => {
    const stored = sessionStorage.getItem('vendorPortalUser');
    if (!stored) navigate('/vendor-portal/login');
  }, [navigate]);

  const handleEdit = () => {
    setEditCache(JSON.parse(JSON.stringify(profile)));
    setEditing(true);
  };

  /**
   * B5-T4 门户资料回写主系统
   * 供应商侧修改不直接覆盖主数据，而是写入 vendor.profilePending 待审区，
   * 由甲方在「供应商列表」审核后并入主数据，符合主数据治理惯例。
   */
  const handleSave = () => {
    setProfile(editCache);
    setEditing(false);
    const { buyerConfirmed: _readonly, ...editable } = editCache;
    updateVendor(vendorId, {
      profilePending: editable as unknown as Record<string, unknown>,
      profilePendingAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      profilePendingBy: identity?.name || editCache.contact,
    });
    setSnackbar('资料已提交甲方审核，审核通过后并入供应商主数据');
  };

  const handleCancel = () => {
    setEditing(false);
    setEditCache(JSON.parse(JSON.stringify(profile)));
  };

  const updateField = (section: string, field: string, value: unknown) => {
    setEditCache(prev => {
      if (section === 'buyerConfirmed') return prev; // 不可编辑
      return { ...prev, [field]: value };
    });
  };

  const current = editing ? editCache : profile;

  // ── 渲染字段 ────────────────────────────────────────
  const renderField = (label: string, value: string, field?: string, section?: string, multiline = false) => (
    <Grid item xs={12} sm={6} md={section === 'buyerConfirmed' ? 4 : 6} key={label}>
      {editing && section !== 'buyerConfirmed' && field ? (
        <TextField
          fullWidth size="small" label={label} value={value}
          onChange={e => updateField(section!, field!, e.target.value)}
          multiline={multiline} rows={multiline ? 2 : 1}
        />
      ) : (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2 }}>
            {label}
          </Typography>
          <Typography variant="body2" fontWeight={500}>{value || '-'}</Typography>
        </Box>
      )}
    </Grid>
  );

  return (
    <PageWrapper title="供应商资料管理">
      {vendorRecord?.profilePendingAt && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="profile-pending-banner">
          资料变更已提交主系统待审（提交人：{vendorRecord.profilePendingBy || '-'} · {vendorRecord.profilePendingAt}），
          甲方审核通过后并入供应商主数据。
        </Alert>
      )}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* ── 顶栏 ──────────────────────────────────── */}
        <Box sx={{
          p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: '#3B82F6', width: 44, height: 44, fontWeight: 700 }}>
              {profile.companyName.slice(0, 1)}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={700}>{profile.companyName}</Typography>
                <Chip size="small" label={profile.buyerConfirmed.approvedStatus}
                  color="success" sx={{ fontWeight: 600 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                统一社会信用代码：{profile.unifiedCode} · 供应商代码：{vendorRecord?.code || identity?.code || '-'}
              </Typography>
            </Box>
          </Stack>
          {editing ? (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>取消</Button>
              <Button size="small" variant="outlined" onClick={() => alert('资料已暂存！（演示模式）')}>暂存</Button>
              <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSave}>保存</Button>
            </Stack>
          ) : (
            <Button size="small" variant="contained" startIcon={<Edit />} onClick={handleEdit}>编辑资料</Button>
          )}
        </Box>

        {/* ── 评分概要 ────────────────────────────────── */}
        <Grid container spacing={0}>
          {[
            { label: '综合评级', value: profile.buyerConfirmed.rating, color: '#10B981', icon: <VerifiedUser /> },
            { label: '账期', value: profile.buyerConfirmed.accountPeriod, color: '#3B82F6', icon: <AccountBalance /> },
            { label: '信用额度', value: profile.buyerConfirmed.creditLimit, color: '#6366F1', icon: <AccountBalance /> },
            { label: '质量评分', value: profile.buyerConfirmed.qualityScore, color: '#F59E0B', icon: <CheckCircle /> },
            { label: '交付评分', value: profile.buyerConfirmed.deliveryScore, color: '#10B981', icon: <CheckCircle /> },
          ].map(({ label, value, color, icon }) => (
            <Grid item xs={6} sm key={label}>
              <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #F1F5F9', textAlign: 'center' }}>
                <Box sx={{ color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{icon}</Box>
                <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ── Tab 导航 ────────────────────────────────── */}
        <Tabs
          value={tabIdx}
          onChange={(_, v) => setTabIdx(v)}
          sx={{ px: 2, borderBottom: '1px solid #E2E8F0' }}
          variant="scrollable"
        >
          <Tab icon={<Business />} iconPosition="start" label="基础资料" />
          <Tab icon={<Article />} iconPosition="start" label="证书资质" />
          <Tab icon={<AccountBalance />} iconPosition="start" label="银行资料" />
          <Tab icon={<Receipt />} iconPosition="start" label="开票资料" />
          <Tab icon={<Lock />} iconPosition="start" label="甲方确认信息" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabIdx === 0 && (
            <Grid container spacing={2}>
              {renderField('企业全称', current.companyName, 'companyName', 'basic')}
              {renderField('企业简称', current.shortName, 'shortName', 'basic')}
              {renderField('统一社会信用代码', current.unifiedCode, 'unifiedCode', 'basic')}
              {renderField('营业执照号', current.businessLicense, 'businessLicense', 'basic')}
              {renderField('法定代表人', current.legalRepresentative, 'legalRepresentative', 'basic')}
              {renderField('注册资本', current.registeredCapital, 'registeredCapital', 'basic')}
              {renderField('成立日期', current.establishedDate, 'establishedDate', 'basic')}
              {renderField('企业类型', current.companyType, 'companyType', 'basic')}
              {renderField('企业地址', current.address, 'address', 'basic')}
              {renderField('企业网址', current.website, 'website', 'basic')}
              {renderField('联系人', current.contact, 'contact', 'basic')}
              {renderField('联系电话', current.contactPhone, 'contactPhone', 'basic')}
              {renderField('联系邮箱', current.contactEmail, 'contactEmail', 'basic')}
              {renderField('紧急联系人', current.emergencyContact, 'emergencyContact', 'basic')}
              {renderField('紧急电话', current.emergencyPhone, 'emergencyPhone', 'basic')}
              <Grid item xs={12}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>供货品类</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {current.supplyCategories.map(cat => (
                      <Chip key={cat} label={cat} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              </Grid>
              {renderField('主营产品', current.mainProducts, 'mainProducts', 'basic', true)}
              {renderField('年营业额', current.annualRevenue, 'annualRevenue', 'basic')}
              {renderField('员工规模', current.employeeCount, 'employeeCount', 'basic')}
            </Grid>
          )}

          {tabIdx === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>证书资质</Typography>
              {editing && (
                <Button size="small" variant="outlined" startIcon={<Add />} sx={{ mb: 2, borderRadius: 2 }}>
                  上传新证书
                </Button>
              )}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 600 }}>证书名称</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>证书编号</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>颁发机构</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>颁发日期</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>到期日期</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {current.certifications.map(cert => {
                      const isExpired = new Date(cert.expiryDate) < new Date();
                      return (
                        <TableRow key={cert.id} hover sx={isExpired ? { bgcolor: '#FEF2F2' } : {}}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Description sx={{ color: isExpired ? '#EF4444' : '#3B82F6', fontSize: 18 }} />
                              <Typography variant="body2" fontWeight={500}>{cert.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{cert.certNo}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>{cert.issuingAuthority}</Typography>
                          </TableCell>
                          <TableCell>{formatDate(cert.issueDate)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color={isExpired ? 'error.main' : 'text.primary'}>
                              {formatDate(cert.expiryDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={isExpired ? <Cancel /> : <CheckCircle />}
                              label={isExpired ? '已过期' : '有效'}
                              size="small"
                              color={isExpired ? 'error' : 'success'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="查看文件"><IconButton size="small" color="primary"><Image fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="下载"><IconButton size="small" color="primary"><Download fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8125rem' }}>
                证书过期前请及时更新，避免影响供应商资格审核
              </Alert>
            </Box>
          )}

          {tabIdx === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="warning" icon={<Info />} sx={{ fontSize: '0.8125rem', mb: 1 }}>
                  银行资料用于付款结算，请确保信息准确。修改后将触发甲方财务重新审核。
                </Alert>
              </Grid>
              {renderField('银行名称', current.bankName, 'bankName', 'bank')}
              {renderField('银行账号', current.bankAccount, 'bankAccount', 'bank')}
              {renderField('账户名称', current.bankAccountName, 'bankAccountName', 'bank')}
              {renderField('开户支行', current.bankBranch, 'bankBranch', 'bank')}
              {renderField('SWIFT Code', current.swiftCode, 'swiftCode', 'bank')}
            </Grid>
          )}

          {tabIdx === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity="info" icon={<Receipt />} sx={{ fontSize: '0.8125rem', mb: 1 }}>
                  开票资料用于生成增值税发票，请确保与税务登记信息一致。
                </Alert>
              </Grid>
              {renderField('发票抬头', current.invoiceTitle, 'invoiceTitle', 'invoice')}
              {renderField('纳税人识别号', current.taxId, 'taxId', 'invoice')}
              {renderField('开票地址', current.invoiceAddress, 'invoiceAddress', 'invoice')}
              {renderField('开票电话', current.invoicePhone, 'invoicePhone', 'invoice')}
              {renderField('开票银行', current.invoiceBank, 'invoiceBank', 'invoice')}
              {renderField('开票银行账号', current.invoiceBankAccount, 'invoiceBankAccount', 'invoice')}
            </Grid>
          )}

          {tabIdx === 4 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Lock sx={{ color: '#64748B', fontSize: 18 }} />
                <Typography variant="subtitle1" fontWeight={600}>甲方确认信息</Typography>
                <Chip label="只读" size="small" color="default" variant="outlined" />
                <Box flex={1} />
                <Typography variant="caption" color="text.secondary">
                  确认人：{profile.buyerConfirmed.confirmedBy} · {profile.buyerConfirmed.confirmedAt}
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
                以下信息由甲方（采购方）确认，供应商不可修改。如有异议请联系采购负责人。
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="text.secondary">准入状态</Typography>
                    <Chip label={profile.buyerConfirmed.approvedStatus} color="success" size="small" sx={{ mt: 0.5 }} />
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="text.secondary">综合评级</Typography>
                    <Typography variant="h5" fontWeight={700} color="#3B82F6">{profile.buyerConfirmed.rating}</Typography>
                    <Typography variant="caption" color="text.secondary">评级日期：{profile.buyerConfirmed.ratingDate}</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="text.secondary">合同有效期</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {profile.buyerConfirmed.contractStart} ~ {profile.buyerConfirmed.contractEnd}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {renderField('账期', profile.buyerConfirmed.accountPeriod, undefined, 'buyerConfirmed')}
                {renderField('信用额度', profile.buyerConfirmed.creditLimit, undefined, 'buyerConfirmed')}
                {renderField('质量评分', profile.buyerConfirmed.qualityScore, undefined, 'buyerConfirmed')}
                {renderField('交付评分', profile.buyerConfirmed.deliveryScore, undefined, 'buyerConfirmed')}
                {renderField('准入日期', profile.buyerConfirmed.approvedDate, undefined, 'buyerConfirmed')}
                <Grid item xs={12}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>分配供货品类</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {profile.buyerConfirmed.assignedCategories.map(cat => (
                        <Chip key={cat} label={cat} size="small" color="primary" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                </Grid>
                {renderField('备注', profile.buyerConfirmed.remarks, undefined, 'buyerConfirmed')}
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        message={snackbar}
      />
    </PageWrapper>
  );
};

export default VendorProfilePage;

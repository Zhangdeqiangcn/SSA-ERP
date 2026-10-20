import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Paper, Alert, TextField, FormControl, InputLabel, Select, MenuItem, Chip, LinearProgress, Typography } from '@mui/material';
import type { LinearProgressProps } from '@mui/material';
import { Share } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, FileUpload, ConfirmDialog, DetailActions, SecureField } from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { notifyError } from '@/utils/notify';
import { useSettingsStore } from '@/stores/settingsStore';
import { useQualityStore } from '@/stores/qualityStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePriceStore } from '@/stores/priceStore';
import { formatDate, formatCurrency } from '@/utils/format';
import { VendorStatus, VendorType } from '@/types';
import { computeVendorRating, buildVendorRatingInput } from '@/utils/vendorRating';

const VendorDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = useVendorStore((s) => s.vendors.find((v) => v.id === id));
  const deleteVendor = useVendorStore((s) => s.deleteVendor);
  const updateVendor = useVendorStore((s) => s.updateVendor);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    shortName: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    type: 'manufacturer' as VendorType,
    status: 'approved' as VendorStatus,
    salesOrg: '',
    reconciliationAccount: '',
    taxCode: '',
  });

  if (!vendor) {
    return (
      <PageWrapper title="供应商详情">
        <Box>供应商不存在</Box>
      </PageWrapper>
    );
  }

  // 供应商绩效自动评级：实时聚合质量（来料检验）/交期（采购订单）/价格（价目表），无需人工干预
  const vendorRatingConfig = useSettingsStore((s) => s.vendorRatingConfig);
  const ratingInput = buildVendorRatingInput({
    inspectionTasks: useQualityStore.getState().inspectionTasks,
    purchaseOrders: usePurchaseStore.getState().purchaseOrders,
    priceList: usePriceStore.getState().priceList,
    vendorId: vendor.id,
  });
  const vendorRating = computeVendorRating(ratingInput, vendorRatingConfig);

  const RATING_GRADE_COLOR: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'default'> = {
    A: 'success',
    B: 'primary',
    C: 'warning',
    D: 'error',
    数据不足: 'default',
  };

  const openEdit = () => {
    setEditForm({
      name: vendor.name,
      shortName: vendor.shortName || '',
      contact: vendor.contact,
      phone: vendor.phone,
      email: vendor.email || '',
      address: vendor.address || '',
      type: vendor.type,
      status: vendor.status,
      salesOrg: vendor.salesOrg || '',
      reconciliationAccount: vendor.reconciliationAccount || '',
      taxCode: vendor.taxCode || '',
    });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    // 与后端 REQUIRED_CORE_FIELDS（vendor_master: code + name）对齐：name 必填，提交前拦截空值
    // （code 不在本编辑表单内，由记录自带、永不为空，按规则不拦截）
    if (!editForm.name.trim()) {
      notifyError('请填写「供应商名称」后再提交');
      return;
    }
    updateVendor(vendor.id, { ...editForm });
    setEditOpen(false);
  };

  const typeMap: Record<string, string> = {
    manufacturer: '生产商',
    trader: '贸易商',
    agent: '代理商',
  };

  const basicFields = [
    { label: '供应商编码', value: vendor.code },
    { label: '供应商名称', value: vendor.name },
    { label: '简称', value: vendor.shortName || '-' },
    { label: '类型', value: typeMap[vendor.type] },
    { label: '联系人', value: vendor.contact },
    { label: '电话', value: vendor.phone },
    { label: '邮箱', value: vendor.email || '-' },
    { label: '地址', value: vendor.address || '-' },
    { label: '状态', value: <StatusBadge status={vendor.status} /> },
    { label: '信用等级', value: vendor.creditLevel || '-' },
    { label: '评级', value: vendor.rating ? `${vendor.rating}星` : '-' },
    { label: '资质到期', value: formatDate(vendor.qualificationExpiry) },
    { label: '税号', value: vendor.taxId || '-' },
    { label: '银行账号', value: vendor.bankAccount || '-' },
  ];

  const operationLogs: Array<{
    id: string;
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'info';
    operator: string;
    time: string;
    description: string;
  }> = [
    { id: '1', action: 'create', operator: vendor.createdBy, time: vendor.createdAt, description: '注册供应商' },
    { id: '2', action: 'approve', operator: '李明', time: '2024-01-20 10:00:00', description: '审核通过' },
  ];

  const handleShare = () => {
    const text = `供应商 ${vendor.name}\n编码：${vendor.code}\n联系人：${vendor.contact}\n电话：${vendor.phone}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  const handleDelete = () => {
    deleteVendor(vendor.id);
    setDeleteDialog(false);
    navigate('/vendor/list');
  };

  // 供应商绩效自动评级（聚合质量/交期/价格，实时计算）
  const ratingBlock = vendorRatingConfig.enabled ? (
    <Box data-testid="vendor-rating">
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
        供应商绩效评级
        {vendorRating.score !== null && (
          <Chip
            size="small"
            sx={{ ml: 1.5, fontWeight: 700 }}
            color={RATING_GRADE_COLOR[vendorRating.grade]}
            label={`${vendorRating.grade} 级 · ${vendorRating.score} 分`}
          />
        )}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {vendorRating.score === null ? (
          <Alert severity="info">暂无足够的检验/订单/价目表数据，无法评级。</Alert>
        ) : (
          <Stack spacing={1.5}>
            {vendorRating.indicators.map((ind) => (
              <Box key={ind.key}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{ind.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ind.value !== null ? `${ind.value} 分` : '无数据'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ind.value ?? 0}
                  color={RATING_GRADE_COLOR[vendorRating.grade] as LinearProgressProps['color']}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  ) : null;

  // 信用状态（只读展示：已用 / 授信上限，超额或 ≥90% 红色告警）
  const creditBlock = (
    <Box>
      <DetailSection
        fields={[
          {
            label: '授信额度',
            value: <SecureField module="vendor" fieldName="creditLimit">{vendor.creditLimit != null ? formatCurrency(vendor.creditLimit) : '未授信'}</SecureField>,
          },
          {
            label: '已用信用',
            value: <SecureField module="vendor" fieldName="creditLimit">{vendor.usedCredit != null ? formatCurrency(vendor.usedCredit) : '-'}</SecureField>,
          },
        ]}
      />
      <Box data-testid="credit-status" sx={{ mt: 2 }}>
        {(() => {
          const limit = vendor.creditLimit;
          const used = vendor.usedCredit || 0;
          if (limit == null || limit <= 0) {
            return <Chip size="small" label="未授信" variant="outlined" color="default" />;
          }
          const ratio = used / limit;
          const over = used > limit || ratio >= 0.9;
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.round(ratio * 100))}
                sx={{
                  width: 160, height: 8, borderRadius: 3,
                  '& .MuiLinearProgress-bar': { bgcolor: over ? '#EF4444' : '#10B981' },
                }}
              />
              <Chip
                size="small"
                label={over ? '信用超额' : '信用正常'}
                color={over ? 'error' : 'success'}
              />
            </Stack>
          );
        })()}
      </Box>
    </Box>
  );

  const sections = [
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    ...(ratingBlock ? [{ id: 'rating', title: '供应商评级', content: ratingBlock }] : []),
    { id: 'credit', title: '信用状态', content: creditBlock },
    {
      id: 'org',
      title: '组织与会计',
      content: (
        <DetailSection
          fields={[
            { label: '采购组织', value: vendor.salesOrg || '-' },
            { label: '统驭科目', value: vendor.reconciliationAccount || '-' },
            { label: '税码', value: vendor.taxCode || '-' },
          ]}
          columns={2}
        />
      ),
    },
    {
      id: 'qualification',
      title: '资质文件',
      content: (
        <Box>
          <DetailSection fields={[]} />
          <FileUpload multiple />
        </Box>
      ),
    },
    ...(vendor.blacklistReason
      ? [{
          id: 'blacklist',
          title: '黑名单记录',
          content: (
            <DetailSection
              fields={[
                { label: '加入时间', value: formatDate(vendor.blacklistedAt) },
                { label: '原因', value: vendor.blacklistReason },
              ]}
            />
          ),
        }]
      : []),
    { id: 'logs', title: '操作日志', content: <OperationTimeline title="操作日志" events={operationLogs} /> },
  ];

  return (
    <>
      <ObjectPage
        title={vendor.code}
        subtitle={vendor.name}
        breadcrumbs={[{ label: '供应商列表', path: '/vendor/list' }]}
        status={<StatusBadge status={vendor.status} />}
        headerFields={[
          { label: '类型', value: typeMap[vendor.type] },
          { label: '联系人', value: vendor.contact },
          { label: '电话', value: vendor.phone },
          { label: '信用等级', value: vendor.creditLevel || '-' },
          { label: '评级', value: vendor.rating ? `${vendor.rating}星` : '-' },
        ]}
        actions={
          <DetailActions
            entity="vendor"
            record={vendor}
            onBack={() => navigate('/vendor/list')}
            onEdit={openEdit}
            onDelete={() => setDeleteDialog(true)}
            extra={[
              { key: 'share', label: '分享', icon: <Share />, onClick: handleShare },
            ]}
          />
        }
        sections={sections}
      />

      <ConfirmDialog
        open={deleteDialog}
        title="确认删除"
        content={`确定删除供应商"${vendor.name}"吗？此操作不可撤销。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑供应商 - {vendor.code}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* 与后端 REQUIRED_CORE_FIELDS（vendor_master: code + name）对齐：name 为必填可见输入框，标记 required */}
            <Grid item xs={12}><TextField fullWidth size="small" required label="供应商名称" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="简称" value={editForm.shortName} onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>类型</InputLabel>
                <Select value={editForm.type} label="类型" onChange={(e) => setEditForm({ ...editForm, type: e.target.value as VendorType })}>
                  <MenuItem value="manufacturer">生产商</MenuItem>
                  <MenuItem value="trader">贸易商</MenuItem>
                  <MenuItem value="agent">代理商</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="联系人" value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="电话" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="邮箱" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="地址" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select value={editForm.status} label="状态" onChange={(e) => setEditForm({ ...editForm, status: e.target.value as VendorStatus })}>
                  <MenuItem value="registered">已注册</MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                  <MenuItem value="approved">已批准</MenuItem>
                  <MenuItem value="rejected">已拒绝</MenuItem>
                  <MenuItem value="blacklisted">黑名单</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="采购组织" value={editForm.salesOrg} onChange={(e) => setEditForm({ ...editForm, salesOrg: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="统驭科目" value={editForm.reconciliationAccount} onChange={(e) => setEditForm({ ...editForm, reconciliationAccount: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="税码" value={editForm.taxCode} onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleEditSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="分享内容已复制到剪贴板"
      />
    </>
  );
};

export default VendorDetail;

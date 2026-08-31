import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Stack, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Paper, Alert, Chip, LinearProgress, Typography, Link,
} from '@mui/material';
import { Share } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, ConfirmDialog, DetailActions, SecureField } from '@/components/common';
import { useCustomerStore } from '@/stores/customerStore';
import { useSalesStore } from '@/stores/salesStore';
import { CustomerStatus, CustomerType, CreditLevel } from '@/types';
import {
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CREDIT_LEVEL_OPTIONS,
} from '@/constants/options';
import { formatDate, formatCurrency } from '@/utils/format';

const labelOf = (
  options: { value: string; label: string }[],
  value?: string
): string => options.find((o) => o.value === value)?.label || value || '-';

const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customers.find((c) => c.id === id));
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer);
  const salesOrders = useSalesStore((s) => s.salesOrders);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const linkedOrders = useMemo(
    () => (customer ? salesOrders.filter((o) => o.customerId === customer.id) : []),
    [salesOrders, customer]
  );
  const linkedAmount = useMemo(
    () => linkedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
    [linkedOrders]
  );

  if (!customer) {
    return (
      <PageWrapper title="客户详情">
        <Box>客户不存在</Box>
      </PageWrapper>
    );
  }

  const limit = customer.creditLimit;
  const used = customer.usedCredit || 0;
  const available = limit != null ? Math.max(0, limit - used) : undefined;
  const ratio = limit != null && limit > 0 ? used / limit : 0;
  const over = limit != null && (used > limit || ratio >= 0.9);

  const typeMap = Object.fromEntries(CUSTOMER_TYPE_OPTIONS.map((o) => [o.value, o.label]));
  const statusMap = Object.fromEntries(CUSTOMER_STATUS_OPTIONS.map((o) => [o.value, o.label]));

  const basicFields = [
    { label: '客户编码', value: customer.code },
    { label: '客户名称', value: customer.name },
    { label: '简称', value: customer.shortName || '-' },
    { label: '类型', value: typeMap[customer.type] },
    { label: '状态', value: <StatusBadge status={customer.status} /> },
    { label: '信用等级', value: customer.creditLevel || '-' },
    { label: '账期', value: customer.settlementTermDays != null ? `${customer.settlementTermDays} 天` : '-' },
    { label: '联系人', value: customer.contactName || '-' },
    { label: '联系电话', value: customer.contactPhone || '-' },
    { label: '邮箱', value: customer.contactEmail || '-' },
    { label: '地址', value: customer.address || '-' },
    { label: '默认币种', value: customer.defaultCurrency || '-' },
    { label: '默认税率', value: customer.defaultTaxRate != null ? `${customer.defaultTaxRate}%` : '-' },
    { label: '备注', value: customer.remarks || '-' },
  ];

  const invoiceFields = [
    { label: '纳税人识别号', value: customer.taxId || '-' },
    { label: '发票抬头', value: customer.invoiceTitle || '-' },
    { label: '开票地址', value: customer.invoiceAddress || '-' },
    { label: '开票电话', value: customer.invoicePhone || '-' },
    { label: '开户银行', value: customer.bankName || '-' },
    { label: '开户名称', value: customer.bankAccountName || '-' },
    { label: '银行账号', value: customer.bankAccount || '-' },
  ];

  const orgFields = [
    { label: '销售组织', value: customer.salesOrg || '-' },
    { label: '统驭科目', value: customer.reconciliationAccount || '-' },
    { label: '税码', value: customer.taxCode || '-' },
  ];

  const creditBlock = (
    <Box>
      <DetailSection
        fields={[
          { label: '授信额度', value: <SecureField module="customer" fieldName="creditLimit">{limit != null ? formatCurrency(limit) : '未授信'}</SecureField> },
          { label: '已用信用', value: <SecureField module="customer" fieldName="creditLimit">{formatCurrency(used)}</SecureField> },
          { label: '可用信用', value: <SecureField module="customer" fieldName="creditLimit">{available != null ? formatCurrency(available) : '-'}</SecureField> },
        ]}
      />
      <Box data-testid="credit-status" sx={{ mt: 2 }}>
        {limit == null || limit <= 0 ? (
          <Chip size="small" label="未授信" variant="outlined" color="default" />
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.round(ratio * 100))}
              sx={{
                width: 200, height: 8, borderRadius: 3,
                '& .MuiLinearProgress-bar': { bgcolor: over ? '#EF4444' : '#10B981' },
              }}
            />
            <Chip size="small" label={over ? '信用超额' : '信用正常'} color={over ? 'error' : 'success'} />
          </Stack>
        )}
      </Box>
    </Box>
  );

  const linkedOrdersBlock = (
    <Box>
      {linkedOrders.length === 0 ? (
        <Alert severity="info">暂无关联销售订单。在「销售订单」中通过选择客户即可建立关联。</Alert>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            共 {linkedOrders.length} 笔订单，价税合计 {formatCurrency(linkedAmount)}
          </Typography>
          {linkedOrders.map((o) => (
            <Link
              key={o.id}
              component="button"
              variant="body2"
              onClick={() => navigate(`/sales/orders/${o.id}`)}
              sx={{ textAlign: 'left' }}
            >
              {o.orderNo} · {o.customerName} · {formatCurrency(o.grandTotal)} · {o.status}
            </Link>
          ))}
        </Stack>
      )}
    </Box>
  );

  const operationLogs = [
    { id: '1', action: 'create' as const, operator: customer.createdBy || '系统', time: customer.createdAt, description: '创建客户主数据' },
    { id: '2', action: 'update' as const, operator: customer.updatedBy || '系统', time: customer.updatedAt, description: '最近更新' },
  ];

  const handleShare = () => {
    const text = `客户 ${customer.name}\n编码：${customer.code}\n联系人：${customer.contactName || '-'}\n电话：${customer.contactPhone || '-'}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  const handleDelete = () => {
    if (linkedOrders.length > 0) {
      setDeleteDialog(false);
      setSnackbar(false);
      return;
    }
    deleteCustomer(customer.id);
    setDeleteDialog(false);
    navigate('/sales/customers');
  };

  const sections = [
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    { id: 'credit', title: '信用状态', content: creditBlock },
    { id: 'invoice', title: '开票信息', content: <DetailSection fields={invoiceFields} columns={2} /> },
    { id: 'org', title: '组织与会计', content: <DetailSection fields={orgFields} columns={2} /> },
    { id: 'orders', title: '关联销售订单', content: linkedOrdersBlock },
    { id: 'logs', title: '操作日志', content: <OperationTimeline title="操作日志" events={operationLogs} /> },
  ];

  return (
    <>
      <ObjectPage
        title={customer.code}
        subtitle={customer.name}
        breadcrumbs={[{ label: '客户列表', path: '/sales/customers' }]}
        status={<StatusBadge status={customer.status} />}
        headerFields={[
          { label: '类型', value: typeMap[customer.type] },
          { label: '联系人', value: customer.contactName || '-' },
          { label: '电话', value: customer.contactPhone || '-' },
          { label: '信用等级', value: customer.creditLevel || '-' },
          { label: '可用信用', value: <SecureField module="customer" fieldName="creditLimit">{available != null ? formatCurrency(available) : '未授信'}</SecureField> },
        ]}
        actions={
          <DetailActions
            entity="customer"
            record={customer}
            onBack={() => navigate('/sales/customers')}
            onEdit={() => navigate(`/sales/customers/${customer.id}/edit`)}
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
        content={`确定删除客户"${customer.name}"吗？此操作不可撤销。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="分享内容已复制到剪贴板"
      />
    </>
  );
};

export default CustomerDetail;

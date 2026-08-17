import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Divider, Alert, Stack, Tooltip, Snackbar,
} from '@mui/material';
import {
  ArrowBack, Edit, Delete, Share,
  LinkOutlined, OpenInNew, ContentCopy, AccountTree,
} from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import type { ObjectPageSection } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, ConfirmDialog, FlowTracker, PrintPreviewButton, DataTable } from '@/components/common';
import { AttachmentUploader } from '@/components/common';
import ApprovalFlow, { ApprovalNode } from '@/components/common/ApprovalFlow';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useBOMStore } from '@/stores/bomStore';
import { formatDate, formatCurrency } from '@/utils/format';

const statusLabels: Record<string, string> = {
  draft: '草稿', confirmed: '已确认', in_production: '生产中',
  partial_shipped: '部分发货', fully_shipped: '已发货', completed: '已完成', cancelled: '已取消',
};

const statusToFlowNode: Record<string, string> = {
  draft: 'so_draft',
  confirmed: 'so_confirmed',
  in_production: 'so_production',
  partial_shipped: 'so_shipping',
  fully_shipped: 'so_shipped',
  completed: 'so_completed',
  cancelled: 'so_completed',
};

const buildApprovalNodes = (status: string): ApprovalNode[] => [
  { id: 'n1', role: '销售员提交', approver: '陈伟', status: 'approved', time: '2024-06-10 09:00' },
  { id: 'n2', role: '销售总监审批', approver: '李明', status: ['confirmed', 'in_production', 'partial_shipped', 'fully_shipped', 'completed'].includes(status) ? 'approved' : 'pending', time: ['confirmed', 'in_production', 'partial_shipped', 'fully_shipped', 'completed'].includes(status) ? '2024-06-10 14:00' : undefined, comment: '确认合同条款，同意' },
  { id: 'n3', role: '财务确认', approver: '财务部', status: ['in_production', 'partial_shipped', 'fully_shipped', 'completed'].includes(status) ? 'approved' : 'waiting', time: ['in_production', 'partial_shipped', 'fully_shipped', 'completed'].includes(status) ? '2024-06-11 10:00' : undefined },
  { id: 'n4', role: '生产排期', approver: '生产部', status: ['partial_shipped', 'fully_shipped', 'completed'].includes(status) ? 'approved' : status === 'in_production' ? 'pending' : 'waiting' },
  { id: 'n5', role: '完成', approver: undefined, status: status === 'completed' ? 'approved' : 'waiting' },
];

const SalesOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const salesOrders = useSalesStore(s => s.salesOrders);
  const { bomList, addBOM } = useBOMStore();
  const { deleteSalesOrder } = useSalesStore();
  const order = salesOrders.find(o => o.id === id);
  const customer = useCustomerStore(s => (order?.customerId ? s.customers.find(c => c.id === order.customerId) : undefined));
  const applyCreditDelta = useCustomerStore(s => s.applyCreditDelta);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  if (!order) {
    return (
      <PageWrapper title="销售订单详情">
        <Alert severity="warning">销售订单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  // B1：本单尚未释放的客户信用占用（兼容 A3 存量单据：非草稿即视为已占用）
  const soCreditOutstanding = order.creditOccupied
    ? (order.creditAmount ?? order.grandTotal ?? 0)
    : order.status !== 'draft' && order.status !== 'cancelled' && order.customerId
      ? (order.grandTotal ?? 0)
      : 0;

  const canEdit = ['draft'].includes(order.status);
  // 是否可发货：生产中/部分发货/已发货/已完成 视为已进入发货阶段
  const canShip = ['in_production', 'partial_shipped', 'fully_shipped', 'completed'].includes(order.status);

  const handleShare = () => {
    const shareText = `销售订单 ${order.orderNo}\n客户：${order.customerName}\n金额：${formatCurrency(order.grandTotal)}\n状态：${order.status}`;
    navigator.clipboard.writeText(shareText).then(() => setSnackbar(true));
  };

  // ── 从销售订单创建BOM ──
  const handleCreateBOM = () => {
    // 检查是否已有BOM（按来源销售订单号判重，避免重复创建）
    const existingBOM = bomList.find(b => b.sourceOrderNo === order.orderNo);
    if (existingBOM) {
      alert(`已存在BOM（${existingBOM.bomNo}），将跳转到编辑页面`);
      navigate(`/bom/${existingBOM.id}/edit`);
      return;
    }

    // 取第一个物料作为产品
    const firstItem = order.items?.[0];
    if (!firstItem) {
      alert('销售订单中没有物料明细，无法创建BOM');
      return;
    }

    const now = new Date().toISOString();
    const seq = String(Date.now()).slice(-6);
    const bomId = `bom-so-${Date.now()}`;
    const bomNo = `BOM-${seq}`;
    const productName = firstItem.materialName || order.customerName + '产品';
    const productCode = firstItem.materialCode || `PRD-${seq}`;

    addBOM({
      id: bomId,
      bomNo,
      name: `${productName} EBOM`,
      type: 'EBOM',
      status: 'draft',
      productId: firstItem.materialId,
      productCode,
      productName,
      version: 'V1.0',
      effectiveDate: now.split('T')[0],
      currency: 'CNY',
      description: `从销售订单 ${order.orderNo} 创建`,
      sourceOrderNo: order.orderNo,
      createdAt: now,
      updatedAt: now,
      items: [{
        id: `bomi-so-0`,
        bomId,
        level: 0,
        sequence: 1,
        materialId: firstItem.materialId,
        materialCode: productCode,
        materialName: productName,
        materialSpec: firstItem.specification || '',
        unit: firstItem.unit || '件',
        quantity: 1,
        scrapRate: 0,
        unitCost: firstItem.unitPrice || 0,
        totalCost: firstItem.amount || 0,
        leadTime: 7,
        source: 'manufacture',
        isCritical: true,
      }],
    });

    navigate(`/bom/${bomId}/edit`);
  };

  const basicFields = [
    { label: '订单号', value: <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip label={order.orderNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} />
        <Tooltip title="复制"><ContentCopy sx={{ fontSize: 14, color: '#94A3B8', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(order.orderNo)} /></Tooltip>
      </Box>
    },
    { label: '订单类型', value: { standard: '标准订单', sample: '样品订单', maintenance: '维修订单' }[order.type] },
    { label: '状态', value: <StatusBadge status={order.status} /> },
    { label: '客户名称', value: customer ? (
      <Typography component="button" variant="body2" onClick={() => navigate(`/sales/customers/${customer.id}`)}
        sx={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', p: 0, textAlign: 'left' }}>
        {order.customerName} ↗
      </Typography>
    ) : order.customerName },
    { label: '客户代码', value: order.customerCode || '-' },
    { label: '联系人', value: order.contactName || '-' },
    { label: '联系电话', value: order.contactPhone || '-' },
    { label: '关联项目', value: order.projectName ? `${order.projectNo} - ${order.projectName}` : '-' },
    { label: '关联合同', value: order.contractNo ? (
      <Typography component="button" variant="body2" onClick={() => navigate(`/sales/contracts/${order.contractId}`)}
        sx={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', p: 0, textAlign: 'left' }}>
        {order.contractNo} ↗
      </Typography>
    ) : '-' },
    { label: '销售员', value: order.salesPerson },
    { label: '下单日期', value: formatDate(order.orderDate) },
    { label: '预计交货', value: formatDate(order.expectedDeliveryDate) },
    { label: '实际交货', value: order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : '-' },
    { label: '付款条款', value: order.paymentTerms || '-' },
    { label: '贸易条款', value: order.tradeTerms || '-' },
    { label: '质量标准', value: order.qualityStandard || '-' },
    { label: '收货地址', value: order.deliveryAddress || '-' },
    { label: '发货方式', value: (() => {
      if (order.shippingMode === 'direct_ship') return `直接发运（${order.directShipVendorName || order.directShipVendorId || '—'}）`;
      if (order.shippingMode === 'third_party') return `三方销售（${order.thirdPartyCompanyName || '—'}）`;
      return order.shippingMode === 'standard' ? '标准发货' : (order.shippingMode || '标准发货');
    })() },
    { label: '送达方地址', value: order.shipToAddress || '-' },
    { label: '备注', value: order.remarks || '-' },
    { label: '创建时间', value: formatDate(order.createdAt) },
  ];

  const approvalNodes = buildApprovalNodes(order.status);

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: order.createdBy, time: order.createdAt, description: '创建销售订单' },
    ...(order.approvalRecords?.map((r, i) => ({
      id: `op-apr-${i}`, action: r.action === 'approve' ? 'approve' as const : 'reject' as const,
      operator: r.approver, time: r.operatedAt,
      description: `${r.nodeName}：${r.action === 'approve' ? '审批通过' : '拒绝'}${r.comments ? ' - ' + r.comments : ''}`,
    })) || []),
  ];

  // ── 单据流转关联 ──
  const linksBlock = (
    <Box sx={{ p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #86EFAC' }}>
      <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, display: 'block', mb: 1 }}>
        <LinkOutlined sx={{ fontSize: 14, mr: 0.5 }} />单据流转关联
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {order.linkedWorkOrders?.map(wo => (
          <Chip
            key={wo.workOrderId}
            label={`🏭 生产工单 (${wo.workOrderNo})`}
            size="small" variant="filled" color="primary"
            onClick={() => navigate(`/production/orders/${wo.workOrderId}`)}
            icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
            sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
          />
        ))}
        {order.contractId && (
          <Chip
            label={`📄 销售合同 (${order.contractNo})`}
            size="small" variant="outlined" color="secondary"
            onClick={() => navigate(`/sales/contracts/${order.contractId}`)}
            icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
            sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
          />
        )}
        <Chip
          label={`🚚 物流发货`}
          size="small" variant={canShip ? 'filled' : 'outlined'} color={canShip ? 'success' : 'default'}
          onClick={() => navigate('/sales/logistics')}
          icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
          sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
        />
        <Chip
          label={`💰 开票结算`}
          size="small" variant="outlined"
          onClick={() => navigate('/finance/invoices')}
          icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
          sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
        />
      </Box>
    </Box>
  );

  // ── 金额汇总 ──
  const amountBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>金额汇总</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">货款合计</Typography>
          <Typography variant="h6" fontWeight={700} color="primary">{formatCurrency(order.totalAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">税额 ({order.taxRate}%)</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{formatCurrency(order.taxAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">价税合计</Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(order.grandTotal)}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  // ── 附件（合同 / 技术协议 / 图纸）──
  const attachmentsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      {order.attachments && order.attachments.length > 0 ? (
        <AttachmentUploader
          label="附件（合同 / 技术协议 / 图纸）"
          value={order.attachments}
          onChange={() => { /* 详情页只读展示，编辑请在表单中进行 */ }}
          hint="详情页仅展示附件，编辑请点击「修改」进入表单。"
        />
      ) : (
        <Typography variant="body2" color="text.secondary">暂无附件</Typography>
      )}
    </Paper>
  );

  // ── 物料明细 ──
  const itemsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" fontWeight={600}>订单物料明细</Typography>
        <Typography variant="caption" color="text.secondary">共 {order.items.length} 项（支持排序/筛选/Ctrl+Y 块选复制）</Typography>
      </Box>
      <DataTable
        data={order.items}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          {
            id: 'materialCode',
            header: '物料编码',
            cell: ({ row }) => (
              <Chip label={row.original.materialCode} size="small"
                sx={{ fontSize: '0.75rem', bgcolor: '#F0FDF4', color: '#16A34A', fontFamily: 'monospace' }} />
            ),
          },
          { id: 'materialName', header: '物料名称', accessorKey: 'materialName',
            cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box> },
          { id: 'specification', header: '规格型号', accessorKey: 'specification',
            cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.specification}</Box> },
          { id: 'unit', header: '单位', accessorKey: 'unit',
            cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit}</Box> },
          { id: 'quantity', header: '数量', accessorKey: 'quantity',
            cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.quantity.toLocaleString()}</Box> },
          { id: 'unitPrice', header: '单价', accessorKey: 'unitPrice',
            cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box> },
          { id: 'amount', header: '金额', accessorKey: 'amount',
            cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>{formatCurrency(row.original.amount)}</Box> },
          { id: 'deliveryDate', header: '交货日期', accessorKey: 'deliveryDate',
            cell: ({ row }) => row.original.deliveryDate ? formatDate(row.original.deliveryDate) : '-' },
        ]}
      />
      <Divider />
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
        <Typography variant="body2" color="text.secondary">货款：{formatCurrency(order.totalAmount)}</Typography>
        <Typography variant="body2" color="text.secondary">税额：{formatCurrency(order.taxAmount)}</Typography>
        <Typography variant="body2" fontWeight={700}>价税合计：<span style={{ color: '#16A34A', fontSize: '1.05rem' }}>{formatCurrency(order.grandTotal)}</span></Typography>
      </Box>
    </Paper>
  );

  // ── 关联生产工单（条件） ──
  const workordersBlock = order.linkedWorkOrders?.length > 0 ? (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>关联生产工单</Typography>
      </Box>
      <DataTable
        data={order.linkedWorkOrders.map((wo) => ({ ...wo, id: wo.workOrderId }))}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          {
            id: 'workOrderNo',
            header: '工单号',
            cell: ({ row }) => (
              <Chip label={row.original.workOrderNo} size="small"
                sx={{ fontFamily: 'monospace', bgcolor: '#EFF6FF', color: '#1D4ED8' }} />
            ),
          },
          { id: 'productName', header: '产品名称', accessorKey: 'productName' },
          { id: 'quantity', header: '数量', accessorKey: 'quantity',
            cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
          {
            id: 'status',
            header: '状态',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
          },
          {
            id: 'actions',
            header: '操作',
            enableSorting: false,
            cell: ({ row }) => (
              <Button size="small" variant="text" startIcon={<OpenInNew />}
                onClick={() => navigate(`/production/orders/${row.original.workOrderId}`)}>查看工单</Button>
            ),
          },
        ]}
      />
    </Paper>
  ) : null;

  // ── 操作历史（条件） ──
  const logsBlock = operationLogs.length > 0 ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>操作历史</Typography>
      <OperationTimeline events={operationLogs} />
    </Box>
  ) : null;

  // ── 客户主数据（A3）──
  const customerBlock = customer ? (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>客户主数据</Typography>
        <Button size="small" variant="text" startIcon={<OpenInNew />}
          onClick={() => navigate(`/sales/customers/${customer.id}`)}>查看客户档案</Button>
      </Box>
      <DetailSection
        fields={[
          { label: '客户编码', value: customer.code },
          { label: '信用等级', value: customer.creditLevel || '-' },
          { label: '授信额度', value: customer.creditLimit != null ? formatCurrency(customer.creditLimit) : '未授信' },
          { label: '已用信用', value: formatCurrency(customer.usedCredit || 0) },
          { label: '可用信用', value: customer.creditLimit != null ? formatCurrency(Math.max(0, (customer.creditLimit || 0) - (customer.usedCredit || 0))) : '-' },
          { label: '账期', value: customer.settlementTermDays != null ? `${customer.settlementTermDays} 天` : '-' },
          { label: '纳税人识别号', value: customer.taxId || '-' },
          { label: '发票抬头', value: customer.invoiceTitle || '-' },
          { label: '开户银行', value: customer.bankName || '-' },
          { label: '银行账号', value: customer.bankAccount || '-' },
        ]}
        columns={2}
      />
    </Box>
  ) : (
    <Alert severity="info">本订单尚未关联客户主数据（历史订单）。新建/编辑订单并选择客户即可建立关联。</Alert>
  );

  const sections: ObjectPageSection[] = [
    { id: 'links', title: '单据流转', content: linksBlock },
    { id: 'approval', title: '审批流程', content: <ApprovalFlow nodes={approvalNodes} /> },
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
    { id: 'customer', title: '客户主数据', content: customerBlock },
    { id: 'amount', title: '金额汇总', content: amountBlock },
    { id: 'items', title: '物料明细', content: itemsBlock },
    { id: 'attachments', title: '附件', content: attachmentsBlock },
    ...(workordersBlock ? [{ id: 'workorders', title: '关联生产工单', content: workordersBlock }] : []),
    ...(logsBlock ? [{ id: 'logs', title: '操作历史', content: logsBlock }] : []),
  ];

  return (
    <>
      <ObjectPage
        title={order.orderNo}
        subtitle={order.customerName}
        breadcrumbs={[{ label: '销售订单列表', path: '/sales/orders' }]}
        status={<StatusBadge status={order.status} />}
        headerFields={[
          { label: '客户', value: order.customerName },
          { label: '价税合计', value: formatCurrency(order.grandTotal) },
          { label: '下单日期', value: formatDate(order.orderDate) },
          { label: '预计交货', value: formatDate(order.expectedDeliveryDate) },
          { label: '销售员', value: order.salesPerson },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <FlowTracker module="sales-order" currentStatus={statusToFlowNode[order.status] || 'so_draft'} documentNo={order.orderNo} />
            {canEdit && (
              <Button variant="outlined" startIcon={<Edit />}
                onClick={() => navigate(`/sales/orders/${id}/edit`)}>修改</Button>
            )}
            <Button variant="contained" color="primary" startIcon={<AccountTree />}
              onClick={handleCreateBOM}>创建BOM</Button>
            <PrintPreviewButton
              entity="salesOrder"
              record={{
                orderNo: order.orderNo,
                customerName: order.customerName,
                customerCode: order.customerCode,
                orderDate: order.orderDate,
                expectedDeliveryDate: order.expectedDeliveryDate,
                paymentTerms: order.paymentTerms,
                tradeTerms: order.tradeTerms,
                qualityStandard: order.qualityStandard,
                salesPerson: order.salesPerson,
                projectName: order.projectName,
                grandTotal: order.grandTotal,
                remarks: order.remarks,
                items: (order.items || []).map((it: any) => ({
                  materialCode: it.materialCode, materialName: it.materialName, specification: it.specification,
                  unit: it.unit, quantity: it.quantity, unitPrice: it.unitPrice, amount: it.amount, deliveryDate: it.deliveryDate,
                })),
              }}
              showBoth
            />
            <Button variant="outlined" color="error" startIcon={<Delete />}
              onClick={() => setDeleteDialog(true)}>删除</Button>
            <Button variant="outlined" startIcon={<Share />}
              onClick={handleShare}>分享</Button>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/sales/orders')}>返回</Button>
          </Stack>
        }
        sections={sections}
      />

      <ConfirmDialog
        open={deleteDialog}
        title="确认删除订单"
        content={
          soCreditOutstanding > 0
            ? `确定要删除销售订单 "${order.orderNo}" 吗？删除后将释放客户已占用的信用额度 ${formatCurrency(soCreditOutstanding)}。此操作不可逆。`
            : `确定要删除销售订单 "${order.orderNo}" 吗？此操作不可逆。`
        }
        onConfirm={() => {
          // B1 补 A3 闭环：删除销售订单前释放客户信用占用，避免额度只增不减
          if (soCreditOutstanding > 0 && order.customerId) {
            applyCreditDelta(order.customerId, -soCreditOutstanding);
          }
          deleteSalesOrder(order.id);
          navigate('/sales/orders');
          setDeleteDialog(false);
        }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        message="订单信息已复制到剪贴板"
      />
    </>
  );
};

export default SalesOrderDetail;

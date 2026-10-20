/**
 * 供应商报价单页面（供应商门户端）
 * 供应商在此查看待报价的询价单，并提交报价
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Stack, Button,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tabs, Tab, Grid,
  Badge,
} from '@mui/material';
import {
  Send, Visibility,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, FileUpload, FilePreviewModal, StatusBadge } from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { usePriceStore } from '@/stores/priceStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useVendorStore } from '@/stores/vendorStore';
import { PriceInquiry, VendorQuotation as IVendorQuotation } from '@/types';
import type { Attachment } from '@/types/common';
import { formatDate, formatCurrency } from '@/utils/format';
import { notify, notifyError, notifySuccess } from '@/utils/notify';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';
import { ColumnDef } from '@tanstack/react-table';

// 询价单状态 → 集中 statusConfig key（draft/published/compared/quotation_received 复用通用 key）
const VQ_STATUS_KEY: Record<string, string> = {
  draft: 'draft',
  published: 'published',
  closed: 'vq_closed',
  compared: 'compared',
  quotation_received: 'quotation_received',
};

// 未登录时的兜底供应商（演示环境直接打开页面）
const FALLBACK_VENDOR_ID = 'ven-001';
const FALLBACK_VENDOR_NAME = '上海宝钢钢铁贸易有限公司';

const VendorQuotation: React.FC = () => {
  const { priceInquiries, vendorQuotations, updatePriceInquiry, addVendorQuotation, updateVendorQuotation } = usePriceStore();
  const { vendorPortalConfig } = useSettingsStore();
  const checkVendorBlacklist = useVendorStore(s => s.checkVendorBlacklist);
  const vendors = useVendorStore(s => s.vendors);

  // B5-T5：统一身份源，替代原先硬编码 ven-001
  const identity = getVendorPortalIdentity();
  const CURRENT_VENDOR_ID = identity?.vendorId || FALLBACK_VENDOR_ID;
  const CURRENT_VENDOR_NAME = identity?.vendorName || FALLBACK_VENDOR_NAME;

  // B6：当前登录供应商的黑名单状态（页面横幅 + 按钮禁用 + 提交拦截共用）
  const selfBlacklist = useMemo(
    () => checkVendorBlacklist(CURRENT_VENDOR_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CURRENT_VENDOR_ID, vendors]
  );

  const [submitResult, setSubmitResult] = useState<{ quotationNo: string; totalAmount: number } | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedInquiry, setSelectedInquiry] = useState<PriceInquiry | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [quotationValidUntil, setQuotationValidUntil] = useState('');
  const [quotationPaymentTerms, setQuotationPaymentTerms] = useState('');
  const [quotationRemarks, setQuotationRemarks] = useState('');
  const [quotationDeliveryTerms, setQuotationDeliveryTerms] = useState('');
  const [inquiryAttachments, setInquiryAttachments] = useState<Attachment[]>([]);
  const [itemAttachments, setItemAttachments] = useState<Record<string, Attachment[]>>({});
  const [preview, setPreview] = useState<{ file: any; downloadAllowed: boolean } | null>(null);
  const [pendingFilter, setPendingFilter] = useState<Record<string, unknown>>({});
  const [submittedFilter, setSubmittedFilter] = useState<Record<string, unknown>>({});

  const toAttachment = (f: any): Attachment => ({
    id: f.id, name: f.name, url: f.url || '', size: f.size, type: f.type,
    uploadedAt: new Date().toISOString(), uploadedBy: CURRENT_VENDOR_ID,
  });
  const attToFileItem = (a: Attachment) => ({ id: a.id, name: a.name, size: a.size, type: a.type, url: a.url });

  // 下载策略：一直允许 / 限时允许 / 仅在线查看
  const isDownloadAllowed = (att?: Attachment) => {
    const policy = vendorPortalConfig.inquiryAttachmentPolicy;
    if (policy === 'always') return true;
    if (policy === 'viewOnly') return false;
    if (!att?.uploadedAt) return true;
    const uploaded = new Date(att.uploadedAt).getTime();
    const limit = vendorPortalConfig.inquiryAttachmentDownloadHours * 3600 * 1000;
    return Date.now() - uploaded <= limit;
  };

  const persistInquiryAttachments = (level: Attachment[], items: Record<string, Attachment[]>) => {
    if (!selectedInquiry) return;
    const updatedItems = selectedInquiry.items.map(it => ({ ...it, attachments: items[it.id] || [] }));
    updatePriceInquiry(selectedInquiry.id, { attachments: level, items: updatedItems } as any);
  };

  const policyLabel = vendorPortalConfig.inquiryAttachmentPolicy === 'always'
    ? '一直允许下载'
    : vendorPortalConfig.inquiryAttachmentPolicy === 'timed'
      ? `限时 ${vendorPortalConfig.inquiryAttachmentDownloadHours} 小时内允许下载`
      : '仅在线查看（禁止下载）';

  // 待报价的询价单（状态为published/closed且指向当前登录供应商）
  const pendingInquiries = useMemo(() =>
    priceInquiries.filter(i =>
      (i.status === 'published' || i.status === 'closed') &&
      i.targetVendorIds.includes(CURRENT_VENDOR_ID)
    ),
  [priceInquiries, CURRENT_VENDOR_ID]);

  // 已报价的单据（回写主系统后由 priceStore 统一持有）
  const submittedQuotations = useMemo(() =>
    vendorQuotations.filter(q => q.vendorId === CURRENT_VENDOR_ID),
  [vendorQuotations, CURRENT_VENDOR_ID]);

  const columns: ColumnDef<PriceInquiry, unknown>[] = useMemo(() => [
    { accessorKey: 'inquiryNo', header: '询价单号', size: 160, meta: { searchable: true } },
    { accessorKey: 'title', header: '标题', size: 200, meta: { searchable: true } },
    {
      accessorKey: 'deadline',
      header: '截止日期',
      meta: { searchable: true },
      cell: ({ row }) => {
        const isOverdue = new Date(row.original.deadline) < new Date();
        return (
          <Typography variant="body2" color={isOverdue ? 'error' : 'inherit'}>
            {formatDate(row.original.deadline)}
            {isOverdue && ' (已过期)'}
          </Typography>
        );
      },
    },
    {
      accessorKey: 'items',
      header: '物料数',
      cell: ({ row }) => `${row.original.items.length} 项`,
    },
    {
      accessorKey: 'totalEstimatedAmount',
      header: '预估总金额',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.totalEstimatedAmount),
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'closed', label: '已关闭' },
          { value: 'compared', label: '已比价' },
          { value: 'quotation_received', label: '已收到报价' },
        ],
      },
      cell: ({ row }) => <StatusBadge status={VQ_STATUS_KEY[row.original.status]} />,
    },
  ], []);

  const handleOpenQuote = (inquiry: PriceInquiry) => {
    setSelectedInquiry(inquiry);
    // 初始化报价项
    setQuoteItems(inquiry.items.map(item => ({
      ...item,
      unitPrice: item.estimatedPrice || 0,
      amount: item.estimatedAmount || 0,
      deliveryDays: 15,
      deliveryDate: '',
      itemRemarks: '',
    })));
    setQuotationValidUntil('');
    setQuotationPaymentTerms('');
    setQuotationRemarks('');
    setQuotationDeliveryTerms('');
    setInquiryAttachments(inquiry.attachments || []);
    setItemAttachments(
      inquiry.items.reduce((acc, it) => {
        if (it.attachments && it.attachments.length) acc[it.id] = it.attachments;
        return acc;
      }, {} as Record<string, Attachment[]>)
    );
    setQuoteDialogOpen(true);
  };

  const handleQuoteItemChange = (idx: number, field: string, value: any) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'unitPrice') {
        updated.amount = (updated.quantity || 0) * Number(value);
      }
      return updated;
    }));
  };

  /**
   * B5-T3 门户报价回写主系统
   * 提交后不再只弹 alert，而是：
   *  ① 向 priceStore 写入正式 VendorQuotation（采购端比价可直接取用）
   *  ② 把询价单状态推进为 quotation_received，并回写关联报价单号
   * 同一供应商对同一询价单重复提交时走更新（幂等），不产生重复报价单。
   */
  const handleSubmitQuotation = () => {
    if (!selectedInquiry) return;
    // B6 黑名单卡点：按登录身份判定，黑名单供应商禁止提交报价（不落库）
    const bl = checkVendorBlacklist(CURRENT_VENDOR_ID);
    if (bl.blacklisted) {
      notifyError(
        `贵司已被列入采购黑名单，暂无法提交报价：\n` +
          `原因：${bl.reason || '未填写'}\n` +
          `时间：${bl.blacklistedAt || '—'}\n\n` +
          `如有异议请联系采购部对接人处理。`
      );
      return;
    }
    if (!quotationValidUntil) {
      notifyError('请设置报价有效期');
      return;
    }
    persistInquiryAttachments(inquiryAttachments, itemAttachments);

    const now = new Date();
    const nowIso = now.toISOString();
    const today = nowIso.slice(0, 10);
    const totalAmount = quoteItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const items = quoteItems.map((item, idx) => ({
      id: `vqi-${now.getTime()}-${idx}`,
      inquiryItemId: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
      deliveryDays: Number(item.deliveryDays) || 0,
      deliveryDate: item.deliveryDate || undefined,
      remarks: item.itemRemarks || undefined,
    }));

    // 幂等：同一供应商 + 同一询价单已提交过则更新
    const existing = vendorQuotations.find(
      q => q.inquiryId === selectedInquiry.id && q.vendorId === CURRENT_VENDOR_ID
    );

    let quotationNo: string;
    let quotationId: string;
    if (existing) {
      quotationNo = existing.quotationNo;
      quotationId = existing.id;
      updateVendorQuotation(existing.id, {
        items,
        totalAmount,
        validUntil: quotationValidUntil,
        paymentTerms: quotationPaymentTerms || undefined,
        deliveryTerms: quotationDeliveryTerms || undefined,
        remarks: quotationRemarks || undefined,
        quotationDate: today,
        status: 'submitted',
        submittedAt: nowIso,
        updatedAt: nowIso,
      });
    } else {
      const seq = String(vendorQuotations.length + 1).padStart(3, '0');
      quotationNo = `VQ${today.replace(/-/g, '')}${seq}`;
      quotationId = `vq-${now.getTime()}`;
      const quotation: IVendorQuotation = {
        id: quotationId,
        quotationNo,
        inquiryId: selectedInquiry.id,
        inquiryNo: selectedInquiry.inquiryNo,
        vendorId: CURRENT_VENDOR_ID,
        vendorName: CURRENT_VENDOR_NAME,
        quotationDate: today,
        items,
        totalAmount,
        validUntil: quotationValidUntil,
        paymentTerms: quotationPaymentTerms || undefined,
        deliveryTerms: quotationDeliveryTerms || undefined,
        currency: 'CNY',
        status: 'submitted',
        remarks: quotationRemarks || undefined,
        submittedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      addVendorQuotation(quotation);
    }

    // 询价单状态推进 + 关联报价单，采购端可见
    updatePriceInquiry(selectedInquiry.id, {
      status: 'quotation_received',
      vendorQuotationId: quotationId,
      vendorQuotationNo: quotationNo,
    });

    setSubmitResult({ quotationNo, totalAmount });
    setQuoteDialogOpen(false);
    setTabValue(1);
  };

  const quotationColumns: ColumnDef<IVendorQuotation, unknown>[] = useMemo(() => [
    { accessorKey: 'quotationNo', header: '报价单号', size: 160, meta: { searchable: true } },
    { accessorKey: 'inquiryNo', header: '关联询价单', size: 160, meta: { searchable: true } },
    {
      accessorKey: 'quotationDate',
      header: '报价日期',
      meta: { searchable: true },
      cell: ({ row }) => formatDate(row.original.quotationDate),
    },
    {
      accessorKey: 'items',
      header: '物料数',
      cell: ({ row }) => `${row.original.items.length} 项`,
    },
    {
      accessorKey: 'totalAmount',
      header: '报价总额',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      accessorKey: 'validUntil',
      header: '有效期至',
      meta: { searchable: true },
      cell: ({ row }) => formatDate(row.original.validUntil),
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'submitted', label: '已提交' },
          { value: 'draft', label: '草稿' },
        ],
      },
      cell: ({ row }) => <StatusBadge status={row.original.status === 'submitted' ? 'vq_submitted' : 'draft'} />,
    },
  ], []);

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filteredPending = useMemo(
    () => applyColumnFilters(pendingInquiries, columns, pendingFilter, { module: 'price' }),
    [pendingInquiries, columns, pendingFilter]
  );
  const filteredSubmitted = useMemo(
    () => applyColumnFilters(submittedQuotations, quotationColumns, submittedFilter, { module: 'price' }),
    [submittedQuotations, quotationColumns, submittedFilter]
  );

  return (
    <PageWrapper title="供应商报价管理">
      {!identity && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="portal-demo-identity-banner">
          未识别到供应商门户登录身份，当前展示的是演示供应商（{FALLBACK_VENDOR_NAME}）的数据。请从供应商门户登录后再提交报价。
        </Alert>
      )}
      {selfBlacklist.blacklisted && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="portal-blacklist-banner">
          贵司已被列入采购黑名单（{selfBlacklist.blacklistedAt || '—'}）：{selfBlacklist.reason || '未填写原因'}。
          期间无法提交任何报价，如有异议请联系采购部对接人。
        </Alert>
      )}
      {submitResult && (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="quotation-submit-result" onClose={() => setSubmitResult(null)}>
          报价已提交并回写主系统：报价单 {submitResult.quotationNo}，总额 {formatCurrency(submitResult.totalAmount)}，询价单状态已更新为「已收到报价」。
        </Alert>
      )}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={
          <Badge badgeContent={pendingInquiries.length} color="error">
            <span style={{ paddingRight: 8 }}>待报价</span>
          </Badge>
        } />
        <Tab label={`已报价 (${submittedQuotations.length})`} />
      </Tabs>

      {tabValue === 0 && (
        <>
          {pendingInquiries.length === 0 ? (
            <Alert severity="info">暂无需报价的询价单</Alert>
          ) : (
            <>
              <FilterBar columns={columns} module="price" onSearch={setPendingFilter} listKey="vq-pending" />
              <DataTable
                data={filteredPending}
                columns={columns}
                enablePagination
                onView={(row) => handleOpenQuote(row)}
                onEdit={(row) => handleOpenQuote(row)}
              />
            </>
          )}
        </>
      )}

      {tabValue === 1 && (
        <>
          <FilterBar columns={quotationColumns} module="price" onSearch={setSubmittedFilter} listKey="vq-submitted" />
          <DataTable
            data={filteredSubmitted}
            columns={quotationColumns}
            enablePagination
            onView={(row) => {
              notify(`报价详情：${row.quotationNo}\n报价总额：${formatCurrency(row.totalAmount)}\n有效期至：${formatDate(row.validUntil)}`, 'info');
            }}
          />
        </>
      )}

      {/* 报价对话框 */}
      <Dialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              提交报价 - {selectedInquiry?.title}
              <Typography variant="caption" color="text.secondary" display="block">
                询价单号：{selectedInquiry?.inquiryNo} | 供应商：{CURRENT_VENDOR_NAME}
              </Typography>
            </Box>
            {selectedInquiry?.deadline && new Date(selectedInquiry.deadline) < new Date() && (
              <Chip label="已过期" color="error" size="small" />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {/* 物料报价明细 */}
          <Typography variant="subtitle2" fontWeight={600} mb={1}>物料报价明细</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>物料编码</TableCell>
                  <TableCell>物料名称</TableCell>
                  <TableCell>规格</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell align="right">报价单价</TableCell>
                  <TableCell align="right">报价金额</TableCell>
                  <TableCell align="center">交货天数</TableCell>
                  <TableCell>预计交期</TableCell>
                  <TableCell>备注</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quoteItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.materialCode}</TableCell>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell>{item.specification}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      <TextField size="small" type="number" value={item.unitPrice}
                        onChange={e => handleQuoteItemChange(idx, 'unitPrice', Number(e.target.value))}
                        sx={{ width: 100 }} inputProps={{ min: 0, step: 0.01 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <TextField size="small" type="number" value={item.deliveryDays}
                        onChange={e => handleQuoteItemChange(idx, 'deliveryDays', Number(e.target.value))}
                        sx={{ width: 70 }} inputProps={{ min: 1 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="date" value={item.deliveryDate}
                        onChange={e => handleQuoteItemChange(idx, 'deliveryDate', e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" value={item.itemRemarks}
                        onChange={e => handleQuoteItemChange(idx, 'itemRemarks', e.target.value)}
                        sx={{ width: 100 }} placeholder="备注" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 报价总额 */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">报价总计</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(quoteItems.reduce((sum, item) => sum + item.amount, 0))}
              </Typography>
            </Stack>
          </Paper>

          {/* 其他信息 */}
          <Typography variant="subtitle2" fontWeight={600} mb={1}>其他信息</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="报价有效期至" type="date" value={quotationValidUntil}
              onChange={e => setQuotationValidUntil(e.target.value)}
              InputLabelProps={{ shrink: true }} required sx={{ minWidth: 180 }} />
            <TextField label="付款条件" value={quotationPaymentTerms}
              onChange={e => setQuotationPaymentTerms(e.target.value)}
              placeholder="如：预付30%，货到60天" sx={{ minWidth: 250 }} />
            <TextField label="交货条件" value={quotationDeliveryTerms}
              onChange={e => setQuotationDeliveryTerms(e.target.value)}
              placeholder="如：含运费到厂" sx={{ minWidth: 200 }} />
          </Box>
          <TextField fullWidth label="备注" value={quotationRemarks}
            onChange={e => setQuotationRemarks(e.target.value)}
            multiline rows={2} sx={{ mt: 2 }}
            placeholder="特殊说明、质保承诺等" />

          {/* 询价附件（集中 + 按物料） */}
          <Typography variant="subtitle2" fontWeight={600} mb={1} mt={2}>询价附件</Typography>
          <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.78rem' }}>
            可上传 word/excel/pdf/ppt/图片等常见格式；系统按设置策略控制下载（当前：{policyLabel}）。支持集中上传或按物料单独上传。
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">询价单集中附件</Typography>
              <FileUpload
                value={inquiryAttachments.map(attToFileItem) as any}
                onChange={(files: any[]) => {
                  const next = files.map(toAttachment);
                  setInquiryAttachments(next);
                  persistInquiryAttachments(next, itemAttachments);
                }}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              />
            </Grid>
            {quoteItems.map((item, idx) => (
              <Grid item xs={12} md={6} key={item.id || idx}>
                <Typography variant="caption" color="text.secondary">物料附件：{item.materialName || item.materialCode}</Typography>
                <FileUpload
                  value={(itemAttachments[item.id] || []).map(attToFileItem) as any}
                  onChange={(files: any[]) => {
                    const next = files.map(toAttachment);
                    const nextMap = { ...itemAttachments, [item.id]: next };
                    setItemAttachments(nextMap);
                    persistInquiryAttachments(inquiryAttachments, nextMap);
                  }}
                  accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                  maxFiles={5}
                />
              </Grid>
            ))}
          </Grid>

          {/* 已上传附件查看 */}
          {(() => {
            const all = [
              ...inquiryAttachments.map(a => ({ ...a, scope: '集中' })),
              ...quoteItems.flatMap(it => (itemAttachments[it.id] || []).map(a => ({ ...a, scope: it.materialName || it.materialCode }))),
            ];
            if (all.length === 0) return null;
            return (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">已上传附件（点击预览 / 下载）</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {all.map((a, i) => {
                    const allowed = isDownloadAllowed(a);
                    return (
                      <Chip key={a.id || i} label={`${a.name}（${a.scope}）`} size="small" variant="outlined"
                        onClick={() => setPreview({ file: { name: a.name, url: a.url, type: a.type }, downloadAllowed: allowed })}
                        sx={{ cursor: 'pointer' }} />
                    );
                  })}
                </Stack>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteDialogOpen(false)}>取消</Button>
          <Button variant="outlined" startIcon={<Visibility />}
            onClick={() => { notifySuccess('已生成报价单预览，可通过上方「提交报价」正式递交'); }}>
            预览
          </Button>
          <Button variant="contained" startIcon={<Send />}
            onClick={handleSubmitQuotation}>
            提交报价
          </Button>
        </DialogActions>
      </Dialog>

      <FilePreviewModal
        open={Boolean(preview)}
        file={preview?.file || null}
        downloadAllowed={preview?.downloadAllowed ?? false}
        onClose={() => setPreview(null)}
      />
    </PageWrapper>
  );
};

export default VendorQuotation;

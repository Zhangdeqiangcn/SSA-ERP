import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Chip, Stack, Button,
  Alert, Radio, RadioGroup, FormControlLabel, FormControl,
  Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
} from '@mui/material';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import {
  ArrowBack, LowPriority, CheckCircle, Send, Visibility,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DetailSection, FlowTracker, DataTable } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { formatDate, formatCurrency } from '@/utils/format';

const PriceComparison: React.FC = () => {
  const { priceComparisons, priceInquiries, vendorQuotations } = usePriceStore();
  const { id, inquiryId } = useParams();
  const navigate = useNavigate();

  // 支持两种路由：/price/comparison/:id（查看比价单）或 /price/comparison/new/:inquiryId（新建比价单）
  let comparison: any;
  let inquiry: any;

  if (id && id !== 'new') {
    comparison = priceComparisons.find(c => c.id === id);
  }

  if (inquiryId) {
    inquiry = priceInquiries.find(i => i.id === inquiryId);
  }

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const [submitted, setSubmitted] = useState(false);

  if (id && id !== 'new' && !comparison) {
    return (
      <>
        <PageWrapper title="比价单">
          <Alert severity="warning">比价单不存在</Alert>
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
  }
  let displayData;
  if (comparison) {
    displayData = comparison;
  } else if (inquiry) {
    const relatedQuotations = vendorQuotations.filter(q => q.inquiryId === inquiry.id);
    const items = inquiry.items.map((item: any) => {
      const quotes = relatedQuotations
        .map(q => {
          const quoteItem = q.items.find((qi) => qi.materialId === item.materialId || qi.materialCode === item.materialCode);
          if (!quoteItem) return null;
          return {
            vendorId: q.vendorId,
            vendorName: q.vendorName,
            quotationId: q.id,
            quotationNo: q.quotationNo,
            unitPrice: quoteItem.unitPrice,
            amount: quoteItem.amount,
            deliveryDays: quoteItem.deliveryDays,
            deliveryDate: quoteItem.deliveryDate,
            paymentTerms: q.paymentTerms,
            remarks: q.remarks,
            isLowest: false,
          };
        })
        .filter(Boolean) as any[];

      // 找出最低价
      if (quotes.length > 0) {
        const lowest = quotes.reduce((min: any, q: any) => q.unitPrice < min.unitPrice ? q : min, quotes[0]);
        quotes.forEach((q: any) => { q.isLowest = q.unitPrice === lowest.unitPrice; });
        const lowestVendor = quotes.find((q: any) => q.isLowest);

        // 自动选择最低价
        if (lowestVendor && !selections[item.materialId]) {
          selections[item.materialId] = lowestVendor.vendorId;
        }
      }

      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        quotations: quotes,
        lowestVendorId: quotes.find((q: any) => q.isLowest)?.vendorId || '',
        lowestVendorName: quotes.find((q: any) => q.isLowest)?.vendorName || '',
        lowestUnitPrice: quotes.find((q: any) => q.isLowest)?.unitPrice || 0,
        lowestAmount: quotes.find((q: any) => q.isLowest)?.amount || 0,
      };
    });

    displayData = {
      inquiryId: inquiry.id,
      inquiryNo: inquiry.inquiryNo,
      title: inquiry.title,
      comparisonDate: new Date().toISOString().split('T')[0],
      items,
      participatingVendors: relatedQuotations.map((q) => q.vendorName),
      status: 'pending',
    };
  }

  if (!displayData) {
    return (
      <PageWrapper title="比价单">
        <Alert severity="info">无法生成比价单</Alert>
      </PageWrapper>
    );
  }

  const totalLowest = displayData.items.reduce((sum: number, item: any) =>
    sum + (item.lowestAmount || 0), 0);

  const handleSelectVendor = (materialId: string, vendorId: string) => {
    setSelections(prev => ({ ...prev, [materialId]: vendorId }));
  };

  const handleSubmitApproval = () => {
    const hasUnselected = displayData.items.some((item: any) => !selections[item.materialId]);
    if (hasUnselected) {
      setSnackbar({ open: true, message: '请为所有物料选择供应商', severity: 'error' }); return;
      return;
    }
    setSubmitted(true);
    // 构建选定数据
    const selectedItems = displayData.items.map((item: any) => {
      const selectedQuote = item.quotations.find((q: any) => q.vendorId === selections[item.materialId]);
      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        selectedVendorId: selectedQuote?.vendorId || '',
        selectedVendorName: selectedQuote?.vendorName || '',
        selectedUnitPrice: selectedQuote?.unitPrice || 0,
        selectedAmount: selectedQuote?.amount || 0,
        deliveryDays: selectedQuote?.deliveryDays || 0,
        deliveryDate: selectedQuote?.deliveryDate || '',
        paymentTerms: selectedQuote?.paymentTerms || '',
      };
    });
    navigate('/price/approval/new', {
      state: {
        comparisonId: comparison?.id || 'new',
        comparisonNo: comparison?.comparisonNo || '',
        inquiryId: displayData.inquiryId,
        inquiryNo: displayData.inquiryNo,
        title: displayData.title,
        items: selectedItems,
        totalAmount: selectedItems.reduce((sum: number, i: any) => sum + i.selectedAmount, 0),
      },
    });
  };

  return (
    <>
    <PageWrapper
      title={comparison ? `比价单 ${comparison.comparisonNo}` : '新建比价单'}
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="price-comparison" currentStatus={displayData.status || 'pending'}
            documentNo={comparison?.comparisonNo || displayData.inquiryNo} />
          {!comparison && !submitted && (
            <>
              <Button variant="contained" color="primary" startIcon={<Send />}
                onClick={handleSubmitApproval}>
                提交价格审批
              </Button>
            </>
          )}
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate(comparison ? '/price/comparisons' : `/price/inquiry/${displayData.inquiryId}`)}>
            返回
          </Button>
        </Stack>
      }
    >
      {/* 基本信息 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.secondary">比价单号</Typography>
            <Typography variant="body2" fontWeight={600}>{comparison?.comparisonNo || '新建'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">关联询价单</Typography>
            <Typography variant="body2" fontWeight={600}>{displayData.inquiryNo}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">标题</Typography>
            <Typography variant="body2" fontWeight={600}>{displayData.title}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">比价日期</Typography>
            <Typography variant="body2">{formatDate(displayData.comparisonDate)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">参与报价供应商</Typography>
            <Stack direction="row" spacing={0.5} mt={0.5}>
              {displayData.participatingVendors.map((name: string) => (
                <Chip key={name} label={name} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              ))}
            </Stack>
          </Box>
          {comparison && (
            <Box>
              <Typography variant="caption" color="text.secondary">状态</Typography>
              <Chip label={comparison.status === 'selected' ? '已选定' : comparison.status === 'approved' ? '已审批' : '待选定'}
                size="small" color={comparison.status === 'approved' ? 'success' : 'warning'} />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* 物料比价明细 */}
      {displayData.items.map((item: any, idx: number) => (
        <Paper key={item.materialId} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              物料 {idx + 1}：{item.materialName}（{item.materialCode}）
            </Typography>
            <Chip label={`${item.specification} | ${item.quantity}${item.unit}`} size="small" variant="outlined" />
          </Stack>

          <DataTable
            data={item.quotations.map((q: any) => ({ ...q, id: q.vendorId }))}
            enablePagination={false}
            enableRowSelection={false}
            sapStyle
            columns={[
              {
                id: 'select', header: !comparison ? '选择' : '已选', enableSorting: false,
                cell: ({ row }) => {
                  const q = row.original as any;
                  const isSelected = (comparison?.status === 'approved' || comparison?.status === 'selected')
                    ? q.vendorId === (comparison?.items?.[idx]?.selectedVendorId)
                    : selections[item.materialId] === q.vendorId;
                  return comparison?.status === 'approved' ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : comparison?.status === 'selected' ? (
                    <Chip label="已选定" size="small" color="primary"
                      sx={q.vendorId === comparison?.items?.[idx]?.selectedVendorId ? {} : { display: 'none' }} />
                  ) : (
                    <Radio checked={isSelected} onChange={() => handleSelectVendor(item.materialId, q.vendorId)} size="small" />
                  );
                },
              },
              {
                id: 'vendorName', header: '供应商',
                cell: ({ row }) => {
                  const q = row.original as any;
                  const isSelected = (comparison?.status === 'approved' || comparison?.status === 'selected')
                    ? q.vendorId === (comparison?.items?.[idx]?.selectedVendorId)
                    : selections[item.materialId] === q.vendorId;
                  return <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>{q.vendorName}</Typography>;
                },
              },
              { id: 'quotationNo', header: '报价单号', accessorKey: 'quotationNo' },
              {
                id: 'unitPrice', header: '单价',
                cell: ({ row }) => {
                  const q = row.original as any;
                  return (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={q.isLowest ? 700 : 400} color={q.isLowest ? 'success.main' : 'inherit'}>
                        {formatCurrency(q.unitPrice)}
                      </Typography>
                    </Box>
                  );
                },
              },
              {
                id: 'amount', header: '金额',
                cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency((row.original as any).amount)}</Box>,
              },
              {
                id: 'deliveryDays', header: '交期(天)',
                cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{(row.original as any).deliveryDays}</Box>,
              },
              {
                id: 'deliveryDate', header: '预计交期',
                cell: ({ row }) => {
                  const q = row.original as any;
                  return q.deliveryDate ? formatDate(q.deliveryDate) : '-';
                },
              },
              {
                id: 'paymentTerms', header: '付款条件',
                cell: ({ row }) => (row.original as any).paymentTerms || '-',
              },
              {
                id: 'isLowest', header: '最低价', enableSorting: false,
                cell: ({ row }) => (row.original as any).isLowest ? (
                  <Chip label="最低价" size="small" color="success" sx={{ fontSize: '0.7rem', height: 22 }} />
                ) : null,
              },
            ]}
          />

          {!comparison && (
            <Alert severity="success" sx={{ mt: 1, fontSize: '0.85rem' }}>
              最低报价：{item.lowestVendorName} - {formatCurrency(item.lowestUnitPrice)}/ {item.unit}
              （共 {formatCurrency(item.lowestAmount)}）
              {!selections[item.materialId] && ' — 已自动选择最低价供应商'}
            </Alert>
          )}
        </Paper>
      ))}

      {/* 汇总 */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>价格汇总</Typography>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">全线最低总价</Typography>
              <Typography variant="h6" color="success.main">¥{totalLowest.toLocaleString()}</Typography>
            </Box>
            {comparison?.totalSelectedAmount && (
              <Box>
                <Typography variant="caption" color="text.secondary">选定总价</Typography>
                <Typography variant="h6" color="primary.main">¥{comparison.totalSelectedAmount.toLocaleString()}</Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </Paper>
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

export default PriceComparison;

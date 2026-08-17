import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { formatCurrency } from '@/utils/format';

const PriceCompare: React.FC = () => {
  const { id } = useParams();
  const { vendorQuotes, purchaseRequests } = usePurchaseStore();
  const request = purchaseRequests.find(r => r.id === id);
  const quotes = vendorQuotes.filter(q => q.requestId === id);

  if (!request) {
    return (
      <PageWrapper title="供应商比价">
        <Box>采购申请不存在</Box>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`供应商比价 - ${request.requestNo}`}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">{request.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          申请人：{request.applicant} | 部门：{request.department}
        </Typography>
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>供应商报价对比</Typography>

      {quotes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无供应商报价</Typography>
        </Paper>
      ) : (
        quotes.map((quote) => (
          <Paper key={quote.id} sx={{ mb: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1">{quote.vendorName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  报价时间：{quote.submittedAt}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" color="primary">{formatCurrency(quote.totalAmount)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  有效期至：{quote.validUntil}
                </Typography>
              </Box>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>物料名称</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>单价</TableCell>
                    <TableCell>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quote.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {quote.remarks && (
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary">备注：{quote.remarks}</Typography>
              </Box>
            )}
          </Paper>
        ))
      )}
    </PageWrapper>
  );
};

export default PriceCompare;

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Slider,
} from '@mui/material';
import { Scale } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { formatCurrency } from '@/utils/format';

interface ScoreWeights {
  price: number;
  delivery: number;
  quality: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = { price: 40, delivery: 30, quality: 30 };

const PriceCompare: React.FC = () => {
  const { id } = useParams();
  const { vendorQuotes, purchaseRequests } = usePurchaseStore();
  const request = purchaseRequests.find(r => r.id === id);
  const quotes = vendorQuotes.filter(q => q.requestId === id);

  const [showScore, setShowScore] = useState(false);
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [openWeightDialog, setOpenWeightDialog] = useState(false);

  // 计算加权评分
  const scoredQuotes = useMemo(() => {
    if (quotes.length === 0) return [];

    // 找最低价和最快交期
    const minPrice = Math.min(...quotes.map(q => q.totalAmount));
    const maxPrice = Math.max(...quotes.map(q => q.totalAmount));
    const minDays = Math.min(...quotes.map(q => {
      if (!q.validUntil) return 999;
      const days = Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }));
    const maxDays = Math.max(...quotes.map(q => {
      if (!q.validUntil) return 999;
      const days = Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }));

    return quotes.map(quote => {
      // 价格分：最低价100分，最高价0分
      const priceScore = maxPrice === minPrice ? 100 :
        Math.round((1 - (quote.totalAmount - minPrice) / (maxPrice - minPrice)) * 100);

      // 交期分：越快越好（用validUntil作为交期参考）
      const quoteDays = !quote.validUntil ? 999 :
        Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const deliveryScore = maxDays === minDays ? 100 :
        Math.round((1 - (quoteDays - minDays) / (maxDays - minDays)) * 100);

      // 质量分：默认70分（可从供应商评级获取）
      const qualityScore = 70;

      // 综合得分
      const totalScore = Math.round(
        priceScore * (weights.price / 100) +
        deliveryScore * (weights.delivery / 100) +
        qualityScore * (weights.quality / 100)
      );

      return { ...quote, priceScore, deliveryScore, qualityScore, totalScore };
    }).sort((a, b) => b.totalScore - a.totalScore); // 按综合得分降序
  }, [quotes, weights]);

  if (!request) {
    return (
      <PageWrapper title="供应商比价">
        <Box>采购申请不存在</Box>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={`供应商比价 - ${request.requestNo}`}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">{request.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            申请人：{request.applicant} | 部门：{request.department}
          </Typography>
        </Box>
        <Tooltip title="设置评分权重">
          <Button
            variant="outlined"
            startIcon={<Scale />}
            onClick={() => setOpenWeightDialog(true)}
          >
            评分权重
          </Button>
        </Tooltip>
      </Box>

      {quotes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无供应商报价</Typography>
        </Paper>
      ) : showScore ? (
        // 评分模式
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>排名</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>报价金额</TableCell>
                <TableCell>有效期至</TableCell>
                <TableCell>价格分 ({weights.price}%)</TableCell>
                <TableCell>交期分 ({weights.delivery}%)</TableCell>
                <TableCell>质量分 ({weights.quality}%)</TableCell>
                <TableCell>综合得分</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scoredQuotes.map((quote, index) => (
                <TableRow key={quote.id} sx={{ bgcolor: index === 0 ? '#E8F5E9' : 'inherit' }}>
                  <TableCell>
                    {index === 0 ? <Chip label="推荐" color="success" size="small" /> : index + 1}
                  </TableCell>
                  <TableCell>{quote.vendorName}</TableCell>
                  <TableCell>{formatCurrency(quote.totalAmount)}</TableCell>
                  <TableCell>{quote.validUntil}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 80 }} title="已计算分数">
                        <Slider size="small" value={quote.priceScore} disabled />
                      </Box>
                      <Typography variant="caption">{quote.priceScore}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 80 }} title="已计算分数">
                        <Slider size="small" value={quote.deliveryScore} disabled />
                      </Box>
                      <Typography variant="caption">{quote.deliveryScore}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 80 }} title="已计算分数">
                        <Slider size="small" value={quote.qualityScore} disabled />
                      </Box>
                      <Typography variant="caption">{quote.qualityScore}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold" color={index === 0 ? 'success.main' : 'inherit'}>
                      {quote.totalScore}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // 原始对比模式
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

      {/* 评分权重设置对话框 */}
      <Dialog open={openWeightDialog} onClose={() => setOpenWeightDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>设置评分权重</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography id="price-weight" gutterBottom>价格权重：{weights.price}%</Typography>
            <Slider
              value={weights.price}
              onChange={(_, v) => setWeights({ ...weights, price: v as number })}
              min={0} max={100} step={5}
            />
            <Typography id="delivery-weight" gutterBottom sx={{ mt: 2 }}>交期权重：{weights.delivery}%</Typography>
            <Slider
              value={weights.delivery}
              onChange={(_, v) => setWeights({ ...weights, delivery: v as number })}
              min={0} max={100} step={5}
            />
            <Typography id="quality-weight" gutterBottom sx={{ mt: 2 }}>质量权重：{weights.quality}%</Typography>
            <Slider
              value={weights.quality}
              onChange={(_, v) => setWeights({ ...weights, quality: v as number })}
              min={0} max={100} step={5}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              总权重必须为 100%，当前总和：{weights.price + weights.delivery + weights.quality}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setWeights(DEFAULT_WEIGHTS); setOpenWeightDialog(false); }}>
            重置默认
          </Button>
          <Button onClick={() => setOpenWeightDialog(false)} variant="contained">
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default PriceCompare;


import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Tooltip, Chip, Alert, Grid,
} from '@mui/material';
import { Payment, Calculate } from '@mui/icons-material';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useVendorStore } from '@/stores/vendorStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useConsignmentStore } from '@/stores/consignmentStore';
import { ConsignmentStock } from '@/types/purchase';

const genId = () => `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ConsignmentStockPage: React.FC = () => {
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const vendors = useVendorStore((s) => s.vendors);
  const { addPurchaseOrder } = usePurchaseStore();

  // 寄售库存数据来自专门的 consignmentStore（持久化，刷新不丢失）
  const { records: consignmentRecords, settleConsumption } = useConsignmentStore();

  // 结算对话框
  const [settleDialog, setSettleDialog] = useState(false);
  const [settleRecord, setSettleRecord] = useState<ConsignmentStock | null>(null);
  const [settleQty, setSettleQty] = useState(0);

  const openSettle = (record: ConsignmentStock) => {
    setSettleRecord(record);
    setSettleQty(record.balanceQty);
    setSettleDialog(true);
  };

  const handleSettle = () => {
    if (!settleRecord || settleQty <= 0) return;

    const totalAmount = settleQty * (settleRecord.agreedUnitPrice || 0);
    const orderNo = `PO-CS-${Date.now()}`;
    const now = new Date().toISOString();

    // 自动生成寄售结算采购订单
    addPurchaseOrder({
      id: `po-cs-${Date.now()}`,
      orderNo,
      vendorId: settleRecord.vendorId,
      vendorName: settleRecord.vendorName,
      status: 'created',
      orderMode: 'consignment',
      orderDate: now.slice(0, 10),
      expectedDeliveryDate: now.slice(0, 10),
      items: [{
        id: genId(),
        materialId: settleRecord.materialId,
        materialCode: settleRecord.materialCode || '',
        materialName: settleRecord.materialName || '',
        specification: settleRecord.specification || '',
        unit: settleRecord.unit || '吨',
        orderedQuantity: settleQty,
        deliveredQuantity: 0,
        unitPrice: settleRecord.agreedUnitPrice || 0,
        amount: totalAmount,
      }],
      totalAmount,
      paymentTerms: '寄售结算',
      tradeTerms: '',
      deliveryAddress: '',
      remarks: `寄售消耗结算 - ${settleRecord.vendorName} - ${settleRecord.materialName}`,
      createdAt: now,
      updatedAt: now,
      createdBy: '当前用户',
      updatedBy: '当前用户',
    });

    // 更新寄售记录（持久化 store）
    settleConsumption(settleRecord.id, settleQty);

    setSettleDialog(false);
    alert(`消耗结算采购订单 ${orderNo} 已生成，金额 ¥${totalAmount.toLocaleString()}`);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5">寄售库存管理</Typography>
        <Chip label="P2-06" size="small" color="primary" variant="outlined" />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        寄售库存：供应商将物料寄存于我方仓库，消耗时按约定单价自动生成采购订单结算。
        寄存数量 = 已消耗 + 结存。消耗结算后自动回写消耗数量。
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>供应商</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>规格</TableCell>
              <TableCell>单位</TableCell>
              <TableCell align="right">约定单价</TableCell>
              <TableCell align="right">寄存数量</TableCell>
              <TableCell align="right">已消耗</TableCell>
              <TableCell align="right">结存</TableCell>
              <TableCell>仓库</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {consignmentRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">暂无寄售库存记录</TableCell>
              </TableRow>
            ) : (
              consignmentRecords.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{record.vendorName}</Typography>
                    <Typography variant="caption" color="text.secondary">{record.vendorCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{record.materialName}</Typography>
                    <Typography variant="caption" color="text.secondary">{record.materialCode}</Typography>
                  </TableCell>
                  <TableCell>{record.specification || '-'}</TableCell>
                  <TableCell>{record.unit}</TableCell>
                  <TableCell align="right">
                    ¥{record.agreedUnitPrice?.toLocaleString() || '-'}
                  </TableCell>
                  <TableCell align="right">{record.consignedQty.toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={record.consumedQty.toLocaleString()}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight={600}
                      color={record.balanceQty > 0 ? 'success.main' : 'text.primary'}
                    >
                      {record.balanceQty.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{record.warehouseName || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="消耗结算：消耗数量 × 约定单价 → 生成采购订单">
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<Payment />}
                        onClick={() => openSettle(record)}
                        disabled={record.balanceQty <= 0}
                      >
                        消耗结算
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 消耗结算对话框 */}
      <Dialog open={settleDialog} onClose={() => setSettleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>消耗结算</DialogTitle>
        <DialogContent>
          {settleRecord && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="供应商" value={settleRecord.vendorName} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="物料" value={`${settleRecord.materialName}`} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="约定单价" value={`¥${settleRecord.agreedUnitPrice?.toLocaleString()}`} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="结存数量" value={settleRecord.balanceQty.toLocaleString()} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth size="small" label="结算数量" type="number"
                  value={settleQty}
                  onChange={(e) => setSettleQty(Math.min(Number(e.target.value), settleRecord.balanceQty))}
                  inputProps={{ max: settleRecord.balanceQty, min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    结算金额 = {settleQty.toLocaleString()} × ¥{settleRecord.agreedUnitPrice?.toLocaleString()}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ¥{((settleQty * (settleRecord.agreedUnitPrice || 0))).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    结算后将自动生成寄售模式的采购订单
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettleDialog(false)}>取消</Button>
          <Button variant="contained" startIcon={<Calculate />} onClick={handleSettle} disabled={settleQty <= 0}>
            确认结算
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsignmentStockPage;

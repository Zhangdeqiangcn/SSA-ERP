import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Grid,
  Divider,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker } from '@/components/common';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { notifyError } from '@/utils/notify';
import { useWarehouseMasterStore, selectWarehousesByOrg } from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import { useMaterialStore } from '@/stores';
import { formatCurrency } from '@/utils/format';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';

const InboundForm: React.FC = () => {
  const navigate = useNavigate();
  const purchaseOrders = usePurchaseStore(s => s.purchaseOrders);
  const addInboundOrder = useWarehouseStore(s => s.addInboundOrder);
  const warehouses = useWarehouseMasterStore(s => s.warehouses);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const materials = useMaterialStore(s => s.materials);

  const [orderNo, setOrderNo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<typeof purchaseOrders[0] | null>(null);
  // 聚合本单所有物料所属分类，用于展示相关物料责任人（仓库视角：库管员）
  const inboundCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    (selectedOrder?.items ?? []).forEach((it) => {
      const mid = it.materialId || it.id;
      const m = materials.find((mm) => mm.id === mid);
      if (m?.categoryId) ids.add(m.categoryId);
    });
    return [...ids];
  }, [selectedOrder, materials]);
  const [warehouseId, setWarehouseId] = useState(visibleWarehouses[0]?.id || 'wh-001');
  const [itemBatches, setItemBatches] = useState<Record<string, string>>({});
  const [itemLocations, setItemLocations] = useState<Record<string, string>>({});
  // P1-08 保质期管理：入库行生产日期
  const [itemProductionDates, setItemProductionDates] = useState<Record<string, string>>({});
  // B2-① 序列号驱动：serialized 物料入库必须填写序列号（逗号/换行分隔，数量=本次入库量）
  const [itemSerials, setItemSerials] = useState<Record<string, string>>({});

  const handleSearch = () => {
    const order = purchaseOrders.find(o => o.orderNo === orderNo);
    setSelectedOrder(order || null);
  };

  const selectedWarehouse = visibleWarehouses.find(w => w.id === warehouseId) || visibleWarehouses[0];

  const buildInboundOrder = (status: 'completed' | 'pending') => {
    if (!selectedOrder) return;
    // B2-① 序列号强制校验：serialized 物料必须填写与入库数量一致的序列号
    const serialErrs: string[] = [];
    selectedOrder.items.forEach(item => {
      const material = useMaterialStore.getState().materials.find(m => m.id === (item.materialId || item.id));
      if (material?.serialized) {
        const serials = (itemSerials[item.id] || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        const qty = (item.orderedQuantity || 0) - (item.deliveredQuantity || 0);
        if (serials.length === 0) serialErrs.push(`物料【${item.materialName}】为序列号管理，本次入库必须填写序列号`);
        else if (serials.length !== qty) serialErrs.push(`物料【${item.materialName}】序列号数量(${serials.length})必须等于本次入库数量(${qty})`);
      }
    });
    if (serialErrs.length) { notifyError('序列号校验未通过：\n' + serialErrs.join('\n')); return; }
    const now = new Date().toISOString();
    const id = `inbound-${Date.now()}`;
    const inboundNo = `IB${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-4)}`;
    const wh = selectedWarehouse;
    addInboundOrder({
      id,
      inboundNo,
      type: 'purchase',
      sourceNo: selectedOrder.orderNo,
      vendorId: selectedOrder.vendorId,
      vendorName: selectedOrder.vendorName,
      status,
      warehouseId: wh?.id || warehouseId,
      warehouseName: wh?.name || '主仓库',
      orgId: currentOrgId,
      operator: '当前用户',
      inboundDate: now.slice(0, 10),
      items: selectedOrder.items.map(item => {
        const locId = itemLocations[item.id] || '';
        const loc = wh?.locations.find(l => l.id === locId);
        // P1-08 保质期：根据物料保质期天数和生产日期计算到期日
        const prodDate = itemProductionDates[item.id] || '';
        const materials = useMaterialStore.getState().materials;
        const material = materials.find(m => m.id === (item.materialId || item.id));
        let expiryDate = '';
        if (prodDate && material?.shelfLifeDays && material.shelfLifeDays > 0) {
          const d = new Date(prodDate);
          d.setDate(d.getDate() + material.shelfLifeDays);
          expiryDate = d.toISOString().slice(0, 10);
        }
        // ★ V3.45.0 补单价/金额：原映射**只传数量、完全没有 unitPrice/amount**，
        //   而服务端 `Number(item.amount) || 0` 完全依赖前端 → 入库金额列恒为 0
        //   → 三单匹配的入库金额恒为 0 → 付款闸门 100% 拦截正常采购付款、到货率永远 0%。
        //   单价取「行单价 → 物料标准价 → 移动均价 → 采购价」逐级兜底（与成本取值口径一致）。
        const qty = item.orderedQuantity - item.deliveredQuantity;
        const unitPrice = Number(
          item.unitPrice
          || material?.standardPrice
          || material?.movingAvgPrice
          || material?.price
          || 0
        );
        return {
          id: `item-${item.id}-${Date.now()}`,
          materialId: item.materialId || item.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          specification: item.specification,
          unit: item.unit,
          expectedQuantity: qty,
          actualQuantity: qty,
          unitPrice,
          amount: Math.round(unitPrice * qty * 100) / 100,
          qualityStatus: 'qualified',
          batchNo: itemBatches[item.id] || undefined,
          locationId: locId || undefined,
          locationName: loc?.name || undefined,
          productionDate: prodDate || undefined,
          expiryDate: expiryDate || undefined,
          // ★ V3.61.0 P0-3：行锚点= 采购订单行 id（selectedOrder.items 来自采购订单，
          //   其 item.id 即 purchase_order_items.id）。缺它则行级三单比对键永不相等，
          //   累计入库量恒 0 → 每行判「欠交/欠票」→ 付款闸门拦截所有付款。
          orderItemId: item.id,
          // B2-① 序列号驱动：serialized 物料写入序列号清单
          serialNos: material?.serialized
            ? (itemSerials[item.id] || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean)
            : undefined,
        };
      }),
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin',
      updatedBy: 'admin',
    });
    navigate('/warehouse/inbound');
  };

  const handleSubmit = () => buildInboundOrder('completed');
  const handleSaveDraft = () => buildInboundOrder('pending');

  return (
    <PageWrapper
      title="新建入库单"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="inbound" currentStatus="ib_created" />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            取消
          </Button>
          <Button variant="outlined" onClick={handleSaveDraft} sx={{ mr: 1 }}>
            暂存
          </Button>
          <Button variant="contained" startIcon={<Save />} disabled={!selectedOrder} onClick={handleSubmit} data-testid="complete-inbound">
            确认入库
          </Button>
        </Box>
      }
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>采购订单查询</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="采购订单号"
              value={orderNo}
              onChange={e => setOrderNo(e.target.value)}
              fullWidth
              placeholder="输入订单号，如：PO20240506001"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant="contained" onClick={handleSearch}>
              查询
            </Button>
          </Grid>
        </Grid>
      </Box>

      {selectedOrder && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>订单信息</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">订单号</Typography>
                <Typography>{selectedOrder.orderNo}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">供应商</Typography>
                <Typography>{selectedOrder.vendorName}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">订单金额</Typography>
                <Typography>{formatCurrency(selectedOrder.totalAmount)}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">预计交货日期</Typography>
                <Typography>{selectedOrder.expectedDeliveryDate}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">收货仓库</Typography>
                <Select
                  size="small"
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  fullWidth
                  sx={{ mt: 0.5 }}
                >
                  {visibleWarehouses.map(w => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
                </Select>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 4 }}>
            {/* 物料责任人（仓库视角：库管员）—— 自动按各物料分类聚合显示 */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <ResponsiblePersons
                categoryIds={inboundCategoryIds}
                roles={['warehouse_keeper']}
                title="相关物料责任人（入库）"
              />
            </Paper>

            <Typography variant="h6" sx={{ mb: 2 }}>入库明细</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>物料编码</TableCell>
                    <TableCell>物料名称</TableCell>
                    <TableCell>规格型号</TableCell>
                    <TableCell>单位</TableCell>
                    <TableCell>订单数量</TableCell>
                    <TableCell>已入库数量</TableCell>
                    <TableCell>本次入库</TableCell>
                    <TableCell>批次号</TableCell>
                    <TableCell>库位</TableCell>
                    <TableCell>生产日期</TableCell>
                    <TableCell>序列号</TableCell>
                    <TableCell>到期日</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOrder.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materialCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.specification}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.orderedQuantity}</TableCell>
                      <TableCell>{item.deliveredQuantity}</TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          defaultValue={item.orderedQuantity - item.deliveredQuantity}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="批次号"
                          value={itemBatches[item.id] || ''}
                          onChange={e => setItemBatches(prev => ({ ...prev, [item.id]: e.target.value }))}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          displayEmpty
                          value={itemLocations[item.id] || ''}
                          onChange={e => setItemLocations(prev => ({ ...prev, [item.id]: e.target.value }))}
                          sx={{ minWidth: 130 }}
                        >
                          <MenuItem value=""><em>不指定</em></MenuItem>
                          {(selectedWarehouse?.locations || []).map(l => (
                            <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          size="small"
                          value={itemProductionDates[item.id] || ''}
                          onChange={e => setItemProductionDates(prev => ({ ...prev, [item.id]: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const mat = useMaterialStore.getState().materials.find(m => m.id === (item.materialId || item.id));
                          if (!mat?.serialized) return <Typography variant="caption" color="text.secondary">非序列号</Typography>;
                          const qty = (item.orderedQuantity || 0) - (item.deliveredQuantity || 0);
                          return (
                            <TextField
                              size="small"
                              multiline
                              minRows={1}
                              placeholder={`序列号×${qty}`}
                              value={itemSerials[item.id] || ''}
                              onChange={e => setItemSerials(prev => ({ ...prev, [item.id]: e.target.value }))}
                              sx={{ width: 160 }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const prodDate = itemProductionDates[item.id];
                          if (!prodDate) return <Typography variant="caption" color="text.secondary">-</Typography>;
                          const materials = useMaterialStore.getState().materials;
                          const material = materials.find(m => m.id === (item.materialId || item.id));
                          if (!material?.shelfLifeDays || material.shelfLifeDays <= 0) return <Typography variant="caption" color="text.secondary">无保质期</Typography>;
                          const d = new Date(prodDate);
                          d.setDate(d.getDate() + material.shelfLifeDays);
                          return <Typography variant="caption">{d.toISOString().slice(0, 10)}</Typography>;
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary">
              填写批次号后，确认入库将自动维护对应物料的批次库存（FIFO 出库时按入库日期消耗）。
            </Typography>
          </Box>
        </>
      )}
    </PageWrapper>
  );
};

export default InboundForm;

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
  IconButton,
} from '@mui/material';
import { Add, Delete, ArrowBack, Save } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';
import { useWarehouseMasterStore, selectWarehousesByOrg } from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import { OutboundOrder, OutboundOrderItem } from '@/types/warehouse';

interface OutboundItemRow {
  id: string;
  materialId: string;
  materialCode?: string;
  materialName: string;
  specification: string;
  unit: string;
  availableQuantity: number;
  quantity: number;
  batchNo?: string;
  locationId?: string;
}

const OutboundForm: React.FC = () => {
  const navigate = useNavigate();
  const materials = useMaterialStore(s => s.materials);
  const addOutboundOrder = useWarehouseStore(s => s.addOutboundOrder);
  const warehouses = useWarehouseMasterStore(s => s.warehouses);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));

  const [outboundType, setOutboundType] = useState('pick');
  const [warehouseId, setWarehouseId] = useState(visibleWarehouses[0]?.id || 'wh-001');
  const [items, setItems] = useState<OutboundItemRow[]>([]);
  // 聚合本单所有物料所属分类，用于展示相关物料责任人（仓库视角：库管员）
  const outboundCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m?.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [picker, setPicker] = useState('');
  const [packagingMethod, setPackagingMethod] = useState('');
  const [packageCount, setPackageCount] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [volume, setVolume] = useState<number | ''>('');

  const selectedWarehouse = visibleWarehouses.find(w => w.id === warehouseId) || visibleWarehouses[0];

  const addItem = () => {
    setItems([...items, {
      id: `item-${Date.now()}`,
      materialId: '',
      materialName: '',
      specification: '',
      unit: '',
      availableQuantity: 0,
      quantity: 1,
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem: OutboundItemRow = { ...item, [field]: value } as OutboundItemRow;
        if (field === 'materialId') {
          const material = materials.find(m => m.id === value);
          if (material) {
            updatedItem.materialCode = material.code;
            updatedItem.materialName = material.name;
            updatedItem.specification = material.specification || '';
            updatedItem.unit = material.unit;
            updatedItem.availableQuantity = material.currentStock;
          }
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };

  const generateOutboundNo = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OUT${date}${random}`;
  };

  const buildOrder = (status: 'pending' | 'processing' | 'completed' | 'cancelled'): OutboundOrder => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const operator = '系统用户';
    const wh = selectedWarehouse;
    const orderItems: OutboundOrderItem[] = items.map(item => {
      const loc = wh?.locations.find(l => l.id === item.locationId);
      return {
        id: item.id,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        batchNo: item.batchNo || undefined,
        locationId: item.locationId || undefined,
        locationName: loc?.name || undefined,
      };
    });
    return {
      id: `out-${Date.now()}`,
      outboundNo: generateOutboundNo(),
      type: outboundType as 'sale' | 'pick' | 'transfer',
      status,
      warehouseId: wh?.id || warehouseId,
      warehouseName: wh?.name || '主仓库',
      orgId: currentOrgId,
      operator,
      outboundDate: today,
      items: orderItems,
      picker: picker || undefined,
      packagingMethod: (packagingMethod || undefined) as 'carton' | 'wooden' | 'pallet' | 'bare' | undefined,
      packageCount: packageCount ? Number(packageCount) : undefined,
      weight: weight ? Number(weight) : undefined,
      volume: volume ? Number(volume) : undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: operator,
      updatedBy: operator,
    };
  };

  const handleSubmit = () => {
    const order = buildOrder('processing');
    addOutboundOrder(order);
    navigate('/warehouse/outbound');
  };

  const handleSaveDraft = () => {
    const order = buildOrder('pending');
    addOutboundOrder(order);
    navigate('/warehouse/outbound');
  };

  return (
    <PageWrapper
      title="新建出库单"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="outbound" currentStatus="ob_draft" />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            取消
          </Button>
          <Button variant="outlined" onClick={handleSaveDraft} sx={{ mr: 1 }}>
            暂存
          </Button>
          <Button variant="contained" startIcon={<Save />} disabled={items.length === 0} onClick={handleSubmit}>
            确认出库
          </Button>
        </Box>
      }
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>出库信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="出库类型"
              value={outboundType}
              onChange={e => setOutboundType(e.target.value)}
              fullWidth
            >
              <MenuItem value="sale">销售出库</MenuItem>
              <MenuItem value="pick">领料出库</MenuItem>
              <MenuItem value="transfer">调拨出库</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="出库仓库"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              fullWidth
            >
              {visibleWarehouses.map(w => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="拣配人"
              value={picker}
              onChange={e => setPicker(e.target.value)}
              fullWidth
              placeholder="请输入拣配人"
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>包装信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="包装方式"
              value={packagingMethod}
              onChange={e => setPackagingMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="">不指定</MenuItem>
              <MenuItem value="carton">纸箱</MenuItem>
              <MenuItem value="wooden">木箱</MenuItem>
              <MenuItem value="pallet">托盘</MenuItem>
              <MenuItem value="bare">裸装</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="件数"
              type="number"
              value={packageCount}
              onChange={e => setPackageCount(e.target.value ? Number(e.target.value) : '')}
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="重量(kg)"
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value ? Number(e.target.value) : '')}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="体积(m³)"
              type="number"
              value={volume}
              onChange={e => setVolume(e.target.value ? Number(e.target.value) : '')}
              fullWidth
              inputProps={{ min: 0, step: 0.001 }}
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 2 }}>
        <Button startIcon={<Add />} onClick={addItem}>
          添加物料
        </Button>
      </Box>

      {/* 物料责任人（仓库视角：库管员）—— 自动按各物料分类聚合显示 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <ResponsiblePersons
          categoryIds={outboundCategoryIds}
          roles={['warehouse_keeper']}
          title="相关物料责任人（出库）"
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>物料</TableCell>
              <TableCell>规格型号</TableCell>
              <TableCell>单位</TableCell>
              <TableCell>可用库存</TableCell>
              <TableCell>出库数量</TableCell>
              <TableCell>批次号</TableCell>
              <TableCell>库位</TableCell>
              <TableCell width={80}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={item.materialId}
                    onChange={e => updateItem(item.id, 'materialId', e.target.value)}
                    sx={{ minWidth: 200 }}
                  >
                    {materials.map(m => (
                      <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>{item.specification}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.availableQuantity}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                    sx={{ width: 100 }}
                    inputProps={{ max: item.availableQuantity }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="批次号"
                    value={item.batchNo || ''}
                    onChange={e => updateItem(item.id, 'batchNo', e.target.value)}
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    size="small"
                    displayEmpty
                    value={item.locationId || ''}
                    onChange={e => updateItem(item.id, 'locationId', e.target.value)}
                    sx={{ minWidth: 130 }}
                  >
                    <MenuItem value=""><em>不指定</em></MenuItem>
                    {(selectedWarehouse?.locations || []).map(l => (
                      <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => removeItem(item.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  暂无出库物料，请点击"添加物料"按钮添加
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary">
        指定批次号 / 库位后，确认出库将按 FIFO（先入库先出库）消耗对应批次库存。
      </Typography>
    </PageWrapper>
  );
};

export default OutboundForm;

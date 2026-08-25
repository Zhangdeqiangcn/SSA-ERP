import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Divider, Stack,
  Stepper, Step, StepLabel, StepContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, LinearProgress,
  Card, CardContent, Alert, Snackbar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import OutputIcon from '@mui/icons-material/Output';
import InventoryIcon from '@mui/icons-material/Inventory';
import { FlowTracker, ConfirmDialog, PrintPreviewButton } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { useBOMStore } from '@/stores/bomStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { BOMItem } from '@/types/bom';

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  released: { label: '已下达', color: 'info' },
  in_progress: { label: '生产中', color: 'warning' },
  completed: { label: '已完工', color: 'success' },
  closed: { label: '已关闭', color: 'default' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: 'default' | 'error' | 'warning' | 'info' }> = {
  urgent: { label: '紧急', color: 'error' },
  high: { label: '高', color: 'warning' },
  normal: { label: '正常', color: 'info' },
  low: { label: '低', color: 'default' },
};

const OP_STATUS_ICON = {
  completed: <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />,
  in_progress: <AccessTimeIcon sx={{ color: 'warning.main', fontSize: 20 }} />,
  pending: <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />,
};

// 多级 BOM 展开：递归下钻子装配（children），按物料编码聚合到最底层领料明细，
// 并计入废品率(scrapRate)，使生产领料与实际耗用更贴合。
const explodeBOM = (
  items: BOMItem[],
  qtyPer: number,
  acc: Map<string, { item: BOMItem; quantity: number }>
) => {
  for (const it of items) {
    const baseQty = (it.quantity || 0) * qtyPer;
    const withScrap = baseQty * (1 + (it.scrapRate || 0) / 100);
    if (it.children && it.children.length > 0) {
      explodeBOM(it.children, withScrap, acc);
    } else {
      const existing = acc.get(it.materialCode);
      if (existing) existing.quantity += withScrap;
      else acc.set(it.materialCode, { item: it, quantity: withScrap });
    }
  }
};

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeStep] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  const workOrders = useProductionStore(s => s.workOrders);
  const deleteWorkOrder = useProductionStore(s => s.deleteWorkOrder);
  const completeWorkOrder = useProductionStore(s => s.completeWorkOrder);
  const { bomList, bomTreeData } = useBOMStore();
  const { addOutboundOrder } = useWarehouseStore();
  const wo = workOrders.find(w => w.id === id);

  // BOM 物料清单（多级展开用），提升到组件作用域供领料出库与打印共用
  const bom = bomList.find(b => b.id === wo?.bomId || b.productCode === wo?.productCode);
  const sourceItems = bom?.items && bom.items.length > 0
    ? bom.items
    : bomTreeData.filter(t => t.bomId === (bom?.id || ''));

  if (!wo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">工单不存在</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/production/orders')}>
          返回列表
        </Button>
      </Box>
    );
  }

  const handleShare = () => {
    const text = `工单 ${wo.orderNo}\n产品：${wo.productName}\n数量：${wo.plannedQuantity}\n状态：${wo.status}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  // ── 生成领料出库单（多级 BOM 展开 + 事件驱动库存扣减）──
  const handleGenOutbound = () => {
    if (!sourceItems || sourceItems.length === 0) {
      alert('未找到对应的BOM物料清单，请先创建BOM');
      return;
    }

    // 多级展开 + 按物料编码聚合（含废品率）
    const acc = new Map<string, { item: BOMItem; quantity: number }>();
    explodeBOM(sourceItems, wo.plannedQuantity, acc);
    const items = Array.from(acc.values()).map(({ item, quantity }, idx) => ({
      id: `oob-wo-${idx}`,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.materialSpec || '',
      unit: item.unit,
      quantity: Math.max(1, Math.ceil(quantity)),
    }));
    if (items.length === 0) {
      alert('BOM 未包含可展开的下级物料');
      return;
    }

    const now = new Date().toISOString();
    const seq = String(Date.now()).slice(-6);
    const outboundNo = `OUT-WO-${seq}`;
    const outboundId = `out-wo-${Date.now()}`;

    // status: completed 触发仓库 store 事件驱动自动扣减库存（生产 → 库存 关联闭环）
    addOutboundOrder({
      id: outboundId,
      outboundNo,
      type: 'pick' as const,
      sourceNo: wo.orderNo,
      status: 'completed',
      warehouseId: 'WH-001',
      warehouseName: '原材料仓',
      operator: wo.supervisor || '生产主管',
      outboundDate: now.split('T')[0],
      remarks: `生产领料 - 工单${wo.orderNo} - ${wo.productName}`,
      items,
      createdAt: now,
      updatedAt: now,
      createdBy: wo.supervisor || 'system',
      updatedBy: wo.supervisor || 'system',
    });

    alert(`已生成领料出库单 ${outboundNo}，共 ${items.length} 种物料，库存已自动扣减`);
    navigate('/warehouse/outbound');
  };

  // ── 生成成品入库单（B3 完工回写：调用 completeWorkOrder → 自动回写工单 + 过账库存 + 生产成本凭证）──
  const handleGenFGInbound = () => {
    const ok = completeWorkOrder(wo.id, {
      completedQuantity: wo.plannedQuantity,
      scrapQuantity: 0,
      operator: wo.supervisor || '生产主管',
    });
    if (!ok) {
      alert('该工单无法完工（可能已完工/已关闭，或缺少对应成品主数据）');
      return;
    }
    alert(`工单 ${wo.orderNo} 已完工回写：成品入库、库存过账、生产成本凭证已自动生成`);
    navigate('/warehouse/inbound');
  };

  const statusConf = STATUS_CONFIG[wo.status];
  const priorityConf = PRIORITY_CONFIG[wo.priority];
  const completionPct = wo.plannedQuantity > 0 ? Math.round((wo.completedQuantity / wo.plannedQuantity) * 100) : 0;

  const currentOpIndex = wo.progress
    ? wo.progress.findIndex(p => p.status === 'in_progress' || p.status === 'pending')
    : -1;

  return (
    <Box sx={{ p: 3 }}>
      {/* 顶栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/production/orders')}>
          返回
        </Button>
        <Typography variant="h5" fontWeight={700}>工单详情</Typography>
        <FlowTracker module="work-order" currentStatus={wo.status} documentNo={wo.orderNo} />
        <Chip label={statusConf.label} color={statusConf.color} size="small" />
        <Chip label={priorityConf.label} color={priorityConf.color} size="small" variant="outlined" />
        <Box flex={1} />
        <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => navigate(`/production/orders/${id}/edit`)}>编辑</Button>
        <Button variant="contained" size="small" color="success" startIcon={<OutputIcon />}
          onClick={handleGenOutbound} disabled={wo.status === 'draft' || wo.status === 'closed'}>
          生成领料出库
        </Button>
        <Button variant="contained" size="small" color="primary" startIcon={<InventoryIcon />}
          onClick={handleGenFGInbound} disabled={wo.status === 'draft' || wo.status === 'closed'}>
          生成成品入库
        </Button>
        <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteDialog(true)}>删除</Button>
        <Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={handleShare}>分享</Button>
        <PrintPreviewButton
          entity="workOrder"
          record={{
            workOrderNo: wo.orderNo,
            productName: wo.productName,
            bomName: wo.bomNo,
            quantity: wo.plannedQuantity,
            plannedStartDate: wo.plannedStartDate,
            plannedEndDate: wo.plannedEndDate,
            status: wo.status,
            remarks: wo.note,
            items: sourceItems.map((i: any) => ({
              materialCode: i.materialCode, materialName: i.materialName, specification: i.materialSpec || i.specification,
              unit: i.unit, quantity: i.quantity, unitPrice: i.unitCost, amount: i.totalCost,
            })),
          }}
          showBoth
        />
        <Typography variant="body2" color="text.secondary">{wo.orderNo}</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 左侧：基本信息 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, mb: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>基本信息</Typography>
            <Divider sx={{ mb: 2 }} />
            {[
              { label: '产品编码', value: wo.productCode },
              { label: '产品名称', value: wo.productName },
              { label: 'BOM编号', value: wo.bomNo },
              { label: '工艺路线', value: wo.routeNo },
              { label: '生产车间', value: wo.workshop },
              { label: '生产主管', value: wo.supervisor },
              ...(wo.projectNo ? [{ label: '项目编号', value: wo.projectNo }, { label: '项目名称', value: wo.projectName || '-' }] : []),
              { label: '计划开始', value: wo.plannedStartDate },
              { label: '计划结束', value: wo.plannedEndDate },
              ...(wo.actualStartDate ? [{ label: '实际开始', value: wo.actualStartDate }] : []),
              ...(wo.actualEndDate ? [{ label: '实际完成', value: wo.actualEndDate }] : []),
            ].map(row => (
              <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
              </Box>
            ))}
          </Paper>

          {/* 生产进度卡 */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>生产进度</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                <Typography variant="h3" fontWeight={700} color="primary">{completionPct}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={completionPct} sx={{ my: 1.5, height: 8, borderRadius: 4 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">已完工：{wo.completedQuantity} 件</Typography>
                <Typography variant="caption" color="text.secondary">计划：{wo.plannedQuantity} 件</Typography>
              </Box>
              {wo.scrapQuantity > 0 && (
                <Typography variant="caption" color="error">报废：{wo.scrapQuantity} 件</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧：工序进度 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>工序执行进度</Typography>
            <Divider sx={{ mb: 2.5 }} />

            {wo.progress && wo.progress.length > 0 ? (
              <Stepper orientation="vertical" activeStep={currentOpIndex >= 0 ? currentOpIndex : wo.progress.length}>
                {wo.progress.map((op, idx) => (
                  <Step key={op.operationId} completed={op.status === 'completed'} active={op.status === 'in_progress'}>
                    <StepLabel
                      icon={OP_STATUS_ICON[op.status]}
                      optional={
                        <Typography variant="caption" color="text.secondary">
                          {op.status === 'completed' && op.endTime
                            ? `完工时间：${new Date(op.endTime).toLocaleString('zh-CN')}`
                            : op.status === 'in_progress' && op.startTime
                            ? `开始时间：${new Date(op.startTime).toLocaleString('zh-CN')}`
                            : '待开始'}
                        </Typography>
                      }
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{op.operationName}</Typography>
                        <Chip
                          label={op.status === 'completed' ? '已完成' : op.status === 'in_progress' ? '进行中' : '待处理'}
                          size="small"
                          color={op.status === 'completed' ? 'success' : op.status === 'in_progress' ? 'warning' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ display: 'flex', gap: 3, py: 1 }}>
                        {op.operator && (
                          <Typography variant="caption" color="text.secondary">操作员：<b>{op.operator}</b></Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          已完成数量：<b>{op.completedQuantity}</b> 件
                        </Typography>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>工单尚未下达，暂无工序进度。</Alert>
                <Typography variant="body2" color="text.secondary">
                  工单状态：{statusConf.label}。下达后工序进度将在此显示。
                </Typography>
              </Box>
            )}
          </Paper>

          {/* 备注 */}
          {wo.note && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>备注</Typography>
              <Typography variant="body2">{wo.note}</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
      <ConfirmDialog
        open={deleteDialog}
        title="确认删除"
        content={`确定删除工单"${wo.orderNo}"吗？此操作不可撤销。`}
        onConfirm={() => { deleteWorkOrder(wo.id); setDeleteDialog(false); navigate('/production/orders'); }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        type="danger"
      />
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="分享内容已复制到剪贴板"
      />
    </Box>
  );
}

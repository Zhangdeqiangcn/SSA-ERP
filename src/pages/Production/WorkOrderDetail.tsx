import { useState, useMemo, useCallback } from 'react';
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
import { useProductionStore, CompleteWorkOrderResult } from '@/stores/productionStore';
import { resolveBOM, topLevelItems } from '@/utils/bomResolver';
import { useBOMStore } from '@/stores/bomStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import SubstituteAdvisor from '@/components/material/SubstituteAdvisor';
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

// 多级 BOM 展开：递归下钻子装配（children / childProductCode），按物料编码聚合到最底层领料明细，
// 并计入废品率(scrapRate)，使生产领料与实际耗用更贴合。
//
// ★ V3.20.0：本函数与服务端「完工倒冲发料」的展开规则
//   （functions/_shared/backflush.ts 的 expandLevel）必须**逐条一致**（坑㉛）。
//   两处口径一旦分叉，就会出现「界面提示领 100、系统实际扣了 120」这种最难查的问题。
//   此前这里缺两条规则，本次已补齐：
//     ① 虚项（source='phantom'）本身不领料，只透传展开其子件
//        —— BOM 详情页的领料清单本来就是 `.filter(item => item.source !== 'phantom')`，
//           与那一处对齐后，三处（BOM 详情 / 工单领料建议 / 服务端倒冲）口径统一；
//     ② childProductCode 引用的子装配要展开
//        —— 原来直接当叶子处理，会少算子装配下的全部用料。
//   改这里时请同步改服务端，反之亦然。
const explodeBOM = (
  items: BOMItem[],
  qtyPer: number,
  acc: Map<string, { item: BOMItem; quantity: number }>,
  bomByProduct: (code: string) => BOMItem[] | undefined,
  depth = 1
) => {
  // 深度上限与服务端 MAX_BOM_DEPTH 一致：防 A 用 B、B 用 A 的循环引用把递归打穿
  if (depth > 12) return;
  for (const it of items) {
    const baseQty = (it.quantity || 0) * qtyPer;
    const withScrap = baseQty * (1 + (it.scrapRate || 0) / 100);
    if (it.children && it.children.length > 0) {
      explodeBOM(it.children, withScrap, acc, bomByProduct, depth + 1);
      continue;
    }
    if (it.childProductCode) {
      const childItems = bomByProduct(it.childProductCode);
      if (childItems && childItems.length > 0) {
        explodeBOM(childItems, withScrap, acc, bomByProduct, depth + 1);
        continue;
      }
    }
    if (it.source === 'phantom') continue; // 虚项不领料（见上方说明①）
    const existing = acc.get(it.materialCode);
    if (existing) existing.quantity += withScrap;
    else acc.set(it.materialCode, { item: it, quantity: withScrap });
  }
};

/** 完工倒冲结果（去掉 undefined，便于用 null 表达「本次未产生结果」） */
type BackflushInfo = NonNullable<CompleteWorkOrderResult['backflush']>;

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeStep] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  // ★ V3.20.0 差距13：完工后服务端返回的「原料倒冲发料」结果（扣了哪些料、多少、出库单号）
  const [backflush, setBackflush] = useState<BackflushInfo | null>(null);

  const workOrders = useProductionStore(s => s.workOrders);
  const deleteWorkOrder = useProductionStore(s => s.deleteWorkOrder);
  const completeWorkOrder = useProductionStore(s => s.completeWorkOrder);
  const issueMaterials = useProductionStore(s => s.issueMaterials);
  const { bomList, bomTreeData } = useBOMStore();
  const { addOutboundOrder } = useWarehouseStore();
  const wo = workOrders.find(w => w.id === id);

  // BOM 物料清单（多级展开用），提升到组件作用域供领料出库与打印共用
  // ★ V3.46.0 收敛到 resolveBOM：原式 `find(b => b.id === wo?.bomId || b.productCode === ...)`
  //   没有 released 优先也没有效期判定，列表顺序一变就换一张 BOM，
  //   且 EBOM/MBOM 的 productCode 相同 → 永远拿数组第一张（EBOM）冒充 MBOM。
  const bom = resolveBOM(bomList, wo?.productCode || '', { bomId: wo?.bomId });
  const sourceItems = bom?.items && bom.items.length > 0
    ? bom.items
    : bomTreeData.filter(t => t.bomId === (bom?.id || ''));

  // V2.85.0 C9 深化：物料主数据（取替代料可用量 currentStock）
  const materials = useMaterialStore((s) => s.materials);
  const materialByCode = useMemo(() => new Map(materials.map((m) => [m.code, m])), [materials]);

  // 子装配解析器：productCode → 该产品的顶层明细行。
  // 与上面同用 resolveBOM（同一张工单在领料页/成本页必须挂同一张 BOM）。
  const bomByProduct = useCallback((code: string): BOMItem[] | undefined => {
    return topLevelItems(resolveBOM(bomList, code));
  }, [bomList]);

  // 多级展开 + 按物料编码聚合（含废品率），得到领料明细与现有库存/缺料量，供缺料预警与替代料建议
  const pickingList = useMemo(() => {
    if (!sourceItems || sourceItems.length === 0) return [];
    const acc = new Map<string, { item: BOMItem; quantity: number }>();
    explodeBOM(sourceItems, wo?.plannedQuantity || 0, acc, bomByProduct);
    return Array.from(acc.values()).map(({ item, quantity }) => {
      const qty = Math.max(1, Math.ceil(quantity));
      const stock = materialByCode.get(item.materialCode)?.currentStock || 0;
      return {
        materialCode: item.materialCode,
        materialName: item.materialName,
        unit: item.unit,
        quantity: qty,
        stock,
        short: Math.max(0, qty - stock),
      };
    });
  }, [sourceItems, wo?.plannedQuantity, materialByCode, bomByProduct]);

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

  // ── 生成领料出库单（B2-② 工单领料联动：调用 issueMaterials → 生成出库单 + 扣减库存 + 回写工单）──
  const handleGenOutbound = () => {
    if (!sourceItems || sourceItems.length === 0) {
      alert('未找到对应的BOM物料清单，请先创建BOM');
      return;
    }
    // 幂等守卫：已领料则不再重复生成
    if (wo.issuedMaterials && wo.issuedMaterials.length > 0) {
      alert('本工单已领料，不可重复领料');
      return;
    }

    // 多级展开 + 按物料编码聚合（含废品率）
    const acc = new Map<string, { item: BOMItem; quantity: number }>();
    explodeBOM(sourceItems, wo.plannedQuantity, acc, bomByProduct);
    const items = Array.from(acc.values()).map(({ item, quantity }, idx) => ({
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      unit: item.unit,
      quantity: Math.max(1, Math.ceil(quantity)),
    }));
    if (items.length === 0) {
      alert('BOM 未包含可展开的下级物料');
      return;
    }

    // 调用 store 方法：检查库存 → 生成出库单 → 扣减库存 → 回写工单领料明细
    const result = issueMaterials(wo.id, items);
    if (!result.ok) {
      alert(result.reason || '领料失败，请检查库存是否充足');
      return;
    }
    alert(`领料成功！出库单号：${result.outboundNo}，共 ${items.length} 种物料`);
    navigate('/warehouse/outbound');
  };

  // ── 生成成品入库单（B3 完工回写：调用 completeWorkOrder → 自动回写工单 + 过账库存 + 生产成本凭证）──
  // ★ V3.20.0 差距13：完工同时会由**服务端**按物料清单倒冲扣减原料。
  //   这里不再「弹个提示就走」——把服务端返回的扣料明细留在页面上（setBackflush），
  //   否则用户看到的现象是「点完工后原料库存凭空少了一截，查不到出处」。
  const handleGenFGInbound = async () => {
    const result = await completeWorkOrder(wo.id, {
      completedQuantity: wo.plannedQuantity,
      scrapQuantity: 0,
      operator: wo.supervisor || '生产主管',
    });
    if (!result.ok) {
      alert(result.reason || '该工单无法完工（可能已完工/已关闭，或缺少对应成品主数据）');
      return;
    }
    setBackflush(result.backflush || null);
    const bf = result.backflush;
    const bfText = bf
      ? bf.posted
        ? `\n\n原料倒冲：${bf.message}`
        : `\n\n原料未自动倒冲：${bf.message}`
      : '\n\n（未登录/离线，未执行服务端倒冲与过账）';
    alert(`工单 ${wo.orderNo} 已完工回写：成品入库、库存过账、生产成本凭证已自动生成${bfText}`);
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
        {/* V3.20.0 差距13：原料倒冲状态在顶栏一眼可见（含出库单号，可直追扣料单据） */}
        {wo.inventoryPosted && (
          <Chip
            label={`原料已倒冲${wo.backflushOutboundNo ? ` · ${wo.backflushOutboundNo}` : ''}`}
            color="success"
            size="small"
            variant="outlined"
          />
        )}
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

      {/* ★ V3.20.0 差距13：已完工但原料没倒冲 —— 必须显式提示。
          这类工单的原料账根本没动过（成品凭空入库），若界面上不提示，
          用户永远不会知道要去补一笔领料。历史遗留的已完工工单也会命中这条，
          那正是实情，需要人工补领料，因此不做「只对新单提示」的特殊处理。 */}
      {wo.status === 'completed' && !wo.inventoryPosted && !backflush && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          本工单已完工，但<strong>原料未自动倒冲扣账</strong>（可能缺少物料清单 BOM、或清单内的料号在物料主数据中不存在）。
          这会造成「成品已入库、原料账未减」的账实不符。请到「出库单」手工生成一张领料出库单补记。
        </Alert>
      )}

      {/* ★ V3.20.0 差距13：完工倒冲发料结果。
          为什么要在页面上留这一块：倒冲是「服务端自动扣原料库存」的动作，
          如果不显示，用户只会看到库存莫名减少、查不到出处。
          这块面板把「扣了哪些料、每项扣多少、对应哪张出库单」摆出来，做到可追溯。 */}
      {backflush && (
        <Alert
          severity={backflush.posted ? 'success' : 'warning'}
          sx={{ mb: 3 }}
          onClose={() => setBackflush(null)}
          data-testid="wo-backflush-panel"
        >
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            原料倒冲发料（完工自动扣料）
          </Typography>
          <Typography variant="body2">{backflush.message}</Typography>
          {backflush.lines && backflush.lines.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>物料编码</TableCell>
                      <TableCell>物料名称</TableCell>
                      <TableCell align="right">应耗用</TableCell>
                      <TableCell align="right">已手工领用</TableCell>
                      <TableCell align="right">本次倒冲扣减</TableCell>
                      <TableCell>说明</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backflush.lines.map((l, i) => (
                      <TableRow key={`${l.materialCode}-${i}`}>
                        <TableCell>{l.materialCode}</TableCell>
                        <TableCell>{l.materialName}</TableCell>
                        <TableCell align="right">{l.requiredQty} {l.unit}</TableCell>
                        <TableCell align="right">{l.issuedQty} {l.unit}</TableCell>
                        <TableCell align="right">
                          <Typography component="span" fontWeight={l.backflushQty > 0 ? 700 : 400}>
                            {l.backflushQty} {l.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {l.outcome === 'posted' && '已倒冲扣账'}
                          {l.outcome === 'covered' && '已被手工领料覆盖，不重复扣'}
                          {l.outcome === 'missing_material' && '物料主数据中不存在此料号，未扣减'}
                          {l.outcome === 'phantom_skipped' && '虚项，本身不领料'}
                          {l.outcome === 'expanded' && '子装配，已展开为其子件（本身不领料）'}
                          {l.outcome === 'missing_bom' && '引用的子装配清单不存在，此部分用量被跳过，请人工确认'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {backflush.posted && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  材料成本合计 {backflush.totalCost} 元
                  {backflush.outboundNo ? `，出库单号 ${backflush.outboundNo}` : ''}
                  （扣减同时已生成库存凭证，可在「出库单」「凭证」中查到）
                </Typography>
              )}
            </Box>
          )}
          <Box sx={{ mt: 1.5 }}>
            <Button size="small" variant="outlined" onClick={() => navigate('/warehouse/inbound')}>
              查看成品入库单
            </Button>
            {backflush.posted && backflush.outboundNo && (
              <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={() => navigate('/warehouse/outbound')}>
                查看倒冲出库单
              </Button>
            )}
          </Box>
        </Alert>
      )}

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

      {/* 缺料预警与替代料建议（V2.85.0 C9 深化）：库存不足时按优先级推荐可用替代料 */}
      {pickingList.length > 0 && (
        <Paper sx={{ p: 2.5, mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            缺料预警与替代料建议（按 BOM 展开）
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {pickingList.some((p) => p.short > 0) ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              共 {pickingList.filter((p) => p.short > 0).length} 种物料库存不足，可考虑下方替代料（按优先级推荐，可完全替代优先）。
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              所有领料物料库存充足，无需替代。
            </Alert>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>需求</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>现有库存</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>缺料</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>替代料建议（按优先级）</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pickingList.map((p) => (
                  <TableRow key={p.materialCode} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{p.materialCode}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.materialName}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{p.quantity} {p.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{p.stock} {p.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={p.short > 0 ? 'error.main' : 'success.main'}>
                        {p.short > 0 ? `${p.short} ${p.unit}` : '0'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {p.short > 0 ? (
                        <SubstituteAdvisor materialCode={p.materialCode} neededQty={p.short} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">库存充足</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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

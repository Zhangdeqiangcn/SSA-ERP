import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, Stack, Alert, Divider, Card, CardContent,
  TextField, IconButton, Tooltip, Select, MenuItem,
} from '@mui/material';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore } from '@/stores/productionOperationStore';
// V3.66.0 P0-3 生产投诉推供应商门户（双写：门户 issue + NCR 带 vendor 归属）
import { useFlowStore } from '@/stores/flowStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useVendorStore } from '@/stores/vendorStore';

const nowISO = () => new Date().toISOString();
const toLocal = (iso?: string) => (iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-');

const OPEN_STATUSES = ['draft', 'released', 'in_progress'];
const WO_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', released: '已下达', in_progress: '生产中', completed: '已完成', closed: '已关闭',
};
const WO_STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'secondary'> = {
  draft: 'default', released: 'info', in_progress: 'warning', completed: 'success', closed: 'secondary',
};
const OP_STATUS_LABEL: Record<string, string> = {
  pending: '未开始', in_progress: '进行中', completed: '已完成',
};
const OP_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success'> = {
  pending: 'default', in_progress: 'warning', completed: 'success',
};

interface ReportDraft {
  goodQuantity: string;
  scrapQuantity: string;
  operator: string;
  startTime: string;
  endTime: string;
  note: string;
  /** V3.66.0 P0-3：报废责任供应商（可选，选了才推门户/NCR） */
  responsibleVendorId: string;
}

export default function OperationReporting() {
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { operationReports, addOperationReport, removeOperationReport } = useProductionOperationStore();
  // V3.66.0 P0-3：责任供应商下拉数据源（vendor_master 直连 D1）
  const { vendors } = useVendorStore();

  const [selectedWoId, setSelectedWoId] = useState<string>('');
  const [dialogOpId, setDialogOpId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReportDraft>({
    goodQuantity: '', scrapQuantity: '0', operator: '', startTime: '', endTime: '', note: '', responsibleVendorId: '',
  });

  const openWos = useMemo(
    () => workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)),
    [workOrders]
  );
  const selectedWo = useMemo(
    () => workOrders.find((wo) => wo.id === selectedWoId) || openWos[0] || null,
    [workOrders, openWos, selectedWoId]
  );

  const route = useMemo(() => {
    if (!selectedWo) return null;
    return (
      processRoutes.find((r) => r.id === selectedWo.routeId) ||
      processRoutes.find((r) => r.routeNo === selectedWo.routeNo) ||
      processRoutes.find((r) => r.productCode === selectedWo.productCode) ||
      null
    );
  }, [selectedWo, processRoutes]);

  // 当前工序的进度（合并 route.operations 与已有 progress）
  const operationRows = useMemo(() => {
    if (!route) return [];
    return route.operations
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((op) => {
        const prog = selectedWo?.progress?.find((p) => p.operationId === op.id);
        const reported = operationReports.filter(
          (r) => r.workOrderId === selectedWo?.id && r.operationId === op.id
        );
        return {
          op,
          status: prog?.status || 'pending',
          completedQuantity: prog?.completedQuantity ?? 0,
          reported,
        };
      });
  }, [route, selectedWo, operationReports]);

  const openReportDialog = (opId: string, defaultGood: number) => {
    setDialogOpId(opId);
    setDraft({
      goodQuantity: String(defaultGood),
      scrapQuantity: '0',
      operator: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date().toISOString().slice(0, 16),
      note: '',
      responsibleVendorId: '',
    });
  };

  const handleSubmit = () => {
    if (!selectedWo || !route || !dialogOpId) return;
    const op = route.operations.find((o) => o.id === dialogOpId);
    if (!op) return;
    const good = Math.max(0, Number(draft.goodQuantity) || 0);
    const scrap = Math.max(0, Number(draft.scrapQuantity) || 0);

    // 写报工记录（V3.66.0 P0-3：带责任供应商归属）
    addOperationReport({
      workOrderId: selectedWo.id,
      workOrderNo: selectedWo.orderNo,
      operationId: op.id,
      operationName: op.operationName,
      workCenter: op.workCenter,
      operator: draft.operator || '未指定',
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      goodQuantity: good,
      scrapQuantity: scrap,
      laborHours: Number(((op.setupTime + op.runTime * good) / 60).toFixed(2)),
      note: draft.note,
      vendorId: draft.responsibleVendorId || undefined,
      vendorName: vendors.find((v) => v.id === draft.responsibleVendorId)?.name || undefined,
    });

    // ── V3.66.0 P0-3 生产投诉推供应商门户（双写，根治「生产投诉追责链断裂」）──
    // 报废数 > 0 且选了责任供应商时：①推供应商门户一条 issue（issueType='production'）；
    // ②建 NCR（source='production_complaint'，带 vendorId/vendorName 归属，幂等锚定 工单+工序）。
    // 不选供应商则只报工、不追责（不误伤正常报废上报）。
    const responsibleVendor = vendors.find((v) => v.id === draft.responsibleVendorId);
    if (scrap > 0 && responsibleVendor) {
      const anchor = `prod-scrap-${selectedWo.id}-${op.id}`;
      const nowStr2 = () => {
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      };
      const ts = nowStr2();
      const issue = {
        id: anchor,
        issueNo: `VQI-PROD-${selectedWo.orderNo}-${op.operationName}`,
        vendorId: responsibleVendor.id,
        vendorName: responsibleVendor.name,
        materialCode: selectedWo.productCode,
        materialName: selectedWo.productName,
        batchNo: selectedWo.orderNo,
        issueType: 'production' as const,
        severity: (scrap >= good ? 'critical' : scrap > 0 ? 'major' : 'minor') as 'critical' | 'major' | 'minor',
        description: `生产报废投诉：工单 ${selectedWo.orderNo} 工序 ${op.operationName} 报废 ${scrap} 件（${draft.note || '车间上报'}），追责供应商 ${responsibleVendor.name}`,
        defectQty: scrap,
        totalQty: good + scrap,
        defectRate: good + scrap > 0 ? Number(((scrap / (good + scrap)) * 100).toFixed(1)) : 0,
        status: 'open' as const,
        createdAt: ts,
        updatedAt: ts,
        createdBy: '生产投诉自动推送',
        updatedBy: '生产投诉自动推送',
      };
      useFlowStore.getState().addVendorQualityIssue(issue);
      useQualityStore.getState().addVendorQualityIssue(issue);
    }

    // 更新工单进度 + 状态
    const progress = selectedWo.progress ? [...selectedWo.progress] : [];
    const idx = progress.findIndex((p) => p.operationId === op.id);
    const entry = {
      operationId: op.id,
      operationName: op.operationName,
      status: 'completed' as const,
      completedQuantity: good,
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      operator: draft.operator || '未指定',
    };
    if (idx >= 0) progress[idx] = entry;
    else progress.push(entry);

    // 计算整体状态 / 完成数 / 报废数
    const allOps = route.operations;
    const completedAll = allOps.every(
      (o) => progress.find((p) => p.operationId === o.id)?.status === 'completed'
    );
    const lastCompleted = [...progress]
      .filter((p) => p.status === 'completed')
      .sort((a, b) => {
        const sa = allOps.find((o) => o.id === a.operationId)?.sequence ?? 0;
        const sb = allOps.find((o) => o.id === b.operationId)?.sequence ?? 0;
        return sb - sa;
      })[0];
    const completedQty = lastCompleted ? lastCompleted.completedQuantity : selectedWo.completedQuantity;
    const scrapQty = operationReports
      .filter((r) => r.workOrderId === selectedWo.id)
      .reduce((s, r) => s + r.scrapQuantity, scrap);

    const nextStatus = completedAll ? 'completed' : 'in_progress';
    updateWorkOrder(selectedWo.id, {
      progress,
      completedQuantity: completedQty,
      scrapQuantity: scrapQty,
      status: nextStatus,
      actualStartDate: selectedWo.actualStartDate || nowISO(),
      actualEndDate: completedAll ? nowISO() : selectedWo.actualEndDate,
    });

    setDialogOpId(null);
  };

  return (
    <PageWrapper
      title="工序报工"
      subtitle="车间执行层数据采集：按工单逐工序上报合格/报废，自动回写工单进度与完工状态"
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        报工会实时写入<strong>工序报工记录</strong>并回写对应工单的「工序进度」。当工单全部工序报工完成，工单状态自动置为<strong>已完成</strong>。
        数据同时驱动「WIP 看板」与「成本归集」页面。
      </Alert>

      <Grid container spacing={2}>
        {/* 左：未完工工单列表 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, maxHeight: 620, overflow: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <PlaylistAddCheckIcon sx={{ color: '#3B82F6' }} />
              <Typography variant="subtitle1" fontWeight={600}>未完工工单（{openWos.length}）</Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1}>
              {openWos.map((wo) => (
                <Card
                  key={wo.id}
                  variant={selectedWo?.id === wo.id ? 'elevation' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 2,
                    borderColor: selectedWo?.id === wo.id ? '#3B82F6' : 'divider',
                    boxShadow: selectedWo?.id === wo.id ? '0 0 0 2px #3B82F633' : 'none',
                  }}
                  onClick={() => setSelectedWoId(wo.id)}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={600}>{wo.orderNo}</Typography>
                      <Chip label={WO_STATUS_LABEL[wo.status]} size="small" color={WO_STATUS_COLOR[wo.status]} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{wo.productName}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      计划 {wo.plannedQuantity} 件 · 已报 {wo.completedQuantity} 件
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {openWos.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  当前没有未完工工单。
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* 右：工序报工 */}
        <Grid item xs={12} md={8}>
          {selectedWo && route ? (
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selectedWo.orderNo} · {route.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    产品 {selectedWo.productName} · 计划 {selectedWo.plannedQuantity} 件
                  </Typography>
                </Box>
                <Chip label={WO_STATUS_LABEL[selectedWo.status]} color={WO_STATUS_COLOR[selectedWo.status]} />
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>序号</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>工序</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>已合格</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operationRows.map(({ op, status, completedQuantity, reported }) => (
                      <TableRow key={op.id} hover>
                        <TableCell>{op.sequence}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{op.operationName}</Typography>
                          <Typography variant="caption" color="text.secondary">{op.operationCode}</Typography>
                        </TableCell>
                        <TableCell>{op.workCenter}</TableCell>
                        <TableCell>
                          <Chip label={OP_STATUS_LABEL[status]} size="small" color={OP_STATUS_COLOR[status]} />
                        </TableCell>
                        <TableCell align="right">{completedQuantity}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={status === 'completed' ? 'outlined' : 'contained'}
                            onClick={() => openReportDialog(op.id, selectedWo.plannedQuantity)}
                          >
                            {status === 'completed' ? '重报' : '报工'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 已报工记录 */}
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <HistoryIcon sx={{ color: '#8B5CF6' }} />
                  <Typography variant="subtitle2" fontWeight={600}>本工单报工记录</Typography>
                </Stack>
                {operationReports.filter((r) => r.workOrderId === selectedWo.id).length === 0 ? (
                  <Typography variant="caption" color="text.secondary">暂无报工记录。</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>工序</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>操作工</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>合格</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>报废</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>上报时间</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {operationReports
                          .filter((r) => r.workOrderId === selectedWo.id)
                          .map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell>{r.operationName}</TableCell>
                              <TableCell>{r.operator}</TableCell>
                              <TableCell align="right">{r.goodQuantity}</TableCell>
                              <TableCell align="right">{r.scrapQuantity}</TableCell>
                              <TableCell>{toLocal(r.reportedAt)}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="删除报工">
                                  <IconButton size="small" color="error" onClick={() => removeOperationReport(r.id)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary">请选择左侧工单进行报工。</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* 报工弹窗 */}
      <Dialog open={dialogOpId !== null} onClose={() => setDialogOpId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          工序报工
          {dialogOpId && route
            ? ` · ${route.operations.find((o) => o.id === dialogOpId)?.operationName ?? ''}`
            : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="合格数量"
              type="number"
              size="small"
              value={draft.goodQuantity}
              onChange={(e) => setDraft((d) => ({ ...d, goodQuantity: e.target.value }))}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="报废数量"
              type="number"
              size="small"
              value={draft.scrapQuantity}
              onChange={(e) => setDraft((d) => ({ ...d, scrapQuantity: e.target.value }))}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="操作工"
              size="small"
              value={draft.operator}
              onChange={(e) => setDraft((d) => ({ ...d, operator: e.target.value }))}
              fullWidth
            />
            <TextField
              label="开工时间"
              type="datetime-local"
              size="small"
              value={draft.startTime}
              onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="完工时间"
              type="datetime-local"
              size="small"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="备注"
              size="small"
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
            <div>
              <Typography variant="caption" sx={{ color: '#8A8F9C' }}>
                V3.66.0 P0-3：报废责任供应商（可选，选了才推供应商门户/NCR 追责）
              </Typography>
              <Select
                size="small"
                value={draft.responsibleVendorId}
                onChange={(e) => setDraft((d) => ({ ...d, responsibleVendorId: e.target.value }))}
                displayEmpty
                fullWidth
                sx={{ mt: 0.5 }}
              >
                <MenuItem value=""><em>不追责（仅报工）</em></MenuItem>
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                ))}
              </Select>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpId(null)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>提交报工</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}

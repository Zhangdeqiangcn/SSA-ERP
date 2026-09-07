import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Button, Stack, LinearProgress, Paper, Grid,
} from '@mui/material';
import { QrCodeScanner, Inventory2, ChevronRight, Verified, ErrorOutline } from '@mui/icons-material';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import type { InboundOrder } from '@/types/warehouse';
import type { InspectionTask, UnqualifiedItem } from '@/types/quality';

const TYPE_LABEL: Record<string, string> = {
  purchase: '采购入库',
  production: '生产入库',
  sales: '销售退货',
  subcontract: '委外入库',
  transfer: '调拨入库',
  other: '其他入库',
};

/** 单据收货进度：已填实收（>0）的行数 / 总行数 */
function progress(o: InboundOrder): { done: number; total: number } {
  const items = o.items || [];
  return { done: items.filter((i) => (i.actualQuantity || 0) > 0).length, total: items.length };
}

/**
 * 移动门户首页 —— 仓库作业中心。
 * 数据来自真实 D1（App 启动期 loadWarehouseOrders / loadCheckTasks 拉取；未登录/离线自动回退本地演示）。
 * 汇聚「扫码入库 / 待盘点 / 待质检 / 待处置」四类待办，点卡片直达对应作业页。
 */
const MobileHome: React.FC = () => {
  const nav = useNavigate();
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const checkTasks = useWarehouseStore((s) => s.checkTasks);
  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  const unqualifiedItems = useQualityStore((s) => s.unqualifiedItems);

  const tasks = useMemo(
    () => inboundOrders
      .filter((o) => o.status === 'pending' || o.status === 'processing')
      .sort((a, b) => String(b.inboundDate).localeCompare(String(a.inboundDate))),
    [inboundOrders],
  );

  // V2.81.0 首页作业中心：盘点/质检待办聚合（数据均直连真实 D1）
  const openCheckTasks = useMemo(
    () => checkTasks.filter((t) => t.status !== 'completed'),
    [checkTasks],
  );
  const openInspects = useMemo(
    () => inspectionTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress'),
    [inspectionTasks],
  );
  const openUnqualified = useMemo(
    () => unqualifiedItems.filter((u) => u.dispositionStatus !== 'completed'),
    [unqualifiedItems],
  );

  return (
    <Box sx={{ p: 1.5 }}>
      {/* 主操作：扫码入库 */}
      <Paper
        onClick={() => nav('/m/inbound')}
        sx={{
          p: 2, mb: 2, borderRadius: 3, cursor: 'pointer',
          bgcolor: '#1E293B', color: '#F8FAFC',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}
      >
        <QrCodeScanner sx={{ fontSize: 40, color: '#60A5FA' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>扫码入库</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            扫描物料标签 → 录入实收 → 一键过账（自动写回云端）
          </Typography>
        </Box>
        <ChevronRight sx={{ color: '#64748B' }} />
      </Paper>

      {/* 待办快捷入口：盘点 / 质检（直连真实 D1） */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper
            onClick={() => nav('/m/stocktake')}
            sx={{
              p: 1.5, borderRadius: 3, cursor: 'pointer', height: '100%',
              display: 'flex', flexDirection: 'column', gap: 0.5,
              border: '1px solid #E2E8F0',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Inventory2 sx={{ fontSize: 26, color: '#0EA5E9' }} />
              <Typography variant="subtitle2" fontWeight={700}>盘点</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
              {openCheckTasks.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">项待盘点</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            onClick={() => nav('/m/quality')}
            sx={{
              p: 1.5, borderRadius: 3, cursor: 'pointer', height: '100%',
              display: 'flex', flexDirection: 'column', gap: 0.5,
              border: '1px solid #E2E8F0',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Verified sx={{ fontSize: 26, color: '#10B981' }} />
              <Typography variant="subtitle2" fontWeight={700}>质检</Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
              {openInspects.length + openUnqualified.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              待检 {openInspects.length} · 待处置 {openUnqualified.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        待入库任务（{tasks.length}）
      </Typography>

      {tasks.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Inventory2 sx={{ fontSize: 44, color: '#CBD5E1' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            暂无待入库任务。新单据创建后会自动出现在这里。
          </Typography>
        </Paper>
      )}

      <Stack spacing={1.5}>
        {tasks.map((o) => {
          const p = progress(o);
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Card
              key={o.id}
              onClick={() => nav(`/m/inbound?order=${o.id}`)}
              sx={{ borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {o.inboundNo}
                  </Typography>
                  <Chip size="small" label={TYPE_LABEL[o.type] || o.type} color="primary" variant="outlined" />
                  <Box sx={{ flex: 1 }} />
                  <ChevronRight sx={{ color: '#94A3B8' }} fontSize="small" />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {[o.vendorName, o.warehouseName].filter(Boolean).join(' · ')}
                  {` · ${o.inboundDate}`}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#E2E8F0' }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    收货进度 {p.done}/{p.total} 行 · {pct}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* 待盘点任务（直连真实 D1） */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
        待盘点任务（{openCheckTasks.length}）
      </Typography>
      {openCheckTasks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <Inventory2 sx={{ fontSize: 36, color: '#CBD5E1' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            暂无待盘点任务。
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {openCheckTasks.map((t) => (
            <Card
              key={t.id}
              onClick={() => nav(`/m/stocktake?task=${t.id}`)}
              sx={{ borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {t.taskNo}
                  </Typography>
                  <Chip
                    size="small"
                    label={t.type === 'full' ? '全盘' : '抽盘'}
                    color="info"
                    variant="outlined"
                  />
                  <Box sx={{ flex: 1 }} />
                  <ChevronRight sx={{ color: '#94A3B8' }} fontSize="small" />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {[t.warehouseName, t.operator].filter(Boolean).join(' · ')}
                  {` · ${t.startDate}`}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 待质检 / 待处置任务（直连真实 D1） */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
        待质检 / 待处置（{openInspects.length + openUnqualified.length}）
      </Typography>
      {openInspects.length === 0 && openUnqualified.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
          <Verified sx={{ fontSize: 36, color: '#CBD5E1' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            暂无待质检 / 待处置任务。
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {openInspects.map((t: InspectionTask) => (
            <Card
              key={t.id}
              onClick={() => nav('/m/quality')}
              sx={{ borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {t.taskNo}
                  </Typography>
                  <Chip size="small" label="待检" color="warning" variant="outlined" />
                  <Box sx={{ flex: 1 }} />
                  <ChevronRight sx={{ color: '#94A3B8' }} fontSize="small" />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {[t.materialName, t.vendorName].filter(Boolean).join(' · ')}
                  {` · 计划 ${t.plannedDate}`}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {openUnqualified.map((u: UnqualifiedItem) => (
            <Card
              key={u.id}
              onClick={() => nav('/m/quality')}
              sx={{ borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <ErrorOutline sx={{ color: '#EF4444', fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {u.itemNo}
                  </Typography>
                  <Chip size="small" label="待处置" color="error" variant="outlined" />
                  <Box sx={{ flex: 1 }} />
                  <ChevronRight sx={{ color: '#94A3B8' }} fontSize="small" />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {[u.materialName, `不良 ${u.defectQuantity}`].filter(Boolean).join(' · ')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button size="small" color="inherit" onClick={() => nav('/')} sx={{ color: 'text.secondary' }}>
          打开完整版（桌面视图）
        </Button>
      </Box>
    </Box>
  );
};

export default MobileHome;

import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, PlayCircle } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWaveRfidStore } from '@/stores/waveRfidStore';
import { WaveRfid, WAVE_STATUS_LABELS, WAVE_STRATEGY_LABELS } from '@/types';
import { formatDate } from '@/utils/format';

const WaveRfidDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const wave = useWaveRfidStore(s => s.waves.find(w => w.id === id)) as WaveRfid | undefined;
  const updateWave = useWaveRfidStore(s => s.updateWave);
  const load = useWaveRfidStore((s) => s.load);
  const loaded = useWaveRfidStore((s) => s.loaded);

  // V3.120.1：详情页必须自己拉一次 D1。
  // 此前本文件完全没有 useEffect/load()，而 store 的初始值是 mock 种子 ——
  // 于是「列表页显示 D1 真数据、详情页显示种子数据」同一模块两个数据源。
  // 直达/刷新详情页时尤其明显：整页刷新把 store 重置回种子，而详情页没人去拉 D1。
  useEffect(() => {
    load();
  }, [load]);

  // 操作历史：按波次生命周期关键节点合成（创建→已下达→拣货中→已完成/已关闭）
  const operationLogs = useMemo(() => {
    if (!wave) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: wave.createdBy, time: wave.createdAt, description: '创建波次' },
    ];
    if (wave.releasedAt) {
      logs.push({ id: 'op-released', action: 'approve', operator: wave.updatedBy, time: wave.releasedAt, description: '波次已下达，开始拣货' });
    }
    if (wave.status === 'in_progress') {
      logs.push({ id: 'op-picking', action: 'info', operator: wave.updatedBy, time: wave.updatedAt, description: '拣货进行中' });
    }
    if (wave.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: wave.updatedBy, time: wave.updatedAt, description: '波次拣货完成' });
    }
    if (wave.status === 'closed') {
      logs.push({ id: 'op-close', action: 'reject', operator: wave.updatedBy || wave.createdBy, time: wave.updatedAt, description: '波次已关闭' });
    }
    return logs;
  }, [wave]);

  if (!wave) {
    // ★ 加载中先不报「不存在」：直链进来时首屏 store 还是空的，
    //   若立刻弹「波次不存在」会被误判为真没有这条数据。
    if (!loaded) {
      return (
        <PageWrapper title="波次详情">
          <Alert severity="info">正在加载波次数据…</Alert>
        </PageWrapper>
      );
    }
    return (
      <PageWrapper title="波次详情">
        <Alert severity="warning">波次不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/wave-rfid')} sx={{ mt: 2 }}>返回波次列表</Button>
      </PageWrapper>
    );
  }

  const totalPlannedQty = wave.lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const totalPickedQty = wave.lines.reduce((s, l) => s + (l.pickedQty || 0), 0);

  const basicFields = [
    { label: '波次号', value: wave.waveNo },
    { label: '状态', value: <StatusBadge status={`wave_${wave.status}`} /> },
    { label: '波次名称', value: wave.name },
    { label: '分组策略', value: WAVE_STRATEGY_LABELS[wave.strategy] },
    { label: '仓库', value: wave.warehouseName || wave.warehouseId },
    { label: '订单数', value: wave.orderCount.toLocaleString() },
    { label: '行数', value: wave.lineCount.toLocaleString() },
    { label: '计划日期', value: formatDate(wave.plannedDate) },
    { label: '下达时间', value: wave.releasedAt ? formatDate(wave.releasedAt) : '-' },
    { label: '总需求数量', value: totalPlannedQty.toLocaleString() },
    { label: '总已拣数量', value: <strong style={{ color: '#1D4ED8' }}>{totalPickedQty.toLocaleString()}</strong> },
    { label: '备注', value: wave.note || '-' },
    { label: '创建人', value: wave.createdBy },
    { label: '创建时间', value: formatDate(wave.createdAt) },
    { label: '最后更新', value: formatDate(wave.updatedAt) },
  ];

  return (
    <>
      <ObjectPage docType="waveRfid" entity={wave}
        title={wave.waveNo}
        subtitle={wave.name}
        breadcrumbs={[{ label: '波次RFID', path: '/warehouse/wave-rfid' }]}
        status={<StatusBadge status={`wave_${wave.status}`} />}
        headerFields={[
          { label: '波次名称', value: wave.name },
          { label: '分组策略', value: WAVE_STRATEGY_LABELS[wave.strategy] },
          { label: '仓库', value: wave.warehouseName || wave.warehouseId },
          { label: '计划日期', value: formatDate(wave.plannedDate) },
          { label: '订单数', value: wave.orderCount.toLocaleString() },
          { label: '行数', value: wave.lineCount.toLocaleString() },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            {/* 下达并拣货：仅草稿态波次可操作，状态置为拣货中并记录下达时间（原列表 Dialog 动作，改版后迁至详情页） */}
            {wave.status === 'draft' && (
              <Button variant="contained" startIcon={<PlayCircle />}
                onClick={async () => {
                  const ts = new Date().toISOString();
                  await updateWave(wave.id, { status: 'in_progress', releasedAt: ts, updatedAt: ts });
                }}>下达并拣货</Button>
            )}
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/wave-rfid')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'lines',
            title: '拣货明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>拣货明细（{wave.lines.length} 行）</Typography>
                  <Typography variant="caption" color="text.secondary">已拣 {totalPickedQty.toLocaleString()} / 需求 {totalPlannedQty.toLocaleString()}</Typography>
                </Box>
                <DataTable
                  data={wave.lines}
                  enablePagination={false}
                  enableRowSelection={false}
                  sapStyle
                  columns={[
                    {
                      id: 'orderNo', header: '订单号',
                      cell: ({ row }) => <Box sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.orderNo}</Box>,
                    },
                    {
                      id: 'materialCode', header: '物料编码',
                      cell: ({ row }) => (
                        <Chip label={row.original.materialCode} size="small"
                          sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
                      ),
                    },
                    {
                      id: 'materialName', header: '物料名称',
                      cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box>,
                    },
                    {
                      id: 'quantity', header: '需求数量',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity.toLocaleString()}</Box>,
                    },
                    {
                      // 拣货进度着色：已拣 < 需求（未拣完）用 warning 提醒；已拣 = 需求（拣完）用 success。
                      id: 'pickedQty', header: '已拣数量',
                      cell: ({ row }) => {
                        const l = row.original;
                        const done = l.pickedQty >= l.quantity;
                        return (
                          <Box sx={{ textAlign: 'right', fontWeight: 500, color: done ? '#16A34A' : '#D97706' }}>
                            {l.pickedQty.toLocaleString()}
                          </Box>
                        );
                      },
                    },
                    {
                      id: 'location', header: '货位',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.location || '-'}</Box>,
                    },
                  ]}
                />
              </Paper>
            ),
          },
          ...(operationLogs.length > 0
            ? [{ id: 'logs', title: '操作历史', content: <OperationTimeline events={operationLogs} /> }]
            : []),
        ]}
      />
    </>
  );
};

export default WaveRfidDetail;

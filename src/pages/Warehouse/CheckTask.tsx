import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, CheckCircle, VisibilityOff } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { formatDate, formatCurrency } from '@/utils/format';

const CheckTask: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const checkTasks = useWarehouseStore(s => s.checkTasks);
  const postCheckAdjustment = useWarehouseStore(s => s.postCheckAdjustment);
  const task = checkTasks.find(t => t.id === id);
  const [items, setItems] = useState(task?.items || []);

  // 操作历史：按盘点任务生命周期合成（创建→完成/取消）
  const operationLogs = useMemo(() => {
    if (!task) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: task.operator, time: task.createdAt, description: '创建盘点任务' },
    ];
    if (task.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: task.operator, time: task.updatedAt, description: '盘点完成，差异已调整过账' });
    }
    if (task.status === 'cancelled') {
      logs.push({ id: 'op-cancel', action: 'reject', operator: task.updatedBy || task.operator, time: task.updatedAt, description: '盘点任务已取消' });
    }
    return logs;
  }, [task]);

  if (!task) {
    return (
      <PageWrapper title="盘点任务">
        <Alert severity="warning">盘点任务不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/check')} sx={{ mt: 2 }}>返回盘点列表</Button>
      </PageWrapper>
    );
  }

  const updateCount = (itemId: string, countQuantity: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          countQuantity,
          difference: countQuantity - item.bookQuantity,
        };
      }
      return item;
    }));
  };

  const completedCount = items.filter(i => i.countQuantity !== undefined).length;

  const handleComplete = () => {
    postCheckAdjustment(task!.id, items);
    navigate('/warehouse/check');
  };

  const basicFields = [
    { label: '任务编号', value: task.taskNo },
    { label: '盘点仓库', value: task.warehouseName || task.warehouseId },
    { label: '任务类型', value: task.type === 'full' ? '全盘' : '循环' },
    { label: '开始日期', value: formatDate(task.startDate) },
    { label: '结束日期', value: formatDate(task.endDate) },
    { label: '操作人', value: task.operator },
    { label: '状态', value: <StatusBadge status={task.status} /> },
    { label: '盲盘模式', value: task.blindMode ? '是' : '否' },
    { label: '差异金额', value: formatCurrency(task.differenceAmount) },
    { label: '备注', value: task.remarks || '-' },
    { label: '创建人', value: task.createdBy },
    { label: '创建时间', value: formatDate(task.createdAt) },
    { label: '最后更新人', value: task.updatedBy },
    { label: '最后更新时间', value: formatDate(task.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={task.taskNo}
        subtitle={task.warehouseName || '盘点任务'}
        breadcrumbs={[{ label: '库存盘点', path: '/warehouse/check' }]}
        status={<StatusBadge status={task.status} />}
        headerFields={[
          { label: '任务类型', value: task.type === 'full' ? '全盘' : '循环' },
          { label: '仓库', value: task.warehouseName || task.warehouseId },
          {
            label: '盘点日期',
            value: task.endDate ? `${formatDate(task.startDate)} ~ ${formatDate(task.endDate)}` : formatDate(task.startDate),
          },
          { label: '状态', value: <StatusBadge status={task.status} /> },
          { label: '操作人', value: task.operator },
          { label: '物料项数', value: `${task.items.length} 项` },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/check')}>
              返回
            </Button>
            <Button variant="contained" startIcon={<CheckCircle />} disabled={completedCount < items.length || task!.status === 'completed'} onClick={handleComplete}>
              完成盘点
            </Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'items',
            title: '盘点明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    盘点物料明细（{items.length} 项）
                    {task.blindMode && (
                      <Chip icon={<VisibilityOff />} label="盲盘模式" color="secondary" size="small" data-testid="check-blind-mode-indicator" />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">盘点进度：<strong>{completedCount} / {items.length}</strong></Typography>
                </Box>
                {task.blindMode && (
                  <Alert severity="info" sx={{ borderRadius: 0 }}>
                    盲盘模式已开启 —— 账面数量对盘点员隐藏，录入实盘数量后系统自动计算差异。
                  </Alert>
                )}
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>物料编码</TableCell>
                        <TableCell>物料名称</TableCell>
                        <TableCell>库位</TableCell>
                        {!task.blindMode && <TableCell>账面数量</TableCell>}
                        <TableCell>盘点数量</TableCell>
                        {!task.blindMode && <TableCell>差异</TableCell>}
                        <TableCell>状态</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.materialCode}</TableCell>
                          <TableCell>{item.materialName}</TableCell>
                          <TableCell>{item.locationName}</TableCell>
                          {!task.blindMode && <TableCell>{item.bookQuantity}</TableCell>}
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.countQuantity || ''}
                              onChange={e => updateCount(item.id, Number(e.target.value))}
                              sx={{ width: 100 }}
                              disabled={task.status === 'completed'}
                            />
                          </TableCell>
                          {!task.blindMode && (
                            <TableCell>
                              {item.difference !== undefined && (
                                <Typography color={item.difference === 0 ? 'success.main' : 'error.main'}>
                                  {item.difference > 0 ? '+' : ''}{item.difference}
                                </Typography>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {item.countQuantity !== undefined ? (
                              <Chip label="已盘点" color="success" size="small" />
                            ) : (
                              <Chip label="待盘点" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
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

export default CheckTask;

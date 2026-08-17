import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Alert } from '@mui/material';
import { ArrowBack, CheckCircle, VisibilityOff } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { formatDate } from '@/utils/format';

const CheckTask: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const checkTasks = useWarehouseStore(s => s.checkTasks);
  const postCheckAdjustment = useWarehouseStore(s => s.postCheckAdjustment);
  const task = checkTasks.find(t => t.id === id);
  const [items, setItems] = useState(task?.items || []);

  if (!task) {
    return (
      <PageWrapper title="盘点任务">
        <Box>盘点任务不存在</Box>
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

  return (
    <PageWrapper
      title={`盘点任务 - ${task.taskNo}`}
      actions={
        <Box>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/check')} sx={{ mr: 1 }}>
            返回
          </Button>
          <Button variant="contained" startIcon={<CheckCircle />} disabled={completedCount < items.length || task!.status === 'completed'} onClick={handleComplete}>
            完成盘点
          </Button>
        </Box>
      }
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>任务信息</Typography>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">仓库</Typography>
            <Typography>{task.warehouseName}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">盘点类型</Typography>
            <Typography>{task.type === 'full' ? '全盘' : '抽盘'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">开始日期</Typography>
            <Typography>{formatDate(task.startDate)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">操作员</Typography>
            <Typography>{task.operator}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">进度</Typography>
            <Typography>{completedCount} / {items.length}</Typography>
          </Box>
          {task.blindMode && (
            <Chip icon={<VisibilityOff />} label="盲盘模式" color="secondary" size="small" data-testid="check-blind-mode-indicator" />
          )}
        </Box>
      </Box>

      {task.blindMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          盲盘模式已开启 —— 账面数量对盘点员隐藏，录入实盘数量后系统自动计算差异。
        </Alert>
      )}

      <TableContainer component={Paper}>
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
    </PageWrapper>
  );
};

export default CheckTask;

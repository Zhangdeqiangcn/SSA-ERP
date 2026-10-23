import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useProductionOperationStore } from '@/stores/productionOperationStore';
import { Equipment, EquipmentCategory, EquipmentStatus, MaintenanceOrder } from '@/types/production';
import { todayLocal } from '@/utils/format';

const CAT_LABEL: Record<EquipmentCategory, string> = { machine: '设备', tool: '工装', mold: '模具' };
const STATUS_LABEL: Record<EquipmentStatus, string> = { in_use: '在用', idle: '闲置', scrapped: '报废' };

export default function EquipmentPage() {
  const { equipments, maintenanceOrders, addEquipment, addMaintenance, deleteEquipment } = useEquipmentStore();
  const { workCenters } = useProductionOperationStore();
  const [tab, setTab] = useState(0);
  const [openEq, setOpenEq] = useState(false);
  const [openMo, setOpenMo] = useState(false);
  const [eqForm, setEqForm] = useState({
    code: '', name: '', category: 'machine' as EquipmentCategory, workCenterId: '', status: 'in_use' as EquipmentStatus, nextMaintenanceDate: '2026-08-01',
  });
  const [moForm, setMoForm] = useState({ equipmentId: '', type: '日常保养', date: todayLocal(), cost: 0 });

  const eqRows = useMemo(() => equipments, [equipments]);
  const moRows = useMemo(() => maintenanceOrders, [maintenanceOrders]);

  const handleAddEq = () => {
    const e: Equipment = {
      id: `eq-${Date.now()}`,
      code: eqForm.code || `EQ-${Date.now()}`,
      name: eqForm.name || '新设备',
      category: eqForm.category,
      workCenterId: eqForm.workCenterId || undefined,
      workCenterName: workCenters.find((w) => w.id === eqForm.workCenterId)?.name,
      status: eqForm.status,
      nextMaintenanceDate: eqForm.nextMaintenanceDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
    addEquipment(e);
    setOpenEq(false);
    setEqForm({ code: '', name: '', category: 'machine', workCenterId: '', status: 'in_use', nextMaintenanceDate: '2026-08-01' });
  };

  const handleAddMo = () => {
    const eq = equipments.find((e) => e.id === moForm.equipmentId);
    const m: MaintenanceOrder = {
      id: `mo-${Date.now()}`,
      equipmentId: moForm.equipmentId,
      equipmentName: eq?.name ?? '',
      equipmentCode: eq?.code ?? '',
      type: moForm.type,
      date: todayLocal(),
      cost: moForm.cost,
      status: 'done',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
    addMaintenance(m);
    setOpenMo(false);
    setMoForm({ equipmentId: '', type: '日常保养', date: todayLocal(), cost: 0 });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="equipment">
      <Typography variant="h5" gutterBottom>设备 / 工装 / 模具 主数据</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>设备主数据 + 保养工单（对标 SAP PM / 金蝶 设备档案）。</Alert>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="设备工装" />
        <Tab label="保养工单" />
      </Tabs>

      {tab === 0 && (
        <>
          <Button data-testid="eq-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenEq(true)} sx={{ mb: 2 }}>
            新增设备/工装
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>编号</TableCell><TableCell>名称</TableCell><TableCell>类别</TableCell>
                  <TableCell>工作中心</TableCell><TableCell>状态</TableCell><TableCell>下次保养</TableCell><TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eqRows.map((e) => (
                  <TableRow key={e.id} data-testid="eq-row">
                    <TableCell>{e.code}</TableCell>
                    <TableCell>{e.name}</TableCell>
                    <TableCell>{CAT_LABEL[e.category]}</TableCell>
                    <TableCell>{e.workCenterName ?? '-'}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_LABEL[e.status]} color={e.status === 'in_use' ? 'success' : 'default'} /></TableCell>
                    <TableCell>{e.nextMaintenanceDate ?? '-'}</TableCell>
                    <TableCell><Button size="small" color="error" onClick={() => deleteEquipment(e.id)}>删除</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <>
          <Button data-testid="mo-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpenMo(true)} sx={{ mb: 2 }}>
            新增保养工单
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>设备</TableCell><TableCell>类型</TableCell><TableCell>日期</TableCell>
                  <TableCell>费用</TableCell><TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moRows.map((m) => (
                  <TableRow key={m.id} data-testid="mo-row">
                    <TableCell>{m.equipmentName}（{m.equipmentCode}）</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>¥{m.cost.toLocaleString('zh-CN')}</TableCell>
                    <TableCell><Chip size="small" label={m.status === 'done' ? '已完成' : '计划中'} color={m.status === 'done' ? 'success' : 'warning'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={openEq} onClose={() => setOpenEq(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增设备 / 工装</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="编号" value={eqForm.code} onChange={(e) => setEqForm({ ...eqForm, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="名称" value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} />
          <TextField fullWidth margin="dense" select label="类别" value={eqForm.category} onChange={(e) => setEqForm({ ...eqForm, category: e.target.value as EquipmentCategory })}>
            <MenuItem value="machine">设备</MenuItem><MenuItem value="tool">工装</MenuItem><MenuItem value="mold">模具</MenuItem>
          </TextField>
          <TextField fullWidth margin="dense" select label="工作中心" value={eqForm.workCenterId} onChange={(e) => setEqForm({ ...eqForm, workCenterId: e.target.value })}>
            <MenuItem value="">—</MenuItem>
            {workCenters.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField fullWidth margin="dense" select label="状态" value={eqForm.status} onChange={(e) => setEqForm({ ...eqForm, status: e.target.value as EquipmentStatus })}>
            <MenuItem value="in_use">在用</MenuItem><MenuItem value="idle">闲置</MenuItem><MenuItem value="scrapped">报废</MenuItem>
          </TextField>
          <TextField fullWidth margin="dense" label="下次保养日期" type="date" value={eqForm.nextMaintenanceDate} onChange={(e) => setEqForm({ ...eqForm, nextMaintenanceDate: e.target.value })} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEq(false)}>取消</Button>
          <Button variant="contained" data-testid="eq-add-confirm" onClick={handleAddEq}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openMo} onClose={() => setOpenMo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增保养工单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="设备" value={moForm.equipmentId} onChange={(e) => setMoForm({ ...moForm, equipmentId: e.target.value })}>
            {equipments.map((e) => <MenuItem key={e.id} value={e.id}>{e.name}（{e.code}）</MenuItem>)}
          </TextField>
          <TextField fullWidth margin="dense" label="保养类型" value={moForm.type} onChange={(e) => setMoForm({ ...moForm, type: e.target.value })} />
          <TextField fullWidth margin="dense" label="日期" type="date" value={moForm.date} onChange={(e) => setMoForm({ ...moForm, date: e.target.value })} InputProps={{ readOnly: true }} helperText="提交时自动记录当天，无需填写" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="费用" type="number" value={moForm.cost} onChange={(e) => setMoForm({ ...moForm, cost: Number(e.target.value) })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMo(false)}>取消</Button>
          <Button variant="contained" data-testid="mo-add-confirm" onClick={handleAddMo}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

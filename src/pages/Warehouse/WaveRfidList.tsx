import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, TextField, MenuItem, Tabs, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Alert,
} from '@mui/material';
import { Add, Visibility, Edit, Delete, QrCode2 } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/common';
import { useWaveRfidStore } from '@/stores/waveRfidStore';
import {
  WaveRfid, RfidEvent, WaveLine, WAVE_STRATEGY_LABELS,
  RFID_OP_LABELS, WaveStatus, WaveStrategy, RfidOpType,
} from '@/types';
import { useTypedRelated } from '@/utils/relations/useTypedRelated';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();
// 本模块编号未纳入统一编号规则（numberingStore 的 DocType 不含 WAVE），按「前缀-年份-四位序号」本地生成
const seqNo = (prefix: string, count: number) =>
  `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

const WaveRfidList: React.FC = () => {
  const navigate = useNavigate();
  const { waves, rfidEvents, addWave, updateWave, deleteWave, addRfidEvent, deleteRfidEvent } = useWaveRfidStore();
  const load = useWaveRfidStore((s) => s.load);
  const [tab, setTab] = useState<'wave' | 'rfid'>('wave');

  // V2.80.0 W2：挂载即从 D1 拉取波次/RFID 数据（离线/Mock 兜底，不阻断 UI）
  useEffect(() => {
    load();
  }, [load]);
  useEnsureRelatedStores('waveRfid');

  // 波次 新建/编辑
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [waveNo, setWaveNo] = useState('');
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<WaveStrategy>('region');
  const [warehouseName, setWarehouseName] = useState('原材料仓');
  const [plannedDate, setPlannedDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<WaveLine[]>([]);

  // RFID 事件 新建
  const [rfOpen, setRfOpen] = useState(false);
  const [rfTag, setRfTag] = useState('');
  const [rfEpc, setRfEpc] = useState('');
  const [rfOp, setRfOp] = useState<RfidOpType>('pick');
  const [rfBiz, setRfBiz] = useState('');
  const [rfMat, setRfMat] = useState('');
  const [rfLoc, setRfLoc] = useState('');
  const [rfOp2, setRfOp2] = useState('');

  const openCreate = () => {
    setEditId(null);
    setWaveNo(seqNo('WAVE', waves.length));
    setName(''); setStrategy('region'); setWarehouseName('原材料仓');
    setPlannedDate(todayStr()); setNote(''); setLines([]);
    setOpen(true);
  };
  const openEdit = (w: WaveRfid) => {
    setEditId(w.id);
    setWaveNo(w.waveNo); setName(w.name); setStrategy(w.strategy);
    setWarehouseName(w.warehouseName); setPlannedDate(w.plannedDate); setNote(w.note || '');
    setLines(w.lines.map((l) => ({ ...l })));
    setOpen(true);
  };

  const addLineRow = () => setLines((s) => [
    ...s, { id: `wl-${Date.now()}`, orderNo: '', materialCode: '', materialName: '', quantity: 1, pickedQty: 0, location: '' },
  ]);
  const updateLineRow = (id: string, patch: Partial<WaveLine>) =>
    setLines((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLineRow = (id: string) => setLines((s) => s.filter((l) => l.id !== id));

  const handleSave = () => {
    const ts = nowStr();
    const base = { name, strategy, warehouseName, plannedDate, note, lines: lines.map((l) => ({ ...l })) };
    if (editId) {
      updateWave(editId, { ...base, updatedAt: ts, updatedBy: 'admin' });
    } else {
      const w: WaveRfid = {
        id: `wave-${Date.now()}`, waveNo, status: 'draft', warehouseId: 'wh-001',
        orderCount: lines.length ? new Set(lines.map((l) => l.orderNo)).size : 0,
        lineCount: lines.length,
        createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base,
      };
      addWave(w);
    }
    setOpen(false);
  };

  const handleRfSave = () => {
    const ts = nowStr();
    const e: RfidEvent = {
      id: `rf-${Date.now()}`, tagId: rfTag || `TAG-${Date.now()}`, epc: rfEpc || 'E20000' + Date.now(),
      opType: rfOp, bizNo: rfBiz, materialCode: rfMat || undefined, location: rfLoc || undefined,
      operator: rfOp2 || '当前用户', scannedAt: ts, result: 'ok', message: '扫描成功',
      createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin',
    };
    addRfidEvent(e);
    setRfOpen(false);
    setRfTag(''); setRfEpc(''); setRfBiz(''); setRfMat(''); setRfLoc(''); setRfOp2('');
  };

  const waveColumns: ColumnDef<WaveRfid>[] = [
    { accessorKey: 'waveNo', header: '波次号' },
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'strategy', header: '策略', cell: (c) => WAVE_STRATEGY_LABELS[c.getValue() as WaveStrategy] },
    {
      accessorKey: 'status', header: '状态',
      cell: (c) => <StatusBadge status={`wave_${c.getValue() as WaveStatus}`} />,
    },
    { accessorKey: 'warehouseName', header: '仓库' },
    { accessorKey: 'orderCount', header: '订单数' },
    { accessorKey: 'lineCount', header: '行数' },
    { accessorKey: 'plannedDate', header: '计划日' },
  ];

  // V3.119.0：关联单据改用 useTypedRelated，按真实单据类型分列、单号+状态、点单号直达。
  // 原 buildRelatedColumns() 只产出「来源单据/后续单据」两列且被 hiddenColumns 默认隐藏。
  const rel = useTypedRelated('waveRfid', waves);
  const allColumns = useMemo(
    () => [...waveColumns, ...(rel.columns as ColumnDef<WaveRfid, unknown>[])],
    [waveColumns, rel.columns]
  );

  const rfColumns: ColumnDef<RfidEvent>[] = [
    { accessorKey: 'tagId', header: '标签ID' },
    { accessorKey: 'epc', header: 'EPC' },
    { accessorKey: 'opType', header: '操作', cell: (c) => <StatusBadge status={`wave_${c.getValue() as RfidOpType}`} /> },
    { accessorKey: 'bizNo', header: '业务单' },
    { accessorKey: 'materialCode', header: '物料' },
    { accessorKey: 'location', header: '货位' },
    { accessorKey: 'operator', header: '操作人' },
    { accessorKey: 'scannedAt', header: '扫描时间' },
    {
      accessorKey: 'result', header: '结果',
      cell: (c) => {
        const ok = c.getValue() === 'ok';
        return <Chip label={ok ? '成功' : '异常'} size="small" color={ok ? 'success' : 'error'} variant="outlined" />;
      },
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
        本模块的<strong>RFID 硬件实时扫描与设备联动当前为模拟演示</strong>：波次与 RFID 事件数据均真实写入本地台账，「模拟扫描」按钮用于演示，未真正对接 RFID 读写硬件。接入真实硬件后将自动切换。
      </Alert>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">波次RFID（P2-07）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setTab('wave'); openCreate(); }}>
          新建波次
        </Button>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`波次（${waves.length}）`} value="wave" />
        <Tab label={`RFID事件（${rfidEvents.length}）`} value="rfid" />
      </Tabs>

      {tab === 'wave' && (
        <DataTable
          data={rel.data} columns={allColumns}
          onView={(r) => navigate(`/warehouse/wave-rfid/${r.id}`)} onEdit={(r) => openEdit(r)} onDelete={(r) => deleteWave(r.id)}
          enableExport enableColumnFilter sapStyle hiddenColumns={rel.hiddenColumns} columnConfigKey="wave-rfid-list"
        />
      )}
      {tab === 'rfid' && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="outlined" startIcon={<QrCode2 />} onClick={() => setRfOpen(true)}>模拟扫描</Button>
          </Stack>
          <DataTable
            data={rfidEvents} columns={rfColumns}
            onDelete={(r) => deleteRfidEvent(r.id)}
            enableExport enableColumnFilter sapStyle columnConfigKey="wave-rfid-events"
          />
        </Box>
      )}

      {/* 波次 新建/编辑 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? '编辑波次' : '新建波次'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="波次号" value={waveNo} onChange={(e) => setWaveNo(e.target.value)} fullWidth disabled={!!editId} />
              <TextField label="名称" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="分组策略" value={strategy} onChange={(e) => setStrategy(e.target.value as WaveStrategy)} fullWidth>
                {(['time', 'region', 'carrier', 'order'] as WaveStrategy[]).map((s) => (
                  <MenuItem key={s} value={s}>{WAVE_STRATEGY_LABELS[s]}</MenuItem>
                ))}
              </TextField>
              <TextField label="仓库" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} fullWidth />
              <TextField label="计划日" type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <TextField label="备注" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />

            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">波次行（订单/物料/货位）</Typography>
                <Button size="small" startIcon={<Add />} onClick={addLineRow}>加一行</Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>订单号</TableCell><TableCell>物料编码</TableCell><TableCell>物料名称</TableCell>
                    <TableCell>数量</TableCell><TableCell>货位</TableCell><TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell><TextField size="small" value={l.orderNo} onChange={(e) => updateLineRow(l.id, { orderNo: e.target.value })} /></TableCell>
                      <TableCell><TextField size="small" value={l.materialCode} onChange={(e) => updateLineRow(l.id, { materialCode: e.target.value })} /></TableCell>
                      <TableCell><TextField size="small" value={l.materialName} onChange={(e) => updateLineRow(l.id, { materialName: e.target.value })} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={l.quantity} onChange={(e) => updateLineRow(l.id, { quantity: Number(e.target.value) || 0 })} /></TableCell>
                      <TableCell><TextField size="small" value={l.location} onChange={(e) => updateLineRow(l.id, { location: e.target.value })} /></TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => removeLineRow(l.id)}><Delete /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  {lines.length === 0 && (
                    <TableRow><TableCell colSpan={6}><Alert severity="info">暂无行，点击「加一行」添加拣货行</Alert></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 波次明细已改版为独立详情页 /warehouse/wave-rfid/:id，「下达并拣货」动作迁至详情页 actions 区 */}

      {/* RFID 事件 新建 */}
      <Dialog open={rfOpen} onClose={() => setRfOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>模拟 RFID 扫描</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="标签ID" value={rfTag} onChange={(e) => setRfTag(e.target.value)} fullWidth />
              <TextField label="EPC" value={rfEpc} onChange={(e) => setRfEpc(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="操作" value={rfOp} onChange={(e) => setRfOp(e.target.value as RfidOpType)} fullWidth>
                {(['receive', 'putaway', 'pick', 'transfer', 'count'] as RfidOpType[]).map((o) => (
                  <MenuItem key={o} value={o}>{RFID_OP_LABELS[o]}</MenuItem>
                ))}
              </TextField>
              <TextField label="业务单号" value={rfBiz} onChange={(e) => setRfBiz(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="物料编码" value={rfMat} onChange={(e) => setRfMat(e.target.value)} fullWidth />
              <TextField label="货位" value={rfLoc} onChange={(e) => setRfLoc(e.target.value)} fullWidth />
              <TextField label="操作人" value={rfOp2} onChange={(e) => setRfOp2(e.target.value)} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRfOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleRfSave}>写入流水</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaveRfidList;

import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, TextField, MenuItem, Tabs, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Hub, Sync } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common';
import { useMesStore } from '@/stores/mesStore';
import { useNumberingStore } from '@/stores/numberingStore';
import {
  MesConnection, MesDeviceStatus, WipTrack, MesOperationReport,
  MES_CONN_STATUS_LABELS, DEVICE_STATUS_LABELS, WIP_STATUS_LABELS, OP_REPORT_STATUS_LABELS,
  MesConnStatus, DeviceStatus, WipStatus, OpReportStatus,
} from '@/types';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();

const CONN_COLORS: Record<MesConnStatus, string> = { connected: '#10B981', disconnected: '#94A3B8', error: '#EF4444' };
const DEV_COLORS: Record<DeviceStatus, string> = { running: '#10B981', idle: '#94A3B8', down: '#EF4444', maintenance: '#F59E0B' };
const WIP_COLORS: Record<WipStatus, string> = { waiting: '#94A3B8', processing: '#F59E0B', done: '#10B981' };
const OP_COLORS: Record<OpReportStatus, string> = { pending: '#94A3B8', in_progress: '#F59E0B', completed: '#10B981' };

const MesIntegrationList: React.FC = () => {
  const { connections, devices, wips, operationReports, addConnection, updateConnection, deleteConnection, syncConnection, addDevice, updateDevice, deleteDevice, addWip, updateWip, deleteWip, addOperationReport, updateOperationReport, deleteOperationReport } = useMesStore();
  const nextNo = useNumberingStore((s) => s.nextNo);
  const [tab, setTab] = useState<'conn' | 'dev' | 'wip' | 'op'>('conn');

  // 连接配置
  const [connOpen, setConnOpen] = useState(false);
  const [connEdit, setConnEdit] = useState<string | null>(null);
  const [connName, setConnName] = useState('');
  const [connEp, setConnEp] = useState('');
  const [connProto, setConnProto] = useState<'REST' | 'OPC-UA' | 'MQTT'>('REST');
  const [connKey, setConnKey] = useState('');
  const [connNote, setConnNote] = useState('');

  // 设备
  const [devOpen, setDevOpen] = useState(false);
  const [devEdit, setDevEdit] = useState<string | null>(null);
  const [devCode, setDevCode] = useState('');
  const [devName, setDevName] = useState('');
  const [devWc, setDevWc] = useState('');
  const [devStatus, setDevStatus] = useState<DeviceStatus>('running');
  const [devOee, setDevOee] = useState('0');

  // 在制品
  const [wipOpen, setWipOpen] = useState(false);
  const [wipEdit, setWipEdit] = useState<string | null>(null);
  const [wipWo, setWipWo] = useState('');
  const [wipProd, setWipProd] = useState('');
  const [wipQty, setWipQty] = useState('1');
  const [wipStation, setWipStation] = useState('');
  const [wipStatus, setWipStatus] = useState<WipStatus>('waiting');

  // 工序报工
  const [opOpen, setOpOpen] = useState(false);
  const [opEdit, setOpEdit] = useState<string | null>(null);
  const [opWo, setOpWo] = useState('');
  const [opName, setOpName] = useState('');
  const [opWc, setOpWc] = useState('');
  const [opOp, setOpOp] = useState('');
  const [opGood, setOpGood] = useState('0');
  const [opScrap, setOpScrap] = useState('0');
  const [opStatus, setOpStatus] = useState<OpReportStatus>('in_progress');

  const openConn = (c?: MesConnection) => {
    setConnEdit(c?.id ?? null); setConnName(c?.name ?? ''); setConnEp(c?.endpoint ?? '');
    setConnProto(c?.protocol ?? 'REST'); setConnKey(c?.apiKey ?? ''); setConnNote(c?.note ?? ''); setConnOpen(true);
  };
  const openDev = (d?: MesDeviceStatus) => {
    setDevEdit(d?.id ?? null); setDevCode(d?.deviceCode ?? ''); setDevName(d?.deviceName ?? '');
    setDevWc(d?.workCenter ?? ''); setDevStatus(d?.status ?? 'running'); setDevOee(String(d?.oee ?? 0)); setDevOpen(true);
  };
  const openWip = (w?: WipTrack) => {
    setWipEdit(w?.id ?? null); setWipWo(w?.workOrderNo ?? ''); setWipProd(w?.productName ?? '');
    setWipQty(String(w?.qty ?? 1)); setWipStation(w?.station ?? ''); setWipStatus(w?.status ?? 'waiting'); setWipOpen(true);
  };
  const openOp = (r?: MesOperationReport) => {
    setOpEdit(r?.id ?? null); setOpWo(r?.workOrderNo ?? ''); setOpName(r?.operationName ?? ''); setOpWc(r?.workCenter ?? '');
    setOpOp(r?.operator ?? ''); setOpGood(String(r?.goodQuantity ?? 0)); setOpScrap(String(r?.scrapQuantity ?? 0)); setOpStatus(r?.status ?? 'in_progress'); setOpOpen(true);
  };

  const saveConn = () => {
    const ts = nowStr();
    const base = { name: connName, endpoint: connEp, protocol: connProto, apiKey: connKey || undefined, note: connNote };
    if (connEdit) updateConnection(connEdit, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addConnection({ id: `mes-${Date.now()}`, status: 'disconnected', createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base });
    setConnOpen(false);
  };
  const saveDev = () => {
    const ts = nowStr();
    const base = { deviceCode: devCode, deviceName: devName, workCenter: devWc, status: devStatus, oee: Number(devOee) || 0, reportedAt: ts };
    if (devEdit) updateDevice(devEdit, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addDevice({ id: `dev-${Date.now()}`, createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base });
    setDevOpen(false);
  };
  const saveWip = () => {
    const ts = nowStr();
    const base = { workOrderNo: wipWo, productName: wipProd, qty: Number(wipQty) || 0, station: wipStation, status: wipStatus };
    if (wipEdit) updateWip(wipEdit, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addWip({ id: `wip-${Date.now()}`, workOrderId: `wo-${Date.now()}`, productCode: '', createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base });
    setWipOpen(false);
  };
  const saveOp = () => {
    const ts = nowStr();
    const base = { workOrderNo: opWo, operationName: opName, workCenter: opWc, operator: opOp, goodQuantity: Number(opGood) || 0, scrapQuantity: Number(opScrap) || 0, status: opStatus, reportedAt: ts };
    if (opEdit) updateOperationReport(opEdit, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addOperationReport({ id: `op-${Date.now()}`, workOrderId: `wo-${Date.now()}`, createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base });
    setOpOpen(false);
  };

  const connColumns: ColumnDef<MesConnection>[] = [
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'endpoint', header: '接口地址' },
    { accessorKey: 'protocol', header: '协议' },
    { accessorKey: 'status', header: '状态', cell: (c) => { const v = c.getValue() as MesConnStatus; return <Chip label={MES_CONN_STATUS_LABELS[v]} size="small" sx={{ bgcolor: CONN_COLORS[v], color: '#fff' }} />; } },
    { accessorKey: 'lastSyncAt', header: '最近同步' },
    { accessorKey: 'note', header: '备注' },
  ];
  const devColumns: ColumnDef<MesDeviceStatus>[] = [
    { accessorKey: 'deviceCode', header: '设备编码' },
    { accessorKey: 'deviceName', header: '设备名称' },
    { accessorKey: 'workCenter', header: '工作中心' },
    { accessorKey: 'status', header: '状态', cell: (c) => { const v = c.getValue() as DeviceStatus; return <Chip label={DEVICE_STATUS_LABELS[v]} size="small" sx={{ bgcolor: DEV_COLORS[v], color: '#fff' }} />; } },
    { accessorKey: 'oee', header: 'OEE%' },
    { accessorKey: 'reportedAt', header: '上报时间' },
  ];
  const wipColumns: ColumnDef<WipTrack>[] = [
    { accessorKey: 'workOrderNo', header: '工单' },
    { accessorKey: 'productName', header: '产品' },
    { accessorKey: 'qty', header: '数量' },
    { accessorKey: 'station', header: '工位' },
    { accessorKey: 'status', header: '状态', cell: (c) => { const v = c.getValue() as WipStatus; return <Chip label={WIP_STATUS_LABELS[v]} size="small" sx={{ bgcolor: WIP_COLORS[v], color: '#fff' }} />; } },
    { accessorKey: 'updatedAt', header: '更新时间' },
  ];
  const opColumns: ColumnDef<MesOperationReport>[] = [
    { accessorKey: 'workOrderNo', header: '工单' },
    { accessorKey: 'operationName', header: '工序' },
    { accessorKey: 'workCenter', header: '工作中心' },
    { accessorKey: 'operator', header: '操作工' },
    { accessorKey: 'goodQuantity', header: '合格' },
    { accessorKey: 'scrapQuantity', header: '报废' },
    { accessorKey: 'status', header: '状态', cell: (c) => { const v = c.getValue() as OpReportStatus; return <Chip label={OP_REPORT_STATUS_LABELS[v]} size="small" sx={{ bgcolor: OP_COLORS[v], color: '#fff' }} />; } },
    { accessorKey: 'reportedAt', header: '报工时间' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>MES集成（P2-09）</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`连接配置（${connections.length}）`} value="conn" />
        <Tab label={`设备状态（${devices.length}）`} value="dev" />
        <Tab label={`在制品（${wips.length}）`} value="wip" />
        <Tab label={`工序报工（${operationReports.length}）`} value="op" />
      </Tabs>

      {tab === 'conn' && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => openConn()}>新建连接</Button>
          </Stack>
          <DataTable
            data={connections} columns={connColumns}
            onEdit={(r) => openConn(r)} onDelete={(r) => deleteConnection(r.id)}
            enableRowSelection
            batchActions={[{ label: '同步', icon: <Sync />, color: 'primary', testId: 'mes-conn-sync', onClick: (rows: MesConnection[]) => syncConnection(rows[0].id) }]}
            enableExport enableColumnFilter sapStyle columnConfigKey="mes-conn"
          />
        </Box>
      )}
      {tab === 'dev' && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => openDev()}>新建设备</Button>
          </Stack>
          <DataTable data={devices} columns={devColumns} onEdit={(r) => openDev(r)} onDelete={(r) => deleteDevice(r.id)} enableExport enableColumnFilter sapStyle columnConfigKey="mes-dev" />
        </Box>
      )}
      {tab === 'wip' && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => openWip()}>新建WIP</Button>
          </Stack>
          <DataTable data={wips} columns={wipColumns} onEdit={(r) => openWip(r)} onDelete={(r) => deleteWip(r.id)} enableExport enableColumnFilter sapStyle columnConfigKey="mes-wip" />
        </Box>
      )}
      {tab === 'op' && (
        <Box>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => openOp()}>新建报工</Button>
          </Stack>
          <DataTable data={operationReports} columns={opColumns} onEdit={(r) => openOp(r)} onDelete={(r) => deleteOperationReport(r.id)} enableExport enableColumnFilter sapStyle columnConfigKey="mes-op" />
        </Box>
      )}

      {/* 连接配置 */}
      <Dialog open={connOpen} onClose={() => setConnOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{connEdit ? '编辑连接' : '新建 MES 连接'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="名称" value={connName} onChange={(e) => setConnName(e.target.value)} fullWidth />
            <TextField label="接口地址" value={connEp} onChange={(e) => setConnEp(e.target.value)} fullWidth placeholder="https://mes.xxx/api/v1" />
            <Stack direction="row" spacing={2}>
              <TextField select label="协议" value={connProto} onChange={(e) => setConnProto(e.target.value as 'REST' | 'OPC-UA' | 'MQTT')} fullWidth>
                {(['REST', 'OPC-UA', 'MQTT'] as const).map((p) => (<MenuItem key={p} value={p}>{p}</MenuItem>))}
              </TextField>
              <TextField label="API Key" value={connKey} onChange={(e) => setConnKey(e.target.value)} fullWidth />
            </Stack>
            <TextField label="备注" value={connNote} onChange={(e) => setConnNote(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveConn}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 设备状态 */}
      <Dialog open={devOpen} onClose={() => setDevOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{devEdit ? '编辑设备' : '新建设备状态'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="设备编码" value={devCode} onChange={(e) => setDevCode(e.target.value)} fullWidth />
              <TextField label="设备名称" value={devName} onChange={(e) => setDevName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="工作中心" value={devWc} onChange={(e) => setDevWc(e.target.value)} fullWidth />
              <TextField type="number" label="OEE%" value={devOee} onChange={(e) => setDevOee(e.target.value)} fullWidth />
            </Stack>
            <TextField select label="状态" value={devStatus} onChange={(e) => setDevStatus(e.target.value as DeviceStatus)} fullWidth>
              {(['running', 'idle', 'down', 'maintenance'] as DeviceStatus[]).map((s) => (<MenuItem key={s} value={s}>{DEVICE_STATUS_LABELS[s]}</MenuItem>))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDevOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveDev}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 在制品 */}
      <Dialog open={wipOpen} onClose={() => setWipOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{wipEdit ? '编辑WIP' : '新建在制品跟踪'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="工单号" value={wipWo} onChange={(e) => setWipWo(e.target.value)} fullWidth />
              <TextField label="产品" value={wipProd} onChange={(e) => setWipProd(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField type="number" label="数量" value={wipQty} onChange={(e) => setWipQty(e.target.value)} fullWidth />
              <TextField label="工位" value={wipStation} onChange={(e) => setWipStation(e.target.value)} fullWidth />
              <TextField select label="状态" value={wipStatus} onChange={(e) => setWipStatus(e.target.value as WipStatus)} fullWidth>
                {(['waiting', 'processing', 'done'] as WipStatus[]).map((s) => (<MenuItem key={s} value={s}>{WIP_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWipOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveWip}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 工序报工 */}
      <Dialog open={opOpen} onClose={() => setOpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{opEdit ? '编辑报工' : '新建工序报工'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="工单号" value={opWo} onChange={(e) => setOpWo(e.target.value)} fullWidth />
              <TextField label="工序" value={opName} onChange={(e) => setOpName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="工作中心" value={opWc} onChange={(e) => setOpWc(e.target.value)} fullWidth />
              <TextField label="操作工" value={opOp} onChange={(e) => setOpOp(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField type="number" label="合格数" value={opGood} onChange={(e) => setOpGood(e.target.value)} fullWidth />
              <TextField type="number" label="报废数" value={opScrap} onChange={(e) => setOpScrap(e.target.value)} fullWidth />
              <TextField select label="状态" value={opStatus} onChange={(e) => setOpStatus(e.target.value as OpReportStatus)} fullWidth>
                {(['pending', 'in_progress', 'completed'] as OpReportStatus[]).map((s) => (<MenuItem key={s} value={s}>{OP_REPORT_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveOp}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MesIntegrationList;

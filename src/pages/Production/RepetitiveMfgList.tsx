import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, TextField, MenuItem, Tabs, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, Alert,
} from '@mui/material';
import { Add, Visibility, Edit, Delete, PlayCircle, ViewTimeline } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, FilterBar, DetailSection } from '@/components/common';
import { useRepetitiveMfgStore } from '@/stores/repetitiveMfgStore';
import { applyColumnFilters } from '@/utils/listSearch';
import { notifyWarning } from '@/utils/notify';
import {
  ProductionLine, RepetitiveMfgPeriod, BackflushItem, REP_LINE_STATUS_LABELS,
  REP_PERIOD_STATUS_LABELS, RepLineStatus, RepPeriodStatus,
} from '@/types';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();
// 本模块编号未纳入统一编号规则（numberingStore 的 DocType 不含 LINE/RP），按「前缀-年份-四位序号」本地生成
const seqNo = (prefix: string, count: number) =>
  `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

// 状态展示统一走 StatusBadge（审计报告 P0 整改：删本地 hex 副本）
// 生产线：running 复用通用 key；idle/maintenance 用 rep_ 前缀专属 key
const LINE_STATUS_KEY: Record<RepLineStatus, string> = {
  running: 'running', idle: 'rep_idle', maintenance: 'rep_maintenance',
};
// 周期：active/closed → rep_period_ 前缀专属 key
const PERIOD_STATUS_KEY: Record<RepPeriodStatus, string> = {
  active: 'rep_period_active', closed: 'rep_period_closed',
};

const RepetitiveMfgList: React.FC = () => {
  const { lines, periods, addLine, updateLine, deleteLine, addPeriod, updatePeriod, deletePeriod, reportProduction, load } = useRepetitiveMfgStore();
  const [tab, setTab] = useState<'line' | 'period'>('line');
  const navigate = useNavigate();
  useEffect(() => { load(); }, [load]);

  // 生产线 新建/编辑
  const [openLine, setOpenLine] = useState(false);
  const [lineEditId, setLineEditId] = useState<string | null>(null);
  const [lineNo, setLineNo] = useState('');
  const [lineName, setLineName] = useState('');
  const [wcName, setWcName] = useState('');
  const [lineStatus, setLineStatus] = useState<RepLineStatus>('running');
  const [capacity, setCapacity] = useState('500');
  const [lineNote, setLineNote] = useState('');

  // 周期 新建/编辑
  const [openPeriod, setOpenPeriod] = useState(false);
  const [periodEditId, setPeriodEditId] = useState<string | null>(null);
  const [periodNo, setPeriodNo] = useState('');
  const [selLineId, setSelLineId] = useState('');
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [pStart, setPStart] = useState(todayStr());
  const [pEnd, setPEnd] = useState(todayStr());
  const [planQty, setPlanQty] = useState('1000');
  const [periodNote, setPeriodNote] = useState('');

  // 产量报工
  const [report, setReport] = useState<RepetitiveMfgPeriod | null>(null);
  const [goodQty, setGoodQty] = useState('100');
  const [scrapQty, setScrapQty] = useState('0');

  // 倒冲明细
  const [bfDetail, setBfDetail] = useState<RepetitiveMfgPeriod | null>(null);

  // 列表检索状态（覆盖生产线 / 重复制造周期两套列）
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const openLineCreate = () => {
    setLineEditId(null); setLineNo(seqNo('LINE', lines.length)); setLineName(''); setWcName('');
    setLineStatus('running'); setCapacity('500'); setLineNote(''); setOpenLine(true);
  };
  const openLineEdit = (l: ProductionLine) => {
    setLineEditId(l.id); setLineNo(l.lineNo); setLineName(l.name); setWcName(l.workCenterName || '');
    setLineStatus(l.status); setCapacity(String(l.dailyCapacity)); setLineNote(l.note || ''); setOpenLine(true);
  };
  const handleLineSave = () => {
    const ts = nowStr();
    const base = { lineNo, name: lineName, workCenterName: wcName, status: lineStatus, dailyCapacity: Number(capacity) || 0, note: lineNote };
    if (lineEditId) updateLine(lineEditId, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addLine({ id: `line-${Date.now()}`, workCenterId: 'wc-01', createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base });
    setOpenLine(false);
  };

  const openPeriodCreate = () => {
    setPeriodEditId(null); setPeriodNo(seqNo('RP', periods.length)); setSelLineId(''); setMatCode(''); setMatName('');
    setPStart(todayStr()); setPEnd(todayStr()); setPlanQty('1000'); setPeriodNote(''); setOpenPeriod(true);
  };
  const openPeriodEdit = (p: RepetitiveMfgPeriod) => {
    setPeriodEditId(p.id); setPeriodNo(p.periodNo); setSelLineId(p.lineId); setMatCode(p.materialCode); setMatName(p.materialName);
    setPStart(p.startDate); setPEnd(p.endDate); setPlanQty(String(p.plannedQty)); setPeriodNote(p.note || ''); setOpenPeriod(true);
  };
  const handlePeriodSave = () => {
    const ts = nowStr();
    const line = lines.find((l) => l.id === selLineId);
    const base = {
      periodNo, lineId: selLineId || 'line-001', lineNo: line?.lineNo || 'LINE-A', lineName: line?.name || '总装一线',
      materialCode: matCode, materialName: matName, startDate: pStart, endDate: pEnd,
      plannedQty: Number(planQty) || 0, note: periodNote,
    };
    if (periodEditId) updatePeriod(periodEditId, { ...base, updatedAt: ts, updatedBy: 'admin' });
    else addPeriod({
      id: `rp-${Date.now()}`, producedQty: 0, scrapQty: 0, status: 'active' as RepPeriodStatus,
      backflushItems: [], createdAt: ts, updatedAt: ts, createdBy: 'admin', updatedBy: 'admin', ...base,
    });
    setOpenPeriod(false);
  };

  const handleReport = () => {
    if (!report) return;
    const ok = reportProduction(report.id, Number(goodQty) || 0, Number(scrapQty) || 0);
    if (!ok) notifyWarning('周期已关闭，无法报工');
    setReport(null); setGoodQty('100'); setScrapQty('0');
  };

  const lineColumns: ColumnDef<ProductionLine>[] = [
    { accessorKey: 'lineNo', header: '线号', meta: { searchable: true } },
    { accessorKey: 'name', header: '名称', meta: { searchable: true } },
    { accessorKey: 'workCenterName', header: '工作中心', meta: { searchable: true } },
    { accessorKey: 'status', header: '状态', meta: { searchable: true, filterType: 'select', filterOptions: (['running', 'idle', 'maintenance'] as RepLineStatus[]).map((s) => ({ value: s, label: REP_LINE_STATUS_LABELS[s] })) }, cell: (c) => { const v = c.getValue() as RepLineStatus; return <StatusBadge status={LINE_STATUS_KEY[v]} />; } },
    { accessorKey: 'dailyCapacity', header: '日产能', meta: { searchable: true } },
    { accessorKey: 'note', header: '备注', meta: { searchable: true } },
  ];

  const periodColumns: ColumnDef<RepetitiveMfgPeriod>[] = [
    { accessorKey: 'periodNo', header: '周期号', meta: { searchable: true } },
    { accessorKey: 'lineName', header: '产线', meta: { searchable: true } },
    { accessorKey: 'materialName', header: '产出物料', meta: { searchable: true } },
    { accessorKey: 'startDate', header: '开始', meta: { searchable: true } },
    { accessorKey: 'endDate', header: '结束', meta: { searchable: true } },
    { accessorKey: 'plannedQty', header: '计划', meta: { searchable: true } },
    { accessorKey: 'producedQty', header: '已产', meta: { searchable: true } },
    { accessorKey: 'scrapQty', header: '报废', meta: { searchable: true } },
    { accessorKey: 'status', header: '状态', meta: { searchable: true, filterType: 'select', filterOptions: (['active', 'closed'] as RepPeriodStatus[]).map((s) => ({ value: s, label: REP_PERIOD_STATUS_LABELS[s] })) }, cell: (c) => { const v = c.getValue() as RepPeriodStatus; return <StatusBadge status={PERIOD_STATUS_KEY[v]} />; } },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>重复制造（P2-08）</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setTab('line'); openLineCreate(); }}>新建生产线</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setTab('period'); openPeriodCreate(); }}>新建周期</Button>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`生产线（${lines.length}）`} value="line" />
        <Tab label={`重复制造周期（${periods.length}）`} value="period" />
      </Tabs>

      {tab === 'line' && (
        <>
          <FilterBar columns={lineColumns} module="production" onSearch={setFilterData} listKey="rep-lines" />
          <DataTable data={applyColumnFilters(lines, lineColumns, filterData, { module: 'production' })} columns={lineColumns} onView={(r) => openLineEdit(r)} onEdit={(r) => openLineEdit(r)} onDelete={(r) => deleteLine(r.id)} enableExport enableColumnFilter sapStyle columnConfigKey="rep-lines" codeColumnId="lineNo" />
        </>
      )}
      {tab === 'period' && (
        <>
          <FilterBar columns={periodColumns} module="production" onSearch={setFilterData} listKey="rep-periods" />
          <DataTable
            data={applyColumnFilters(periods, periodColumns, filterData, { module: 'production' })} columns={periodColumns}
            onView={(r) => navigate(`/production/repetitive/period/${r.id}`)}
            onEdit={(r) => openPeriodEdit(r)}
            onDelete={(r) => deletePeriod(r.id)}
            enableRowSelection
            batchActions={[
              { label: '产量报工', icon: <PlayCircle />, color: 'primary', testId: 'rep-report-production', onClick: (rows: RepetitiveMfgPeriod[]) => setReport(rows[0]) },
              { label: '倒冲明细', icon: <ViewTimeline />, color: 'primary', testId: 'rep-backflush-detail', onClick: (rows: RepetitiveMfgPeriod[]) => setBfDetail(rows[0]) },
            ]}
            enableExport enableColumnFilter sapStyle columnConfigKey="rep-periods" codeColumnId="periodNo"
          />
        </>
      )}

      {/* 生产线 */}
      <Dialog open={openLine} onClose={() => setOpenLine(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{lineEditId ? '编辑生产线' : '新建生产线'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="线号" value={lineNo} onChange={(e) => setLineNo(e.target.value)} fullWidth disabled={!!lineEditId} />
              <TextField label="名称" value={lineName} onChange={(e) => setLineName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="工作中心" value={wcName} onChange={(e) => setWcName(e.target.value)} fullWidth />
              <TextField select label="状态" value={lineStatus} onChange={(e) => setLineStatus(e.target.value as RepLineStatus)} fullWidth>
                {(['running', 'idle', 'maintenance'] as RepLineStatus[]).map((s) => (<MenuItem key={s} value={s}>{REP_LINE_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
              <TextField label="日产能" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} fullWidth />
            </Stack>
            <TextField label="备注" value={lineNote} onChange={(e) => setLineNote(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLine(false)}>取消</Button>
          <Button variant="contained" onClick={handleLineSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 周期 */}
      <Dialog open={openPeriod} onClose={() => setOpenPeriod(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{periodEditId ? '编辑周期' : '新建重复制造周期'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="周期号" value={periodNo} onChange={(e) => setPeriodNo(e.target.value)} fullWidth disabled={!!periodEditId} />
              <TextField select label="产线" value={selLineId} onChange={(e) => setSelLineId(e.target.value)} fullWidth>
                {lines.map((l) => (<MenuItem key={l.id} value={l.id}>{l.lineNo} - {l.name}</MenuItem>))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="产出物料编码" value={matCode} onChange={(e) => setMatCode(e.target.value)} fullWidth />
              <TextField label="产出物料名称" value={matName} onChange={(e) => setMatName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="开始" type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="结束" type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="计划产量" type="number" value={planQty} onChange={(e) => setPlanQty(e.target.value)} fullWidth />
            </Stack>
            <TextField label="备注" value={periodNote} onChange={(e) => setPeriodNote(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPeriod(false)}>取消</Button>
          <Button variant="contained" onClick={handlePeriodSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 产量报工（倒冲） */}
      <Dialog open={!!report} onClose={() => setReport(null)} maxWidth="xs" fullWidth>
        <DialogTitle>产量报工 · {report?.periodNo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">报工后按单件标准耗用自动倒冲(backflush)各物料，报废单独累计。</Alert>
            <TextField label="合格数量" type="number" value={goodQty} onChange={(e) => setGoodQty(e.target.value)} fullWidth />
            <TextField label="报废数量" type="number" value={scrapQty} onChange={(e) => setScrapQty(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReport(null)}>取消</Button>
          <Button variant="contained" onClick={handleReport}>确认报工并倒冲</Button>
        </DialogActions>
      </Dialog>

      {/* 倒冲明细 */}
      <Dialog open={!!bfDetail} onClose={() => setBfDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>物料倒冲明细 · {bfDetail?.periodNo}</DialogTitle>
        <DialogContent>
          {bfDetail && (
            <DetailSection
              title="周期信息"
              columns={2}
              fields={[
                { label: '周期号', value: bfDetail.periodNo },
                { label: '生产线', value: `${bfDetail.lineNo} · ${bfDetail.lineName}` },
                { label: '产出物料', value: `${bfDetail.materialCode} · ${bfDetail.materialName}` },
                { label: '周期区间', value: `${bfDetail.startDate} ~ ${bfDetail.endDate}` },
                { label: '计划产量', value: bfDetail.plannedQty },
                { label: '已产 / 报废', value: `${bfDetail.producedQty} / ${bfDetail.scrapQty}` },
                { label: '状态', value: <StatusBadge status={PERIOD_STATUS_KEY[bfDetail.status]} /> },
                { label: '备注', value: bfDetail.note || '-' },
              ]}
            />
          )}
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow><TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>单位</TableCell><TableCell>单件标准</TableCell><TableCell>已倒冲累计</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {(bfDetail?.backflushItems || []).map((it: BackflushItem) => (
                <TableRow key={it.id}>
                  <TableCell>{it.materialCode}</TableCell><TableCell>{it.materialName}</TableCell><TableCell>{it.unit}</TableCell>
                  <TableCell>{it.stdQty}</TableCell><TableCell>{it.consumedQty}</TableCell>
                </TableRow>
              ))}
              {(!bfDetail?.backflushItems || bfDetail.backflushItems.length === 0) && (
                <TableRow><TableCell colSpan={5}><Alert severity="info">暂未配置倒冲物料</Alert></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBfDetail(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RepetitiveMfgList;

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, TextField, MenuItem, Tabs, Tab, Table, TableBody,
  TableCell, TableHead, TableRow, IconButton, Tooltip, Alert, Divider, CircularProgress,
} from '@mui/material';
import { Add, Print, Visibility, LocalShipping, Search, Send } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/common';
import { useLogisticsStore, type Waybill, type TrackRecord } from '@/stores/logisticsStore';
import { deriveWaybillStatus, type WaybillStatus, type TrackStatus } from '@/services/logistics';

const CARRIER_LABELS: Record<string, string> = {
  douyin: '抖音电子面单', pinduoduo: '拼多多电子面单', kdniao: '快递鸟(聚合)',
};
const carrierLabel = (c?: string) => (c ? (CARRIER_LABELS[c] || c) : '—');

const PRINT_STYLE_ID = 'ssa-waybill-print-style';

const LogisticsWaybill: React.FC = () => {
  const {
    waybills, tracks, providers,
    load, loadProviders, createWaybill, getTrack, pushTrack,
  } = useLogisticsStore();
  const [tab, setTab] = useState<'print' | 'track'>('print');

  // 挂载即从 D1 拉取运单 + 承运商列表（离线/Mock 兜底，不阻断 UI）
  useEffect(() => { load(); loadProviders(); }, [load, loadProviders]);

  // 打印区样式注入（与 PrintPreview 同口径：打印时仅显示 .ssa-print-area）
  useEffect(() => {
    if (document.getElementById(PRINT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.innerHTML = `
@media print {
  body * { visibility: hidden !important; }
  .ssa-print-area, .ssa-print-area * { visibility: visible !important; }
  .ssa-print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
  .no-print { display: none !important; }
  @page { margin: 10mm; }
}`;
    document.head.appendChild(style);
  }, []);

  // ── 新建面单 ──
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    carrier: '', orderHubId: '', packNo: '',
    receiverName: '', receiverPhone: '', receiverAddress: '', weight: '',
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');

  const openCreate = () => {
    setForm({ carrier: providers[0]?.code || '', orderHubId: '', packNo: '', receiverName: '', receiverPhone: '', receiverAddress: '', weight: '' });
    setCreateErr('');
    setCreateOpen(true);
  };
  const handleCreate = async () => {
    setCreating(true); setCreateErr('');
    try {
      await createWaybill({
        carrier: form.carrier,
        orderHubId: form.orderHubId,
        packNo: form.packNo,
        receiverName: form.receiverName,
        receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress,
        weight: form.weight ? Number(form.weight) : undefined,
      });
      setCreateOpen(false);
    } catch (e: any) {
      setCreateErr(e?.message || '建单失败');
    } finally {
      setCreating(false);
    }
  };

  // ── 面单打印预览 ──
  const [printTarget, setPrintTarget] = useState<Waybill | null>(null);
  const openPrint = (w: Waybill) => setPrintTarget(w);

  // ── 轨迹看板 ──
  const [trackNo, setTrackNo] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackErr, setTrackErr] = useState('');
  const [pushing, setPushing] = useState(false);

  const handleQuery = async (no?: string) => {
    const target = (no ?? trackNo).trim();
    if (!target) return;
    setTrackNo(target);
    setTrackLoading(true); setTrackErr('');
    try {
      await getTrack(target);
    } catch (e: any) {
      setTrackErr(e?.message || '查询失败');
    } finally {
      setTrackLoading(false);
    }
  };
  const handlePushMock = async () => {
    if (!trackNo.trim()) return;
    const wb = waybills.find((w) => w.waybillNo === trackNo.trim());
    const carrier = wb?.carrier || 'kdniao';
    setPushing(true); setTrackErr('');
    try {
      const now = new Date().toISOString();
      await pushTrack({
        waybillNo: trackNo.trim(),
        carrier,
        payload: { eventTime: now, status: 'collected', location: '成都分拣中心', description: '模拟揽收（演示数据）' },
      });
      await getTrack(trackNo.trim());
    } catch (e: any) {
      setTrackErr(e?.message || '推送失败');
    } finally {
      setPushing(false);
    }
  };

  const trackEvents = [...(tracks || [])].sort((a, b) =>
    (a.eventTime || '').localeCompare(b.eventTime || ''));
  const derived: WaybillStatus = deriveWaybillStatus(
    trackEvents.map((t) => ({ eventTime: t.eventTime || '', status: (t.status || 'collected') as TrackStatus, location: t.location, description: t.description }))
  );

  // ── 运单列表列 ──
  const waybillColumns: ColumnDef<Waybill>[] = [
    { accessorKey: 'waybillNo', header: '运单号' },
    { accessorKey: 'carrier', header: '承运商', cell: (c) => carrierLabel(c.getValue() as string) },
    { accessorKey: 'packNo', header: '包裹号' },
    { accessorKey: 'receiverName', header: '收件人' },
    {
      accessorKey: 'weight', header: '重量(kg)',
      cell: (c) => (c.getValue() != null ? String(c.getValue()) : '—'),
    },
    {
      accessorKey: 'status', header: '状态',
      cell: (c) => <StatusBadge status={`waybill_${c.getValue() as WaybillStatus}`} />,
    },
    {
      accessorKey: 'mock', header: '模式',
      cell: (c) => (c.getValue() ? <Chip size="small" color="warning" variant="outlined" label="模拟" /> : <Chip size="small" color="success" variant="outlined" label="真实" />),
    },
    { accessorKey: 'createdAt', header: '创建时间' },
    {
      id: 'actions',
      header: '操作',
      cell: (c) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="打印面单"><IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); openPrint(c.row.original); }}><Print fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="查看轨迹"><IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); setTab('track'); handleQuery(c.row.original.waybillNo); }}><Visibility fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">电子面单 / 物流轨迹（P1-6）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建面单</Button>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        物流面单层对标聚水潭「电子面单 + 物流轨迹」。未配置真实承运商密钥时为<strong>模拟取号</strong>（标注「模拟」），
        提供抖音/拼多多/快递鸟三套适配器；一旦后端配置 AppKey/AppSecret/access_token 即自动切换真实签名调用。
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`面单打印（${waybills.length}）`} value="print" />
        <Tab label="轨迹看板" value="track" />
      </Tabs>

      {tab === 'print' && (
        <DataTable
          data={waybills} columns={waybillColumns}
          enableExport enableColumnFilter sapStyle columnConfigKey="logistics-waybill-list"
        />
      )}

      {tab === 'track' && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              label="运单号" value={trackNo} onChange={(e) => setTrackNo(e.target.value)}
              placeholder="输入运单号查询轨迹" fullWidth
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuery(); }}
            />
            <Button variant="contained" startIcon={<Search />} onClick={() => handleQuery()} disabled={trackLoading || !trackNo.trim()}>
              查询轨迹
            </Button>
            <Button variant="outlined" startIcon={<Send />} onClick={handlePushMock} disabled={pushing || !trackNo.trim()}>
              模拟推送轨迹
            </Button>
          </Stack>
          {trackErr && <Alert severity="error">{trackErr}</Alert>}
          {trackLoading && <CircularProgress size={24} />}

          {!trackLoading && trackNo.trim() && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1">运单 {trackNo} 当前状态</Typography>
                <StatusBadge status={`waybill_${derived}`} />
              </Stack>
              {trackEvents.length === 0 ? (
                <Alert severity="info">暂无轨迹。可点「模拟推送轨迹」演示揽收事件，或接入真实承运商后自动回写。</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>时间</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>地点</TableCell>
                      <TableCell>描述</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trackEvents.map((t: TrackRecord, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{t.eventTime ? new Date(t.eventTime).toLocaleString('zh-CN') : '—'}</TableCell>
                        <TableCell><StatusBadge status={`track_${t.status as TrackStatus}`} /></TableCell>
                        <TableCell>{t.location || '—'}</TableCell>
                        <TableCell>{t.description || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}
        </Stack>
      )}

      {/* 新建面单 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建电子面单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="承运商" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} fullWidth>
              {(providers.length ? providers : [{ code: 'kdniao', label: '快递鸟(聚合)' }]).map((p: any) => (
                <MenuItem key={p.code} value={p.code}>{p.label}{p.isConfigured ? '' : '（模拟）'}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="订单中台ID" value={form.orderHubId} onChange={(e) => setForm({ ...form, orderHubId: e.target.value })} fullWidth placeholder="orderHubId" />
              <TextField label="包裹号" value={form.packNo} onChange={(e) => setForm({ ...form, packNo: e.target.value })} fullWidth placeholder="packNo" />
            </Stack>
            <Divider />
            <Typography variant="subtitle2">收件人</Typography>
            <Stack direction="row" spacing={2}>
              <TextField label="姓名" value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} fullWidth />
              <TextField label="电话" value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} fullWidth />
            </Stack>
            <TextField label="地址" value={form.receiverAddress} onChange={(e) => setForm({ ...form, receiverAddress: e.target.value })} fullWidth />
            <TextField label="重量(kg，可选)" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} fullWidth />
            {createErr && <Alert severity="error">{createErr}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>{creating ? '建单中…' : '生成面单'}</Button>
        </DialogActions>
      </Dialog>

      {/* 面单打印预览 */}
      <Dialog open={!!printTarget} onClose={() => setPrintTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>面单预览 · {printTarget?.waybillNo}</DialogTitle>
        <DialogContent>
          {printTarget && (
            <Box
              className="ssa-print-area"
              sx={{ width: '100%', mx: 'auto', bgcolor: '#fff', color: '#111', p: 3, fontFamily: '"Microsoft YaHei","PingFang SC",sans-serif', border: '1px solid #E2E8F0', borderRadius: 2 }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{carrierLabel(printTarget.carrier)}</Typography>
                {printTarget.mock && <Chip size="small" color="warning" label="模拟面单" />}
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ fontSize: 13, lineHeight: 2 }}>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>运单号</Box><Box sx={{ fontWeight: 700, letterSpacing: 1 }}>{printTarget.waybillNo}</Box></Box>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>包裹号</Box><Box>{printTarget.packNo || '—'}</Box></Box>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>收件人</Box><Box>{printTarget.receiverName || '—'}　{printTarget.receiverPhone || ''}</Box></Box>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>地址</Box><Box>{printTarget.receiverAddress || '—'}</Box></Box>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>重量</Box><Box>{printTarget.weight != null ? `${printTarget.weight} kg` : '—'}</Box></Box>
                <Box sx={{ display: 'flex' }}><Box sx={{ width: 72, color: '#64748B' }}>状态</Box><Box>{WAYBILL_LABEL[printTarget.status as WaybillStatus] || printTarget.status || '—'}</Box></Box>
              </Box>
              <Paper variant="outlined" sx={{ mt: 2, p: 1.5, textAlign: 'center', fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, wordBreak: 'break-all' }}>
                {printTarget.waybillNo}
              </Paper>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94A3B8' }}>
                SSA ERP · 电商物流面单（{printTarget.mock ? '模拟取号，未配置真实承运商' : '真实承运商'}）
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="no-print">
          <Button onClick={() => setPrintTarget(null)}>关闭</Button>
          <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>打印</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const WAYBILL_LABEL: Record<WaybillStatus, string> = {
  created: '已创建', printed: '已打印', dispatched: '已发运', intransit: '运输中', signed: '已签收', exception: '异常',
};

export default LogisticsWaybill;

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Alert, Tabs, Tab, TextField, MenuItem, Grid, IconButton, Tooltip,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useQualityAdvancedStore } from '@/stores/qualityAdvancedStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useVendorStore } from '@/stores/vendorStore';
import { SecureField } from '@/components/common';
import { COQRecord, InspectionLot } from '@/types';

const LOT_STATUS_LABEL: Record<InspectionLot['status'], string> = {
  pending: '待检', in_inspection: '检验中', passed: '合格', failed: '不合格',
};
const COQ_LABEL: Record<COQRecord['category'], string> = {
  prevention: '预防成本', appraisal: '鉴定成本', internal_failure: '内部失败成本', external_failure: '外部失败成本',
};

export default function InspectionLotPage() {
  const {
    inspectionLots, coqRecords, qmVendorFeedback, judgeLot, addCOQ, recalcVendorQm,
  } = useQualityAdvancedStore();
  const { batchRecords } = useWarehouseStore();
  const { inspectionTasks } = useQualityStore();
  const { vendors } = useVendorStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [vendorId, setVendorId] = useState('');

  const lotResultByBatch = useMemo(() => {
    const map: Record<string, string> = {};
    inspectionLots.forEach((l) => { if (l.batchNo) map[l.batchNo] = LOT_STATUS_LABEL[l.status]; });
    return map;
  }, [inspectionLots]);

  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? id ?? '—';

  const qmImpact = useMemo(() => {
    if (!vendorId) return null;
    return recalcVendorQm(vendorId);
  }, [vendorId, qmVendorFeedback, inspectionTasks]);

  return (
    <Box sx={{ p: 2 }} data-testid="inspection-lot">
      <Typography variant="h5" gutterBottom>检验批 / COQ / 批次追溯 / QM评级回流</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        采购入库完成自动生成检验批；判定不合格自动回流供应商评级（写入失败来料检验任务）。
      </Alert>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="检验批" data-testid="tab-lots" />
        <Tab label="质量成本COQ" data-testid="tab-coq" />
        <Tab label="批次追溯" data-testid="tab-trace" />
        <Tab label="QM评级回流" data-testid="tab-qm" />
      </Tabs>

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>检验批号</TableCell>
                <TableCell>物料</TableCell>
                <TableCell>批次</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspectionLots.map((l) => (
                <TableRow key={l.id} data-testid="lot-row">
                  <TableCell>{l.lotNo}</TableCell>
                  <TableCell>{l.materialName}</TableCell>
                  <TableCell>{l.batchNo || '—'}</TableCell>
                  <TableCell>{l.vendorName || '—'}</TableCell>
                  <TableCell>{l.quantity}</TableCell>
                  <TableCell><Chip size="small" label={LOT_STATUS_LABEL[l.status]} color={l.status === 'failed' ? 'error' : l.status === 'passed' ? 'success' : 'default'} /></TableCell>
                  <TableCell>
                    <Tooltip title="查看详情"><IconButton size="small" aria-label="查看检验批详情" data-testid="lot-detail" onClick={() => navigate(`/quality/inspection-lot/${l.id}`)}><Visibility fontSize="small" /></IconButton></Tooltip>
                    {l.status === 'pending' && <Button size="small" data-testid="lot-start" onClick={() => judgeLot(l.id, 'in_inspection')}>开始检验</Button>}
                    {l.status === 'in_inspection' && (
                      <Box component="span">
                        <Button size="small" color="success" data-testid="lot-pass" onClick={() => judgeLot(l.id, 'passed')}>合格</Button>
                        <Button size="small" color="error" data-testid="lot-fail" onClick={() => judgeLot(l.id, 'failed')}>不合格</Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <Box>
          <Button variant="contained" sx={{ mb: 1 }} data-testid="coq-add"
            onClick={() => addCOQ({
              id: `coq-${Date.now()}`, period: '2026-07', category: 'appraisal', costCenter: '质检中心',
              amount: 5000, note: '新增鉴定成本', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '质量部', updatedBy: '质量部',
            })}>
            新增COQ记录
          </Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>期间</TableCell><TableCell>类别</TableCell><TableCell>成本中心</TableCell><TableCell>金额</TableCell><TableCell>说明</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {coqRecords.map((r) => (
                  <TableRow key={r.id} data-testid="coq-row">
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{COQ_LABEL[r.category]}</TableCell>
                    <TableCell>{r.costCenter}</TableCell>
                    <TableCell><SecureField module="quality" fieldName="inspectionCost">{r.amount.toLocaleString()}</SecureField></TableCell>
                    <TableCell>{r.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>批次</TableCell><TableCell>物料</TableCell><TableCell>数量</TableCell><TableCell>状态</TableCell><TableCell>检验批结果</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {batchRecords.map((b) => (
                <TableRow key={b.id} data-testid="trace-row">
                  <TableCell>{b.batchNo}</TableCell>
                  <TableCell>{b.materialName}</TableCell>
                  <TableCell>{b.quantity}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>{lotResultByBatch[b.batchNo] || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 3 && (
        <Box>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={6} md={4}>
              <TextField fullWidth select label="选择供应商" value={vendorId}
                onChange={(e) => setVendorId(e.target.value)} data-testid="qm-vendor">
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={4}>
              {qmImpact && (
                <Alert severity="info">
                  来料合格率：{qmImpact.qualityPassRate ?? '—'}%；回流后评级：{qmImpact.gradeAfter}（{qmImpact.scoreAfter ?? '—'}分）
                </Alert>
              )}
            </Grid>
          </Grid>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>供应商</TableCell><TableCell>检验批</TableCell><TableCell>结果</TableCell><TableCell>日期</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {qmVendorFeedback.map((f) => (
                  <TableRow key={f.id} data-testid="qm-row">
                    <TableCell>{vendorName(f.vendorId)}</TableCell>
                    <TableCell>{f.lotNo}</TableCell>
                    <TableCell><Chip size="small" label={f.result === 'fail' ? '不合格' : '合格'} color={f.result === 'fail' ? 'error' : 'success'} /></TableCell>
                    <TableCell>{f.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}

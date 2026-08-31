import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Stack, Alert, Grid, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, FormControl, MenuItem, Button, IconButton, TextField,
} from '@mui/material';
import { Warning, Schedule, PieChart, AssignmentTurnedIn, Delete, Undo } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useSlowMovingStore, DISPOSITION_LABEL, type DispositionAction } from '@/stores/slowMovingStore';
import { BarChart } from '@mui/x-charts/BarChart';

const BUCKETS = [
  { key: 'b0', label: '0-30天', min: 0, max: 30, color: '#10B981' },
  { key: 'b1', label: '31-90天', min: 31, max: 90, color: '#3B82F6' },
  { key: 'b2', label: '91-180天', min: 91, max: 180, color: '#F59E0B' },
  { key: 'b3', label: '180天以上', min: 181, max: Infinity, color: '#EF4444' },
];

const dayDiff = (a: string, b: string) => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.max(0, Math.round((db - da) / 86400000));
};

type ABCClass = 'A' | 'B' | 'C';
const ABC_LABEL: Record<ABCClass, { label: string; color: string }> = {
  A: { label: 'A类(核心)', color: '#EF4444' },
  B: { label: 'B类(重要)', color: '#F59E0B' },
  C: { label: 'C类(一般)', color: '#10B981' },
};

const InventoryAging: React.FC = () => {
  const { batchRecords, inventoryRecords } = useWarehouseStore();
  const { materials } = useMaterialStore();
  const { disposals, dispose, removeDisposal } = useSlowMovingStore();
  const [tabValue, setTabValue] = useState(0);

  // ── P2-24 呆滞料处置流 ──
  const [dispDialog, setDispDialog] = useState(false);
  const [dispTarget, setDispTarget] = useState<{
    id: string; materialName: string; materialCode: string; quantity: number; value: number;
  } | null>(null);
  const [dispForm, setDispForm] = useState<{ action: DispositionAction; reason: string }>({ action: 'scrap', reason: '' });

  const openDispose = (row: { id: string; materialName: string; materialCode: string; quantity: number; value: number }) => {
    setDispTarget(row);
    setDispForm({ action: 'scrap', reason: '' });
    setDispDialog(true);
  };
  const handleDisposeSave = () => {
    if (!dispTarget) return;
    dispose({
      materialId: dispTarget.id,
      materialName: dispTarget.materialName,
      materialCode: dispTarget.materialCode,
      action: dispForm.action,
      reason: dispForm.reason,
      quantity: dispTarget.quantity,
      value: dispTarget.value,
      by: '当前用户',
    });
    setDispDialog(false);
  };

  const refDate = useMemo(() => {
    const dates = [
      ...batchRecords.map((b) => b.inboundDate),
      ...inventoryRecords.map((r) => r.lastInboundDate).filter(Boolean) as string[],
    ].filter(Boolean) as string[];
    return dates.length ? dates.sort().slice(-1)[0] : new Date().toISOString().slice(0, 10);
  }, [batchRecords, inventoryRecords]);

  const bucketAgg = useMemo(() => {
    const agg: Record<string, number> = { b0: 0, b1: 0, b2: 0, b3: 0 };
    batchRecords.forEach((b) => {
      const age = dayDiff(b.inboundDate, refDate);
      const bucket = BUCKETS.find((x) => age >= x.min && age <= x.max);
      if (bucket) agg[bucket.key] += b.quantity;
    });
    return agg;
  }, [batchRecords, refDate]);

  const batchDetail = useMemo(() =>
    batchRecords
      .map((b) => ({ ...b, age: dayDiff(b.inboundDate, refDate) }))
      .sort((a, b) => b.age - a.age),
    [batchRecords, refDate]
  );

  const expiringBatches = batchRecords.filter((b) => b.status === 'expiring' || b.status === 'expired');

  const invDetail = useMemo(() =>
    inventoryRecords
      .map((r) => ({ ...r, age: dayDiff(r.lastInboundDate || refDate, refDate) }))
      .sort((a, b) => b.age - a.age),
    [inventoryRecords, refDate]
  );

  const chartData = BUCKETS.map((b) => bucketAgg[b.key]);

  // P2-24: ABC 分析
  const abcData = useMemo(() => {
    const stockItems = inventoryRecords
      .map((r) => {
        const material = materials.find((m) => m.code === r.materialCode || m.id === r.materialId);
        const price = material?.price || 0;
        const value = r.quantity * price;
        return { ...r, value, materialName: material?.name || r.materialName, price };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

    const totalValue = stockItems.reduce((sum, item) => sum + item.value, 0);

    let cumulative = 0;
    const classified = stockItems.map((item) => {
      cumulative += item.value;
      const pct = cumulative / totalValue;
      let cls: ABCClass = 'C';
      if (pct <= 0.70) cls = 'A';
      else if (pct <= 0.90) cls = 'B';
      return { ...item, cumulativePct: pct, cls };
    });

    const classCount = { A: 0, B: 0, C: 0 };
    const classValue = { A: 0, B: 0, C: 0 };
    classified.forEach((item) => {
      classCount[item.cls]++;
      classValue[item.cls] += item.value;
    });

    return { items: classified, totalValue, classCount, classValue };
  }, [inventoryRecords, materials]);

  // P2-24: 呆滞料列表 (>90天未动)
  const slowMoving = useMemo(() => {
    return invDetail
      .filter((r) => r.age > 90)
      .map((r) => {
        const material = materials.find((m) => m.code === r.materialCode || m.id === r.materialId);
        const value = r.quantity * (material?.price || 0);
        return { ...r, value };
      })
      .sort((a, b) => b.value - a.value);
  }, [invDetail, materials]);

  // P2-24: 待处置 = 呆滞料中尚未登记处置决策的
  const pendingSlow = useMemo(
    () => slowMoving.filter((r) => !disposals.find((d) => d.materialId === r.id)),
    [slowMoving, disposals]
  );

  return (
    <PageWrapper
      title="库龄分析"
      subtitle="库存库龄分层、ABC分析与呆滞料预警"
    >
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="库龄分布" />
        <Tab label="ABC分析" />
        <Tab label="呆滞料预警" />
      </Tabs>

      <Alert severity="info" sx={{ mb: 2 }}>
        数据基准日：<strong>{refDate}</strong>（取批次与库存最新入库日期）。库龄按批次入库日期计算。
      </Alert>

      {tabValue === 0 && (
        <>
          {/* 库龄分布图表 */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>批次库龄分布（按数量）</Typography>
            <Box sx={{ height: 320 }}>
              <BarChart
                xAxis={[{ scaleType: 'band', data: BUCKETS.map((b) => b.label) }]}
                series={[{ data: chartData, color: '#3B82F6', valueFormatter: (v) => `${v} 单位` }]}
                height={300}
              />
            </Box>
          </Paper>

          {/* 批次库龄明细 */}
          <Paper sx={{ borderRadius: 3, mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
              <Typography variant="subtitle2" fontWeight={600}>批次库龄明细</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>批次号</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">数量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库龄(天)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>库龄区间</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>入库日期</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchDetail.map((b) => {
                    const bucket = BUCKETS.find((x) => b.age >= x.min && b.age <= x.max);
                    return (
                      <TableRow key={b.id} hover>
                        <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{b.batchNo}</Typography></TableCell>
                        <TableCell>{b.materialName}</TableCell>
                        <TableCell align="right">{b.quantity}</TableCell>
                        <TableCell align="right"><Typography fontWeight={500}>{b.age}</Typography></TableCell>
                        <TableCell>
                          <Chip label={bucket?.label} size="small"
                            sx={{ bgcolor: (bucket?.color || '#94A3B8') + '15', color: bucket?.color || '#94A3B8', fontWeight: 500 }} />
                        </TableCell>
                        <TableCell>{b.inboundDate}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* 效期预警 */}
          <Paper sx={{ borderRadius: 3, mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: '#F59E0B', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>效期预警（临期 / 已过期批次）</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>批次号</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>效期</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>建议</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiringBatches.map((b) => (
                    <TableRow key={b.id} hover>
                      <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{b.batchNo}</Typography></TableCell>
                      <TableCell>{b.materialName}</TableCell>
                      <TableCell>{b.expiryDate}</TableCell>
                      <TableCell>
                        <Chip label={b.status === 'expired' ? '已过期' : '临期'} size="small"
                          sx={{ bgcolor: (b.status === 'expired' ? '#EF4444' : '#F59E0B') + '15', color: b.status === 'expired' ? '#EF4444' : '#F59E0B', fontWeight: 500 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {b.status === 'expired' ? '立即冻结并做报废/退货处理' : '优先出库，避免过期损失'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expiringBatches.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94A3B8' }}>暂无临期/过期批次</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* 库存物料库龄（按物料） */}
          <Paper sx={{ borderRadius: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule sx={{ color: '#3B82F6', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>库存物料库龄（按最新入库日期）</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库存数量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>单位</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库龄(天)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>库龄区间</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>最新入库</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invDetail.map((r) => {
                    const bucket = BUCKETS.find((x) => r.age >= x.min && r.age <= x.max);
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{r.materialName}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.materialCode}</Typography>
                        </TableCell>
                        <TableCell align="right">{r.quantity}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell align="right"><Typography fontWeight={500}>{r.age}</Typography></TableCell>
                        <TableCell>
                          <Chip label={bucket?.label} size="small"
                            sx={{ bgcolor: (bucket?.color || '#94A3B8') + '15', color: bucket?.color || '#94A3B8', fontWeight: 500 }} />
                        </TableCell>
                        <TableCell>{r.lastInboundDate || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {tabValue === 1 && (
        <Box data-testid="aging-abc">
          {/* ABC 概览 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {(['A', 'B', 'C'] as ABCClass[]).map((cls) => (
              <Grid item xs={4} key={cls}>
                <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: ABC_LABEL[cls].color + '15' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: ABC_LABEL[cls].color }}>
                    {abcData.classCount[cls]}
                  </Typography>
                  <Typography variant="caption">{ABC_LABEL[cls].label}</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    金额：{abcData.classValue[cls].toLocaleString()} 元
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ borderRadius: 3, mb: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
              <Typography variant="subtitle2" fontWeight={600}>
                ABC 分类明细（按库存金额：A类前70% / B类70-90% / C类90-100%）
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库存数量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">单价</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库存金额</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">累计占比</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>分类</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {abcData.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{item.materialName}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.materialCode}</Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{item.price.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={500} color={ABC_LABEL[item.cls].color}>
                          {item.value.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {(item.cumulativePct * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ABC_LABEL[item.cls].label}
                          sx={{
                            bgcolor: ABC_LABEL[item.cls].color + '15',
                            color: ABC_LABEL[item.cls].color,
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {abcData.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                        暂无库存数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {tabValue === 2 && (
        <Box data-testid="aging-slow">
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              呆滞料预警：库龄超过90天未动物料共 {slowMoving.length} 项，其中待处置 {pendingSlow.length} 项
            </Typography>
            <Typography variant="body2">
              以下物料超过90天无出库记录，建议优先消耗或处置；可对每项登记处置决策（报废/转用/退供应商/促销）。
            </Typography>
          </Alert>

          <Paper sx={{ borderRadius: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning sx={{ color: '#EF4444', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>呆滞料列表（待处置）</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库存数量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>单位</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库龄(天)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">库存金额</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>最新入库</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingSlow.map((r) => (
                    <TableRow key={r.id} hover sx={{ bgcolor: '#FFF5F5' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{r.materialName}</Typography>
                        <Typography variant="caption" color="text.secondary">{r.materialCode}</Typography>
                      </TableCell>
                      <TableCell align="right">{r.quantity}</TableCell>
                      <TableCell>{r.unit}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${r.age}天`}
                          sx={{
                            bgcolor: r.age > 180 ? '#EF4444' : '#F59E0B',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600} color="#EF4444">
                          {r.value.toLocaleString()} 元
                        </Typography>
                      </TableCell>
                      <TableCell>{r.lastInboundDate || '-'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="warning" startIcon={<AssignmentTurnedIn />}
                          data-testid={`dispose-${r.id}`} onClick={() => openDispose(r)}>
                          处置
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingSlow.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                        待处置呆滞物料已全部登记处置决策
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* 处置记录 */}
          <Paper sx={{ borderRadius: 3, mt: 3 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentTurnedIn sx={{ color: '#10B981', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>处置记录（已登记 {disposals.length} 项）</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>处置方式</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>原因</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">数量</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">金额</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>登记日期</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disposals.map((d) => (
                    <TableRow key={d.materialId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{d.materialName}</Typography>
                        <Typography variant="caption" color="text.secondary">{d.materialCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={DISPOSITION_LABEL[d.action]}
                          sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>{d.reason || '-'}</TableCell>
                      <TableCell align="right">{d.quantity}</TableCell>
                      <TableCell align="right">{d.value.toLocaleString()} 元</TableCell>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" data-testid={`undo-dispose-${d.materialId}`}
                          onClick={() => removeDisposal(d.materialId)}>
                          <Undo fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {disposals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                        暂无处置记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {/* 处置决策对话框 */}
      <Dialog open={dispDialog} onClose={() => setDispDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>登记呆滞料处置决策</DialogTitle>
        <DialogContent>
          {dispTarget && (
            <Box sx={{ pt: 0.5 }}>
              <Typography variant="body2" gutterBottom>
                物料：<strong>{dispTarget.materialName}</strong>（{dispTarget.materialCode}）
              </Typography>
              <Typography variant="caption" color="text.secondary">
                数量 {dispTarget.quantity} · 金额 {dispTarget.value.toLocaleString()} 元
              </Typography>
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">处置方式</Typography>
                <Select value={dispForm.action} onChange={(e) => setDispForm({ ...dispForm, action: e.target.value as DispositionAction })}>
                  {(Object.keys(DISPOSITION_LABEL) as DispositionAction[]).map((a) => (
                    <MenuItem key={a} value={a}>{DISPOSITION_LABEL[a]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth size="small" label="处置原因" multiline minRows={2} sx={{ mt: 2 }}
                value={dispForm.reason} onChange={(e) => setDispForm({ ...dispForm, reason: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispDialog(false)}>取消</Button>
          <Button variant="contained" color="warning" onClick={handleDisposeSave} disabled={!dispTarget}>确认处置</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default InventoryAging;

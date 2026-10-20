import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, TextField, Stack, Alert, Divider, Avatar,
} from '@mui/material';
import {
  Search, AccountTree, CallSplit, Inventory2, Factory, LocalShipping,
  Store, Assignment, QrCode2,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { SerialMaster } from '@/types';

// ───────────────────── 追溯节点模型 ─────────────────────
interface TraceNode {
  /** 节点类型，用于配色与图标 */
  kind: 'inbound' | 'vendor' | 'workorder' | 'pick' | 'rawinbound' | 'finished' | 'sale' | 'customer';
  docNo: string;
  title: string;
  detail: string;
  sub?: string;
  date?: string;
}

interface TraceResult {
  backward: TraceNode[];
  forward: TraceNode[];
}

interface TraceCtx {
  batchRecords: { batchNo: string; inboundNo?: string; supplierName?: string; materialName?: string; inboundDate?: string }[];
  inboundOrders: { inboundNo: string; vendorName?: string; sourceNo?: string; inboundDate?: string }[];
  outboundOrders: {
    outboundNo: string; type: string; sourceNo?: string; customerName?: string; outboundDate?: string;
    items: { batchNo?: string; materialName?: string; quantity?: number; unit?: string }[];
  }[];
  finishedGoodsInbounds: {
    inboundNo: string; batchNo: string; workOrderNo: string; productName?: string; productCode?: string;
    actualQty?: number; unit?: string; inboundDate?: string;
  }[];
}

const LEVEL_META: Record<TraceNode['kind'], { color: string; icon: React.ReactNode; align: 'up' | 'down' }> = {
  inbound: { color: '#3B82F6', icon: <Inventory2 fontSize="small" />, align: 'up' },
  vendor: { color: '#8B5CF6', icon: <Store fontSize="small" />, align: 'up' },
  workorder: { color: '#F59E0B', icon: <Assignment fontSize="small" />, align: 'up' },
  pick: { color: '#0EA5E9', icon: <CallSplit fontSize="small" />, align: 'up' },
  rawinbound: { color: '#6366F1', icon: <Inventory2 fontSize="small" />, align: 'up' },
  finished: { color: '#10B981', icon: <Factory fontSize="small" />, align: 'down' },
  sale: { color: '#EF4444', icon: <LocalShipping fontSize="small" />, align: 'down' },
  customer: { color: '#EC4899', icon: <Store fontSize="small" />, align: 'down' },
};

/** 纯函数：批次正反向追溯穿透。不改任何 store，只读计算。 */
function buildTrace(batchNo: string, ctx: TraceCtx): TraceResult {
  const backward: TraceNode[] = [];
  const forward: TraceNode[] = [];

  if (!batchNo) return { backward, forward };

  const batch = ctx.batchRecords.find((b) => b.batchNo === batchNo);

  // ── 反向上游（来源）──
  // 1) 批次自身采购入库 + 供应商
  if (batch?.inboundNo) {
    const inb = ctx.inboundOrders.find((i) => i.inboundNo === batch.inboundNo);
    backward.push({
      kind: 'inbound', docNo: batch.inboundNo, title: '采购入库',
      detail: `供应商：${inb?.vendorName || batch.supplierName || '-'}`,
      sub: inb ? `采购订单：${inb.sourceNo || '-'}` : '', date: batch.inboundDate,
    });
    backward.push({
      kind: 'vendor', docNo: '', title: '上游供应商',
      detail: batch.supplierName || inb?.vendorName || '-',
      sub: inb ? `采购订单：${inb.sourceNo || '-'}` : '', date: '',
    });
  } else if (batch?.supplierName) {
    backward.push({
      kind: 'vendor', docNo: '', title: '上游供应商', detail: batch.supplierName, sub: '', date: '',
    });
  }

  // 2) 成品批次 → 工单 → 领料原料批次 → 原料供应商
  const fin = ctx.finishedGoodsInbounds.find((f) => f.batchNo === batchNo);
  if (fin) {
    backward.push({
      kind: 'workorder', docNo: fin.workOrderNo, title: '生产工单',
      detail: `产品：${fin.productName || '-'}（${fin.productCode || '-'}）`,
      sub: `工单 ${fin.workOrderNo}`, date: fin.inboundDate,
    });
    const picks = ctx.outboundOrders.filter((o) => o.type === 'pick' && o.sourceNo === fin.workOrderNo);
    picks.forEach((p) => {
      p.items.forEach((it) => {
        if (!it.batchNo) return;
        backward.push({
          kind: 'pick', docNo: p.outboundNo, title: '生产领料',
          detail: `耗用物料批次：${it.batchNo}（${it.materialName || ''}）`,
          sub: `数量 ${it.quantity ?? '-'} ${it.unit || ''}`, date: p.outboundDate,
        });
        const rawBatch = ctx.batchRecords.find((b) => b.batchNo === it.batchNo);
        if (rawBatch?.inboundNo) {
          const rinb = ctx.inboundOrders.find((i) => i.inboundNo === rawBatch.inboundNo);
          backward.push({
            kind: 'rawinbound', docNo: rawBatch.inboundNo, title: '原料采购入库',
            detail: `原料批次：${rawBatch.batchNo}（${rawBatch.materialName || ''}）`,
            sub: `供应商：${rawBatch.supplierName || rinb?.vendorName || '-'} / 采购订单：${rinb?.sourceNo || '-'}`,
            date: rawBatch.inboundDate,
          });
          backward.push({
            kind: 'vendor', docNo: '', title: '原料供应商',
            detail: rawBatch.supplierName || rinb?.vendorName || '-',
            sub: rinb ? `采购订单：${rinb.sourceNo || '-'}` : '', date: '',
          });
        } else if (rawBatch) {
          backward.push({
            kind: 'rawinbound', docNo: '', title: '原料批次',
            detail: `原料批次：${rawBatch.batchNo}（${rawBatch.materialName || ''}）`,
            sub: `供应商：${rawBatch.supplierName || '-'}`, date: rawBatch.inboundDate,
          });
        }
      });
    });
  }

  // ── 正向下游（去向）──
  // 1) 原料批次 → 领料 → 工单 → 成品入库
  const picksForBatch = ctx.outboundOrders.filter(
    (o) => o.type === 'pick' && o.items.some((it) => it.batchNo === batchNo),
  );
  picksForBatch.forEach((p) => {
    forward.push({
      kind: 'pick', docNo: p.outboundNo, title: '生产领料',
      detail: `工单：${p.sourceNo}`, sub: `领用工单 ${p.sourceNo}`, date: p.outboundDate,
    });
    const fins = ctx.finishedGoodsInbounds.filter((f) => f.workOrderNo === p.sourceNo);
    fins.forEach((f) => {
      forward.push({
        kind: 'finished', docNo: f.inboundNo, title: '成品入库',
        detail: `成品批次：${f.batchNo}（${f.productName || ''}）`,
        sub: `数量 ${f.actualQty ?? '-'} ${f.unit || ''} / 工单 ${f.workOrderNo}`, date: f.inboundDate,
      });
    });
  });

  // 2) 销售/调拨出库 → 客户
  const sales = ctx.outboundOrders.filter(
    (o) => (o.type === 'sale' || o.type === 'transfer') && o.items.some((it) => it.batchNo === batchNo),
  );
  sales.forEach((s) => {
    forward.push({
      kind: 'sale', docNo: s.outboundNo, title: s.type === 'transfer' ? '调拨出库' : '销售出库',
      detail: `客户：${s.customerName || '-'}`, sub: `单据 ${s.outboundNo}`, date: s.outboundDate,
    });
  });

  return { backward, forward };
}

const NodeRow: React.FC<{ node: TraceNode }> = ({ node }) => {
  const meta = LEVEL_META[node.kind];
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
      <Avatar sx={{ bgcolor: meta.color + '15', color: meta.color, width: 32, height: 32, mt: 0.25 }}>
        {meta.icon}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={700} color={meta.color}>{node.title}</Typography>
          {node.docNo && (
            <Typography variant="caption" fontFamily="monospace" color="text.secondary">{node.docNo}</Typography>
          )}
          {node.date && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{node.date}</Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.primary">{node.detail}</Typography>
        {node.sub && <Typography variant="caption" color="text.secondary">{node.sub}</Typography>}
      </Box>
    </Box>
  );
};

const TraceColumn: React.FC<{ title: string; nodes: TraceNode[]; testid: string; emptyText: string }> = ({
  title, nodes, testid, emptyText,
}) => (
  <Paper sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 320, borderTop: '3px solid', borderColor: '#E2E8F0' }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <AccountTree fontSize="small" sx={{ color: '#64748B' }} />
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      <Chip size="small" label={nodes.length} sx={{ ml: 'auto' }} />
    </Stack>
    <Divider sx={{ mb: 2 }} />
    <Box data-testid={testid}>
      {nodes.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{emptyText}</Typography>
      ) : (
        nodes.map((n, i) => <NodeRow key={`${n.kind}-${n.docNo}-${i}`} node={n} />)
      )}
    </Box>
  </Paper>
);

const TraceBatch: React.FC = () => {
  const { batchRecords, inboundOrders, outboundOrders, finishedGoodsInbounds } = useWarehouseStore();
  const serialMasters = useWarehouseAdvancedStore((s) => s.serialMasters);

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<TraceResult | null>(null);
  const [activeSerial, setActiveSerial] = useState<SerialMaster | null>(null);
  const [notFound, setNotFound] = useState('');

  const ctx = useMemo<TraceCtx>(() => ({
    batchRecords: batchRecords as TraceCtx['batchRecords'],
    inboundOrders: inboundOrders as TraceCtx['inboundOrders'],
    outboundOrders: outboundOrders as TraceCtx['outboundOrders'],
    finishedGoodsInbounds: finishedGoodsInbounds as TraceCtx['finishedGoodsInbounds'],
  }), [batchRecords, inboundOrders, outboundOrders, finishedGoodsInbounds]);

  const runTrace = () => {
    const q = query.trim();
    if (!q) { setNotFound('请输入批次号或序列号'); setResult(null); setActiveSerial(null); return; }
    // 优先按序列号匹配
    const serial = serialMasters.find((s) => s.serialNo.toLowerCase() === q.toLowerCase());
    if (serial) {
      setActiveSerial(serial);
      const batchNo = serial.batchNo || '';
      setResult(batchNo ? buildTrace(batchNo, ctx) : { backward: [], forward: [] });
      setNotFound('');
      return;
    }
    // 按批次号匹配
    const batchExists = batchRecords.some((b) => b.batchNo === q);
    const touchedInbound = inboundOrders.some((i) => i.items.some((it) => it.batchNo === q));
    const touchedOutbound = outboundOrders.some((o) => o.items.some((it) => it.batchNo === q));
    const isFin = finishedGoodsInbounds.some((f) => f.batchNo === q);
    if (batchExists || touchedInbound || touchedOutbound || isFin) {
      setActiveSerial(null);
      setResult(buildTrace(q, ctx));
      setNotFound('');
    } else {
      setResult(null);
      setActiveSerial(null);
      setNotFound(`未找到批次/序列号「${q}」的追溯链路，请确认输入是否正确。`);
    }
  };

  // 示例快捷入口（填示例批次/序列号供快速体验；实际查询仍走真实数据，匹配不到即提示未找到）
  const demos = [
    { label: '示例：成品批次 F20240620X（反向上游）', value: 'F20240620X' },
    { label: '示例：原料批次 B20240601X（正向下游）', value: 'B20240601X' },
    { label: '示例：序列号 SN-2024-0001（一物一码）', value: 'SN-2024-0001' },
  ];

  return (
    <PageWrapper
      title="批次追溯穿透"
      subtitle="批次正反向追溯穿透视图（含序列号级一物一码溯源）— C1。数据源随真实单据流转自动更新（入库/出库/成品入库/序列号均已接数据库）；下方示例号仅作快速体验入口。"
    >
      {/* 查询条 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="输入批次号（如 B20240601X）或序列号（如 SN-2024-0001）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runTrace(); }}
            InputProps={{ startAdornment: <Search sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
            sx={{ width: 460 }}
            data-testid="trace-query"
          />
          <Button variant="contained" startIcon={<Search />} onClick={runTrace} data-testid="trace-run">
            追溯
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>示例入口（查询仍走真实数据）：</Typography>
          {demos.map((d) => (
            <Chip key={d.value} size="small" variant="outlined" label={d.label}
              onClick={() => { setQuery(d.value); }}
              sx={{ cursor: 'pointer' }} />
          ))}
        </Stack>
      </Paper>

      {notFound && <Alert severity="warning" sx={{ mb: 2 }}>{notFound}</Alert>}

      {/* 序列号信息面板 */}
      {activeSerial && (
        <Paper sx={{ p: 2.5, mb: 2, borderRadius: 3, borderLeft: '4px solid', borderColor: '#8B5CF6' }}
          data-testid="serial-info">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <QrCode2 sx={{ color: '#8B5CF6' }} />
            <Typography variant="subtitle1" fontWeight={700}>序列号溯源</Typography>
            <Chip size="small" label={activeSerial.serialNo} sx={{ ml: 'auto', fontFamily: 'monospace' }} />
          </Stack>
          <Stack direction="row" spacing={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">物料</Typography>
              <Typography variant="body2" fontWeight={600}>{activeSerial.materialName || '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">关联批次</Typography>
              <Typography variant="body2" fontWeight={600} fontFamily="monospace">{activeSerial.batchNo || '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">状态</Typography>
              <Typography variant="body2" fontWeight={600}>
                {activeSerial.status === 'shipped' ? '已发货' : activeSerial.status === 'in_stock' ? '在库' : activeSerial.status}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">客户</Typography>
              <Typography variant="body2" fontWeight={600}>{activeSerial.customerName || '-'}</Typography>
            </Box>
          </Stack>
          {activeSerial.movements && activeSerial.movements.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">全生命周期轨迹</Typography>
              {activeSerial.movements.map((m, i) => (
                <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  · {m.date} [{m.type}] {m.docNo} — {m.note}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* 追溯结果：反向上游 / 正向下游 */}
      {result && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TraceColumn
            title="反向上游（来源）"
            testid="trace-backward"
            nodes={result.backward}
            emptyText="该批次无上游来源记录（如已是最上游采购批次）。"
          />
          <TraceColumn
            title="正向下游（去向）"
            testid="trace-forward"
            nodes={result.forward}
            emptyText="该批次暂无下游出货/投产记录。"
          />
        </Stack>
      )}
    </PageWrapper>
  );
};

export default TraceBatch;

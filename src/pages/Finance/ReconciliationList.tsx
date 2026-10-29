/**
 * 财务 · 对账管理（V3.118.0 新增）
 * ─────────────────────────────────────────────────────────────────────────────
 * 强哥需求：主 ERP 财务模块要有对账功能，和供应商端的对账数据核对，显示关联单据并支持点击跳转。
 *
 * 与既有页面的分工（务必区分，避免做成"又一个三单匹配"）：
 *   · 三单匹配（/finance/three-way）：发票 ↔ 采购订单 ↔ 入库单，回答"这笔钱能不能付"；
 *   · 本页（对账管理）            ：门户对账单 → 采购订单/入库/发票台账，回答"这张对账单认不认"。
 *
 * 数据来源（唯一真源，不在本页另存一份）：
 *   · 门户对账单  useFlowStore.vendorStatements —— 供应商在门户提交的原件；
 *   · 采购订单    usePurchaseStore.purchaseOrders
 *   · 入库单      useWarehouseStore.inboundOrders
 *   · 发票台账    useFinanceStore.invoices
 *   · 对账回写    useFinanceStore.reconciliations（门户确认时写入）
 * 核对算法全部收在 utils/finance/statementReconcile.ts（纯函数 + 单测兜底），
 * 本页只负责取数、铺列、展示差异、触发回写 —— 不在这里另算一套数字。
 *
 * 关联单据：复用 V3.115~117 的 useTypedRelated('vendorStatement') 基础设施，
 * 与门户对账单页同一套关系口径（上游=采购订单/入库单，下游=开票申请，同源=采购发票/付款计划）。
 * ★ 门户对账单的详情路由指向 /vendor-portal/...（门户身份体系），主 ERP 点它会弹回登录页，
 *   故本页对「供应商对账单」这个类型改用主 ERP 内的只读速览弹窗，其余类型照常跳路由。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Card, CardContent, Button, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, FilterBar } from '@/components/common';
import { PageWrapper } from '@/components/layout';
import { applyColumnFilters } from '@/utils/listSearch';
import { useTypedRelated } from '@/utils/relations/useTypedRelated';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
import RelatedDocLinks from '@/components/common/RelatedDocLinks';
import type { RelatedDocRef } from '@/utils/relations/documentRelations';
import { useFinanceStore } from '@/stores/financeStore';
import { useFlowStore } from '@/stores/flowStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import {
  reconcileStatement, summarize,
  type StatementCheck, type Conclusion,
} from '@/utils/finance/statementReconcile';
import { formatCurrency } from '@/utils/format';
import VendorStatementPeek from './VendorStatementPeek';

/** 结论 → 展示样式（一处定义，KPI 卡 / 表格 Chip / 详情共用，避免同一条结论两种颜色） */
const CONCLUSION_UI: Record<Conclusion, { label: string; color: 'success' | 'error' | 'warning' }> = {
  matched: { label: '核对一致', color: 'success' },
  diff: { label: '存在差异', color: 'error' },
  incomplete: { label: '待补充单据', color: 'warning' },
};

/** 门户状态 → 中文（只覆盖本页会遇到的；未登记的回落原值，不编造） */
const PORTAL_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', submitted: '待审批', reviewing: '审批中', sent: '已发送',
  confirmed: '已确认', disputed: '有争议', closed: '已关闭',
};

const CONCLUSION_OPTIONS = [
  { value: '', label: '全部结论' },
  { value: 'matched', label: '核对一致' },
  { value: 'diff', label: '存在差异' },
  { value: 'incomplete', label: '待补充单据' },
];

const WRITEBACK_OPTIONS = [
  { value: '', label: '全部回写状态' },
  { value: 'yes', label: '已回写' },
  { value: 'no', label: '未回写' },
];

/**
 * 混合类型关联单据渲染（V3.118.0）。
 *
 * 为什么要拆开渲染，而不是直接给 RelatedDocLinks 传 onDocClick：
 *   RelatedDocLinks 的契约是「只要传了 onDocClick，就一律渲染为可点链接、且不再 navigate」，
 *   它并不知道回调内部会不会处理某个类型。所以若整组传回调，点采购订单也会进回调、
 *   什么都不发生（实测表现为"点了没反应"，或更糟——弹出张冠李戴的速览）。
 *   正确做法：把「需要主 ERP 内接管的类型」与「照常跳路由的类型」分组，前者才传回调。
 *
 * ★ 哪些类型必须接管（实测出的清单，不是猜的）：
 *   · vendorStatement（供应商对账单）→ 路由 /vendor-portal/purchase/statements
 *   · vendorInvoiceRequest（开票申请）→ 路由 /vendor-portal/finance/invoices
 *   两者都登记在**门户身份体系**下。主 ERP 里点它们会被 RequireAuth 直接踹到
 *   /vendor-portal/login（实测：点开票申请 → 跳门户登录页），用户会以为功能坏了。
 *   故这两类统一在主 ERP 内弹只读速览，其余类型（采购订单/入库单/发票/付款计划）照常跳详情页。
 */
const PORTAL_DOC_TYPES = new Set(['vendorStatement', 'vendorInvoiceRequest']);

function RelatedDocsMixed({
  docs,
  onPortalDocClick,
}: {
  docs: RelatedDocRef[];
  onPortalDocClick: (d: RelatedDocRef) => void;
}) {
  if (!docs || docs.length === 0) return <Typography variant="body2" color="text.disabled">-</Typography>;
  const takeover = docs.filter((d) => PORTAL_DOC_TYPES.has(d.type));
  const normal = docs.filter((d) => !PORTAL_DOC_TYPES.has(d.type));
  return (
    <Box component="span">
      {takeover.length > 0 && (
        <RelatedDocLinks docs={takeover} showType showStatus onDocClick={onPortalDocClick} />
      )}
      {takeover.length > 0 && normal.length > 0 && (
        <Typography component="span" variant="body2" sx={{ mx: 0.5, color: 'text.disabled' }}>、</Typography>
      )}
      {normal.length > 0 && <RelatedDocLinks docs={normal} showType showStatus />}
    </Box>
  );
}

/** 金额单元格：差异按正负着色（正=供应商多报，红；负=少报，橙） */function DiffCell({ value, testId }: { value: number; testId: string }) {
  const zero = Math.abs(value) < 0.01;
  const color = zero ? 'text.secondary' : value > 0 ? 'error.main' : 'warning.main';
  return (
    <Typography variant="body2" align="right" sx={{ color, fontWeight: zero ? 400 : 600 }} data-testid={testId}>
      {zero ? '0.00' : `${value > 0 ? '+' : ''}${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
    </Typography>
  );
}

export default function ReconciliationList() {
  // 关系源就绪（含采购订单/入库/发票/付款计划等 store 的预拉取 + 数据变化订阅）
  useEnsureRelatedStores('vendorStatement');

  const vendorStatements = useFlowStore((s) => s.vendorStatements);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const invoices = useFinanceStore((s) => s.invoices);
  const reconciliations = useFinanceStore((s) => s.reconciliations);
  const confirmReconciliation = useFinanceStore((s) => s.confirmReconciliation);

  // 手动刷新：核对结论依赖 4 张表，任一表被别的页面改过都要能重算
  const [nonce, setNonce] = useState(0);
  /** 已执行回写的对账单号（用于给出「已回写」反馈，不做长事务） */
  const [writeBackMsg, setWriteBackMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!writeBackMsg) return;
    const t = setTimeout(() => setWriteBackMsg(null), 4000);
    return () => clearTimeout(t);
  }, [writeBackMsg]);

  // ── 核对（每张对账单一份结果；统一走纯函数，与单测同口径）──
  const checks = useMemo<StatementCheck[]>(() => {
    void nonce;
    const list = Array.isArray(vendorStatements) ? vendorStatements : [];
    return list.map((vs) =>
      reconcileStatement({
        statement: vs as unknown as Parameters<typeof reconcileStatement>[0]['statement'],
        purchaseOrders: purchaseOrders as unknown as Parameters<typeof reconcileStatement>[0]['purchaseOrders'],
        inboundOrders: inboundOrders as unknown as Parameters<typeof reconcileStatement>[0]['inboundOrders'],
        invoices: invoices as unknown as Parameters<typeof reconcileStatement>[0]['invoices'],
        reconciliations: reconciliations as unknown as Parameters<typeof reconcileStatement>[0]['reconciliations'],
      })
    );
  }, [vendorStatements, purchaseOrders, inboundOrders, invoices, reconciliations, nonce]);

  const summary = useMemo(() => summarize(checks), [checks]);

  // 供应商对账单只读速览（主 ERP 内不能跳 /vendor-portal/...，会被 RequireAuth 弹回登录页）
  const [peekDoc, setPeekDoc] = useState<RelatedDocRef | null>(null);
  // 门户体系单据（对账单/开票申请）的点击统一进这里 → 主 ERP 内只读速览
  const handleDocClick = useCallback((doc: RelatedDocRef) => setPeekDoc(doc), []);

  // ── 关联单据列：门户体系类型（对账单 / 开票申请）在主 ERP 内弹速览，其余照常跳详情页 ──
  // ★ V3.118.0 实测教训：useTypedRelated 的 onDocClick 原本会接管**整列所有类型**，
  //   于是点「采购订单」没反应（回调只处理对账单，其余 return 掉了）、
  //   点「开票申请」被踹到 /vendor-portal/login。现改为按类型分组（portalDocTypes），
  //   同一列内两类并存：门户类型走速览，正常类型照常 navigate。
  const rel = useTypedRelated('vendorStatement', vendorStatements as unknown as Record<string, any>[], {
    onDocClick: handleDocClick,
    // 固定铺出这些列：即使当前一张对账单都没关联到，也要让财务看见
    // "本该有采购发票/付款计划"——列不存在，缺失本身就不可见。
    alwaysIncludeTypes: ['finInvoice', 'paymentPlan'],
    // 这两类的路由在门户身份体系下，主 ERP 直接跳会被 RequireAuth 拦到门户登录页
    portalDocTypes: ['vendorStatement', 'vendorInvoiceRequest'],
  });

  /** 核对结果按对账单号索引（关联列与核对结果需同行合并展示） */
  const checkMap = useMemo(() => {
    const m = new Map<string, StatementCheck>();
    for (const c of checks) m.set(c.statementNo, c);
    return m;
  }, [checks]);

  /** 表格行 = 关系增强行 + 核对结论字段（两套口径合并成一行，避免两个表各看一半） */
  const rows = useMemo(
    () => rel.data.map((r) => {
      const c = checkMap.get(String(r.statementNo));
      return {
        ...r,
        // 供筛选/检索的文本字段（结论 label、回写状态）
        rcConclusion: c?.conclusion ?? 'incomplete',
        rcWriteBack: c?.reconciled ? 'yes' : 'no',
      };
    }),
    [rel.data, checkMap]
  );

  // ── 列定义 ──
  const baseColumns = useMemo<ColumnDef<any, unknown>[]>(() => [
    {
      id: 'statementNo',
      header: '对账单号',
      meta: { searchable: true },
      accessorFn: (r) => r.statementNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>{row.original.statementNo}</Typography>
      ),
    },
    {
      id: 'vendorName',
      header: '供应商',
      meta: { searchable: true },
      accessorFn: (r) => r.vendorName,
    },
    {
      id: 'period',
      header: '对账周期',
      meta: { searchable: true },
      accessorFn: (r) => r.statementPeriod,
    },
    {
      id: 'portalStatus',
      header: '门户状态',
      accessorFn: (r) => PORTAL_STATUS_LABEL[String(r.status)] ?? r.status,
      cell: ({ row }) => {
        const key = String(row.original.status ?? '');
        const label = PORTAL_STATUS_LABEL[key] ?? key;
        const color = key === 'confirmed' || key === 'closed' ? 'success'
          : key === 'disputed' ? 'error' : 'default';
        return <Chip size="small" variant="outlined" color={color as any} label={label} />;
      },
    },
    {
      id: 'stmtGrandTotal',
      header: '对账金额(价税合计)',
      meta: { searchable: true },
      accessorFn: (r) => Number(r.grandTotal) || 0,
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        return <Typography variant="body2" align="right">{formatCurrency(c?.stmtGrandTotal ?? 0)}</Typography>;
      },
    },
    {
      id: 'poTotal',
      header: 'ERP订单金额(价税合计)',
      accessorFn: (r) => checkMap.get(String(r.statementNo))?.poTotal ?? 0,
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        if (!c || c.poTotal === 0) {
          // 明确表达"没得比"，而不是显示 ¥0.00 让人误以为订单金额为零
          return <Typography variant="body2" align="right" color="text.disabled">—</Typography>;
        }
        return <Typography variant="body2" align="right">{formatCurrency(c.poTotal)}</Typography>;
      },
    },
    {
      id: 'totalDiff',
      header: '价税合计差异',
      accessorFn: (r) => checkMap.get(String(r.statementNo))?.totalDiff ?? 0,
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        if (!c || c.poTotal === 0) {
          return <Typography variant="body2" align="right" color="text.disabled">—</Typography>;
        }
        return <DiffCell value={c.totalDiff} testId={`recon-diff-${row.original.statementNo}`} />;
      },
    },
    {
      id: 'qtySummary',
      header: '数量核对',
      accessorFn: (r) => {
        const c = checkMap.get(String(r.statementNo));
        if (!c) return '';
        const bad = c.lines.filter((l) => l.poFound && Math.abs(l.qtyDiff) > 0.001).length;
        return bad > 0 ? `${bad} 行不符` : '一致';
      },
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        if (!c || c.lines.length === 0) return <Typography variant="body2" color="text.disabled">—</Typography>;
        const bad = c.lines.filter((l) => l.poFound && Math.abs(l.qtyDiff) > 0.001);
        // ★ 已入库数量单独着色：数量与订单一致 ≠ 货已收到。
        //   实测种子数据就是这种情形（对账单 30 吨、订单 30 吨，但入库单仍是"待处理"、实收 0），
        //   若把「已入库 0 / 对账 30」塞在绿色的"一致"里，财务会以为货已到、可以付款 ——
        //   而实际上一件都没入库。故未收齐时用橙色表达"数量口径一致、实物未到"。
        const receivedShort = c.inboundQty + 0.001 < c.stmtQty;
        const qtyLabel = `已入库 ${c.inboundQty} / 对账 ${c.stmtQty}`;
        if (bad.length > 0) {
          return (
            <Tooltip title={bad.map((l) => `第${l.lineNo}行：对账 ${l.stmtQty} vs 订单 ${l.poQty}`).join('；')}>
              <Chip size="small" color="error" label={`${bad.length} 行不符`} />
            </Tooltip>
          );
        }
        return (
          <Tooltip title={receivedShort ? '数量与订单一致，但实收数量少于对账数量（货未到齐或入库单未过账）' : ''}>
            <Chip
              size="small"
              color={receivedShort ? 'warning' : 'success'}
              variant={receivedShort ? 'filled' : 'outlined'}
              label={qtyLabel}
              data-testid={`recon-qty-${row.original.statementNo}`}
            />
          </Tooltip>
        );
      },
    },
    {
      id: 'invoiceCheck',
      header: '发票核对',
      accessorFn: (r) => {
        const c = checkMap.get(String(r.statementNo));
        if (!c) return '';
        return c.missingInvoices.length > 0 ? `缺 ${c.missingInvoices.join(',')}` : '台账已存在';
      },
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        if (!c) return <Typography variant="body2" color="text.disabled">—</Typography>;
        if (c.missingInvoices.length > 0) {
          return (
            <Tooltip title={`台账中查不到：${c.missingInvoices.join('、')}`}>
              <Chip size="small" color="error" variant="outlined" label={`${c.missingInvoices.length} 张未入账`} />
            </Tooltip>
          );
        }
        const invoiced = c.lines.filter((l) => l.invoiceNo);
        if (invoiced.length === 0) return <Typography variant="body2" color="text.secondary">未开票</Typography>;
        return <Chip size="small" color="success" variant="outlined" label={`${invoiced.length} 张已入账`} />;
      },
    },
    {
      id: 'conclusion',
      header: '核对结论',
      meta: { searchable: true, filterType: 'select', filterOptions: CONCLUSION_OPTIONS.filter((o) => o.value) },
      accessorFn: (r) => r.rcConclusion,
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        const concl = (c?.conclusion ?? 'incomplete') as Conclusion;
        const ui = CONCLUSION_UI[concl];
        return (
          <Tooltip title={c?.conclusionText ?? ''}>
            <Chip size="small" color={ui.color} label={ui.label} data-testid={`recon-conclusion-${row.original.statementNo}`} />
          </Tooltip>
        );
      },
    },
    {
      id: 'writeBack',
      header: '主ERP回写',
      meta: { searchable: true, filterType: 'select', filterOptions: WRITEBACK_OPTIONS.filter((o) => o.value) },
      accessorFn: (r) => r.rcWriteBack,
      cell: ({ row }) => {
        const c = checkMap.get(String(row.original.statementNo));
        if (c?.reconciled) {
          return <Chip size="small" color="success" label="已回写" data-testid={`recon-wb-${row.original.statementNo}`} />;
        }
        return <Chip size="small" color="warning" variant="outlined" label="未回写" data-testid={`recon-wb-${row.original.statementNo}`} />;
      },
    },
  ], [checkMap]);

  const allColumns = useMemo(
    () => [...baseColumns, ...(rel.columns as ColumnDef<any, unknown>[])],
    [baseColumns, rel.columns]
  );

  // ── 列驱动统一检索 ──
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const filtered = useMemo(
    () => applyColumnFilters(rows, allColumns, filterData, { module: 'finance' }),
    [rows, allColumns, filterData]
  );

  // ── 详情弹窗（点击行打开：逐行差异 + 关联单据 + 回写操作）──
  const [detailNo, setDetailNo] = useState<string | null>(null);
  // 深链：全局搜索/其他页面跳过来带 ?focus=<对账单号>，自动打开该单详情
  const [searchParams] = useSearchParams();
  const focusNo = searchParams.get('focus');
  useEffect(() => {
    if (!focusNo) return;
    if (!vendorStatements.some((v) => String(v.statementNo) === focusNo)) return;
    setDetailNo(focusNo);
  }, [focusNo, vendorStatements]);

  const detail = detailNo ? checkMap.get(detailNo) : undefined;
  const detailRow = detailNo ? rel.data.find((r) => String(r.statementNo) === detailNo) : undefined;


  /** 回写对账确认（金额取对账单不含税合计，与门户侧 confirmReconciliation 的入参口径一致） */
  const handleWriteBack = (c: StatementCheck) => {
    confirmReconciliation({
      statementNo: c.statementNo,
      vendorId: c.vendorId,
      vendorName: c.vendorName,
      period: c.period,
      amount: c.stmtSubtotal,
    } as Parameters<typeof confirmReconciliation>[0]);
    setWriteBackMsg(`已回写对账结论：${c.statementNo}`);
    setNonce((n) => n + 1);
  };

  return (
    <PageWrapper title="对账管理">
      <Alert severity="info" sx={{ mb: 2 }} data-testid="recon-scope-note">
        本页核对<b>供应商在门户提交的对账单</b>与主 ERP 的采购订单、入库单、发票台账是否一致，
        用于判断「这张对账单能不能认」。<b>能不能付款</b>请看
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}> 三单匹配</Typography>
        （发票 ↔ 订单 ↔ 入库），两者口径不同、结论也不同。
      </Alert>

      {/* KPI 卡 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { key: 'total', label: '对账单总数', value: summary.total, testId: 'recon-kpi-total', color: undefined },
          { key: 'matched', label: '核对一致', value: summary.matched, testId: 'recon-kpi-matched', color: 'success.main' },
          { key: 'diff', label: '存在差异', value: summary.diff, testId: 'recon-kpi-diff', color: 'error.main' },
          { key: 'incomplete', label: '待补充单据', value: summary.incomplete, testId: 'recon-kpi-incomplete', color: 'warning.main' },
          { key: 'pending', label: '待回写确认', value: summary.pendingWriteBack, testId: 'recon-kpi-pending', color: 'warning.main' },
        ].map((k) => (
          <Grid item xs={6} sm={4} md={2.4} key={k.key}>
            <Card data-testid={k.testId}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: k.color }}>{k.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={12} sm={4} md={2.4}>
          <Card data-testid="recon-kpi-diff-amount">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">差异金额合计</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ color: summary.diffAmount > 0.01 ? 'error.main' : undefined }}>
                {formatCurrency(summary.diffAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
        <FilterBar
          columns={allColumns}
          module="finance"
          onSearch={setFilterData}
          listKey="reconciliation-list"
          columnConfigKey="reconciliation-list"
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => setNonce((n) => n + 1)}
          data-testid="recon-refresh"
        >
          重新核对
        </Button>
      </Stack>

      {writeBackMsg && (
        <Alert severity="success" sx={{ mb: 1.5 }} data-testid="recon-writeback-msg">{writeBackMsg}</Alert>
      )}

      <DataTable
        data={filtered}
        columns={allColumns}
        enablePagination
        enableSorting
        enableColumnFilter
        enableExport
        exportFormat="xlsx"
        hiddenColumns={rel.hiddenColumns}
        columnConfigKey="reconciliation-list"
        onRowClick={(row) => setDetailNo(String((row as Record<string, any>).statementNo ?? ''))}
        onView={(row) => setDetailNo(String((row as Record<string, any>).statementNo ?? ''))}
      />

      {/* ── 详情：逐行差异 + 关联单据 + 回写 ── */}
      <Dialog open={!!detailNo} onClose={() => setDetailNo(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
          <FactCheckIcon color="primary" fontSize="small" />
          对账核对 — {detailNo}
          {detail && (
            <Chip
              size="small"
              sx={{ ml: 'auto', fontWeight: 600 }}
              color={CONCLUSION_UI[detail.conclusion].color}
              label={CONCLUSION_UI[detail.conclusion].label}
            />
          )}
        </DialogTitle>
        <Divider />
        <DialogContent dividers>
          {detail && (
            <>
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {[
                  { label: '供应商', value: detail.vendorName || '-' },
                  { label: '对账周期', value: detail.period || '-' },
                  { label: '门户状态', value: PORTAL_STATUS_LABEL[detail.portalStatus] ?? detail.portalStatus },
                  { label: '对账金额(不含税)', value: formatCurrency(detail.stmtSubtotal) },
                  { label: '订单金额(不含税)', value: detail.poTotal > 0 ? formatCurrency(detail.poAmount) : '无可比对订单' },
                  { label: '价税合计差异', value: detail.poTotal > 0 ? formatCurrency(detail.totalDiff) : '—' },
                ].map((f) => (
                  <Grid item xs={6} sm={4} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* 问题清单：明确写出"差在哪"，而不是只给一个红色标签 */}
              {detail.issues.length > 0 ? (
                <Alert severity={detail.conclusion === 'matched' ? 'info' : 'warning'} sx={{ mb: 1.5 }} data-testid="recon-issues">
                  <Typography variant="caption" fontWeight={700} display="block">核对发现 {detail.issues.length} 项</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {detail.issues.map((t, i) => <li key={i}><Typography variant="caption">{t}</Typography></li>)}
                  </Box>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 1.5 }} icon={<CheckCircleIcon />} data-testid="recon-issues-ok">
                  金额、数量、税额与采购订单一致，发票均已在台账中找到。
                </Alert>
              )}

              {/* 逐行差异 */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>明细逐行核对</Typography>
              <TableContainer sx={{ maxHeight: 320, mb: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>行</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>对账数量</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>订单数量</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>已入库</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>对账金额</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>订单金额</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>发票</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>差异</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.lines.map((l) => (
                      <TableRow key={l.lineNo} hover>
                        <TableCell>{l.lineNo}</TableCell>
                        <TableCell>
                          <Typography variant="caption" display="block">{l.materialName || '-'}</Typography>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace">{l.materialCode}</Typography>
                        </TableCell>
                        <TableCell align="right">{l.stmtQty}</TableCell>
                        <TableCell align="right">{l.poFound ? l.poQty : '—'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={l.inboundQty < l.stmtQty ? 'error' : undefined}
                            fontWeight={l.inboundQty < l.stmtQty ? 600 : undefined}
                          >
                            {l.inboundQty}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(l.stmtAmount)}</TableCell>
                        <TableCell align="right">{l.poFound ? formatCurrency(l.poAmount) : '—'}</TableCell>
                        <TableCell>
                          {!l.invoiceNo ? (
                            <Typography variant="caption" color="text.secondary">未开票</Typography>
                          ) : l.invoiceFound ? (
                            <Chip size="small" color="success" variant="outlined" label={l.invoiceNo} />
                          ) : (
                            <Tooltip title="发票台账中查不到这张票">
                              <Chip size="small" color="error" variant="outlined" icon={<WarningAmberIcon />} label={l.invoiceNo} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.level === 'ok' ? (
                            <Chip size="small" color="success" variant="outlined" label="一致" />
                          ) : l.level === 'missing' ? (
                            <Tooltip title={l.issues.join('；')}>
                              <Chip size="small" color="warning" icon={<ErrorOutlineIcon />} label="缺订单" />
                            </Tooltip>
                          ) : (
                            <Tooltip title={l.issues.join('；')}>
                              <Chip size="small" color="error" label={l.level === 'warn' ? '尾差' : '有差异'} />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* 关联单据（与门户同一套关系口径；点开即主 ERP 内只读速览或详情页） */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>关联单据</Typography>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 64 }}>来源单据</Typography>
                  <RelatedDocsMixed docs={(detailRow?.upstreamDocs ?? []) as RelatedDocRef[]} onPortalDocClick={handleDocClick} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 64 }}>后续单据</Typography>
                  <RelatedDocsMixed docs={(detailRow?.downstreamDocs ?? []) as RelatedDocRef[]} onPortalDocClick={handleDocClick} />
                </Box>
              </Stack>

              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  回写说明：把本次核对结论写入主 ERP 往来对账记录（金额取对账单不含税合计
                  {formatCurrency(detail.stmtSubtotal)}），供应付与付款环节引用。
                </Typography>
                {detail.reconciled ? (
                  <Chip size="small" color="success" label="已回写对账结论" sx={{ mt: 1 }} data-testid="recon-detail-reconciled" />
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    sx={{ mt: 1 }}
                    onClick={() => handleWriteBack(detail)}
                    data-testid="recon-writeback-btn"
                  >
                    回写对账结论
                  </Button>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailNo(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 关联单据只读速览（主 ERP 内点「供应商对账单」不能跳门户路由） */}
      <VendorStatementPeek doc={peekDoc} onClose={() => setPeekDoc(null)} onOpen={(d) => setPeekDoc(d)} />
    </PageWrapper>
  );
}

import { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Paper, Card, CardContent, CardActionArea,
  Chip, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Alert, Tooltip, LinearProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useProductionStore } from '@/stores/productionStore';
import { aggregate, monthKey, makeMonthOrder, ReportResult } from '@/utils/reportEngine';

const reportGroups = [
  {
    group: '采购与供应链',
    color: '#1976d2',
    icon: <ShoppingCartIcon />,
    reports: [
      { name: '采购汇总报表', desc: '采购金额、订单数量、供应商分布', path: '/purchase/orders', tag: '采购' },
      { name: '供应商评级报表', desc: '供应商绩效评分、交货准时率', path: '/vendor/rating', tag: '供应商' },
      { name: '交期跟踪报表', desc: '在途订单状态、预计到货日期', path: '/purchase/track', tag: '物流' },
    ],
  },
  {
    group: '仓储库存',
    color: '#388e3c',
    icon: <InventoryIcon />,
    reports: [
      { name: '库存现状报表', desc: '各物料当前库存量、库位分布', path: '/warehouse/inventory', tag: '仓储' },
      { name: '出入库明细报表', desc: '历史出入库记录统计分析', path: '/warehouse/inbound', tag: '仓储' },
      { name: '库存盘点报告', desc: '盘点差异分析、调整记录', path: '/warehouse/check', tag: '盘点' },
    ],
  },
  {
    group: '质量管理',
    color: '#f57c00',
    icon: <FactCheckIcon />,
    reports: [
      { name: '质量综合报表', desc: '合格率趋势、缺陷分析、供应商质量', path: '/quality/report', tag: '质量' },
      { name: '不合格品统计', desc: '不合格品类型、处置情况', path: '/quality/unqualified', tag: '质量' },
      { name: 'PDCA改进追踪', desc: '改进项目进度、效果验证', path: '/quality/pdca', tag: '改进' },
    ],
  },
  {
    group: '生产制造',
    color: '#7b1fa2',
    icon: <PrecisionManufacturingIcon />,
    reports: [
      { name: '生产综合报表', desc: '产量统计、效率分析、车间对比', path: '/production/report', tag: '生产' },
      { name: 'MRP需求计划', desc: '物料需求预测、采购/生产建议', path: '/production/mrp', tag: 'MRP' },
      { name: '工单完成情况', desc: '工单进度、完工率、延期分析', path: '/production/orders', tag: '工单' },
    ],
  },
  {
    group: '财务管理',
    color: '#c62828',
    icon: <AccountBalanceIcon />,
    reports: [
      { name: '财务综合报表', desc: '应付账款、现金流、成本结构', path: '/finance/report', tag: '财务' },
      { name: '科目余额表', desc: '资产负债、收入费用科目汇总', path: '/finance/trial-balance', tag: '会计' },
      { name: '付款计划报表', desc: '应付款项、逾期风险分析', path: '/finance/payments', tag: '付款' },
      { name: '财务报表数据集(BI)', desc: '发票折算本位币 + 跨模块关联分析', path: '/reports/bi', tag: '财务数据集' },
    ],
  },
];

// ── B5：内置真查询报表的定义 ──────────────────────────────────────
//
// 每张报表声明「分组维度 + 度量 + 口径」。界面上的说明文案直接来自这里，
// 保证「数字」与「口径解释」永远在一起，不会出现「说明文档里写的和系统算的不一样」。
interface BuiltinReport {
  id: string;
  name: string;
  group: string;
  /** 分组维度的中文名（如「供应商」「月份」） */
  dimensionLabel: string;
  measures: { key: string; label: string; note: string; format?: 'number' | 'money' | 'qty' }[];
  /** 是否需要固定排序（月份类报表用） */
  monthOrder?: boolean;
}

const BUILTIN_REPORTS: BuiltinReport[] = [
  {
    id: 'purchase-by-vendor',
    name: '采购金额按供应商汇总',
    group: '采购与供应链',
    dimensionLabel: '供应商',
    measures: [
      { key: 'amount', label: '未税金额', note: '订单 totalAmount 求和（未税口径，与订单列表口径一致）', format: 'money' },
      { key: 'tax', label: '税额', note: '订单 totalTaxAmount 求和；历史订单无此字段时记 0', format: 'money' },
      { key: 'grand', label: '价税合计', note: '订单 grandTotal 求和；缺省时按「未税 + 税额」补齐', format: 'money' },
    ],
  },
  {
    id: 'purchase-by-month',
    name: '采购金额按月份汇总',
    group: '采购与供应链',
    dimensionLabel: '月份',
    monthOrder: true,
    measures: [
      { key: 'amount', label: '未税金额', note: '按订单 orderDate 所在月份归集', format: 'money' },
      { key: 'orders', label: '订单数', note: '该月创建的采购订单条数', format: 'number' },
    ],
  },
  {
    id: 'sales-by-customer',
    name: '销售金额按客户汇总',
    group: '销售管理',
    dimensionLabel: '客户',
    measures: [
      { key: 'amount', label: '未税金额', note: '订单 totalAmount 求和（未税口径）', format: 'money' },
      { key: 'grand', label: '价税合计', note: '订单 grandTotal 求和', format: 'money' },
    ],
  },
  {
    id: 'sales-by-month',
    name: '销售金额按月份汇总',
    group: '销售管理',
    dimensionLabel: '月份',
    monthOrder: true,
    measures: [
      { key: 'amount', label: '未税金额', note: '按订单 orderDate 所在月份归集', format: 'money' },
      { key: 'orders', label: '订单数', note: '该月创建的销售订单条数', format: 'number' },
    ],
  },
  {
    id: 'stock-by-material',
    name: '库存金额按物料汇总',
    group: '仓储库存',
    dimensionLabel: '物料',
    measures: [
      { key: 'qty', label: '库存数量', note: '物料主数据 currentStock 求和', format: 'qty' },
      { key: 'value', label: '库存金额', note: '数量 × 标准成本（标准成本缺失时记 0，故本列可能低估）', format: 'money' },
    ],
  },
  {
    id: 'wo-by-status',
    name: '工单按状态汇总',
    group: '生产制造',
    dimensionLabel: '状态',
    measures: [
      { key: 'count', label: '工单数', note: '按工单状态统计条数', format: 'number' },
      { key: 'planned', label: '计划数量', note: 'plannedQuantity 求和', format: 'qty' },
      { key: 'completed', label: '完工数量', note: 'completedQuantity 求和', format: 'qty' },
    ],
  },
];

const WO_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', released: '已下达', in_progress: '生产中',
  completed: '已完工', closed: '已关闭', cancelled: '已取消',
};

const fmtMoney = (n: number) =>
  `¥${(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) =>
  (n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

export default function ReportCenter() {
  const navigate = useNavigate();

  // ── B5：真查询所需的数据源（直接读各 store，不额外请求网络）──
  const { purchaseOrders } = usePurchaseStore();
  const { salesOrders } = useSalesStore();
  const { materials } = useMaterialStore();
  const { workOrders } = useProductionStore();

  // 视图切换：报表卡片（原导航） / 数据速查（本次新增的真查询）
  const [view, setView] = useState<'cards' | 'query'>('query');
  const [activeReportId, setActiveReportId] = useState<string>(BUILTIN_REPORTS[0].id);

  const activeReport = BUILTIN_REPORTS.find((r) => r.id === activeReportId) ?? BUILTIN_REPORTS[0];

  // ── 各报表的取数与聚合 ──────────────────────────────────────────
  // 统一在这里按报表 id 分派，好处是「数据从哪来」一眼可查；
  // 若用配置化的「字段路径字符串」，出错时只能靠运行时才暴露，不值得。
  const result: ReportResult = useMemo(() => {
    switch (activeReport.id) {
      case 'purchase-by-vendor': {
        const items = purchaseOrders.map((o: any) => ({
          group: o.vendorName || '(未填供应商)',
          metrics: {
            amount: Number(o.totalAmount) || 0,
            tax: Number(o.totalTaxAmount) || 0,
            // 价税合计的兜底：老订单可能没写 grandTotal，按「未税 + 税额」补齐，
            // 否则报表里会出现「未税 100、税额 13、价税合计 0」这种自相矛盾的行
            grand: Number(o.grandTotal) || ((Number(o.totalAmount) || 0) + (Number(o.totalTaxAmount) || 0)),
          },
        }));
        return aggregate(items);
      }
      case 'purchase-by-month': {
        const order = makeMonthOrder(12);
        const items = purchaseOrders.map((o: any) => ({
          group: monthKey(o.orderDate),
          metrics: { amount: Number(o.totalAmount) || 0, orders: 1 },
        }));
        return aggregate(items, order);
      }
      case 'sales-by-customer': {
        const items = salesOrders.map((o: any) => ({
          group: o.customerName || '(未填客户)',
          metrics: {
            amount: Number(o.totalAmount) || 0,
            grand: Number(o.grandTotal) || (Number(o.totalAmount) || 0) + (Number(o.taxAmount) || 0),
          },
        }));
        return aggregate(items);
      }
      case 'sales-by-month': {
        const order = makeMonthOrder(12);
        const items = salesOrders.map((o: any) => ({
          group: monthKey(o.orderDate),
          metrics: { amount: Number(o.totalAmount) || 0, orders: 1 },
        }));
        return aggregate(items, order);
      }
      case 'stock-by-material': {
        const items = materials
          // 只统计有库存的物料：库存为 0 的物料列出来只会把表格撑长，
          // 而「哪些物料有货、值多少钱」才是这张表要回答的问题
          .filter((m: any) => (Number(m.currentStock) || 0) !== 0)
          .map((m: any) => ({
            group: `${m.code || m.id} ${m.name || ''}`.trim(),
            metrics: {
              qty: Number(m.currentStock) || 0,
              // 标准成本字段名在不同物料上可能是 standardCost / cost，取到哪个用哪个
              value: (Number(m.currentStock) || 0) * (Number(m.standardCost ?? m.cost ?? 0) || 0),
            },
          }));
        return aggregate(items);
      }
      case 'wo-by-status': {
        const items = workOrders.map((w: any) => ({
          group: WO_STATUS_LABEL[w.status] || w.status || '(未知)',
          metrics: {
            count: 1,
            planned: Number(w.plannedQuantity) || 0,
            completed: Number(w.completedQuantity) || 0,
          },
        }));
        return aggregate(items);
      }
      default:
        return { rows: [], totals: {}, totalCount: 0, sourceCount: 0, hasData: false };
    }
  }, [activeReport.id, purchaseOrders, salesOrders, materials, workOrders]);

  const totalReports = reportGroups.reduce((s, g) => s + g.reports.length, 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <AssessmentIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700}>报表中心</Typography>
        <Chip label={`共 ${totalReports} 个报表入口`} size="small" sx={{ ml: 2 }} />
        <Box flex={1} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => { if (v) setView(v); }}
        >
          <ToggleButton value="query" data-testid="rc-view-query">数据速查</ToggleButton>
          <ToggleButton value="cards" data-testid="rc-view-cards">报表入口</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        集中访问系统各模块的统计分析报表，快速获取业务洞察
      </Typography>

      {view === 'query' && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            以下报表为<b>实时查询</b>：数据直接取自当前系统的业务数据，切换报表即重算，无需等待。
            每列的<b>口径说明</b>可鼠标悬停查看 —— 报表最容易出的问题是「数字对不上」，
            而对不上的根因几乎总是「口径没写清楚」。
          </Alert>

          {/* 报表选择 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {BUILTIN_REPORTS.map((r) => (
              <Chip
                key={r.id}
                data-testid={`rc-report-${r.id}`}
                label={r.name}
                color={r.id === activeReport.id ? 'primary' : 'default'}
                variant={r.id === activeReport.id ? 'filled' : 'outlined'}
                onClick={() => setActiveReportId(r.id)}
                clickable
              />
            ))}
          </Box>

          {!result.hasData ? (
            <Alert severity="warning" data-testid="rc-empty">
              该报表暂无数据。可能原因：对应的业务数据为空，或数据尚未从云端同步完成。
              （本次参与计算的数据条数：{result.sourceCount}）
            </Alert>
          ) : (
            <TableContainer component={Paper} data-testid="rc-table">
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" fontWeight={600}>{activeReport.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  分组维度：{activeReport.dimensionLabel}　共 {result.rows.length} 组、
                  底层 {result.sourceCount} 条记录
                </Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{activeReport.dimensionLabel}</TableCell>
                    {activeReport.measures.map((m) => (
                      <TableCell key={m.key} align="right" sx={{ fontWeight: 600 }}>
                        <Tooltip title={m.note}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                            {m.label}
                            <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          </Box>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <Tooltip title="该分组由多少条底层记录汇总而来。让「1 条」与「10000 条」看起来不一样，避免误读">
                        <span>记录数</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.rows.map((r) => (
                    <TableRow key={r.group} data-testid="rc-row" hover>
                      <TableCell>{r.group}</TableCell>
                      {activeReport.measures.map((m) => (
                        <TableCell key={m.key} align="right">
                          {m.format === 'money' ? fmtMoney(r.values[m.key] ?? 0) : fmtNum(r.values[m.key] ?? 0)}
                        </TableCell>
                      ))}
                      <TableCell align="right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                  {/* 合计行：报表没有合计等于把加法留给用户，而用户会算错 */}
                  <TableRow sx={{ bgcolor: 'action.hover' }} data-testid="rc-total-row">
                    <TableCell sx={{ fontWeight: 700 }}>合计</TableCell>
                    {activeReport.measures.map((m) => (
                      <TableCell key={m.key} align="right" sx={{ fontWeight: 700 }}>
                        {m.format === 'money' ? fmtMoney(result.totals[m.key] ?? 0) : fmtNum(result.totals[m.key] ?? 0)}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{result.totalCount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {view === 'cards' && (
      <>
      {reportGroups.map(group => (
        <Box key={group.group} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box sx={{ color: group.color }}>{group.icon}</Box>
            <Typography variant="h6" fontWeight={600} sx={{ color: group.color }}>{group.group}</Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
          <Grid container spacing={2}>
            {group.reports.map(report => (
              <Grid item xs={12} sm={6} md={4} key={report.name}>
                <Card variant="outlined" sx={{ '&:hover': { boxShadow: 2, borderColor: group.color } }}>
                  <CardActionArea onClick={() => navigate(report.path)} sx={{ p: 2 }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{report.name}</Typography>
                        <Chip label={report.tag} size="small" sx={{ bgcolor: `${group.color}15`, color: group.color, fontSize: '0.65rem' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">{report.desc}</Typography>
                      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14, color: group.color }} />
                        <Typography variant="caption" sx={{ color: group.color }}>查看报表</Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
      </>
      )}
    </Box>
  );
}

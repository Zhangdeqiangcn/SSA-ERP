// POST /api/chatbi/analyze — 自然语言查询分析
//
// 决策 C（#23）落地：智能体只读工具调用
// 把原先「关键词 → 写死 switch SQL」的 7 类查询，重构为「声明式只读工具注册表」READ_TOOLS。
// 每个工具自带 name / label / keywords / run，onRequest 统一按关键词路由，新增工具零改动路由。
// 全部为只读 SELECT，不触碰任何写入路径——这就是智能体（与 chatbi 端点）的边界：只允许查、不允许写。
// 写入类能力（如「帮我建一张采购单」）按铁律留待拍板，不在本注册表内。

import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';

// ---- 工具响应契约（前端消费，结构保持不变） ----
interface ChartDataPoint {
  label: string;
  value: number;
  orders?: number;
  secondary?: number;
  color?: string;
}
interface ChartResult {
  title: string;
  description: string;
  chartType: 'bar' | 'donut' | 'horizontalBar';
  data: ChartDataPoint[];
  summary: string;
}

// ---- 声明式只读工具注册表 ----
// 新增一个只读分析工具：在下方数组追加一项即可，onRequest 会自动纳入路由与 suggestions。
interface ReadTool {
  name: string;
  label: string;       // 中文名，用于无法识别时的建议
  keywords: string[];  // 触发关键词（命中任一即匹配，数组顺序即优先级）
  run: (db: any, user: any, query: string) => Promise<ChartResult>;
}

const READ_TOOLS: ReadTool[] = [
  {
    name: 'sales_trend',
    label: '销售趋势',
    keywords: ['销售', '订单', '营业额', '营收'],
    run: async (db, user) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const sql = `SELECT 
        strftime('%m-%d', order_date) as day,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_amount
        FROM sales_orders 
        WHERE org_id = ? AND order_date >= ?
        GROUP BY strftime('%m-%d', order_date)
        ORDER BY day ASC`;
      const rows = await db.prepare(sql).bind(user.org_id, monthStart).all();
      const data = (rows.results || []).map((r: any) => ({
        label: r.day,
        value: Number(r.total_amount) || 0,
        orders: Number(r.order_count) || 0,
      }));
      return {
        title: '本月销售趋势',
        description: `2026年${now.getMonth() + 1}月销售数据，共 ${data.reduce((acc: number, item: any) => acc + item.orders, 0)} 笔订单`,
        chartType: 'bar' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, orders: 0 }],
        summary: `本月订单总额: ${data.reduce((acc: number, item: any) => acc + item.value, 0).toFixed(2)} 元`,
      };
    },
  },
  {
    name: 'inventory_level',
    label: '库存水平',
    keywords: ['库存', '物料', '仓'],
    run: async (db, user) => {
      const sql = `SELECT 
        COALESCE(category_name, '未分类') as category,
        COUNT(*) as count,
        COALESCE(SUM(quantity_on_hand), 0) as total_qty,
        COALESCE(SUM(quantity_on_hand * standard_price), 0) as total_value
        FROM materials 
        WHERE org_id = ? AND status = 'active'
        GROUP BY category_name
        ORDER BY total_value DESC`;
      const rows = await db.prepare(sql).bind(user.org_id).all();
      const colors = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];
      const data = (rows.results || []).map((r: any, i: number) => ({
        label: r.category,
        value: Number(r.count) || 0,
        color: colors[i % colors.length],
      }));
      return {
        title: '库存物料分类统计',
        description: '各物料类别的数量与货值分布',
        chartType: 'donut' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, color: '#ccc' }],
        summary: `共有 ${data.reduce((acc: number, item: any) => acc + item.value, 0)} 种物料`,
      };
    },
  },
  {
    name: 'supplier_quality',
    label: '供应商质量',
    keywords: ['供应商', '供货', '采购'],
    run: async (db, user) => {
      const sql = `SELECT 
        company_name as name,
        rating,
        credit_level,
        (SELECT COUNT(*) FROM purchase_orders po 
         WHERE po.vendor_id = vendors.id AND po.org_id = ?) as order_count,
        (SELECT COUNT(*) FROM inbound_orders io 
         WHERE io.vendor_id = vendors.id AND io.org_id = ? AND io.status = 'completed') as delivered_count
        FROM vendors 
        WHERE org_id = ? AND status = 'approved'
        ORDER BY rating DESC LIMIT 10`;
      const rows = await db.prepare(sql).bind(user.org_id, user.org_id, user.org_id).all();
      const data = (rows.results || []).map((r: any) => ({
        label: r.name,
        value: Number(r.rating) || 0,
        secondary: Number(r.delivered_count) || 0,
      }));
      return {
        title: '供应商质量排名',
        description: '供应商综合评分与交货次数',
        chartType: 'horizontalBar' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, secondary: 0 }],
        summary: `共有 ${data.length} 家合格供应商`,
      };
    },
  },
  {
    name: 'purchase_status',
    label: '采购状态',
    keywords: ['采购单', '订单状态', '待处理'],
    run: async (db, user) => {
      const sql = `SELECT 
        status,
        COUNT(*) as count
        FROM purchase_orders 
        WHERE org_id = ?
        GROUP BY status
        ORDER BY count DESC`;
      const rows = await db.prepare(sql).bind(user.org_id).all();
      const colors = { draft: '#9e9e9e', pending: '#ff9800', approved: '#4caf50', 'in_progress': '#2196f3', completed: '#1976d2', cancelled: '#f44336' };
      const data = (rows.results || []).map((r: any) => ({
        label: r.status,
        value: Number(r.count) || 0,
        color: colors[r.status] || '#757575',
      }));
      return {
        title: '采购订单状态分布',
        description: '各类状态采购订单数量统计',
        chartType: 'donut' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, color: '#ccc' }],
        summary: `共有 ${data.reduce((s: any) => s + s.value, 0)} 张采购订单`,
      };
    },
  },
  {
    name: 'finance_summary',
    label: '财务摘要',
    keywords: ['凭证', '记账', '财务', '金额'],
    run: async (db, user) => {
      const sql = `SELECT 
        COUNT(*) as total_vouchers,
        COALESCE(SUM(total_debit), 0) as total_debit,
        COALESCE(SUM(total_credit), 0) as total_credit
        FROM vouchers 
        WHERE org_id = ? AND status = 'posted'`;
      const row = await db.prepare(sql).bind(user.org_id).first();
      const totalDebit = Number(row?.total_debit) || 0;
      const totalCredit = Number(row?.total_credit) || 0;
      return {
        title: '财务凭证摘要',
        description: `已记账凭证汇总：借方总额 ${totalDebit.toFixed(2)} 元，贷方总额 ${totalCredit.toFixed(2)} 元`,
        chartType: 'bar' as const,
        data: [
          { label: '借方', value: totalDebit, secondary: 0 },
          { label: '贷方', value: totalCredit, secondary: 0 },
        ],
        summary: `共 ${row?.total_vouchers || 0} 张凭证，借贷平衡差: ${(totalDebit - totalCredit).toFixed(2)} 元`,
      };
    },
  },
  {
    name: 'work_order_status',
    label: '工单状态',
    keywords: ['工单', '生产', '加工'],
    run: async (db, user) => {
      const sql = `SELECT 
        status,
        COUNT(*) as count
        FROM work_orders 
        WHERE org_id = ?
        GROUP BY status
        ORDER BY count DESC`;
      const rows = await db.prepare(sql).bind(user.org_id).all();
      const colors = { draft: '#9e9e9e', in_progress: '#2196f3', completed: '#4caf50', cancelled: '#f44336' };
      const data = (rows.results || []).map((r: any) => ({
        label: r.status,
        value: Number(r.count) || 0,
        color: colors[r.status] || '#757575',
      }));
      return {
        title: '生产工单状态分布',
        description: '各类状态工单数量统计',
        chartType: 'donut' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, color: '#ccc' }],
        summary: `共有 ${data.reduce((s: any) => s + s.value, 0)} 张工单`,
      };
    },
  },
  {
    name: 'customer_list',
    label: '客户列表',
    keywords: ['客户', '销售客户'],
    run: async (db, user) => {
      const sql = `SELECT 
        name,
        credit_level,
        credit_limit,
        used_credit,
        (SELECT COUNT(*) FROM sales_orders so WHERE so.customer_id = customers.id AND so.org_id = ?) as order_count
        FROM customers 
        WHERE org_id = ? AND status = 'active'
        ORDER BY used_credit DESC LIMIT 10`;
      const rows = await db.prepare(sql).bind(user.org_id, user.org_id).all();
      const data = (rows.results || []).map((r: any) => ({
        label: r.name,
        value: Number(r.used_credit) || 0,
        secondary: Number(r.order_count) || 0,
      }));
      return {
        title: '客户信用使用排名',
        description: '活跃客户的信用额度使用情况',
        chartType: 'horizontalBar' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, secondary: 0 }],
        summary: `共有 ${data.length} 家活跃客户`,
      };
    },
  },
  {
    // 新增只读工具①：应收账龄（按到期日分桶的未收金额分布）
    name: 'ar_aging',
    label: '应收账龄',
    keywords: ['应收', '账龄', '欠款', '未收'],
    run: async (db, user) => {
      const sql = `SELECT 
        CASE 
          WHEN julianday('now') <= julianday(COALESCE(ar_due_date, order_date)) THEN '未到期'
          WHEN CAST(julianday('now') - julianday(COALESCE(ar_due_date, order_date)) AS INTEGER) BETWEEN 1 AND 30 THEN '逾期1-30天'
          WHEN CAST(julianday('now') - julianday(COALESCE(ar_due_date, order_date)) AS INTEGER) BETWEEN 31 AND 60 THEN '逾期31-60天'
          WHEN CAST(julianday('now') - julianday(COALESCE(ar_due_date, order_date)) AS INTEGER) BETWEEN 61 AND 90 THEN '逾期61-90天'
          ELSE '逾期90天以上'
        END as bucket,
        COALESCE(SUM(total_amount - received_amount), 0) as outstanding
        FROM sales_orders
        WHERE org_id = ? AND status IN ('approved','completed','delivering','delivered','shipped')
          AND (total_amount - received_amount) > 0
        GROUP BY bucket`;
      const rows = await db.prepare(sql).bind(user.org_id).all();
      const bucketOrder = ['未到期', '逾期1-30天', '逾期31-60天', '逾期61-90天', '逾期90天以上'];
      const colorByBucket: Record<string, string> = {
        '未到期': '#1976d2',
        '逾期1-30天': '#ff9800',
        '逾期31-60天': '#f57c00',
        '逾期61-90天': '#e64a19',
        '逾期90天以上': '#d32f2f',
      };
      const totalOutstanding = (rows.results || []).reduce((acc: number, r: any) => acc + (Number(r.outstanding) || 0), 0);
      const data = bucketOrder.map((bucket) => {
        const found = (rows.results || []).find((r: any) => r.bucket === bucket);
        return {
          label: bucket,
          value: found ? Number(found.outstanding) || 0 : 0,
          color: colorByBucket[bucket] || '#757575',
        };
      });
      return {
        title: '应收账龄分析',
        description: '按到期日分桶的未收回销售金额（total_amount − received_amount）',
        chartType: 'donut' as const,
        data,
        summary: `未收总额: ${totalOutstanding.toFixed(2)} 元，共 ${data.filter((d) => d.value > 0).length} 个账龄区间有欠款`,
      };
    },
  },
  {
    // 新增只读工具②：库存预警（低于安全库存/补货点的在库物料）
    name: 'inventory_alert',
    label: '库存预警',
    keywords: ['预警', '缺货', '补货', '安全库存', '低于安全'],
    run: async (db, user) => {
      const sql = `SELECT 
        material_code, material_name, quantity_on_hand, safety_stock, reorder_point
        FROM materials
        WHERE org_id = ? AND status = 'active'
          AND quantity_on_hand <= COALESCE(reorder_point, safety_stock)
        ORDER BY quantity_on_hand ASC
        LIMIT 20`;
      const rows = await db.prepare(sql).bind(user.org_id).all();
      const data = (rows.results || []).map((r: any) => ({
        label: `${r.material_name}（${r.material_code}）`,
        value: Number(r.quantity_on_hand) || 0,
        secondary: Number(r.safety_stock) || 0,
      }));
      return {
        title: '库存预警（低于补货点）',
        description: '在库数量低于安全库存/补货点的活跃物料，需及时补货',
        chartType: 'horizontalBar' as const,
        data: data.length > 0 ? data : [{ label: '无预警物料', value: 0, secondary: 0 }],
        summary: `共 ${data.length} 种物料低于补货点`,
      };
    },
  },
];

export async function onRequest(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = env.DB;

  // 解析请求体
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const { query } = body || {};
  if (!query || typeof query !== 'string') {
    return json({ error: '请提供 query 字段' }, 400);
  }

  // 在声明式注册表中按关键词匹配工具（数组顺序即优先级，命中第一个即返回）
  const tool = READ_TOOLS.find((t) => t.keywords.some((kw) => query.includes(kw)));

  if (!tool) {
    return json({
      title: '无法识别的查询',
      description: `请尝试以下查询：${READ_TOOLS.map((t) => t.label).join('、')}`,
      chartType: 'bar' as const,
      data: [],
      suggestions: READ_TOOLS.map((t) => t.label),
    });
  }

  // 执行匹配到的只读工具
  try {
    const result = await tool.run(db, user, query);
    return json(result);
  } catch (e: any) {
    return errorResponse(e, '查询');
  }
}

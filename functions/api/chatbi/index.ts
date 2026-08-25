// POST /api/chatbi/analyze — 自然语言查询分析
import { getUserFromRequest, json } from '../../_shared/auth';

// 关键词 → 查询类型映射
const QUERY_PATTERNS = [
  { keywords: ['销售', '订单', '营业额', '营收'], type: 'sales_trend' },
  { keywords: ['库存', '物料', '仓'], type: 'inventory_level' },
  { keywords: ['供应商', '供货', '采购'], type: 'supplier_quality' },
  { keywords: ['采购单', '订单状态', '待处理'], type: 'purchase_status' },
  { keywords: ['凭证', '记账', '财务', '金额'], type: 'finance_summary' },
  { keywords: ['工单', '生产', '加工'], type: 'work_order_status' },
  { keywords: ['客户', '销售客户'], type: 'customer_list' },
];

// 查询分类处理器
async function handleQuery(user, db, query: string, type: string) {
  const q = query.toLowerCase();

  switch (type) {
    case 'sales_trend': {
      // 获取最近销售订单趋势
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
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
        description: `2026年${now.getMonth()+1}月销售数据，共 ${data.reduce((acc:number,item:any)=>acc+item.orders,0)} 笔订单`,
        chartType: 'bar' as const,
        data: data.length > 0 ? data : [{ label: '无数据', value: 0, orders: 0 }],
        summary: `本月订单总额: ${data.reduce((acc:number,item:any)=>acc+item.value,0).toFixed(2)} 元`,
      };
    }

    case 'inventory_level': {
      // 获取库存水平按类别
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
        summary: `共有 ${data.reduce((acc:number,item:any)=>acc+item.value,0)} 种物料`,
      };
    }

    case 'supplier_quality': {
      // 获取供应商质量排名
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
    }

    case 'purchase_status': {
      // 获取采购订单状态分布
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
        summary: `共有 ${data.reduce((s:any)=>s+s.value,0)} 张采购订单`,
      };
    }

    case 'finance_summary': {
      // 获取财务摘要
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
    }

    case 'work_order_status': {
      // 获取工单状态分布
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
        summary: `共有 ${data.reduce((s:any)=>s+s.value,0)} 张工单`,
      };
    }

    case 'customer_list': {
      // 获取客户列表
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
    }

    default:
      return { title: '未知查询', description: '无法识别的分析请求', chartType: 'bar' as const, data: [] };
  }
}

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

  // 匹配查询类型
  let matchedType = null;
  for (const pattern of QUERY_PATTERNS) {
    if (pattern.keywords.some(kw => query.includes(kw))) {
      matchedType = pattern.type;
      break;
    }
  }

  if (!matchedType) {
    return json({
      title: '无法识别的查询',
      description: `请尝试以下查询：销售趋势、库存水平、供应商质量、采购状态、财务摘要、工单状态、客户列表`,
      chartType: 'bar' as const,
      data: [],
      suggestions: QUERY_PATTERNS.map(p => p.keywords[0]),
    });
  }

  // 执行查询
  try {
    const result = await handleQuery(user, db, query, matchedType);
    return json(result);
  } catch (e: any) {
    return json({ error: `查询失败: ${e.message}` }, 500);
  }
}

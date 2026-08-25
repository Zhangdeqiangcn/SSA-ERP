// GET /api/protected-data/{type} — 根据角色返回脱敏数据
// 支持: vendors, customers, materials, sales-orders, purchase-orders
import { getUserFromRequest, json } from '../../_shared/auth';

// 敏感字段配置（根据角色屏蔽）
const SENSITIVE_FIELDS = {
  vendors: {
    admin: [], // 管理员可见全部
    manager: ['bank_account', 'tax_code', 'reconciliation_account'], // 经理屏蔽财务字段
    staff: ['bank_account', 'tax_code', 'reconciliation_account', 'credit_limit', 'used_credit', 'blacklist_reason'], // 员工屏蔽信用和黑名单
    vendor: ['credit_level', 'credit_limit', 'used_credit', 'rating', 'blacklist_reason', 'blacklisted_at'], // 供应商屏蔽自身敏感信息
  },
  customers: {
    admin: [],
    manager: ['bank_account', 'tax_code', 'reconciliation_account'],
    staff: ['bank_account', 'tax_code', 'reconciliation_account', 'credit_limit', 'used_credit'],
    vendor: ['credit_level', 'credit_limit', 'used_credit'],
  },
  'sales-orders': {
    admin: [],
    manager: ['customer_tax_id', 'customer_bank_account'],
    staff: ['customer_tax_id', 'customer_bank_account', 'total_amount'],
  },
  'purchase-orders': {
    admin: [],
    manager: ['vendor_tax_code', 'vendor_bank_account'],
    staff: ['vendor_tax_code', 'vendor_bank_account', 'total_amount'],
  },
};

// 脱敏函数
function maskValue(value: string, pattern: string = '****'): string {
  if (!value) return '';
  if (value.length <= 4) return pattern;
  return value.slice(0, 2) + pattern + value.slice(-2);
}

function applyMasking(data: any, sensitiveFields: string[], role: string): any {
  if (role === 'admin') return data; // 管理员不脱敏
  
  const masked = { ...data };
  for (const field of sensitiveFields) {
    if (masked[field] !== undefined) {
      if (typeof masked[field] === 'string') {
        masked[field] = maskValue(masked[field]);
      } else if (typeof masked[field] === 'number') {
        masked[field] = 0; // 金额字段清零
      }
    }
  }
  return masked;
}

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const dataType = params.type;
  if (!dataType || !SENSITIVE_FIELDS[dataType]) {
    return json({ error: '不支持的数据类型' }, 400);
  }

  const role = user.role || 'staff';
  const sensitiveFields = SENSITIVE_FIELDS[dataType][role] || [];

  try {
    let sql = '';
    let results: any[] = [];

    switch (dataType) {
      case 'vendors':
        sql = `SELECT id, vendor_code, company_name, short_name, type, status, 
                    contact_name, contact_phone, contact_email, address,
                    qualification_expiry, rating, credit_level, credit_limit, used_credit,
                    blacklist_reason, blacklisted_at, bank_account, tax_code, reconciliation_account
                FROM vendors WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`;
        const vendorRows = await env.DB.prepare(sql).bind(user.org_id).all();
        results = (vendorRows.results || []).map((r: any) => applyMasking(r, sensitiveFields, role));
        break;

      case 'customers':
        sql = `SELECT id, code, name, short_name, type, status,
                    contact_name, contact_phone, contact_email, address,
                    credit_level, credit_limit, used_credit, settlement_term_days,
                    bank_account, tax_code, reconciliation_account, sales_org
                FROM customers WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`;
        const customerRows = await env.DB.prepare(sql).bind(user.org_id).all();
        results = (customerRows.results || []).map((r: any) => applyMasking(r, sensitiveFields, role));
        break;

      case 'sales-orders':
        sql = `SELECT id, order_no, customer_name, customer_code, status,
                    total_amount, grand_total, order_date, expected_delivery_date,
                    customer_id, sales_person, trade_terms, remarks
                FROM sales_orders WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`;
        const soRows = await env.DB.prepare(sql).bind(user.org_id).all();
        results = (soRows.results || []).map((r: any) => applyMasking(r, sensitiveFields, role));
        break;

      case 'purchase-orders':
        sql = `SELECT id, order_no, vendor_name, vendor_id, status,
                    total_amount, grand_total, order_date, expected_delivery_date,
                    trade_terms, remarks
                FROM purchase_orders WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`;
        const poRows = await env.DB.prepare(sql).bind(user.org_id).all();
        results = (poRows.results || []).map((r: any) => applyMasking(r, sensitiveFields, role));
        break;

      default:
        return json({ error: '不支持的数据类型' }, 400);
    }

    return json({
      data: results,
      role: role,
      maskedFields: sensitiveFields,
      count: results.length,
    });
  } catch (e: any) {
    return json({ error: `查询失败: ${e.message}` }, 500);
  }
}

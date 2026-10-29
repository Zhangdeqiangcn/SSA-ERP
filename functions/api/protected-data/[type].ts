// GET /api/protected-data/{type} — 按角色返回脱敏数据
// 支持: vendors, customers, sales-orders, purchase-orders
//
// ════════════════════════════════════════════════════════════════════════
// V3.21.0 改造说明（差距 19 第 ① 步：角色词表统一 + 策略收敛）
// ════════════════════════════════════════════════════════════════════════
//
// 改前本文件自带一张档位表：
//     SENSITIVE_FIELDS[dataType][admin|manager|staff|vendor]
// 三个问题：
//   ① 词表不兼容真实角色 —— manager / staff 在 ROLE_DEFINITIONS 里**不存在**。
//   ② manager 档是**死档**：逐一核对 vendors / customers / sales-orders /
//      purchase-orders 四张表，它的字段集分别是同表 staff 档的真子集，
//      而没有任何真实角色能命中 manager → 删掉它零行为变化。
//   ③ 与前端「字段级权限」页面、与 /api/open 网关各写一份，三套互不相通。
//
// 改后：字段策略统一由 _shared/fieldAccess 提供（唯一权威），本文件只负责取数。
//   角色词表 = REAL_ROLES（15 个真实角色），档位概念取消。
//
// ★ 行为等价性：原逻辑为
//     roleKey = role === 'super_admin' ? 'admin' : role
//     fields  = SENSITIVE_FIELDS[dt][roleKey] || SENSITIVE_FIELDS[dt].staff
//   真实角色命中情况：admin → admin 档；vendor → vendor 档；
//   其余 12 个（含 user）→ 全部落 staff 兜底档。
//   fieldAccess 的 HARD_SENSITIVE 正是按这个命中关系展开成显式角色名，
//   故脱敏结果与改前**逐字段一致**。
//
// ★ 唯一有意变化：改前用 maskValue 打码（保留首尾 2 字符），改后**直接移除字段**
//   并以 _hiddenFields 元数据告知 —— 与 /api/open 网关既有的 stripHidden 约定统一，
//   且更安全（打码仍会泄露首尾字符与长度）。本接口全项目零消费方，无兼容负担。
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { errorResponse } from '../../_shared/errors';
import {
  DATATYPE_TO_MODULE,
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
  type FieldModule,
} from '../../_shared/fieldAccess';

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const dataType = params.type;
  const module: FieldModule | undefined = DATATYPE_TO_MODULE[dataType];
  if (!dataType || !module) {
    return json({ error: '不支持的数据类型' }, 400);
  }

  // 唯一权威策略：管理员在「字段级权限」页面改了什么，这里立刻照办
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, module);

  try {
    let sql = '';
    let results: any[] = [];

    // V2.98.0（评测 M-06 / M-11）：① 与主数据接口使用同一张表、同一套过滤——
    //   原先 vendors 走遗留 `vendors` 表（主数据接口已改指 `vendor_master`），双源并存
    //   且不带归属过滤，等于开了一条绕开行级策略的旁路；② 四类数据统一补上行级过滤。
    // V3.3.0（评测 L-04）：改用 rlsCondition 的「子句 + 参数数组」契约。
    //   旧写法 `args: [rls.param!]` 会在默认拒绝（无参数的 1=0）时推入 undefined，
    //   造成「占位符数 ≠ 绑定参数数」运行期 500；改为展开数组后两种情况都安全。
    const scope = (table: string) => {
      const rls = rlsCondition(user, table);
      return rls.clause === '1=1'
        ? { sql: '', args: [] as any[] }
        : { sql: ' AND ' + rls.clause, args: [...rls.params] as any[] };
    };

    switch (dataType) {
      // 改指 vendor_master，与 /api/vendors 同源（消除双数据源）
      case 'vendors': {
        const s = scope('vendor_master');
        sql = `SELECT id, vendor_code, company_name, short_name, type, status, 
                    contact_name, contact_phone, contact_email, address,
                    qualification_expiry, rating, credit_level, credit_limit, used_credit,
                    blacklist_reason, blacklisted_at, bank_account, tax_code, reconciliation_account
                FROM vendor_master WHERE org_id = ?${s.sql} ORDER BY created_at DESC LIMIT 50`;
        const vendorRows = await env.DB.prepare(sql).bind(user.org_id, ...s.args).all();
        results = stripRowsFields(vendorRows.results || [], module, hidden).rows;
        break;
      }

      case 'customers': {
        const s = scope('customers');
        sql = `SELECT id, code, name, short_name, type, status,
                    contact_name, contact_phone, contact_email, address,
                    credit_level, credit_limit, used_credit, settlement_term_days,
                    bank_account, tax_code, reconciliation_account, sales_org
                FROM customers WHERE org_id = ?${s.sql} ORDER BY created_at DESC LIMIT 50`;
        const customerRows = await env.DB.prepare(sql).bind(user.org_id, ...s.args).all();
        results = stripRowsFields(customerRows.results || [], module, hidden).rows;
        break;
      }

      case 'sales-orders': {
        const s = scope('sales_orders');
        sql = `SELECT id, order_no, customer_name, customer_code, status,
                    total_amount, grand_total, order_date, expected_delivery_date,
                    customer_id, sales_person, trade_terms, remarks
                FROM sales_orders WHERE org_id = ?${s.sql} ORDER BY created_at DESC LIMIT 50`;
        const soRows = await env.DB.prepare(sql).bind(user.org_id, ...s.args).all();
        results = stripRowsFields(soRows.results || [], module, hidden).rows;
        break;
      }

      case 'purchase-orders': {
        const s = scope('purchase_orders');
        sql = `SELECT id, order_no, vendor_name, vendor_id, status,
                    total_amount, grand_total, order_date, expected_delivery_date,
                    trade_terms, remarks
                FROM purchase_orders WHERE org_id = ?${s.sql} ORDER BY created_at DESC LIMIT 50`;
        const poRows = await env.DB.prepare(sql).bind(user.org_id, ...s.args).all();
        results = stripRowsFields(poRows.results || [], module, hidden).rows;
        break;
      }

      default:
        return json({ error: '不支持的数据类型' }, 400);
    }

    return json({
      data: results,
      role: user.role,
      // 保留原字段名以兼容既有调用方；内容改为「实际被移除的字段」（含 DB 列名形态）
      maskedFields: [...hidden],
      count: results.length,
    });
  } catch (e: any) {
    return errorResponse(e, '查询');
  }
}

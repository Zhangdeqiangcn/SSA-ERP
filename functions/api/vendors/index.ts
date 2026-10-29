// GET/POST /api/vendors — 供应商主数据（D1 vendor_master，会话鉴权）
// V2.74.3 起从旧 vendors 门户表改指 vendor_master，与开放网关 /api/open/vendors 同源（消除双数据源）。
//
// ════════════════════════════════════════════════════════════════════════
// V3.21.0 差距 19 第 ② 步试点域：字段级权限从「界面装饰」升级为「服务端强制」
// ════════════════════════════════════════════════════════════════════════
// 改前：本文件 `SELECT *` 返回全部列、零脱敏。库管在界面上经 <SecureField> 看到的
//   授信额度是 ***，但打开开发者工具读本接口的响应体，credit_limit / bank_account /
//   tax_code 全是明文 —— 界面上的字段权限是装饰性的。
// 改后：
//   · GET（列表/详情）→ 按当前角色剥离不可见字段，并以 _hiddenFields 元数据告知；
//   · POST（创建）→ 不可见字段一律不落库（静默剔除）；
//   · PUT（修改，见 [id].ts）→ 不可见字段「值有变化」即 403。
// 策略来源见 _shared/fieldAccess：管理员在「字段级权限」页面改了什么，这里立刻照办。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { audit } from '../../_shared/auditLog';
import { validateOrReject } from '../../_shared/validate';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';
import {
  resolveFieldPolicy,
  hiddenFieldsFor,
  stripRowsFields,
} from '../../_shared/fieldAccess';

// ── ★ vendor_master 的 CHECK 约束白名单（V3.12.0 补）────────────────
// 建表 DDL 里三列带 CHECK：
//   type         IN ('manufacturer','trader','agent')
//   status       IN ('registered','pending','approved','rejected','blacklisted')
//   credit_level IN ('AAA','AA','A','B','C')
//
// ★★ 为什么必须在这里再校验一遍（这是实测出来的真故障）：
//   前端 `Vendor` 类型的 status 与其它主数据一样习惯用 `'active'`
//   （物料、客户表都是 'active'），而 vendor_master 的 CHECK **不接受它**。
//   传 'active' 时：
//     ① `validateOrReject` 只认「字段类型」，不认枚举 → 放行；
//     ② INSERT 抛 `CHECK constraint failed`；
//     ③ 本端点**原本没有 try/catch** → 异常冒到 Cloudflare →
//        返回的是平台的 **500 HTML 错误页**，不是 JSON。
//   用户看到的是「服务器开了个小差」，完全无从判断其实是
//   「供应商状态只能填 registered/pending/approved/rejected/blacklisted 之一」。
//   **这是最难排查的一类问题：错误信息与真实原因之间隔了三层。**
//
//   因此做两件事，缺一不可：
//     (1) 入参显式按白名单校验 → 立刻返回 400 + 可读中文（把原因说清楚）；
//     (2) INSERT 包 try/catch → 任何漏网的数据库错误都转成中文 JSON，
//        **绝不让 Cloudflare 的 HTML 错误页到达前端**（前端按 JSON 解析会失败 → 白屏）。
const VENDOR_ENUMS: Record<string, { camel: string; values: string[] }> = {
  type: { camel: 'type', values: ['manufacturer', 'trader', 'agent'] },
  status: { camel: 'status', values: ['registered', 'pending', 'approved', 'rejected', 'blacklisted'] },
  credit_level: { camel: 'creditLevel', values: ['AAA', 'AA', 'A', 'B', 'C'] },
};

function enumError(body: any): string | null {
  for (const [snake, def] of Object.entries(VENDOR_ENUMS)) {
    const v = body?.[def.camel];
    if (v === undefined || v === null) continue;
    if (!def.values.includes(String(v))) {
      return `字段「${def.camel}」取值「${v}」不合法，只能是：${def.values.join(' / ')}`;
    }
  }
  return null;
}

// camelCase 前端字段 → vendor_master 列
function toRow(body: any) {
  return {
    vendor_code: body.code,
    company_name: body.name,
    short_name: body.shortName ?? null,
    type: body.type ?? 'trader',
    contact_name: body.contact ?? null,
    contact_phone: body.phone ?? null,
    contact_email: body.email ?? null,
    address: body.address ?? null,
    status: body.status ?? 'pending',
    qualification_expiry: body.qualificationExpiry ?? null,
    rating: body.rating ?? null,
    credit_level: body.creditLevel ?? null,
    credit_limit: body.creditLimit ?? 0,
    used_credit: body.usedCredit ?? 0,
    tax_id: body.taxId ?? null,
    bank_account: body.bankAccount ?? null,
    sales_org: body.salesOrg ?? null,
    reconciliation_account: body.reconciliationAccount ?? null,
    tax_code: body.taxCode ?? null,
    blacklist_reason: body.blacklistReason ?? null,
    blacklisted_at: body.blacklistedAt ?? null,
    blacklist_reason_history: body.blacklistReasonHistory ? JSON.stringify(body.blacklistReasonHistory) : null,
    profile_pending: body.profilePending ? JSON.stringify(body.profilePending) : null,
    profile_pending_at: body.profilePendingAt ?? null,
    profile_pending_by: body.profilePendingBy ?? null,
    profile_reviewed_by: body.profileReviewedBy ?? null,
    custom_fields: body.customFields ? JSON.stringify(body.customFields) : null,
  };
}

function formatVendor(r: any) {
  return {
    id: r.id, org_id: r.org_id,
    code: r.vendor_code, name: r.company_name,
    shortName: r.short_name,
    type: r.type,
    contact: r.contact_name, phone: r.contact_phone, email: r.contact_email,
    address: r.address,
    status: r.status,
    qualificationExpiry: r.qualification_expiry,
    rating: r.rating,
    creditLevel: r.credit_level,
    creditLimit: r.credit_limit,
    usedCredit: r.used_credit,
    taxId: r.tax_id,
    bankAccount: r.bank_account,
    salesOrg: r.sales_org,
    reconciliationAccount: r.reconciliation_account,
    taxCode: r.tax_code,
    blacklistReason: r.blacklist_reason,
    blacklistedAt: r.blacklisted_at,
    blacklistReasonHistory: safeParse(r.blacklist_reason_history),
    profilePending: safeParse(r.profile_pending),
    profilePendingAt: r.profile_pending_at,
    profilePendingBy: r.profile_pending_by,
    profileReviewedBy: r.profile_reviewed_by,
    customFields: safeParse(r.custom_fields),
    ownerId: r.owner_id,
    deptId: r.dept_id,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function safeParse(s: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}

// V3.3.0（评测 L-05）：原本地 audit() 的静默 catch 已删除，统一改用 _shared/auditLog 的
//   audit()——审计失败不再被吞掉，而是走「结构化日志 → 降级表留痕 → 永不抛出」三层降级。

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');

  let sql = 'SELECT * FROM vendor_master WHERE org_id = ?';
  const params: any[] = [user.org_id];
  const rls = rlsCondition(user, 'vendor_master');
  if (rls.clause !== '1=1') { sql += ' AND ' + rls.clause; params.push(...rls.params); }

  if (keyword) {
    sql += ' AND (vendor_code LIKE ? ESCAPE \'\\\' OR company_name LIKE ? ESCAPE \'\\\' OR contact_name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const rows = await env.DB.prepare(sql).bind(...params).all();

  // ★ V3.21.0：读取侧字段剥离 —— 让「界面上看不到」变成「数据里也拿不到」。
  //   在 formatVendor（驼峰化）之后做，因为策略表用的就是驼峰字段名。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'vendor');
  const data = stripRowsFields(
    (rows.results || []).map((r: any) => formatVendor(r)),
    'vendor',
    hidden
  ).rows;

  let countSql = 'SELECT COUNT(*) as cnt FROM vendor_master WHERE org_id = ?';
  const countParams: any[] = [user.org_id];
  if (rls.clause !== '1=1') { countSql += ' AND ' + rls.clause; countParams.push(...rls.params); }
  if (keyword) {
    countSql += ' AND (vendor_code LIKE ? ESCAPE \'\\\' OR company_name LIKE ? ESCAPE \'\\\' OR contact_name LIKE ? ESCAPE \'\\\')';
    const kw = likePattern(keyword);
    countParams.push(kw, kw, kw);
  }
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  if (type) { countSql += ' AND type = ?'; countParams.push(type); }
  const countRow = await env.DB.prepare(countSql).bind(...countParams).first();
  const total = (countRow as any)?.cnt || 0;

  return json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  
  // V3.24.0: 操作权限服务端守卫
  const _opGuard = await import('../../_shared/operationGuard').then(m => m.guardOperation(user, 'vendor', 'create', context.env.DB, user.org_id));
  if (_opGuard) return _opGuard;

let body: any;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const _invalid = validateOrReject('vendor_master', body);
  if (_invalid) return _invalid;
  if (!body.code || !body.name) return json({ error: '供应商编码与名称必填' }, 400);
  // ★ 枚举白名单先拦：不拦的话会一路走到 INSERT 抛 CHECK 失败 → 500 HTML
  const badEnum = enumError(body);
  if (badEnum) return json({ error: badEnum, code: 'INVALID_ENUM' }, 400);

  // ★ V3.21.0：创建时「不可见字段一律不落库」。
  //   为何这里静默剔除、而修改时是 403？两者的正确行为本就不同：
  //     · 修改 —— 用户明确提交了一次改动，若悄悄丢掉他会以为改成功了 → 必须拒绝并说清原因；
  //     · 创建 —— 表单往往带着默认值（如 creditLimit: 0），一个库管根本看不到该字段，
  //       若拦成 403 就变成「新建供应商永远失败」。剔除后由 toRow 落库默认值，
  //       结果等同「该角色从未填过这个字段」，既不越权也不打断业务。
  const policy = await resolveFieldPolicy(env.DB, user.org_id);
  const hidden = hiddenFieldsFor(policy, user.role, 'vendor');
  const droppedFields: string[] = [];
  for (const f of hidden) {
    if (f in body) { delete body[f]; droppedFields.push(f); }
  }

  const dup = await env.DB.prepare(
    'SELECT id FROM vendor_master WHERE org_id = ? AND vendor_code = ?'
  ).bind(user.org_id, body.code).first();
  if (dup) return json({ error: '供应商编码已存在' }, 409);

  const id = uid('ven');
  const now = new Date().toISOString();
  const row = toRow(body);
  try {
  await env.DB.prepare(`
    INSERT INTO vendor_master (
      org_id, id, vendor_code, company_name, short_name, type, contact_name, contact_phone,
      contact_email, address, status, qualification_expiry, rating, credit_level, credit_limit,
      used_credit, tax_id, bank_account, sales_org, reconciliation_account, tax_code,
      blacklist_reason, blacklisted_at, blacklist_reason_history, profile_pending,
      profile_pending_at, profile_pending_by, profile_reviewed_by, custom_fields,
      owner_id, dept_id, created_at, updated_at, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.org_id, id, row.vendor_code, row.company_name, row.short_name, row.type, row.contact_name,
    row.contact_phone, row.contact_email, row.address, row.status, row.qualification_expiry, row.rating,
    row.credit_level, row.credit_limit, row.used_credit, row.tax_id, row.bank_account, row.sales_org,
    row.reconciliation_account, row.tax_code, row.blacklist_reason, row.blacklisted_at,
    row.blacklist_reason_history, row.profile_pending, row.profile_pending_at, row.profile_pending_by,
    row.profile_reviewed_by, row.custom_fields, user.id, user.department || null, now, now, user.id, user.id
  ).run();
  } catch (e: any) {
    return errorResponse(e, '创建供应商');
  }

  // 审计留痕：被剔除的字段要看得见（否则「为什么我填的授信额度没保存」无从解释）
  const dropNote = droppedFields.length ? `（已忽略无权字段：${droppedFields.join('、')}）` : '';
  await audit(env.DB, user.org_id, user, 'vendor_master', 'create', `创建供应商 ${body.code} ${body.name}${dropNote}`);

  const created = await env.DB.prepare('SELECT * FROM vendor_master WHERE id = ? AND org_id = ?').bind(id, user.org_id).first();
  // 回传同样按角色剥离：创建成功的响应不该比列表接口多泄露字段
  return json(
    stripRowsFields([formatVendor(created as any)], 'vendor', hidden).rows[0],
    201
  );
}

/**
 * ★ 兜底：把任何数据库异常翻译成可读中文 JSON。
 * 为什么必须包：不包的话，异常冒到 Cloudflare 会返回平台的 **HTML 500 页**，
 * 前端按 JSON 解析直接失败 —— 用户看到的是白屏或一句「服务器错误」，
 * 而真实原因（哪个字段不合法）被完全埋掉。
 * 这里统一转成 JSON，并把 SQLite 的原始原因带上，便于定位。
 */
function dbError(e: any, action: string): Response {
  const msg = String(e?.message || e || '未知错误');
  if (msg.includes('UNIQUE')) return json({ error: `${action}失败：供应商编码在本组织已存在`, code: 'DUPLICATE' }, 409);
  if (msg.includes('CHECK')) {
    return json({
      error: `${action}失败：取值不在数据库允许的范围内（${msg}）。` +
        '注意供应商的 status 只接受 registered / pending / approved / rejected / blacklisted，' +
        '不接受 active —— 与其它主数据的取值不同。',
      code: 'CHECK_FAILED',
    }, 400);
  }
  return json({ error: `${action}失败：${msg}`, code: 'DB_ERROR' }, 400);
}

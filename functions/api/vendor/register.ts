// POST /api/vendor/register — 供应商注册
import { hashPasswordPbkdf2, makeSalt, json, uid } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { likePrefix } from '../../_shared/searchKeyword';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const vendorCode = (body.vendorCode || '').trim().toUpperCase();
  const companyName = (body.companyName || '').trim();
  const contactName = (body.contactName || '').trim();
  const contactPhone = (body.contactPhone || '').trim();
  const contactEmail = (body.contactEmail || '').trim();
  const password = (body.password || '').toString();

  if (!vendorCode || !companyName || !contactName || !password) {
    return json({ error: '请填写完整信息' }, 400);
  }
  if (password.length < 6) {
    return json({ error: '密码至少6位' }, 400);
  }

  try {
    // ─────────────────────────────────────────────────────────────
    // 组织归属判定（V3.113.3 生产复验修正）
    // ─────────────────────────────────────────────────────────────
    // 原实现：拿 vendorCode 前 3 位做 `company_code LIKE 'xxx%' LIMIT 1` 猜组织。
    // 生产复验暴露的缺陷：**多候选时 LIMIT 1 静默挑一个**。
    //   生产 orgs 表里同前缀组织有 30+ 个（E2E-* / MOCK-* / RLS-* 等测试组织），
    //   供应商注册时被静默落到**别的组织** → 管理端（按 org_id 过滤）根本查不到这条申请
    //   → 管理员无从审核 → 供应商永远 pending → 门户永远登不进去。
    //   症状与 P0-4「整模块归零」完全一致，但根因在归属判定而非审核端点缺失。
    //
    // 修正后的优先级（越精确越优先）：
    //   ① body.orgId 精确命中（管理员/系统内部调用）
    //   ② body.companyCode 精确命中完整公司码
    //   ③ vendorCode 前 3 位前缀匹配 —— **仅当唯一命中才接受**；多候选直接拒绝并说明，
    //      绝不静默挑一个（宁可注册失败让人来问，也不让供应商落错组织后永远看不见）。
    const orgIdHint = (body.orgId || '').trim();
    const companyCodeHint = (body.companyCode || '').trim();
    let org: any = null;

    if (orgIdHint) {
      org = await env.DB.prepare('SELECT id, company_code FROM orgs WHERE id = ?').bind(orgIdHint).first();
      if (!org) {
        return json({ error: '指定的企业不存在，请联系企业管理员' }, 404);
      }
    } else if (companyCodeHint) {
      org = await env.DB.prepare('SELECT id, company_code FROM orgs WHERE company_code = ?')
        .bind(companyCodeHint).first();
      if (!org) {
        return json({ error: '企业编码不存在，请联系企业管理员' }, 404);
      }
    } else {
      // V3.21.0：此处 vendorCode 是**用户输入**，此前直接拼进 LIKE 模式
      //   （`vendorCode.slice(0,3) + '%'`）且未转义 —— 供应商只要填一个以 `%`
      //   开头的代码，前 3 位就成了通配符，可匹配到任意组织的公司码，
      //   从而把自己注册进不属于自己的组织（越权归属）。
      //   改用 likePrefix（转义用户输入部分，`%` 由我们自己加）配 ESCAPE。
      const candidates = await env.DB.prepare(
        "SELECT id, company_code FROM orgs WHERE company_code LIKE ? ESCAPE '\\' ORDER BY company_code LIMIT 20"
      ).bind(likePrefix(vendorCode.slice(0, 3))).all();
      const list = candidates.results || [];
      if (list.length === 0) {
        return json({ error: '未找到对应组织，请联系企业管理员邀请加入' }, 404);
      }
      if (list.length > 1) {
        // 多候选 → 明确拒绝，绝不静默落错组织（否则申请进了别的组织，管理端永远看不到）
        return json({
          error: `供应商代码前缀匹配到多个企业（${list.map((o: any) => o.company_code).join('、')}），请改用企业邀请码注册，或联系管理员确认归属企业`,
          code: 'ORG_AMBIGUOUS',
        }, 409);
      }
      org = list[0];
    }

    // 检查是否已注册
    const existing = await env.DB.prepare(
      'SELECT id FROM vendors WHERE vendor_code = ?'
    ).bind(vendorCode).first();
    if (existing) {
      return json({ error: '该供应商代码已被注册' }, 409);
    }

    const salt = makeSalt();
    const passwordHash = await hashPasswordPbkdf2(password, salt);
    const vendorId = uid('vendor');
    const now = new Date().toISOString();

    // ★ V3.113.3 P0-4：注册时**同时写两张供应商表**。
    //   缺陷背景：本端点只写 vendors（门户账号表），而 /api/vendors 的列表/详情/审核
    //     全部操作 vendor_master（主数据表）。实测生产两表 id 与 vendor_code **零匹配**
    //     —— 自助注册的供应商在管理端**根本看不到**，管理员无从审核，供应商永远 pending，
    //     门户登录又只放行 approved → 注册后永久无法登录（整条链路归零）。
    //   修法：同 id 同 vendor_code 双写（vendors 带密码，vendor_master 带主数据列），
    //     审核端点按 id 即可同时命中两表；且审核动作也同步两表（见 _shared/vendorApproval）。
    await env.DB.prepare(`
      INSERT INTO vendors (id, org_id, vendor_code, company_name, contact_name, contact_phone, contact_email, password_hash, salt, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      vendorId, (org as any).id, vendorCode, companyName, contactName,
      contactPhone || null, contactEmail || null, passwordHash, salt, 'vendor', 'pending', now
    ).run();

    // 主数据表同步（列与 vendor_master 契约一致；password/salt 不落主数据表）
    try {
      await env.DB.prepare(`
        INSERT INTO vendor_master (org_id, id, vendor_code, company_name, contact_name, contact_phone, contact_email, status, created_at, updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        (org as any).id, vendorId, vendorCode, companyName, contactName,
        contactPhone || null, contactEmail || null, 'pending', now, now, '供应商自助注册', '供应商自助注册'
      ).run();
    } catch (e: any) {
      // 主数据表写入失败不阻断注册（账号已建），但必须留痕（铁律㊾：catch 必 console.error + 反映到响应体）
      console.error('[vendor-register] 主数据表 vendor_master 同步失败：', e?.message || e);
      return json({
        message: '注册成功，等待管理员审核',
        warning: '主数据同步异常，管理员审核列表可能暂未显示该申请，请联系管理员处理',
      });
    }

    return json({ message: '注册成功，等待管理员审核' });
  } catch (e: any) {
    console.error('Register error:', e);
    return errorResponse(e, '注册');
  }
}

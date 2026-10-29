// 公开提交接口：供应商凭「有效邀请码」提交注册申请（无需登录）
// 路由：POST /api/vendor-application-public
// 用途：让未登录的外部供应商也能把申请落到 D1，真正实现「跨设备 / 真落地后端」。
// 安全要点：
//   · 必须携带一个【有效且未使用、未过期】的邀请码（否则拒绝）——既防开放滥用，又确定 org_id 与归属。
//   · buyerId / inviteCode / salesOrg 由服务端从邀请记录权威填充，客户端传入仅作参考，杜绝伪造归属。
//   · 成功消费后标记邀请为 used，并给发起采购员发站内信「新的供应商注册待您审核」。
import { json } from '../_shared/auth';

const REQUIRED = [
  'companyName', 'unifiedCode', 'contact', 'contactPhone', 'contactEmail',
  'bankName', 'bankAccount', 'bankAccountName',
];

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));

  const code = body.inviteCode;
  if (!code || typeof code !== 'string') {
    return json({ error: '缺少邀请码，无法通过邀请注册' }, 400);
  }

  const invite = await env.DB.prepare(
    `SELECT id, org_id, buyer_id, buyer_name, sales_org, status, expires_at
       FROM vendor_invitations
      WHERE code = ?`,
  ).bind(code).first();

  if (!invite) return json({ error: '邀请码不存在' }, 400);
  if (invite.status !== 'active') {
    return json({ error: invite.status === 'used' ? '该邀请链接已被使用' : '该邀请链接已作废' }, 400);
  }
  if (invite.expires_at && new Date(String(invite.expires_at)).getTime() < Date.now()) {
    return json({ error: '邀请链接已过期' }, 400);
  }

  // 最小必填校验（防止空白脏数据入库）
  for (const f of REQUIRED) {
    if (!body[f] || typeof body[f] !== 'string' || !String(body[f]).trim()) {
      return json({ error: '请完整填写企业、联系人、银行等信息后再提交' }, 400);
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const id = body.id && typeof body.id === 'string' ? body.id : `vpa-${Date.now()}`;
  const applicationNo =
    body.applicationNo && typeof body.applicationNo === 'string'
      ? body.applicationNo
      : `VA${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 900 + 100)}`;

  // 申请对象（__kind 标记与前端 flowStore.withKind('vendorApplication', item) 一致，便于水合分流）
  const app: Record<string, unknown> = {
    __kind: 'vendorApplication',
    id,
    applicationNo,
    companyName: String(body.companyName),
    unifiedCode: String(body.unifiedCode || ''),
    businessLicense: String(body.businessLicense || ''),
    legalRepresentative: String(body.legalRepresentative || ''),
    registeredCapital: String(body.registeredCapital || ''),
    contact: String(body.contact),
    contactPhone: String(body.contactPhone),
    contactEmail: String(body.contactEmail),
    address: String(body.address || ''),
    supplyCategories: Array.isArray(body.supplyCategories) ? body.supplyCategories : [],
    mainProducts: String(body.mainProducts || ''),
    annualRevenue: String(body.annualRevenue || ''),
    certifications: Array.isArray(body.certifications) ? body.certifications : [],
    bankName: String(body.bankName),
    bankAccount: String(body.bankAccount),
    bankAccountName: String(body.bankAccountName),
    taxId: String(body.taxId || ''),
    taxRate: String(body.taxRate || '13'),
    attachments: [],
    status: 'submitted',
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    currentStep: 0,
    stepHistory: [{ step: 0, role: 'supplier', label: '提交申请', action: 'submit', at: now }],
    // ── 定向归属：服务端权威填充，不从客户端取值 ──
    buyerId: invite.buyer_id,
    buyerName: invite.buyer_name,
    inviteCode: code,
    salesOrg: invite.sales_org || '',
  };

  try {
    // 写 flow_shared（org_id 取自邀请记录，绕过 RLS 直接插入）
    await env.DB.prepare(
      `INSERT INTO flow_shared
         (id, org_id, payload, created_at, updated_at, created_by, updated_by, created_by_name, updated_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id, invite.org_id, JSON.stringify(app), now, now,
        invite.buyer_id, invite.buyer_id, invite.buyer_name, invite.buyer_name,
      )
      .run();

    // 标记邀请已使用
    await env.DB.prepare(
      `UPDATE vendor_invitations SET status = 'used', used_at = ?, updated_at = ? WHERE id = ? AND org_id = ?`,
    )
      .bind(now, now, invite.id, invite.org_id)
      .run();

    // 通知发起采购员
    const msgId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await env.DB.prepare(
      `INSERT INTO messages
         (id, org_id, sender_id, sender_name, recipient_id, recipient_role,
          title, body, type, ref_module, ref_id, read, created_at, updated_at,
          created_by, updated_by, created_by_name, updated_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        msgId, invite.org_id, null, '系统', invite.buyer_id, null,
        '新的供应商注册待您审核',
        `「${app.companyName}」通过您的邀请链接提交了注册申请，请前往「供应商注册审批」处理。`,
        'vendor_invite', 'vendor_register', id, 0, now, now,
        'system', 'system', '系统', '系统',
      )
      .run();

    return json({ ok: true, applicationNo, id }, 201);
  } catch (e: any) {
    return json({ error: '提交失败，请稍后重试' }, 500);
  }
}

// 公开只读接口：按邀请码查询邀请信息（无需登录）
// 路由：GET /api/vendor-invite/:code
// 用途：供应商门户注册页凭 ?invite=<code> 回填「邀请采购员 / 采购组织」并校验有效性。
// 安全：仅返回非敏感字段（buyer_name / sales_org / status / expires_at），不泄露 buyer_id / org_id。
import { json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { env } = context;
  const code = context.params.code;
  if (!code || typeof code !== 'string') {
    return json({ valid: false, reason: '缺少或无效的邀请码' }, 200);
  }

  const row = await env.DB.prepare(
    `SELECT buyer_name, sales_org, status, expires_at
       FROM vendor_invitations
      WHERE code = ?`,
  ).bind(code).first();

  if (!row) {
    return json({ valid: false, reason: '邀请码不存在或已失效' }, 200);
  }

  const expired = !!row.expires_at && new Date(String(row.expires_at)).getTime() < Date.now();
  const consumed = row.status === 'used' || row.status === 'revoked';
  const valid = row.status === 'active' && !expired;

  return json(
    {
      valid,
      buyerName: row.buyer_name || '',
      salesOrg: row.sales_org || '',
      status: row.status,
      expiresAt: row.expires_at || null,
      reason: expired ? '邀请链接已过期' : consumed ? '邀请链接已使用或已作废' : '',
    },
    200,
  );
}

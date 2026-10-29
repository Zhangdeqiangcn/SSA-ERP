// 公司邀请码管理（登录态，仅 超级管理员 / 管理员）
// ─────────────────────────────────────────────────────────────
// V3.15.5：把「公司码」升级为可轮换、带有效期的「公司邀请码」。
//   · 公司身份由 orgs.id / orgs.name 承载，邀请码只是「加入凭证」，可更换而不影响公司身份；
//   · 有效期：默认 30 天，可自定义任意天数，也可设为「永久有效」（NULL）；
//   · 轮换：生成新码后旧码「立即失效」——旧码写入 org_code_history，注册时被明确拒绝；
//   · 停用：可临时暂停接受新成员加入。
//
// 权限：仅 super_admin（可跨公司，?orgId= 指定目标）与 admin（仅本公司）可读可改。
//   非特权角色一律 403；admin 无法通过 orgId 参数操作其它公司。
// 审计：每次成功变更写一条 audit_log，记录谁在什么时候把邀请码/有效期/停用状态改成了什么。
import { getUserFromRequest, json } from '../../_shared/auth';
import { RLS_PRIVILEGED } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';

/** 邀请码字符集：去掉易混淆的 0/o/1/l/i，仅小写字母 + 数字 */
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LEN = 8;
/** 邀请码格式：小写字母与数字，4~32 位 */
const CODE_RE = /^[a-z0-9]{4,32}$/;
/** 默认有效期（天） */
const DEFAULT_VALID_DAYS = 30;

function genCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

/** 生成一个全局唯一（既不在 orgs 也不在历史表）的新邀请码 */
async function genUniqueCode(DB: any): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const c = genCode();
    const dupOrg = await DB.prepare('SELECT 1 AS x FROM orgs WHERE company_code = ?').bind(c).first();
    if (dupOrg) continue;
    const dupHis = await DB.prepare('SELECT 1 AS x FROM org_code_history WHERE code = ?').bind(c).first();
    if (dupHis) continue;
    return c;
  }
  // 极端兜底：加时间戳后缀，确保唯一
  return genCode() + Date.now().toString(36).slice(-4);
}

function toState(row: any) {
  return {
    orgId: row.id,
    orgName: row.name,
    orgStatus: row.status ?? 'active',
    companyCode: row.company_code,
    expiresAt: row.code_expires_at ?? null,
    rotatedAt: row.code_rotated_at ?? null,
    disabled: !!row.code_disabled,
  };
}

/** 解析目标组织：super_admin 可用 ?orgId= 指定，其余一律锁定为本人所属组织 */
function resolveOrgId(me: any, url: URL): string {
  if (me.role === 'super_admin') {
    const q = (url.searchParams.get('orgId') || '').trim();
    if (q) return q;
  }
  return me.org_id;
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (!RLS_PRIVILEGED.has(me.role)) return json({ error: '无权查看公司邀请码' }, 403);

  const url = new URL(request.url);
  const orgId = resolveOrgId(me, url);
  if (!orgId) return json({ error: '账号未归属任何组织' }, 400);

  const row: any = await env.DB.prepare(
    `SELECT id, name, status, company_code, code_expires_at, code_rotated_at, code_disabled
       FROM orgs WHERE id = ?`
  ).bind(orgId).first();
  if (!row) return json({ error: '组织不存在' }, 404);

  return json({ success: true, data: toState(row) });
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (!RLS_PRIVILEGED.has(me.role)) return json({ error: '无权重置公司邀请码' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: '请求格式错误' }, 400);

  const url = new URL(request.url);
  const orgId = resolveOrgId(me, url);
  if (!orgId) return json({ error: '账号未归属任何组织' }, 400);

  const row: any = await env.DB.prepare(
    `SELECT id, name, status, company_code, code_expires_at, code_rotated_at, code_disabled
       FROM orgs WHERE id = ?`
  ).bind(orgId).first();
  if (!row) return json({ error: '组织不存在' }, 404);

  const setClauses: string[] = [];
  const setParams: any[] = [];
  const changes: string[] = [];
  const now = new Date().toISOString();
  let newCode = row.company_code as string;
  let rotated = false;

  // ── ① 生成新码（轮换）或手动指定新码 ────────────────────────
  let explicit = '';
  if (body.companyCode !== undefined && body.companyCode !== null && String(body.companyCode).trim() !== '') {
    explicit = String(body.companyCode).trim().toLowerCase();
  }
  const wantRotate = body.rotate === true;
  if (wantRotate || explicit) {
    if (explicit) {
      if (!CODE_RE.test(explicit)) {
        return json({ error: '邀请码只能由 4~32 位小写字母或数字组成' }, 400);
      }
      if (explicit !== newCode) {
        // 唯一性：不得与任何现存组织的码或历史码重复
        const dupOrg = await env.DB.prepare('SELECT 1 AS x FROM orgs WHERE company_code = ? AND id <> ?')
          .bind(explicit, orgId).first();
        if (dupOrg) return json({ error: '该邀请码已被其它公司占用，请换一个' }, 409);
        const dupHis = await env.DB.prepare('SELECT 1 AS x FROM org_code_history WHERE code = ?')
          .bind(explicit).first();
        if (dupHis) return json({ error: '该邀请码曾被使用并已失效，请换一个' }, 409);
        newCode = explicit;
      }
    } else {
      newCode = await genUniqueCode(env.DB);
    }

    if (newCode !== row.company_code) {
      // 旧码写入历史表 → 立即失效（注册时被明确拒绝，而非被误判为新公司）
      if (row.company_code) {
        await env.DB.prepare(
          `INSERT INTO org_code_history (code, org_id, revoked_at, revoked_by)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(code) DO NOTHING`
        ).bind(row.company_code, orgId, now, me.id).run();
      }
      setClauses.push('company_code = ?');
      setParams.push(newCode);
      setClauses.push('code_rotated_at = ?');
      setParams.push(now);
      rotated = true;
      changes.push(`邀请码：${row.company_code} → ${newCode}（旧码已立即失效）`);
    }
  }

  // ── ② 有效期：支持 days（天数）或 expiresAt（ISO）/ null（永久）──
  if (body.expiresInDays !== undefined) {
    const d = body.expiresInDays;
    if (d === null || d === '' || d === 'forever') {
      if ((row.code_expires_at ?? null) !== null) {
        setClauses.push('code_expires_at = ?');
        setParams.push(null);
        changes.push('有效期：改为永久有效');
      }
    } else {
      const n = Number(d);
      if (!Number.isFinite(n) || n <= 0 || n > 3650) {
        return json({ error: '有效期天数需为 1~3650 之间的数字' }, 400);
      }
      const exp = new Date(Date.now() + n * 86400_000).toISOString();
      setClauses.push('code_expires_at = ?');
      setParams.push(exp);
      changes.push(`有效期：${n} 天（至 ${exp.slice(0, 10)}）`);
    }
  } else if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === '') {
      if ((row.code_expires_at ?? null) !== null) {
        setClauses.push('code_expires_at = ?');
        setParams.push(null);
        changes.push('有效期：改为永久有效');
      }
    } else {
      const s = String(body.expiresAt);
      const t = Date.parse(s);
      if (Number.isNaN(t)) return json({ error: '有效期时间格式不正确' }, 400);
      if (t <= Date.now()) return json({ error: '有效期必须晚于当前时间' }, 400);
      setClauses.push('code_expires_at = ?');
      setParams.push(new Date(t).toISOString());
      changes.push(`有效期：至 ${new Date(t).toISOString().slice(0, 10)}`);
    }
  }

  // ── ③ 停用 / 启用加入 ─────────────────────────────────────
  if (body.disabled !== undefined) {
    const want = body.disabled === true || body.disabled === 1 || body.disabled === '1';
    if (want !== !!row.code_disabled) {
      setClauses.push('code_disabled = ?');
      setParams.push(want ? 1 : 0);
      changes.push(want ? '已暂停接受新成员加入' : '已恢复接受新成员加入');
    }
  }

  if (!setClauses.length) {
    return json({ success: true, changed: false, data: toState(row) });
  }

  try {
    await env.DB.prepare(`UPDATE orgs SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...setParams, orgId)
      .run();
  } catch (e: any) {
    return json({ error: '更新失败：' + (e?.message || '数据库错误') }, 500);
  }

  await writeAudit(env.DB, {
    orgId,
    actor: { id: me.id, name: me.name },
    entity: 'orgs',
    entityId: orgId,
    action: 'update_invite_code',
    summary:
      `组织「${row.name}」邀请码变更：` + changes.join('；') +
      (me.role === 'super_admin' ? '【操作人身份：超级管理员】' : '【操作人身份：管理员】'),
    diff: { before: { companyCode: row.company_code, expiresAt: row.code_expires_at, disabled: !!row.code_disabled } },
  });

  const fresh: any = await env.DB.prepare(
    `SELECT id, name, status, company_code, code_expires_at, code_rotated_at, code_disabled
       FROM orgs WHERE id = ?`
  ).bind(orgId).first();

  return json({
    success: true,
    changed: true,
    rotated,
    defaultValidDays: DEFAULT_VALID_DAYS,
    data: toState(fresh),
  });
}

// 兼容 POST 调用方（语义同 PUT）
export async function onRequestPost(context: any) {
  return onRequestPut(context);
}

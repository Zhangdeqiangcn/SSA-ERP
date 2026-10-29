// 自服务资料更新（登录态，全角色可用）
// V3.15.0：用户可在「个人中心 → 个人资料」里修改自己的部分信息，
//   但管理员设置的信息（用户名 / 部门 / 角色 / 状态 / 组织 / 是否负责人）只读、不可经此接口改动。
//
// 设计要点：
//   ① 白名单：仅 name / phone / email / altEmail 可改；其它字段一律 400 拒绝，
//      防止前端越权把 department / role 等管理员字段一并 POST 上来时悄悄改掉。
//   ② 校验：name 非空且 ≤50；phone 留空=清空，非空须符合中国大陆手机号；email/altEmail 留空=清空，
//      非空须符合邮箱格式（与超级管理员双邮箱验证通道共用同一对列，改后下次验证即发往新邮箱）。
//   ③ 审计：每次成功变更写一条 audit_logs，便于追溯「谁改了自己什么」。
import { getUserFromRequest, json, toClientUser } from '../../_shared/auth';
import { writeAudit } from '../../_shared/auditLog';

export async function onRequestPatch(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: '请求格式错误' }, 400);

  // ── ① 白名单 + 拒绝受保护字段 ─────────────────────────────
  const ALLOWED = new Set(['name', 'phone', 'email', 'altEmail']);
  const PROTECTED = ['username', 'department', 'role', 'status', 'org_id', 'is_owner', 'security_initialized'];
  for (const k of Object.keys(body)) {
    if (PROTECTED.includes(k)) {
      return json({ error: `字段「${k}」由管理员设置，不可自行修改` }, 400);
    }
    if (!ALLOWED.has(k)) {
      return json({ error: `不支持修改字段「${k}」` }, 400);
    }
  }

  const setClauses: string[] = [];
  const setParams: any[] = [];
  const changes: string[] = [];
  const before: Record<string, any> = {
    name: me.name,
    phone: me.phone ?? null,
    email: me.email ?? null,
    altEmail: me.alt_email ?? null,
  };

  // ── ② name ────────────────────────────────────────────────
  if (body.name !== undefined) {
    const nm = String(body.name).trim();
    if (!nm) return json({ error: '姓名不能为空' }, 400);
    if (nm.length > 50) return json({ error: '姓名过长（≤50 字）' }, 400);
    if (nm !== (me.name ?? '')) {
      setClauses.push('name = ?');
      setParams.push(nm);
      changes.push(`姓名：${me.name || '-'} → ${nm}`);
    }
  }

  // ── ② phone ───────────────────────────────────────────────
  if (body.phone !== undefined) {
    const raw = String(body.phone ?? '').trim();
    if (raw === '') {
      // 允许清空
      if ((me.phone ?? null) !== null) {
        setClauses.push('phone = ?');
        setParams.push(null);
        changes.push('手机号：已清空');
      }
    } else {
      if (!/^1[3-9]\d{9}$/.test(raw)) return json({ error: '手机号格式不正确' }, 400);
      if (raw !== (me.phone ?? '')) {
        setClauses.push('phone = ?');
        setParams.push(raw);
        changes.push(`手机号：${me.phone || '-'} → ${raw}`);
      }
    }
  }

  // ── ② email / altEmail ────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (body.email !== undefined) {
    const raw = String(body.email ?? '').trim();
    if (raw === '') {
      if ((me.email ?? null) !== null) {
        setClauses.push('email = ?');
        setParams.push(null);
        changes.push('主邮箱：已清空');
      }
    } else {
      if (!emailRe.test(raw)) return json({ error: '主邮箱格式不正确' }, 400);
      if (raw !== (me.email ?? '')) {
        setClauses.push('email = ?');
        setParams.push(raw);
        changes.push(`主邮箱：${me.email || '-'} → ${raw}`);
      }
    }
  }
  if (body.altEmail !== undefined) {
    const raw = String(body.altEmail ?? '').trim();
    if (raw === '') {
      if ((me.alt_email ?? null) !== null) {
        setClauses.push('alt_email = ?');
        setParams.push(null);
        changes.push('备用邮箱：已清空');
      }
    } else {
      if (!emailRe.test(raw)) return json({ error: '备用邮箱格式不正确' }, 400);
      const cur = me.alt_email ?? '';
      if (raw !== cur) {
        setClauses.push('alt_email = ?');
        setParams.push(raw);
        changes.push(`备用邮箱：${cur || '-'} → ${raw}`);
      }
    }
  }

  if (!setClauses.length) {
    // 无实际变化：直接返回当前用户，避免无谓写库
    return json({ success: true, user: toClientUser(me), changed: false });
  }

  try {
    await env.DB.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...setParams, me.id)
      .run();
  } catch (e: any) {
    return json({ error: '更新失败：' + (e?.message || '数据库错误') }, 500);
  }

  // ── ③ 审计留痕 ────────────────────────────────────────────
  await writeAudit(env.DB, {
    orgId: me.org_id,
    actor: { id: me.id, name: me.name },
    entity: 'users',
    entityId: me.id,
    action: 'update_self',
    summary: `用户「${me.name || me.username}」自行更新个人资料：${changes.join('；')}`,
    diff: { before, after: body },
  });

  // 读回最新行并规范化返回
  const fresh: any = await env.DB.prepare(
    `SELECT id, org_id, username, name, role, department, status, email, alt_email, phone
       FROM users WHERE id = ?`
  ).bind(me.id).first();

  return json({ success: true, user: toClientUser(fresh), changed: true });
}

// 让不支持 PATCH 的调用方也可用 PUT（语义相同：整体替换可改字段）
export async function onRequestPut(context: any) {
  return onRequestPatch(context);
}

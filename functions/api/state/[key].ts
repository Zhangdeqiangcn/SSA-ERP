// 业务状态同步：GET 拉取 / PUT 保存 / DELETE 清除
// 作用域：自动按当前用户所属组织（org_id）共享，同一组织所有人看同一份
import { getUserFromRequest, json } from '../../_shared/auth';
import { isRlsPrivileged } from '../../_shared/rls';
import { checkSize, recordSizeMetric } from '../../_shared/stateSizeGuard';
// V3.5.0 B6：补齐写审计。注意这里是「大对象总闸」——60 个业务域都从这里进出，
//   不能每个域都记一条（会把审计表本身撑爆）。策略：只对特权配置键留痕
//   （见下方 PRIVILEGED_KEYS 相关分支），普通业务域靠 recordSizeMetric 的体积指标
//   与各业务域自己的写端点审计来覆盖。
import { writeAudit } from '../../_shared/auditLog';

// ── 组织级「特权配置键」写保护（V2.97.0 修复 · 安全审计 C1）─────────────────
// 缺陷：本端点是所有 zustand store 的通用云同步通道（见 src/stores/persistStorage.ts），
//   此前只校验「是否登录」，不校验角色。于是任一普通成员都能 PUT 覆盖组织级安全配置：
//     · ssa-erp-users            用户与角色表  → 可把自己改成管理员（直接提权）
//     · ssa-erp-data-permission  字段权限矩阵  → 可解除敏感字段遮蔽（看成本/价格/授信）
//     · ssa-erp-approval-flows   审批流定义    → 可增删审批节点，绕过管控
//     · ssa-erp-report-perm      报表权限      → 可放开本无权查看的报表
//     · ssa-erp-audit            审计日志缓存  → 可清空/篡改，销毁操作痕迹
// 修复：把这些键的「写 / 删」收敛到特权角色（super_admin / admin）。
// 为何不封「读」：ssa-erp-data-permission 是前端 SecureField 每次渲染字段遮蔽的依据，
//   ssa-erp-approval-flows 是各单据页判定审批链路的依据——对这些键的读取是全员必需的，
//   强行封读会导致遮蔽失效或页面白屏。故本次只封写，不影响任何读取路径。
// 副作用说明：ssa-erp-audit 会被普通业务操作被动写入（销售价目表/促销增改删、数电票核验建批）。
//   被拒后前端 persistStorage 会静默吞掉 403 并保留本地副本，业务不中断；
//   权威审计链路是 /api/audit/logs（写 D1 audit_logs 表，append-only），不受影响。
const PRIVILEGED_KEYS = new Set([
  'ssa-erp-users',
  'ssa-erp-data-permission',
  'ssa-erp-approval-flows',
  'ssa-erp-report-perm',
  'ssa-erp-audit',
]);

/** 该键是否禁止当前用户写入（读不受限） */
function isWriteDenied(userRole: string, key: string): boolean {
  return PRIVILEGED_KEYS.has(key) && !isRlsPrivileged(userRole);
}

export async function onRequestGet(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  // V3.1.0（评测 H-02 / M-13）：连同版本号一并返回，前端下次写入时带回做冲突比对。
  // 取不到 version 列（老库 / 迁移未执行）时退化为 1，功能不受影响。
  let row: any = null;
  try {
    row = await env.DB.prepare(
      'SELECT value, version, updated_at FROM app_state WHERE org_id = ? AND key = ?'
    )
      .bind(user.org_id, key)
      .first();
  } catch {
    row = await env.DB.prepare('SELECT value FROM app_state WHERE org_id = ? AND key = ?')
      .bind(user.org_id, key)
      .first();
  }

  if (!row) return json({ value: null }, 404);
  return json({
    value: row.value,
    version: Number(row.version) || 1,
    updated_at: row.updated_at || null,
  });
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  // C1：特权配置键仅管理员可写
  if (isWriteDenied(user.role, key)) {
    return json({ error: '该配置为组织级特权项，需管理员权限' }, 403);
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
  const now = new Date().toISOString();

  // ── A5 大对象键容量守护 ───────────────────────────────────────
  // 缺陷原状：单键体积没有上限校验。某个业务域（凭证 / 库存流水这类只增不减的域）
  //   涨到存储上限后，写入会失败或半失败，而前端 persistStorage 对此静默吞掉 ——
  //   用户看到「保存成功」，刷新后数据回滚，等发现时已积压大量未上云的本地数据。
  // 处置（分级，不做一刀切）：
  //   · 超软阈值 4 MB → 照常写入，响应带 warning，由前端同步状态栏提示、管理端可见
  //   · 超硬阈值 8 MB → 拒绝写入（413）并给出可操作的中文原因
  //   理由：静默丢数据远比明确报错严重。报错至少可发现、可干预、可留底。
  const size = checkSize(value);
  if (size.level === 'reject') {
    return json(
      {
        error: size.message,
        code: 'STATE_TOO_LARGE',
        bytes: size.bytes,
        humanSize: size.human,
        key,
      },
      413,
    );
  }
  const sizeWarning = size.level === 'warn' ? size.message : undefined;

  // ── 乐观并发控制（V3.1.0 · 评测 M-13）────────────────────────
  // 缺陷：本端点原先是「按键整块覆盖」——后写入者无条件覆盖先写入者，
  //   多端（或同一浏览器多个标签页）同时编辑同一份数据时，先写入者的改动
  //   无声消失，且系统不会给出任何提示。
  // 修复：调用方可传 baseVersion（上一次读到的版本号）。若库中版本已变化，
  //   说明期间有别的端改过 → 返回 409 并回传云端最新版本与内容，由前端提示用户，
  //   而不是静默覆盖。不传 baseVersion 时保持原有覆盖行为（老客户端兼容）。
  let current: any = null;
  try {
    current = await env.DB.prepare(
      'SELECT version FROM app_state WHERE org_id = ? AND key = ?'
    )
      .bind(user.org_id, key)
      .first();
  } catch {
    current = null; // 老库无 version 列 → 跳过冲突检测，保持原行为
  }

  const currentVersion = Number(current?.version) || 0;
  const baseVersion = body.baseVersion == null ? null : Number(body.baseVersion);
  if (currentVersion > 0 && baseVersion != null && Number.isFinite(baseVersion)) {
    if (baseVersion !== currentVersion) {
      const latest: any = await env.DB.prepare(
        'SELECT value, version, updated_at FROM app_state WHERE org_id = ? AND key = ?'
      )
        .bind(user.org_id, key)
        .first();
      return json(
        {
          error: '该数据在其他设备或由其他成员已被修改，为避免覆盖他人改动，本次保存未生效。请刷新后重试。',
          code: 'VERSION_CONFLICT',
          current: {
            version: Number(latest?.version) || currentVersion,
            updated_at: latest?.updated_at || null,
            value: latest?.value ?? null,
          },
        },
        409
      );
    }
  }

  const nextVersion = currentVersion + 1;
  try {
    await env.DB.prepare(
      `INSERT INTO app_state (org_id, key, value, updated_at, version, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_id, key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at,
         version = COALESCE(app_state.version, 0) + 1,
         updated_by = excluded.updated_by`
    )
      .bind(user.org_id, key, value, now, nextVersion, user.id ?? null)
      .run();
  } catch {
    // 老库无 version 列 → 退回原语句，保证写入不中断
    await env.DB.prepare(
      `INSERT INTO app_state (org_id, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(org_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
      .bind(user.org_id, key, value, now)
      .run();
  }

  const after: any = await env.DB.prepare(
    'SELECT version FROM app_state WHERE org_id = ? AND key = ?'
  )
    .bind(user.org_id, key)
    .first()
    .catch(() => null);

  // A5：记录体积指标（失败静默，不影响业务返回）—— 管理端据此提前发现「哪个域要爆」
  await recordSizeMetric(env.DB, user.org_id, key, size.bytes);

  // B6 审计（分级）：只对特权配置键留痕。
  //   判断依据「是否走了管理员分支」——PRIVILEGED_KEYS 中的键写入门槛即为管理员，
  //   因此这里能进入就说明是特权配置（用户权限矩阵 / 审批流 / 报表权限这类）。
  //   为什么不给每个业务域都记：60 个域 × 高频自动保存 = 审计表被淹没，
  //   真正需要查的安全事件会被噪声埋掉。业务域的留痕由各自的写端点负责。
  if (PRIVILEGED_KEYS.has(key)) {
    await writeAudit(env.DB, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name || user.username },
      entity: 'app_state',
      entityId: key,
      action: 'update',
      summary:
        `修改组织级特权配置「${key}」` +
        `（体积 ${size.human}${size.level === 'warn' ? '，已超软阈值告警' : ''}）` +
        '【该键影响权限与审批路由，改动需管理员身份】',
    });
  }

  return json({
    ok: true,
    updated_at: now,
    version: Number(after?.version) || nextVersion,
    // 体积信息随响应回传：前端可据此在同步状态栏提示，无需额外请求
    size: { bytes: size.bytes, human: size.human, level: size.level },
    ...(sizeWarning ? { warning: sizeWarning } : {}),
  });
}

export async function onRequestDelete(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const key = params.key;
  // C1：特权配置键仅管理员可删（删除等同清空安全配置，与写入同级别管控）
  if (isWriteDenied(user.role, key)) {
    return json({ error: '该配置为组织级特权项，需管理员权限' }, 403);
  }
  await env.DB.prepare('DELETE FROM app_state WHERE org_id = ? AND key = ?')
    .bind(user.org_id, key)
    .run();

  // B6 审计：删除特权配置键等于把该配置「清空回默认」——比如删掉用户权限矩阵，
  //   全部角色会退回默认可见范围（可能放开本应遮蔽的字段）。与写入同级别必须留痕。
  if (PRIVILEGED_KEYS.has(key)) {
    await writeAudit(env.DB, {
      orgId: user.org_id,
      actor: { id: user.id, name: user.name || user.username },
      entity: 'app_state',
      entityId: key,
      action: 'delete',
      summary:
        `清空组织级特权配置「${key}」（该键将回退为系统默认值，权限与审批路由可能随之变化）` +
        '【该动作需管理员身份】',
    });
  }

  return json({ ok: true });
}

/**
 * 登录失败限流（评测发现 H-05：登录接口无失败次数限制，可被口令爆破）
 *
 * 计数维度：用户名 + 来源地址。这样即使攻击者换用户名，
 * 同一来源对同一账号的连续尝试依然会被计数；同时避免「一处输错、
 * 全网被锁」的误伤。
 *
 * 计数窗口：距上次失败超过 WINDOW_MINUTES 分钟即重新计数，
 * 避免用户偶尔输错被长期累积。
 * 锁定阶梯：失败次数越多，锁定时长越长。
 */
import { json, uid } from './auth';

/** 计数窗口（分钟）：超过该时长未再失败则重新计数 */
const WINDOW_MINUTES = 15;

/** 锁定阶梯：由高到低，取第一个满足的档位 */
const TIERS = [
  { count: 50, minutes: 60 * 24 }, // 24 小时
  { count: 20, minutes: 30 },
  { count: 10, minutes: 5 },
];

/** 触发锁定的最小失败次数（用于提示文案） */
export const LOCK_THRESHOLD = Math.min(...TIERS.map((t) => t.count));

/** 取客户端来源地址：Cloudflare 优先，其次代理头，最后兜底 */
export function clientIp(request: Request): string {
  const h = request.headers;
  const cf = h.get('CF-Connecting-IP');
  if (cf) return cf.trim();
  const xff = h.get('X-Forwarded-For');
  if (xff) return (xff.split(',')[0] || '').trim() || 'unknown';
  return 'unknown';
}

const subjectKey = (username: string, ip: string): string => `${username}@${ip}`;

const minutesText = (ms: number): string => {
  const m = Math.ceil(ms / 60000);
  return m <= 1 ? '1' : String(m);
};

/** 登录前检查：已锁定则返回 429 响应，否则返回 null */
export async function checkLoginLock(
  db: any,
  username: string,
  ip: string
): Promise<Response | null> {
  try {
    const row = await db
      .prepare('SELECT locked_until FROM login_attempts WHERE subject_key = ?')
      .bind(subjectKey(username, ip))
      .first();
    if (!row) return null;
    const until = String((row as any).locked_until || '');
    if (!until) return null;
    const left = new Date(until).getTime() - Date.now();
    if (left <= 0) return null; // 已过锁定时间
    return json(
      {
        error: `登录失败次数过多，已临时锁定，请 ${minutesText(left)} 分钟后重试`,
        code: 'LOGIN_LOCKED',
        retryAfterSeconds: Math.ceil(left / 1000),
      },
      429
    );
  } catch {
    // 限流表异常不应阻断登录本身
    return null;
  }
}

/** 记录一次登录失败；达到阶梯则写入锁定截止时间 */
export async function recordLoginFail(db: any, username: string, ip: string): Promise<void> {
  const key = subjectKey(username, ip);
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60000).toISOString();
  try {
    const res = await db
      .prepare(
        `UPDATE login_attempts
            SET fail_count = CASE WHEN last_fail_at IS NULL OR last_fail_at < ? THEN 1 ELSE fail_count + 1 END,
                last_fail_at = ?
          WHERE subject_key = ?`
      )
      .bind(windowStart, nowIso, key)
      .run();

    if (!res?.meta || res.meta.changes === 0) {
      await db
        .prepare(
          `INSERT INTO login_attempts (id, subject_key, username, fail_count, first_fail_at, last_fail_at)
           VALUES (?, ?, ?, 1, ?, ?)`
        )
        .bind(uid('la'), key, username || '', nowIso, nowIso)
        .run();
    }

    const row = await db
      .prepare('SELECT fail_count FROM login_attempts WHERE subject_key = ?')
      .bind(key)
      .first();
    const count = Number((row as any)?.fail_count || 1);
    const tier = TIERS.find((t) => count >= t.count);
    if (tier) {
      const until = new Date(now.getTime() + tier.minutes * 60000).toISOString();
      await db
        .prepare('UPDATE login_attempts SET locked_until = ? WHERE subject_key = ?')
        .bind(until, key)
        .run();
    }
  } catch {
    /* 限流失败不阻断登录流程 */
  }
}

/** 登录成功：清除该主体的失败计数 */
export async function clearLoginFail(db: any, username: string, ip: string): Promise<void> {
  try {
    await db
      .prepare('DELETE FROM login_attempts WHERE subject_key = ?')
      .bind(subjectKey(username, ip))
      .run();
  } catch {
    /* 忽略 */
  }
}

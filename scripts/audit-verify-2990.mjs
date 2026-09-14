/**
 * V2.99.0 第二批整改回归实测
 *   ② 写接口统一入参校验（M-03 数值 / M-04 日期 / M-05 超长）
 *   ④ 登录失败限流（H-05）
 * 用法：先起本地服务（wrangler pages dev dist --local --persist-to <库> --port 8799）
 */
const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:8799';
const PW = 'Audit@2026';
// 每次运行使用唯一编号，保证脚本可重复执行
const RUN = Date.now().toString(36).slice(-6).toUpperCase();

let pass = 0;
let fail = 0;
const T = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); }
};

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: r.status, data, text };
}

const login = async (u, p = PW) => (await req('/api/auth/login', { method: 'POST', body: { username: u, password: p } })).data?.token;

(async () => {
  console.log('=== V2.99.0 第二批整改回归实测 ===\n');

  // ---------- 夹具准备 ----------
  const token = await login('a_admin');
  if (!token) {
    console.log('无法登录 a_admin，请确认本地库夹具存在');
    process.exit(1);
  }
  console.log('夹具就绪（a_admin 登录成功）\n');

  // ================= ② 入参校验 =================
  console.log('【② 写接口统一入参校验】');

  // M-03 数值字段传非数字文本
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-N1-'+RUN, name: '数值校验', creditLimit: '一千元' },
    });
    T('M-03 金额填「一千元」被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
    T('M-03 响应明确指出字段与当前值', /creditLimit/.test(r.text) && /一千元/.test(r.text), r.text.slice(0, 120));
    T('M-03 错误码为 INVALID_FIELD', r.data?.code === 'INVALID_FIELD', String(r.data?.code));
  }

  // 数值传合法数字字符串应放行
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-N2-'+RUN, name: '数值合法', creditLimit: '12345.6' },
    });
    T('M-03 反向：数字字符串「12345.6」放行', r.status === 201, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
  }

  // M-04 非法日期
  {
    const r = await req('/api/purchase-orders', {
      method: 'POST', token,
      body: { orderNo: 'V99-D1-'+RUN, vendorId: 'V1', vendorName: '供', status: 'draft', orderDate: '2026-13-45', totalAmount: 1 },
    });
    T('M-04 日期 2026-13-45 被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
    T('M-04 响应指出字段 orderDate', /orderDate/.test(r.text), r.text.slice(0, 120));
  }
  {
    const r = await req('/api/purchase-orders', {
      method: 'POST', token,
      body: { orderNo: 'V99-D2-'+RUN, vendorId: 'V1', vendorName: '供', status: 'draft', orderDate: '2026-02-30', totalAmount: 1 },
    });
    T('M-04 边界：2026-02-30（不存在的日）被拒', r.status === 400, `HTTP ${r.status}`);
  }
  {
    const r = await req('/api/purchase-orders', {
      method: 'POST', token,
      body: { orderNo: 'V99-D3-'+RUN, vendorId: 'V1', vendorName: '供', status: 'draft', orderDate: '2026-02-28', totalAmount: 1 },
    });
    T('M-04 反向：合法日期 2026-02-28 放行', r.status === 201, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
  }

  // M-05 超长字段
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-L1-'+RUN, name: '好好'.repeat(100000) },
    });
    T('M-05 20 万字符名称被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
    T('M-05 响应指出字段 name', /name/.test(r.text), r.text.slice(0, 120));
  }
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-L2-'+RUN, name: '正常名称' },
    });
    T('M-05 反向：正常长度放行', r.status === 201, `HTTP ${r.status}`);
  }

  // 通用实体内核（动态表）
  {
    const r = await req('/api/entities/cashAccount', {
      method: 'POST', token,
      body: { accountNo: 'V99-E1-'+RUN, accountName: '实体校验', openingBalance: '不是数字' },
    });
    T('通用实体内核：数值非法被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 100)}`);
  }
  {
    const r = await req('/api/entities/cashFlow', {
      method: 'POST', token,
      body: { accountId: 'A1', direction: 'in', amount: 100, flowDate: '2026-99-99' },
    });
    T('通用实体内核：日期非法被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 100)}`);
  }
  {
    const r = await req('/api/entities/cashAccount', {
      method: 'POST', token,
      body: { accountNo: 'V99-E2-'+RUN, accountName: '实体合法', openingBalance: 100 },
    });
    T('通用实体内核：反向合法放行', r.status === 201, `HTTP ${r.status} ${r.text.slice(0, 80)}`);
  }

  // 服务端自管字段不应被误判
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-S1-'+RUN, name: '自管字段', createdAt: '任意值', updatedAt: 'x', id: 'my-id' },
    });
    T('服务端自管字段（createdAt/id）不误判', r.status === 201, `HTTP ${r.status} ${r.text.slice(0, 100)}`);
  }

  // 空值不应被误判
  {
    const r = await req('/api/customers', {
      method: 'POST', token,
      body: { code: 'V99-S2-'+RUN, name: '空值', creditLimit: '', settlementTermDays: null },
    });
    T('数值字段传空字符串/空值不误判', r.status === 201, `HTTP ${r.status} ${r.text.slice(0, 100)}`);
  }

  // 明细行校验（子表）
  {
    const r = await req('/api/purchase-orders', {
      method: 'POST', token,
      body: {
        orderNo: 'V99-IT1-'+RUN, vendorId: 'V1', vendorName: '供', status: 'draft',
        orderDate: '2026-09-14', totalAmount: 100,
        items: [{ materialId: 'M1', orderedQuantity: '很多', unitPrice: 10 }],
      },
    });
    T('明细行：数量非法被拒（400）', r.status === 400, `HTTP ${r.status} ${r.text.slice(0, 120)}`);
    T('明细行：提示标明是明细行', /明细行/.test(r.text), r.text.slice(0, 140));
  }

  // ================= ④ 登录限流 =================
  console.log('\n【④ 登录失败限流】');

  const victim = 'a_admin';
  // 先清掉可能的历史计数
  await login(victim);

  let lockedAt = 0;
  let lockBody = '';
  for (let i = 1; i <= 12; i++) {
    const r = await req('/api/auth/login', { method: 'POST', body: { username: victim, password: 'WrongPass#' + i } });
    if (r.status === 429) { lockedAt = i; lockBody = r.text; break; }
  }
  T('H-05 连续失败达到阈值后锁定（429）', lockedAt > 0, `第 ${lockedAt} 次触发；未触发则为 0`);
  T('H-05 锁定阈值 ≥ 10（不会误伤偶尔输错）', lockedAt === 0 || lockedAt >= 10, `实际 ${lockedAt}`);
  T('H-05 锁定响应含剩余等待时间', lockedAt === 0 || /分钟后重试/.test(lockBody), lockBody.slice(0, 120));
  T('H-05 锁定响应含重试秒数', lockedAt === 0 || typeof (JSON.parse(lockBody || '{}').retryAfterSeconds) === 'number', lockBody.slice(0, 120));

  if (lockedAt > 0) {
    // 被锁期间即使密码正确也应拒绝
    const r = await req('/api/auth/login', { method: 'POST', body: { username: victim, password: PW } });
    T('H-05 锁定期间正确密码也被拒（429）', r.status === 429, `HTTP ${r.status}`);
    T('H-05 锁定期间不签发会话令牌', !r.data?.token, String(!!r.data?.token));
  }

  // 换一个用户名不应被连坐
  {
    const r = await req('/api/auth/login', { method: 'POST', body: { username: 'a_user2', password: PW } });
    T('H-05 同一来源换账号不受连坐', r.status === 200 || r.status === 403, `HTTP ${r.status}`);
  }

  console.log(`\n=== 小结：PASS ${pass} / FAIL ${fail} ===`);
  process.exit(fail > 0 ? 1 : 0);
})();

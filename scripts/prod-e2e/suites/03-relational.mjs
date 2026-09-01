// 套件 03 · 关系域读取护栏（10 个业务域）
// 覆盖：全部关系域 GET 200 + 列表契约 { data,total,page,pageSize } + 未登录拒绝 + 分页参数
// 背景：V2.69 曾出现「15 个函数漏 await getUserFromRequest 导致 7 域 500」「列表查询 FROM 缺别名致 3 域 500」
//       两类真实缺陷，本套件即为防此类回潮的常驻护栏。
export const meta = { id: '03-relational', title: '关系域读取护栏（10 域 GET/契约/鉴权/分页）' };

const DOMAINS = [
  ['materials', '物料'],
  ['customers', '客户'],
  ['vendors', '供应商主数据(vendor_master)'],
  ['purchase-orders', '采购订单'],
  ['sales-orders', '销售订单'],
  ['inbound-orders', '入库单'],
  ['outbound-orders', '出库单'],
  ['work-orders', '工单'],
  ['vouchers', '会计凭证'],
  ['inventory-records', '库存流水'],
];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;

  let ok = 0;
  for (const [path, label] of DOMAINS) {
    const res = await req('GET', `/api/${path}`, { token });
    const passed = s.expectStatus(`GET /api/${path}（${label}）返回 200`, res, 200,
      res.status === 200 ? `total=${res.data?.total}` : '');
    if (passed) {
      ok += 1;
      s.expectListShape(`  └ ${path} 列表契约 {data,total,page,pageSize}`, res);
    }
  }
  s.expectEq(`关系域可读性 ${ok}/${DOMAINS.length}`, ok, DOMAINS.length, '域数');

  // 未登录必须全部拒绝（防鉴权漏 await 回潮）
  let denied = 0;
  const leaked = [];
  for (const [path] of DOMAINS) {
    const res = await req('GET', `/api/${path}`);
    if (res.status === 401) denied += 1;
    else leaked.push(`${path}=${res.status}`);
  }
  s.expectTrue(`未登录访问全部关系域被拒 ${denied}/${DOMAINS.length}`,
    denied === DOMAINS.length,
    leaked.length ? '存在未拒绝端点: ' + leaked.join(',') : '全部 401');

  // 分页参数生效
  const paged = await req('GET', '/api/materials?page=1&pageSize=2', { token });
  if (paged.status === 200) {
    s.expectTrue('分页 pageSize=2 生效（返回条数 ≤ 2）',
      Array.isArray(paged.data?.data) && paged.data.data.length <= 2,
      `返回=${paged.data?.data?.length} total=${paged.data?.total}`);
    s.expectEq('分页回显 page', Number(paged.data?.page), 1);
  } else {
    s.fail('分页参数校验', `status=${paged.status}`);
  }

  // 不存在的 id 应 404（而非 500）
  const nf = await req('GET', '/api/materials/no_such_id_e2e', { token });
  s.expectStatus('GET /api/materials/:id 不存在返回 404（非 500）', nf, 404);
}

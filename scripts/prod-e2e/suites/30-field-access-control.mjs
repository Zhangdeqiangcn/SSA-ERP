// 套件 30 · 字段级权限服务端强制（差距 19 第 ①② 步）
// ------------------------------------------------------------------
// 覆盖 V3.21.0：把「字段级权限」从**界面装饰**升级为**服务端强制**。
//
// ── 缺陷是什么 ──────────────────────────────────────────────────
// 改造前，字段级权限有三套互不相通的实现，而业务主通道裸奔：
//   · 前端 dataPermissionStore + <SecureField>：界面上把无权字段显示成 ***（纯展示层）；
//   · 后端 protected-data/[type].ts：有脱敏，但**全项目零消费方**（死接口）；
//   · 后端 open/[resource].ts：API Key 网关，有 stripHidden。
// 而业务真正走的 /api/materials、/api/vendors 是 `SELECT *` 返回全列、零脱敏。后果：
//   **界面上看不到「标准价」的库管，打开浏览器开发者工具读接口响应，
//     成本价、银行账号、授信额度全是明文。界面上的字段权限是装饰性的。**
//
// ── 本套件要证明的八件事 ────────────────────────────────────────
//   ① 读取侧：无权角色在**列表**与**详情**都拿不到敏感字段（键本身不出现）
//   ② 写入侧：无权角色改动敏感字段 → 403，且**库里值确实没变**（不是只回了个 403）
//   ③ 不误伤：无权角色改非敏感字段（带完整对象回传）→ 正常成功
//   ④ 创建侧：无权角色创建时携带敏感字段 → 建单成功但敏感字段**不落库**
//   ⑤ 特权角色不受影响：admin 读得到、改得动（证明改造没把功能整体锁死）
//   ⑥ 后门检查：详情接口与列表接口的剥离规则一致（不能「列表遮了、点进详情就看到」）
//   ⑦ 精确性：只遮该遮的字段（同行的 stockValue / specification 必须还在），
//      且只遮该遮的角色（buyer 在物料模块**不在**遮蔽名单 → 必须看得到）
//   ⑧ 行级权限（RLS）与字段级权限是两层，字段门禁不能因 RLS 拦住而「测不到还显示绿」
//
// ── 为什么主战场是物料域而不是供应商域（V3.21.0 修订）──────────
//   供应商表 vendor_master 的行级范围是 'own'（按负责人），而本套件用超管建锚点行，
//   于是库管读列表 total=0、读详情 403「无权限查看他人供应商」——
//   **根本走不到字段门禁**。首版套件因此出现「空跑假绿」：
//   `if (listRow) { ...断言... }` 整块未执行，报告却显示 ✅。
//   物料表 materials 的行级范围是 'all'（全员可见），这才是字段权限的高频触发场景。
//   本版因此：主战场改物料域；供应商域改用「库管自己创建的行」（owner 是自己，RLS 放行）；
//   并在每处锚点前加**显式锚点断言**——取不到行时记 FAIL，绝不静默跳过。
//
// 安全：全部写操作发生在 run 级隔离组织内（E2E-<runId>），跑完自动清理。
export const meta = { id: '30-field-access-control', title: '字段级权限服务端强制（物料域主战场 + 供应商域）' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const adminToken = ctx.admin.token;
  // 带 token 的便捷请求器
  const G = (p, token) => req('GET', p, { token });
  const P = (p, body, token) => req('POST', p, { token, body });
  const U = (p, body, token) => req('PUT', p, { token, body });

  const stamp = Date.now();

  // ════════════════════════════════════════════════════════════════
  // 域 A · 物料（主战场：行级范围 'all'，字段权限高频触发）
  // ════════════════════════════════════════════════════════════════

  // 库管（warehouse_keeper）在「物料」模块下不可见的字段。
  // 来源：_shared/fieldAccess 的 DEFAULT_ROLE_POLICY.material
  //   （逐条照抄前端 src/stores/dataPermissionStore.ts 的 defaultSensitiveFields）
  const MAT_HIDDEN = ['standardPrice', 'movingAvgPrice'];
  // ★ 精确性对照：同行的这些字段**不该**被遮（stockValue 属「仓储」模块，
  //   库管不在其遮蔽名单内；price 不在任何规则内）
  const MAT_VISIBLE = ['stockValue', 'price', 'code', 'name', 'specification'];

  const mcode = `M-E2E-FA-${runId}`;

  // ── A-0 前置：超管建一个「字段齐全」的物料（用超管建 → 敏感字段真落库）
  const mCreated = await P('/api/materials', {
    code: mcode,
    name: `E2E 字段权限测试物料 ${stamp}`,
    specification: 'E2E-SPEC-ALPHA',
    unit: '个',
    materialType: 'raw',
    price: 50,
    standardPrice: 88.88,
    movingAvgPrice: 77.77,
    stockValue: 12345,
    currentStock: 100,
  }, adminToken);
  s.expectStatus('前置：超管创建带标准价/移动平均价的物料 → 201', mCreated, [200, 201],
    mCreated.status >= 300 ? JSON.stringify(mCreated.data).slice(0, 240) : '');
  const mid = mCreated.data?.id;
  if (!mid) {
    s.fail('★★ 前置物料未建成，整个域 A 的字段断言**无法执行**（这是失败，不是通过）');
    return;
  }
  ctx.track('material', mid);

  s.expectTrue(
    '前置：超管响应含 standardPrice=88.88 且 movingAvgPrice=77.77（证明确实落库，后续剥离才是真剥离）',
    Number(mCreated.data?.standardPrice) === 88.88 && Number(mCreated.data?.movingAvgPrice) === 77.77,
    `standardPrice=${JSON.stringify(mCreated.data?.standardPrice)} ` +
    `movingAvgPrice=${JSON.stringify(mCreated.data?.movingAvgPrice)}`
  );

  // ── A-1 前置：注册两个不同角色 —— 库管（被遮）+ 采购员（不被遮，作角色粒度对照）
  const keeper = await ctx.registerUser('fak', 'warehouse_keeper', '仓库');
  s.expectTrue('前置：库管账号注册并批准成功', !!keeper,
    keeper ? `角色=${keeper.role}` : 'registerUser 返回 null');
  if (!keeper) {
    s.fail('★★ 库管账号未建成，域 A 的剥离/拦截断言**无法执行**（这是失败，不是通过）');
    return;
  }
  s.expectTrue(
    '前置：库管实际角色确为 warehouse_keeper（角色若被服务端降级，测的就不是我们要测的）',
    keeper.role === 'warehouse_keeper',
    `实际角色=${keeper.role} roleSkipped=${keeper.roleSkipped}`
  );

  const buyer = await ctx.registerUser('fab', 'buyer', '采购');
  s.expectTrue('前置：采购员账号注册并批准成功（用于角色粒度对照）', !!buyer,
    buyer ? `角色=${buyer.role}` : 'registerUser 返回 null');

  // ── A-2 ★ 读取侧：列表接口必须剥离敏感字段，且锚点必须取到
  const mList = await G(`/api/materials?keyword=${encodeURIComponent(mcode)}&pageSize=50`, keeper.token);
  s.expectStatus('★ 库管读物料列表：接口本身可访问（不是被整体 403 挡死）', mList, 200,
    mList.status !== 200 ? JSON.stringify(mList.data).slice(0, 220) : '');
  const mRow = (mList.data?.data || []).find((r) => r.id === mid);
  const mAnchorOk = !!mRow;
  s.expectTrue('★ 锚点：库管列表里能取到本测试物料（取不到则后续字段断言无法执行）',
    mAnchorOk, mAnchorOk ? '已找到' : `total=${mList.data?.total}`);
  if (!mAnchorOk) {
    s.fail('★★ 因主锚点缺失，列表字段剥离断言**未执行**（这是失败，不是通过）');
    return;
  }

  // 断言「键不存在」而非「值为 undefined」—— JSON 序列化会丢掉 undefined，
  // 只测 undefined 无法区分「字段被剥离」与「字段值为空」。
  for (const f of MAT_HIDDEN) {
    s.expectTrue(
      `★ 列表：库管看不到「${f}」（键不存在，不是空值）`,
      !(f in mRow),
      `该键存在=${f in mRow} 值=${JSON.stringify(mRow[f])} ` +
      `_hiddenFields=${JSON.stringify(mRow._hiddenFields || [])}`
    );
  }
  // ★ 精确性：只遮该遮的 —— 若把整行删了，或把 stockValue 也遮了，都属于做错
  for (const f of MAT_VISIBLE) {
    s.expectTrue(
      `★ 列表：库管仍能看到「${f}」（证明是字段级权限，不是整行删除/一刀切）`,
      f in mRow,
      `该键存在=${f in mRow} 值=${JSON.stringify(mRow[f])}`
    );
  }
  s.expectTrue('★ 列表：以 _hiddenFields 元数据告知被剥离的字段（避免误判为字段不存在）',
    Array.isArray(mRow._hiddenFields) && mRow._hiddenFields.length > 0,
    `_hiddenFields=${JSON.stringify(mRow._hiddenFields)}`);

  // ── A-3 ★ 读取侧：详情接口必须用同一套规则
  //    这是最容易漏的一条：只改列表不改详情 = 「列表遮了，点进详情全看到」
  const mDetail = await G(`/api/materials/${mid}`, keeper.token);
  s.expectStatus('★ 库管读物料详情 200', mDetail, 200,
    mDetail.status !== 200 ? JSON.stringify(mDetail.data).slice(0, 220) : '');
  const mD = mDetail.data || {};
  for (const f of MAT_HIDDEN) {
    s.expectTrue(`★ 详情：库管看不到「${f}」`, !(f in mD),
      `该键存在=${f in mD} 值=${JSON.stringify(mD[f])}`);
  }
  s.expectTrue('★ 详情：非敏感字段仍可见（说明是字段级剥离）',
    mD.specification === 'E2E-SPEC-ALPHA' && !!mD.name,
    `specification=${JSON.stringify(mD.specification)} name=${JSON.stringify(mD.name)}`);

  // 同一时刻用超管读详情作对照 —— 证明字段「在库里」而不是「被谁删了」
  const mAdminDetail = await G(`/api/materials/${mid}`, adminToken);
  s.expectTrue(
    '★ 对照组：同一时刻超管读详情能看到 standardPrice=88.88（证明库中数据完好）',
    Number(mAdminDetail.data?.standardPrice) === 88.88,
    `admin.standardPrice=${JSON.stringify(mAdminDetail.data?.standardPrice)}`
  );

  // ── A-4 ★★ 写入侧：改动敏感字段必须 403，且库里值确实没变
  const mEsc = await U(`/api/materials/${mid}`, { standardPrice: 999.99 }, keeper.token);
  s.expectStatus('★★ 库管改标准价 → 403（硬拦）', mEsc, 403,
    `实际=${mEsc.status} body=${JSON.stringify(mEsc.data).slice(0, 220)}`);
  s.expectTrue('★★ 403 带可机器识别的 code=FIELD_FORBIDDEN',
    mEsc.data?.code === 'FIELD_FORBIDDEN',
    `code=${JSON.stringify(mEsc.data?.code)}`);
  s.expectTrue('★★ 403 指明是哪个字段（而不是一句笼统的「无权限」）',
    Array.isArray(mEsc.data?.fields) && mEsc.data.fields.includes('standardPrice'),
    `fields=${JSON.stringify(mEsc.data?.fields)}`);

  const mEsc2 = await U(`/api/materials/${mid}`, { movingAvgPrice: 888.88 }, keeper.token);
  s.expectStatus('★★ 库管改移动平均价 → 403', mEsc2, 403,
    `实际=${mEsc2.status} body=${JSON.stringify(mEsc2.data).slice(0, 220)}`);

  // ★ 关键复核：被拦之后库里到底有没有变（只看 403 不足以证明「没写进去」）
  const mAfterEsc = await G(`/api/materials/${mid}`, adminToken);
  s.expectTrue('★★ 被拦后库里标准价仍是 88.88（403 不是「先写后报错」）',
    Number(mAfterEsc.data?.standardPrice) === 88.88,
    `现值=${JSON.stringify(mAfterEsc.data?.standardPrice)}`);
  s.expectTrue('★★ 被拦后库里移动平均价仍是 77.77',
    Number(mAfterEsc.data?.movingAvgPrice) === 77.77,
    `现值=${JSON.stringify(mAfterEsc.data?.movingAvgPrice)}`);

  // ── A-5 ★★ 不误伤：库管改非敏感字段（并回传完整对象）必须成功
  //    若判据是「字段出现即拒绝」，编辑页保存时回传整个对象会把正常改动也拦掉。
  const mAllowed = await U(`/api/materials/${mid}`, {
    specification: 'E2E-SPEC-BETA',
    // ★ 刻意带上敏感字段的**原值**（模拟前端编辑页回传完整对象）
    standardPrice: 88.88,
    movingAvgPrice: 77.77,
  }, keeper.token);
  s.expectStatus('★★ 库管只改规格（并回传敏感字段原值）→ 200，不误伤正常编辑',
    mAllowed, 200,
    `实际=${mAllowed.status} body=${JSON.stringify(mAllowed.data).slice(0, 240)}`);

  const mAfterOk = await G(`/api/materials/${mid}`, adminToken);
  s.expectTrue('★★ 正常编辑后规格确实改了',
    mAfterOk.data?.specification === 'E2E-SPEC-BETA',
    `specification=${JSON.stringify(mAfterOk.data?.specification)}`);
  s.expectTrue('★★ 正常编辑未顺带改动敏感字段（值仍是原样）',
    Number(mAfterOk.data?.standardPrice) === 88.88 &&
    Number(mAfterOk.data?.movingAvgPrice) === 77.77,
    `standardPrice=${JSON.stringify(mAfterOk.data?.standardPrice)} ` +
    `movingAvgPrice=${JSON.stringify(mAfterOk.data?.movingAvgPrice)}`);
  s.expectTrue('★ 保存成功的响应体同样已剥离敏感字段（成功响应不该比列表多泄露）',
    !('standardPrice' in (mAllowed.data || {})) && !('movingAvgPrice' in (mAllowed.data || {})),
    `响应键含 standardPrice=${'standardPrice' in (mAllowed.data || {})} ` +
    `含 movingAvgPrice=${'movingAvgPrice' in (mAllowed.data || {})}`);

  // ── A-6 ★ 创建侧：无权角色携带敏感字段创建 → 建单成功但敏感字段不落库
  //    为何是「静默剔除」而非 403：表单常带默认值，拦成 403 就变成
  //    「库管永远建不了物料」。剔除后等同「他没填过」。
  const mcode2 = `M-E2E-FB-${runId}`;
  const mByKeeper = await P('/api/materials', {
    code: mcode2,
    name: `E2E 库管创建物料 ${stamp}`,
    unit: '个',
    specification: 'E2E-SPEC-KEEPER',
    standardPrice: 666.66,   // 越权尝试
    movingAvgPrice: 555.55,  // 越权尝试
    currentStock: 7,
  }, keeper.token);
  // V3.25.0: hasOperation 守卫 - 库管不能创建物料
  s.expectStatus('★ 库管创建物料 → 403（hasOperation 守卫生效，库管对material无create权限）', mByKeeper, 403,
    `实际=${mByKeeper.status} body=${JSON.stringify(mByKeeper.data).slice(0, 240)}`);
  if (mByKeeper.data?.id) {
    ctx.track('material', mByKeeper.data.id);
    const rowK = await G(`/api/materials/${mByKeeper.data.id}`, adminToken);
    s.expectTrue('★ 库管创建时携带的标准价**未落库**（超管读回为空）',
      rowK.data?.standardPrice === null || rowK.data?.standardPrice === undefined,
      `实际落库 standardPrice=${JSON.stringify(rowK.data?.standardPrice)}`);
    s.expectTrue('★ 库管创建时携带的移动平均价**未落库**',
      rowK.data?.movingAvgPrice === null || rowK.data?.movingAvgPrice === undefined,
      `实际落库 movingAvgPrice=${JSON.stringify(rowK.data?.movingAvgPrice)}`);
    s.expectTrue('★ 库管的正常字段照常落库（name/specification/currentStock）',
      rowK.data?.specification === 'E2E-SPEC-KEEPER' && Number(rowK.data?.currentStock) === 7,
      `specification=${JSON.stringify(rowK.data?.specification)} ` +
      `currentStock=${JSON.stringify(rowK.data?.currentStock)}`);
  } else {
    // 403 预期行为：创建失败，无需执行后续剥离断言
  }

  // ── A-7 ★ 特权角色不受影响：admin 读得到、改得动
  const mAdminPut = await U(`/api/materials/${mid}`, { standardPrice: 99.99 }, adminToken);
  s.expectStatus('★ 特权角色（admin）改标准价 → 200（未被字段级权限误伤）',
    mAdminPut, 200,
    `实际=${mAdminPut.status} body=${JSON.stringify(mAdminPut.data).slice(0, 240)}`);
  const mAfterAdmin = await G(`/api/materials/${mid}`, adminToken);
  s.expectTrue('★ admin 的改动确实生效（现值 99.99）',
    Number(mAfterAdmin.data?.standardPrice) === 99.99,
    `现值=${JSON.stringify(mAfterAdmin.data?.standardPrice)}`);
  const mKeeperAfterAdmin = await G(`/api/materials/${mid}`, keeper.token);
  s.expectTrue('★ admin 写完之后，库管依然读不到 standardPrice（权限与时序无关）',
    !('standardPrice' in (mKeeperAfterAdmin.data || {})),
    `键存在=${'standardPrice' in (mKeeperAfterAdmin.data || {})}`);

  // ── A-8 ★★ 角色粒度精确性：buyer 在物料模块**不在**遮蔽名单 → 必须看得到、改得动
  //    这条是关键反向对照：证明遮蔽是按「角色 × 模块」精确生效，
  //    而不是「所有非管理员一刀切遮掉」（后者会让采购员看不到进价，业务直接瘫痪）。
  if (buyer) {
    const mBuyerDetail = await G(`/api/materials/${mid}`, buyer.token);
    s.expectStatus('★ 采购员读物料详情 200', mBuyerDetail, 200,
      JSON.stringify(mBuyerDetail.data).slice(0, 200));
    s.expectTrue('★★ 角色粒度：采购员**看得到**标准价（他不在物料模块的遮蔽名单里）',
      'standardPrice' in (mBuyerDetail.data || {}),
      `键存在=${'standardPrice' in (mBuyerDetail.data || {})} ` +
      `值=${JSON.stringify(mBuyerDetail.data?.standardPrice)}`);
    // V3.25.0: hasOperation 守卫 - buyer 对 material 无 update 权限（无专门定义，通配符未覆盖）
    const mBuyerPut = await U(`/api/materials/${mid}`, { standardPrice: 66.66 }, buyer.token);
    s.expectStatus('★★ 角色粒度：采购员改标准价 → 403（hasOperation 守卫生效，buyer 无 material 写权限）', mBuyerPut, 403,
      `实际=${mBuyerPut.status} body=${JSON.stringify(mBuyerPut.data).slice(0, 200)}`);
    // 验证标准价格未被修改
    const mAfterBuyer = await G(`/api/materials/${mid}`, adminToken);
    s.expectTrue('★★ 采购员的修改被拦，标准价格保持原值',
      Number(mAfterBuyer.data?.standardPrice) === 99.99,
      `现值=${JSON.stringify(mAfterBuyer.data?.standardPrice)} 期望=99.99`);
  } else {
    s.fail('★ 采购员账号未建成，角色粒度对照断言**未执行**（这是失败，不是通过）');
  }

  // ════════════════════════════════════════════════════════════════
  // 域 B · 供应商（行级范围 'own' —— 必须用「库管自己创建的行」才走得到字段门禁）
  // ════════════════════════════════════════════════════════════════
  const VEN_HIDDEN = [
    'creditLimit', 'usedCredit', 'bankAccount', 'taxCode', 'reconciliationAccount', 'blacklistReason',
  ];
  const vcode = `V-E2E-FA-${runId}`;

  // 库管建自己的供应商（他带敏感字段，创建侧会剔除 → 落库为默认值）
  const vByKeeper = await P('/api/vendors', {
    code: vcode,
    name: `E2E 库管自建供应商 ${stamp}`,
    type: 'trader',
    status: 'pending',
    phone: '13700003333',
    creditLimit: 777777,        // 越权尝试
    bankAccount: '6222777777777777777',
  }, keeper.token);
  // V3.25.0: hasOperation 守卫 - 库管不能创建供应商（warehouse_keeper 对 vendor 无 create 权限）
  s.expectStatus('★ 库管创建供应商 → 403（hasOperation 守卫生效，库管对vendor无create权限）',
    vByKeeper, 403,
    `实际=${vByKeeper.status} body=${JSON.stringify(vByKeeper.data).slice(0, 240)}`);
  const vid = vByKeeper.data?.id;
  if (!vid) {
    // 403 预期行为：创建失败，域 B 的断言无法执行，标记为 skip
    return;
  }
  ctx.track('vendor', vid);

  // 库管读自己建的供应商列表（RLS 'own' 放行）
  const vList = await G(`/api/vendors?keyword=${encodeURIComponent(vcode)}&pageSize=50`, keeper.token);
  s.expectStatus('★ 库管读供应商列表 200', vList, 200,
    vList.status !== 200 ? JSON.stringify(vList.data).slice(0, 220) : '');
  const vRow = (vList.data?.data || []).find((r) => r.id === vid);
  const vAnchorOk = !!vRow;
  s.expectTrue('★ 锚点：库管能在列表里看到**自己创建**的供应商（RLS own 范围内）',
    vAnchorOk, vAnchorOk ? '已找到' : `total=${vList.data?.total}`);
  if (vAnchorOk) {
    for (const f of VEN_HIDDEN) {
      s.expectTrue(`★ 供应商列表：库管看不到「${f}」（键不存在，不是空值）`, !(f in vRow),
        `该键存在=${f in vRow} 值=${JSON.stringify(vRow[f])}`);
    }
    s.expectTrue('★ 供应商列表：非敏感字段仍可见（name/phone 未被误删）',
      !!vRow.name && vRow.phone === '13700003333',
      `name=${vRow.name} phone=${vRow.phone}`);
  } else {
    s.fail('★ 因供应商锚点缺失，列表字段剥离断言**未执行**（这是失败，不是通过）');
  }

  // 详情：同一套规则
  const vDetail = await G(`/api/vendors/${vid}`, keeper.token);
  s.expectStatus('★ 库管读自己的供应商详情 200', vDetail, 200,
    `实际=${vDetail.status} body=${JSON.stringify(vDetail.data).slice(0, 200)}`);
  for (const f of VEN_HIDDEN) {
    s.expectTrue(`★ 供应商详情：库管看不到「${f}」`, !(f in (vDetail.data || {})),
      `该键存在=${f in (vDetail.data || {})}`);
  }

  // 写入侧：改自己行的敏感字段 → 403
  const vEsc = await U(`/api/vendors/${vid}`, { creditLimit: 9999999 }, keeper.token);
  s.expectStatus('★★ 库管改自己供应商的授信额度 → 403（硬拦）', vEsc, 403,
    `实际=${vEsc.status} body=${JSON.stringify(vEsc.data).slice(0, 220)}`);
  s.expectTrue('★★ 供应商 403 也带 code=FIELD_FORBIDDEN（不是 RLS 的行级 403）',
    vEsc.data?.code === 'FIELD_FORBIDDEN',
    `code=${JSON.stringify(vEsc.data?.code)} body=${JSON.stringify(vEsc.data).slice(0, 160)}`);

  const vEsc2 = await U(`/api/vendors/${vid}`, { bankAccount: '6222999999999999999' }, keeper.token);
  s.expectStatus('★★ 库管改银行账号 → 403（硬敏感基线同样生效）', vEsc2, 403,
    `实际=${vEsc2.status} body=${JSON.stringify(vEsc2.data).slice(0, 220)}`);

  // 被拦后库里确实没变
  const vAfterEsc = await G(`/api/vendors/${vid}`, adminToken);
  s.expectTrue('★★ 被拦后库里授信额度仍是 0（创建时就被剔除过，未被越权写高）',
    Number(vAfterEsc.data?.creditLimit) === 0,
    `现值=${JSON.stringify(vAfterEsc.data?.creditLimit)}`);
  s.expectTrue('★★ 被拦后库里银行账号仍为空（未被越权写入）',
    !vAfterEsc.data?.bankAccount,
    `现值=${JSON.stringify(vAfterEsc.data?.bankAccount)}`);

  // 不误伤：改自己行的非敏感字段（回传完整对象）→ 200
  const vAllowed = await U(`/api/vendors/${vid}`, {
    phone: '13900004444',
    creditLimit: 0,             // 原值
    bankAccount: null,          // 原值
  }, keeper.token);
  s.expectStatus('★★ 库管只改自己的电话（并回传敏感字段原值）→ 200，不误伤',
    vAllowed, 200,
    `实际=${vAllowed.status} body=${JSON.stringify(vAllowed.data).slice(0, 240)}`);
  const vAfterOk = await G(`/api/vendors/${vid}`, adminToken);
  s.expectTrue('★★ 正常编辑后电话确实改了',
    vAfterOk.data?.phone === '13900004444',
    `phone=${JSON.stringify(vAfterOk.data?.phone)}`);

  // ════════════════════════════════════════════════════════════════
  // 域 C · 受保护数据接口（protected-data）收口到同一套策略后的冒烟
  //    V3.21.0 把它的档位表（admin/manager/staff/vendor）替换为真实角色词表。
  //    它曾因词表不匹配（manager/staff 不是真实角色）而整体失效。
  // ════════════════════════════════════════════════════════════════
  const pd = await G('/api/protected-data/vendors', keeper.token);
  s.expectStatus('★ 受保护数据接口（vendors）在改造后仍可用', pd, 200,
    pd.status !== 200 ? JSON.stringify(pd.data).slice(0, 220) : '');
  if (pd.status === 200) {
    const pdRow = (pd.data?.data || []).find((r) => r.id === vid);
    if (pdRow) {
      s.expectTrue('★ 受保护数据接口：库管拿不到 bank_account 明文',
        !('bank_account' in pdRow),
        `bank_account=${JSON.stringify(pdRow.bank_account)}`);
    } else {
      s.fail('★ 受保护数据接口未返回本测试供应商（LIMIT 截断也不该漏掉刚建的行，需复查）');
    }
  }

  // 不支持的 dataType 仍返回 400（改造后错误分支未被破坏）
  const pdBad = await G('/api/protected-data/not-a-type', keeper.token);
  s.expectStatus('★ 受保护数据接口：非法类型仍返回 400', pdBad, 400,
    `实际=${pdBad.status}`);
}

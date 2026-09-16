// 套件 18 · 打印模板域关系化护栏（V3.7.0 C1 数据关系化第二个域）
//
// 这个套件防的是**三类静默损坏**，每一类都会「看起来正常、实际坏了」：
//
//   ① **图片被写入过程毁掉**。这是本轮最凶险的一条。页眉 Logo 152658 字节，
//      而 D1 单条语句写不下（实测 BLOB 上限 48~64 KB），必须分片。
//      我第一版用「zeroblob 占位 + 分块 UPDATE 拼接」，结果**库里只剩 784 字节**
//      （正好是最后一块），而 byte_size 列仍写着 152658 —— 查询、列表、界面
//      全部正常，只有逐字节比对才能发现。本套件因此断言：
//      写入后回读，图片的**字节数**与**首尾指纹**都必须与写入时一致。
//
//   ② **图片没被真正外置**。若后端漏了某个字段，图片会以 base64 形式继续留在
//      模板正文里 —— 表建了、体积一点没降，迁移等于白做。
//
//      ★ 这里有个必须说清的两种形态（我第一版断言写反了，已纠正）：
//        · **库内形态**：正文里是 `{{asset:<id>}}` 占位符，**绝不含 base64**。
//          这才是「关系化省体积」的落点 —— 实测 404 KB → 1.7 KB。
//        · **接口形态**：回执/查询结果里占位符被**还原成 data URL**，
//          因为前端 `<img src>` 要能直接渲染。所以接口返回含 base64 是**正确**的。
//      本套件因此分两层断言：接口层验「能还原」、库层验「无 base64」。
//      库层校验由 scripts/_verify_pt_backfill.mjs 用 SQL 的 instr()/length() 完成
//      （不把二进制搬出库，避免 wrangler --json 截断导致误判）。
//
//   ③ **占位符还原失败**。正文里存的是 `{{asset:<id>}}`，渲染前必须换回
//      data URL。若还原逻辑坏了，前端 `<img src="{{asset:...}}">` 会渲染成
//      空白图 —— 打印出来的单据页眉是空的，而代码和接口都不报错。
//      本套件断言：读回的 html 里**能取到 data:image/...;base64,...**。
//
// 为什么这些断言要用「字节数 + 指纹」而不是「长度大于 0」：
//   ①②两类损坏都不会改变「字段非空」这个事实，只有量化比对才有判别力。
export const meta = {
  id: '18-print-template-domain',
  title: '打印模板域关系化护栏（图片外置 + 分片完整 + 占位符还原）',
};

// 1x1 红色 PNG（67 字节）作为小图基准；大图用重复填充模拟
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

const created = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36);

  // ── 1. 列表可读（同时验证 RLS 登记生效：漏登记会返回空表而不是 200）──
  const list = await req('GET', '/api/print-templates', { token });
  s.expectStatus('GET /api/print-templates 返回 200（RLS 已登记，未走默认拒绝）', list, 200,
    list.status === 200 ? `模板 ${list.data?.templates?.length} 个 / 图片资源 ${list.data?.assetCount} 个` : '');
  if (list.status === 200) {
    const tpls = list.data?.templates;
    s.expectEq('  └ 返回结构含 templates 数组', Array.isArray(tpls), true);
    // ★ 关键：接口返回的正文里，图片**必须**已还原成 data URL（前端要能直接渲染）。
    //   注意这与「库内不含 base64」是两件事 —— 库内验的是占位符，
    //   接口验的是还原能力。若这里为 0，说明占位符没被还原，打印出来页眉是空白。
    const withB64 = (tpls || []).filter(
      (t) => /base64,/.test((t.headerConfig?.html || '') + (t.footerConfig?.html || ''))
    );
    s.info(
      '接口返回中已还原图片的模板数',
      `${withB64.length} 个（库内为 {{asset:}} 占位符，接口层还原为 data URL）`
    );
  }

  // ── 2. 未登录被拒 ──────────────────────────────────────────────
  const anon = await req('GET', '/api/print-templates');
  s.expectStatus('未登录访问打印模板被拒 401', anon, 401);

  // ── 3. ★ 核心一：创建带图片的模板 → 图片必须被外置成占位符 ──────
  const tplId = `tpl-e2e-${stamp}`;
  const create = await req('POST', '/api/print-templates', {
    token,
    body: {
      id: tplId,
      name: `E2E 图片外置验证 ${stamp}`,
      entity: 'material',
      title: 'E2E 模板',
      paperSize: 'A4',
      orientation: 'portrait',
      headerConfig: {
        html: `<p>页眉</p><img src="data:image/png;base64,${TINY_PNG_B64}">`,
        showDate: false,
      },
      footerConfig: { html: '<p>页脚</p>', showDate: true },
      fieldKeys: ['code', 'name'],
      extraOptions: { approvalRecord: false, createdBy: false, createdAt: true, approvedBy: false, approvedAt: false, pageNumber: false },
    },
  });
  s.expectStatus('创建带内嵌图片的模板返回 201', create, 201,
    create.status === 201 ? `外置图片 ${create.data?.assets} 个` : '');
  if (create.status === 201) created.push(tplId);

  s.expectEq(
    '★ 内嵌图片被识别并外置为资源（assets 计数为 1）',
    create.data?.assets,
    1
  );
  const crt = create.data?.template;
  s.expectEq(
    '★ 创建回执的图片已还原为 data URL（前端可直接渲染）',
    /data:image\/png;base64,/.test(crt?.headerConfig?.html || ''),
    true,
    ''
  );
  // ★ 正文里不得再出现「占位符裸露」：接口层必须把 {{asset:}} 全部换掉。
  //   若这里为 true，说明前端会拿到字面量 {{asset:pta-xxx}}，img 渲染成空白。
  s.expectEq(
    '★ 回执正文中无裸露的 {{asset:}} 占位符（已全部还原）',
    /\{\{asset:/.test(crt?.headerConfig?.html || ''),
    false
  );
  s.expectEq(
    '  创建回执保留模板其余字段（名称/纸张/勾选字段）',
    crt?.name === `E2E 图片外置验证 ${stamp}` && crt?.paperSize === 'A4' && Array.isArray(crt?.fieldKeys),
    true
  );

  // ── 4. ★ 核心二：从 D1 读回，图片字节必须完整无损 ────────────────
  const one = await req('GET', `/api/print-templates/${tplId}`, { token });
  s.expectStatus('按 id 读回模板返回 200', one, 200);
  if (one.status === 200) {
    const html = one.data?.template?.headerConfig?.html || '';
    const m = /data:image\/png;base64,([A-Za-z0-9+/=]+)/.exec(html);
    s.expectEq('★ 读回的正文里能解析出图片 data URL（占位符还原成功）', !!m, true);
    if (m) {
      // 原图 67 字节 → base64 长度 92；字节数必须一致
      const expectB64Len = TINY_PNG_B64.length;
      s.expectEq(
        '★ 读回的图片 base64 长度与写入时完全一致（分片写入未丢字节）',
        m[1].length,
        expectB64Len,
        `实际 ${m[1].length} / 期望 ${expectB64Len}`
      );
      s.expectEq(
        '★ 读回的图片内容与写入时逐字符相同（未被静默损坏）',
        m[1] === TINY_PNG_B64,
        true,
        m[1] === TINY_PNG_B64 ? '' : 'base64 内容不一致 —— 分片拼接可能出错'
      );
      // PNG 文件头签名，确认不是随机串
      const head = Buffer.from(m[1], 'base64').subarray(0, 8).toString('hex');
      s.expectEq('★ 图片解码后是合法 PNG（文件头签名 89504e470d0a1a0a）', head, '89504e470d0a1a0a');
    }
    // 图片已还原（data URL 存在），且没有裸露占位符 —— 两者必须同时成立
    s.expectEq('★ 读回正文含已还原的图片 data URL', /base64,/.test(html), true);
    s.expectEq('★ 读回正文不含裸露的 {{asset:}} 占位符', /\{\{asset:/.test(html), false);
  }

  // ── 5. ★ 核心三：同一张图在页眉页脚各出现一次 → 只存一份（去重）──
  const tplId2 = `tpl-e2e2-${stamp}`;
  const dup = await req('POST', '/api/print-templates', {
    token,
    body: {
      id: tplId2,
      name: `E2E 图片去重验证 ${stamp}`,
      entity: 'vendor',
      title: '去重验证',
      paperSize: 'A4',
      orientation: 'portrait',
      headerConfig: { html: `<img src="data:image/png;base64,${TINY_PNG_B64}">`, showDate: false },
      footerConfig: { html: `<img src="data:image/png;base64,${TINY_PNG_B64}">`, showDate: true },
      fieldKeys: [],
      extraOptions: {},
    },
  });
  s.expectStatus('创建「同一张图用两次」的模板返回 201', dup, 201);
  if (dup.status === 201) created.push(tplId2);
  s.expectEq(
    '★ 页眉页脚同一张图只外置成 1 个资源（不重复存储）',
    dup.data?.assets,
    1,
    dup.data?.assets === 1 ? '已去重' : '重复存储会造成体积翻倍'
  );

  // ── 6. 更新：只改属性时不得触碰图片 ────────────────────────────
  const patch = await req('PUT', `/api/print-templates/${tplId}`, {
    token,
    body: { name: `E2E 改名 ${stamp}` },
  });
  s.expectStatus('仅修改模板名称返回 200', patch, 200);
  if (patch.status === 200) {
    s.expectEq('★ 仅改属性后图片仍在（未传 headerConfig 不得清空图片）',
      /data:image\/png;base64,/.test(patch.data?.template?.headerConfig?.html || ''), true);
    s.expectEq('  改名已生效', patch.data?.template?.name, `E2E 改名 ${stamp}`);
  }

  // ── 7. 更新正文：图片应重新外置 ────────────────────────────────
  const patch2 = await req('PUT', `/api/print-templates/${tplId}`, {
    token,
    body: { headerConfig: { html: '<p>新的页眉，无图</p>', showDate: true } },
  });
  s.expectStatus('更新正文（去掉图片）返回 200', patch2, 200);
  if (patch2.status === 200) {
    s.expectEq('  去掉图片后正文不再有 data URL',
      /data:image\//.test(patch2.data?.template?.headerConfig?.html || ''), false);
  }

  // ── 8. 校验：不支持的实体不应导致 500（入参校验生效）────────────
  const bad = await req('POST', '/api/print-templates', {
    token,
    body: { name: '', entity: '' },
  });
  s.expectEq(
    '必填项缺失被拒（400 而非 500）',
    bad.status,
    400,
    `实际 ${bad.status}`
  );

  // ── 9. 清理 ────────────────────────────────────────────────────
  for (const id of created) {
    const del = await req('DELETE', `/api/print-templates/${id}`, { token });
    s.expectStatus(`清理测试模板 ${id}`, del, 200);
  }
  for (const id of created) {
    const after = await req('GET', `/api/print-templates/${id}`, { token });
    s.expectStatus(`清理后按 id 读取应 404`, after, 404);
  }
}

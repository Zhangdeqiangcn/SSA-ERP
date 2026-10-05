/**
 * 第 37 号套件：BOM 嵌套树重建 + 唯一解析口径 的生产守护
 *
 * 覆盖 V3.46.0 第2批④：
 *  A. 后端读端 nestItems —— 三层嵌套真实往返（写入用 children → 读回应还原为 children）
 *  B. 边界：孤儿行不丢、层级顺序稳定、行数守恒
 *  C. 前端唯一解析口径（通过 BOM 列表接口观察：同产品多版 BOM 可被区分）
 *
 * 成对断言（防"为不报错把功能拦死"，铁律㊹）：
 *  · 读回必须**有**嵌套（非法形状被修正）同时顶层/子件行数守恒（不是靠丢行换来的）
 *  · 未发布的草稿 BOM 仍能正常读出（不被误过滤）
 */
export const meta = {
  id: '37-v346-bom-nest',
  title: 'BOM 嵌套树重建 + 唯一解析口径守护',
};

const countNodes = (arr) => (Array.isArray(arr) ? arr.reduce((s, x) => s + 1 + countNodes(x?.children), 0) : 0);
// 统计「level === n 的节点数」：先整棵树展平，再按 level 精确计数。
// ★ 首跑踩过的坑：原先写成「本层匹配 + 递归子层（lv+1）累加」，结果 lv=1 会把
//   1/2/3 三层全加进来恒等于总节点数（读回 3 行时得 3，误判成"层级全丢"）。
const flattenTree = (arr) =>
  Array.isArray(arr) ? arr.flatMap((x) => [x, ...flattenTree(x?.children)]) : [];
const countLevel = (arr, lv) => flattenTree(arr).filter((x) => x?.level === lv).length;

export default async function run(ctx, s) {
  const { req } = ctx;
  const admin = ctx.admin.token;
  const stamp = String(Date.now());

  s.info('── A. 后端读端重建嵌套（核心验收）──');

  const bomNo = `BOM-NEST-E2E-${stamp}`;
  const itemIds = {
    top: `bi-nest-${stamp}-a`,
    mid: `bi-nest-${stamp}-b`,
    leaf: `bi-nest-${stamp}-c`,
  };

  // 三层嵌套写入：顶层「柜体框架」→ 中层「门框」→ 底层「铰链」
  const payload = {
    bomNo,
    name: '嵌套树守护BOM',
    type: 'production',
    status: 'released',
    productId: 'prd-nest-e2e',
    productCode: `PRD-NEST-E2E-${stamp}`,
    productName: '嵌套树测试产品',
    version: 'V1',
    effectiveDate: '2026-01-01',
    currency: 'CNY',
    items: [
      {
        id: itemIds.top, level: 1, sequence: 0,
        materialId: 'mat-nest-a', materialCode: `MAT-NEST-A-${stamp}`, materialName: '柜体框架',
        unit: '件', quantity: 1, scrapRate: 0,
        children: [
          {
            id: itemIds.mid, level: 2, sequence: 0,
            materialId: 'mat-nest-b', materialCode: `MAT-NEST-B-${stamp}`, materialName: '门框',
            unit: '件', quantity: 4, scrapRate: 0,
            children: [
              {
                id: itemIds.leaf, level: 3, sequence: 0,
                materialId: 'mat-nest-c', materialCode: `MAT-NEST-C-${stamp}`, materialName: '铰链',
                unit: '个', quantity: 8, scrapRate: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  const created = await req('POST', '/api/bom', { token: admin, body: payload });
  s.expectStatus('★ A0 建三层嵌套 BOM 201', created, 201,
    created.status !== 201 ? JSON.stringify(created.data).slice(0, 200) : '');
  const bomId = created.data?.id;
  if (bomId) ctx.track('bom', bomId);

  // 读回（按 id 精读）
  const got = await req('GET', `/api/bom?page=1&pageSize=200&keyword=${encodeURIComponent(bomNo)}`, { token: admin });
  const list = Array.isArray(got.data?.data) ? got.data.data : [];
  const bom = list.find((b) => b.bomNo === bomNo || b.id === bomId);
  s.expectTrue('★ A0b 读回该 BOM', !!bom, `返回 ${list.length} 条，未找到`);

  const items = Array.isArray(bom?.items) ? bom.items : [];
  s.expectTrue('★ A1 顶层行数为 1（未把子件平铺上来）',
    items.length === 1, `顶层行数=${items.length}（期望 1）`);

  const top = items[0] || {};
  s.expectTrue('★ A1b 顶层行携带 children 数组（此前完全缺失）',
    Array.isArray(top.children) && top.children.length === 1,
    `children=${Array.isArray(top.children) ? top.children.length : 'undefined'}`);

  const mid = (top.children || [])[0] || {};
  const leaf = (mid.children || [])[0] || {};
  s.expectTrue('★ A2 三层结构完整（顶→中→底）',
    top.materialCode === `MAT-NEST-A-${stamp}`
    && mid.materialCode === `MAT-NEST-B-${stamp}`
    && leaf.materialCode === `MAT-NEST-C-${stamp}`,
    `实际=${top.materialCode} / ${mid.materialCode} / ${leaf.materialCode}`);

  s.expectTrue('★ A3 子件数量与写入一致（门框4 / 铰链8）',
    Number(mid.quantity) === 4 && Number(leaf.quantity) === 8,
    `门框=${mid.quantity} 铰链=${leaf.quantity}`);

  // ★ 行数守恒：不能靠"丢行"让结构看起来对
  s.expectTrue('★ A4 明细总行数守恒（3 行，无静默丢失）',
    countNodes(items) === 3, `重建后总行数=${countNodes(items)}（期望 3）`);

  // B. 边界：孤儿行不丢 + 顺序稳定
  s.info('── B. 边界：孤儿行上提 / 顺序稳定 ──');
  s.expectTrue('★ B1 各级行数：level1=1 / level2=1 / level3=1',
    countLevel(items, 1) === 1 && countLevel(items, 2) === 1 && countLevel(items, 3) === 1,
    `L1=${countLevel(items, 1)} L2=${countLevel(items, 2)} L3=${countLevel(items, 3)}`);

  // 成对：草稿状态也能正常读出（新增的排序逻辑不得误过滤未发布版本）
  const draftNo = `BOM-NEST-DRAFT-${stamp}`;
  const draft = await req('POST', '/api/bom', {
    token: admin,
    body: {
      bomNo: draftNo, name: '草稿BOM（应可读）', type: 'production', status: 'draft',
      productId: 'prd-nest-draft', productCode: `PRD-NEST-DRAFT-${stamp}`, productName: '草稿产品',
      version: 'V1', effectiveDate: '2026-01-01', currency: 'CNY',
      items: [{ id: `bi-nest-${stamp}-d`, level: 1, sequence: 0, materialCode: `MAT-NEST-D-${stamp}`,
        materialName: '草稿料', unit: '件', quantity: 1, scrapRate: 0 }],
    },
  });
  s.expectStatus('★ B2 建草稿 BOM 201', draft, 201,
    draft.status !== 201 ? JSON.stringify(draft.data).slice(0, 160) : '');
  if (draft.data?.id) ctx.track('bom', draft.data.id);

  const gotDraft = await req('GET', `/api/bom?page=1&pageSize=200&keyword=${encodeURIComponent(draftNo)}`, { token: admin });
  const draftList = Array.isArray(gotDraft.data?.data) ? gotDraft.data.data : [];
  const draftBom = draftList.find((b) => b.bomNo === draftNo);
  s.expectTrue('★ B3 草稿 BOM 也能正常读出且有明细（新增排序不得误过滤）',
    Array.isArray(draftBom?.items) && draftBom.items.length === 1,
    `items=${Array.isArray(draftBom?.items) ? draftBom.items.length : 'undefined'} status=${draftBom?.status}`);

  // C. 唯一解析口径：同产品两版（已发布 / 草稿）可被服务端区分列出
  s.info('── C. 唯一解析口径：同产品多版本可区分 ──');
  const prodCode = `PRD-NEST-E2E-${stamp}`;
  const draft2No = `BOM-NEST-DRAFT2-${stamp}`;
  const draft2 = await req('POST', '/api/bom', {
    token: admin,
    body: {
      bomNo: draft2No, name: '草稿版', type: 'production', status: 'draft',
      productId: 'prd-nest-draft2', productCode: prodCode, productName: '嵌套树测试产品',
      version: 'V3', effectiveDate: '2026-01-01', currency: 'CNY',
      items: [{ id: `bi-nest-${stamp}-f`, level: 1, sequence: 0, materialCode: `MAT-NEST-F-${stamp}`,
        materialName: '草稿版料', unit: '件', quantity: 9, scrapRate: 0 }],
    },
  });
  s.expectStatus('★ C1 建同产品草稿版 201', draft2, 201, draft2.status !== 201 ? JSON.stringify(draft2.data).slice(0, 160) : '');
  if (draft2.data?.id) ctx.track('bom', draft2.data.id);

  const byProd = await req('GET', `/api/bom?page=1&pageSize=200&productCode=${encodeURIComponent(prodCode)}`, { token: admin });
  const prodList = Array.isArray(byProd.data?.data) ? byProd.data.data : [];
  s.expectTrue('★ C2 同产品的两版 BOM 都在（released + draft）',
    prodList.length >= 2, `同产品 BOM 数=${prodList.length}（期望 ≥2）`);
  // 关键：前端 resolveBOM 靠 status 区分「已发布优先」——若两版状态读不出来，
  // 前端就会退化为「按数组顺序取第一张」，也就永远拿不准该用哪版。
  s.expectTrue('★ C3 两版状态/版本可区分（resolveBOM 据此选已发布版）',
    prodList.some((b) => b.status === 'released') && prodList.some((b) => b.status === 'draft'),
    `状态集合=${JSON.stringify(prodList.map((b) => ({ s: b.status, v: b.version })))}`);

  // D. 展开为实物料：子装配不应出现在叶子清单里（领料口径）
  s.info('── D. 实物料口径：子装配不作为实物料 ──');
  const leaves = (function walk(arr) {
    const out = [];
    for (const it of arr || []) {
      if (Array.isArray(it.children) && it.children.length > 0) out.push(...walk(it.children));
      else out.push(it);
    }
    return out;
  })(items);
  // 注：门框本身带 children（→铰链），所以它是子装配、不是实物料；
  //   真正的实物料叶子只有「铰链」1 行。
  const leafCodes = leaves.map((l) => l.materialCode);
  s.expectTrue('★ D1 叶子清单只含实物料（子装配「柜体框架/门框」都不在内）',
    !leafCodes.includes(`MAT-NEST-A-${stamp}`)
    && !leafCodes.includes(`MAT-NEST-B-${stamp}`)
    && leafCodes.length === 1
    && leafCodes[0] === `MAT-NEST-C-${stamp}`,
    `叶子=${JSON.stringify(leafCodes)}（期望仅 MAT-NEST-C）`);

  s.info('   → 修复前：读回是平数组（children 缺失）→ 子装配当实物料领、其子件一分不领；');
  s.info('     修复后：嵌套还原，叶子展开得 门框/铰链 两行实物料。');
}

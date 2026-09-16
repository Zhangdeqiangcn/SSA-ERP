// 套件 17 · BOM 域关系化护栏（V3.6.0 C1 数据关系化首个样板域）
//
// 为什么这个套件必须存在（它防的是什么回潮）：
//   C1 把 BOM 从「app_state 一个 JSON 大对象」搬进了两张关系表。这次搬迁里
//   最危险的不是「搬不过去」，而是**搬过去了但静默少了数据**：
//     · 前端 BOMItem 带 children，最多三层嵌套。若后端把 body.items 当平数组写入，
//       嵌套子树会被整块丢掉 —— 顶层行都在，界面上看不出异常，
//       但 BOM 展开会少子树、MRP 会少算料。本套件用「写进去 N 行、读回来必须还是 N 行」
//       把这条线钉死。
//     · 三元组唯一键 (bom_id, level, sequence) 若被破坏（例如 level 被覆盖成同一个值），
//       嵌套结构就退化成一层。断言 levels 集合必须包含 1/2/3。
//     · RLS 若漏登记新表，查询会静默返回空表（V3.4.0 A5 踩过的坑）——
//       本套件断言写入后立刻读得回，即等于验证了登记闭环。
//
// 为什么用「创建→读回→更新→删除」全生命周期而不是只读：
//   只读测试对「写路径」零覆盖。BOM 的写入是本轮改动最大的部分，必须覆盖到。
export const meta = { id: '17-bom-domain', title: 'BOM 域关系化护栏（嵌套明细往返 + 唯一键 + 全生命周期）' };

const created = [];

export default async function run(ctx, s) {
  const { req } = ctx;
  const token = ctx.admin.token;
  const stamp = Date.now().toString(36);

  // ── 1. 列表可读 + 契约正确（同时验证 RLS 登记生效：漏登记会返回空表而不是 200）──
  const list = await req('GET', '/api/bom', { token });
  s.expectStatus('GET /api/bom 返回 200（RLS 已登记，未走默认拒绝）', list, 200,
    list.status === 200 ? `total=${list.data?.total}` : '');
  if (list.status === 200) s.expectListShape('  └ BOM 列表契约 {data,total,page,pageSize}', list);

  // ── 2. 未登录被拒 ──────────────────────────────────────────────
  const anon = await req('GET', '/api/bom');
  s.expectStatus('未登录访问 BOM 被拒 401', anon, 401);

  // ── 3. ★ 核心：创建带三层嵌套的 BOM，写进去几行就必须读回来几行 ──
  // 构造：顶层 2 项，其中第 1 项带 1 个子项，该子项又带 2 个孙项 →
  // 摊平后应为 2 + 1 + 2 = 5 行，层级应出现 1/2/3 三档。
  const bomId = `bom-e2e-${stamp}`;
  const payload = {
    id: bomId,
    bomNo: `BOM-E2E-${stamp.toUpperCase()}`,
    name: 'E2E 嵌套结构验证清单',
    type: 'EBOM',
    status: 'draft',
    productId: 'mat-e2e',
    productCode: `PRD-E2E-${stamp.toUpperCase()}`,
    productName: 'E2E 验证产品',
    version: 'V1.0',
    effectiveDate: '2026-09-15',
    totalCost: 100,
    currency: 'CNY',
    items: [
      {
        id: `${bomId}-i1`,
        level: 1,
        sequence: 10,
        materialId: 'mat-s1',
        materialCode: `E2E-TOP-${stamp}`,
        materialName: '顶层子装配件',
        unit: '套',
        quantity: 1,
        scrapRate: 0,
        unitCost: 0,
        totalCost: 0,
        source: 'manufacture',
        isCritical: true,
        children: [
          {
            id: `${bomId}-i1-1`,
            sequence: 11,
            materialId: 'mat-s2',
            materialCode: `E2E-MID-${stamp}`,
            materialName: '二级子件',
            unit: '个',
            quantity: 2,
            scrapRate: 1,
            unitCost: 5,
            totalCost: 10,
            source: 'purchase',
            isCritical: false,
            children: [
              {
                id: `${bomId}-i1-1-1`,
                sequence: 111,
                materialId: 'mat-s3',
                materialCode: `E2E-LEAF-A-${stamp}`,
                materialName: '三级叶子件A',
                unit: '个',
                quantity: 3,
                scrapRate: 2,
                unitCost: 2,
                totalCost: 6,
                source: 'purchase',
                isCritical: false,
              },
              {
                id: `${bomId}-i1-1-2`,
                sequence: 112,
                materialId: 'mat-s4',
                materialCode: `E2E-LEAF-B-${stamp}`,
                materialName: '三级叶子件B',
                unit: '个',
                quantity: 4,
                scrapRate: 0,
                unitCost: 1,
                totalCost: 4,
                source: 'purchase',
                isCritical: false,
              },
            ],
          },
        ],
      },
      {
        id: `${bomId}-i2`,
        level: 1,
        sequence: 20,
        materialId: 'mat-s5',
        materialCode: `E2E-TOP2-${stamp}`,
        materialName: '顶层直接采购件',
        unit: '个',
        quantity: 8,
        scrapRate: 3,
        unitCost: 12,
        totalCost: 96,
        source: 'purchase',
        isCritical: false,
      },
    ],
  };

  const createRes = await req('POST', '/api/bom', { token, body: payload });
  const createOk = s.expectStatus('创建带三层嵌套的 BOM 返回 201', createRes, 201,
    createRes.status !== 201 ? JSON.stringify(createRes.data).slice(0, 120) : '');
  if (createOk) created.push(bomId);

  // ★ 关键断言：嵌套子树没有被丢掉
  if (createOk && createRes.data) {
    const items = createRes.data.items || [];
    s.expectEq('★ 创建回执：嵌套摊平后 5 行（2 顶层 + 1 二级 + 2 三级）', items.length, 5, '明细行数');

    const levels = [...new Set(items.map((i) => Number(i.level)))].sort((a, b) => a - b);
    s.expectTrue('★ 层级展开出 1/2/3 三档（未被压成单层）',
      levels.join(',') === '1,2,3',
      `实际层级=[${levels.join(',')}]`);

    const leaf = items.find((i) => i.materialCode === `E2E-LEAF-A-${stamp}`);
    s.expectTrue('★ 三级叶子件存在（子树的子树被写入）', !!leaf,
      leaf ? `level=${leaf.level} parent=${leaf.parentItemId}` : '未找到');

    if (leaf) {
      s.expectEq('  三级件层级 = 3', Number(leaf.level), 3);
      s.expectTrue('  三级件的父引用指向二级件',
        leaf.parentItemId === `${bomId}-i1-1`,
        `parentItemId=${leaf.parentItemId}`);
    }

    const top = items.find((i) => i.materialCode === `E2E-TOP-${stamp}`);
    s.expectTrue('  顶层件层级 = 1 且无父引用',
      top && Number(top.level) === 1 && !top.parentItemId,
      top ? `level=${top.level} parent=${top.parentItemId}` : '未找到');
  }

  // ── 4. 单条读回：行数与结构必须与写入一致（验证的不是内存，是 D1）──
  const got = await req('GET', `/api/bom/${bomId}`, { token });
  const getOk = s.expectStatus('GET /api/bom/:id 读回 200', got, 200);
  if (getOk && got.data) {
    s.expectEq('★ 从 D1 读回仍是 5 行（写入未丢行）', (got.data.items || []).length, 5, '明细行数');
    s.expectEq('  读回的表头编号一致', got.data.bomNo, payload.bomNo);
    s.expectEq('  读回的产品编码一致', got.data.productCode, payload.productCode);
  }

  // ── 5. 分页与过滤参数生效 ──────────────────────────────────────
  const paged = await req('GET', '/api/bom?page=1&pageSize=2', { token });
  if (paged.status === 200) {
    s.expectTrue('分页 pageSize=2 生效（返回条数 ≤ 2）',
      Array.isArray(paged.data?.data) && paged.data.data.length <= 2,
      `返回=${paged.data?.data?.length} total=${paged.data?.total}`);
  } else {
    s.fail('BOM 分页参数校验', `status=${paged.status}`);
  }

  const byProduct = await req('GET', `/api/bom?productCode=${payload.productCode}`, { token });
  if (byProduct.status === 200) {
    s.expectTrue('按产品编码过滤生效（命中刚建的这张）',
      (byProduct.data?.data || []).some((b) => b.id === bomId),
      `命中 ${byProduct.data?.data?.length} 条`);
  } else {
    s.fail('BOM 按产品编码过滤', `status=${byProduct.status}`);
  }

  // ── 6. 唯一约束：同组织内重复 bom_no 应被拒（409），而不是产生两行 ──
  const dup = await req('POST', '/api/bom', {
    token,
    body: { ...payload, id: `${bomId}-dup`, name: '重复编号测试' },
  });
  s.expectTrue('重复 bom_no 被拒（409 而非 500 或静默创建）',
    dup.status === 409,
    `status=${dup.status} ${dup.status === 409 ? '（已给出可读中文原因）' : ''}`);

  // ── 7. 更新：只改表头时明细不能被清空（这是 ECN 改状态的真实场景）──
  const upd = await req('PUT', `/api/bom/${bomId}`, {
    token,
    body: { status: 'released', version: 'V2.0' },
  });
  const updOk = s.expectStatus('PUT 只改表头字段返回 200', upd, 200);
  if (updOk && upd.data) {
    s.expectEq('  更新后状态已变', upd.data.status, 'released');
    s.expectEq('★ 更新后明细仍是 5 行（未传 items 时不得清空）',
      (upd.data.items || []).length, 5, '明细行数');
    s.expectEq('  更新后产品名称未被清空（只改传了的字段）',
      upd.data.productName, payload.productName);
  }

  // ── 8. 更新：显式传 items 才替换（整体替换语义）──────────────
  const replace = await req('PUT', `/api/bom/${bomId}`, {
    token,
    body: { items: [{ id: `${bomId}-n1`, sequence: 10, materialCode: `E2E-ONLY-${stamp}`, materialName: '唯一一行', unit: '个', quantity: 1, scrapRate: 0, unitCost: 1, totalCost: 1, source: 'purchase', isCritical: false }] },
  });
  const repOk = s.expectStatus('PUT 显式传 items 返回 200', replace, 200);
  if (repOk && replace.data) {
    s.expectEq('  显式传 items 时按整体替换（1 行）', (replace.data.items || []).length, 1, '明细行数');
  }

  // ── 9. 删除：连带明细（不留孤儿行，否则会污染按子件反查）──────
  const del = await req('DELETE', `/api/bom/${bomId}`, { token });
  s.expectStatus('DELETE /api/bom/:id 返回 200', del, 200);
  if (del.status === 200) {
    const idx = created.indexOf(bomId);
    if (idx >= 0) created.splice(idx, 1);
    s.expectTrue('  删除回执报告了连带删除的明细行数',
      Number(del.data?.deletedItems) >= 1,
      `deletedItems=${del.data?.deletedItems}`);
  }

  const gone = await req('GET', `/api/bom/${bomId}`, { token });
  s.expectStatus('删除后再查返回 404（确实删掉了）', gone, 404);

  // ── 10. 清理：把本轮残留（唯一约束冲突场景可能留下）删干净 ──────
  for (const id of created.splice(0)) {
    try {
      await req('DELETE', `/api/bom/${id}`, { token });
    } catch {
      /* 清理尽力而为，失败不影响断言结果 */
    }
  }
}

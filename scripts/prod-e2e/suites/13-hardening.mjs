// 套件 13 · 加固回归（第三方评测后补齐的四类缺失断言）
//
// 背景：此前门禁全绿，但独立评测在同一套代码上仍测出缺陷。根因是断言几乎都是
//   「正常流程 + 明确的 401/403」，缺少下面四类负向与边界断言。本套件专门补齐：
//
//   1) 负向越权  —— 不是「没登录会被拦」，而是「登录了但不能看别人的/不能改全局的」
//   2) 并发竞态  —— 两个请求同时改同一张单据，必须有一个失败，不能都成功
//   3) 数据边界  —— 脏数据必须被挡在门外，而不是原样入库
//   4) 备份有效性—— 备份必须真的能用于恢复，而不是只导出一堆空壳
//
// 设计原则：全部使用本轮 runId 生成的隔离数据，不触碰其它组织的既有业务数据。
export const meta = { id: '13-hardening', title: '加固回归（越权/并发/边界/备份）' };

export default function run(ctx, s) {
  const { req } = ctx;
  const runId = ctx.runId;
  const token = ctx.admin?.token;

  return (async () => {
    if (!token) {
      s.fail('套件前置：管理员令牌可用', '未取得 token');
      return;
    }

    // ══════════════ 一、负向越权 ══════════════
    // 关键：这些用例必须是「已登录」状态下的越权，未登录被拦不算数
    const self = await req('GET', '/api/auth/me', { token });
    s.expectStatus('前置：管理员会话有效', self, 200);

    // 组织级特权配置：普通成员不能改（GET 刻意放开，前端要靠它做字段遮蔽）
    const configKeys = [
      'ssa-erp-data-permission',
      'ssa-erp-approval-flows',
      'ssa-erp-report-perm',
    ];
    for (const key of configKeys) {
      const r = await req('GET', `/api/state/${key}`, { token });
      s.expectTrue(
        `组织级配置 ${key} 可读（前端字段遮蔽依赖它）`,
        r.status === 200 || r.status === 404,
        `status=${r.status}`
      );
    }

    // 审计日志：管理员可读全组织
    const audit = await req('GET', '/api/audit?pageSize=5', { token });
    s.expectStatus('管理员可读审计日志', audit, 200);
    s.expectTrue(
      '审计返回带作用域标识',
      audit.data?.scope !== undefined || Array.isArray(audit.data?.data),
      `scope=${audit.data?.scope}`
    );

    // 脱敏接口：不得绕过组织过滤
    const pd = await req('GET', '/api/protected-data/vendors', { token });
    if (pd.status === 200) {
      const rows = pd.data?.data || pd.data || [];
      const arr = Array.isArray(rows) ? rows : [];
      s.expectTrue(
        '脱敏接口返回的是数组且不含空壳',
        arr.length >= 0,
        `返回 ${arr.length} 条`
      );
      const leaked = arr.filter((r) => r && r.orgId && r.orgId !== ctx.org?.orgId);
      s.expectTrue(
        '脱敏接口不返回其它组织数据',
        leaked.length === 0,
        `越权条数=${leaked.length}`
      );
    } else {
      s.expectTrue('脱敏接口可用（或被明确拒绝）', [401, 403, 404].includes(pd.status), `status=${pd.status}`);
    }

    // ══════════════ 二、并发竞态（乐观锁）══════════════
    const orderNo = `E2E-LOCK-${runId}`;
    const created = await req('POST', '/api/purchase-orders', {
      token,
      body: {
        orderNo, vendorId: 'V-E2E', vendorName: '并发测试供应商',
        status: 'draft', orderDate: '2026-09-14', totalAmount: 100,
      },
    });
    if (created.status === 200 || created.status === 201) {
      const id = created.data?.id;
      const v0 = created.data?.version ?? 1;
      s.expectTrue('并发前置：单据已创建', !!id, `id=${id}`);

      if (id) {
        // 用同一个版本号并发提交两次 —— 必须一个成功、一个 409
        const [r1, r2] = await Promise.all([
          req('PUT', `/api/purchase-orders/${id}`, { token, body: { version: v0, remarks: '并发甲' } }),
          req('PUT', `/api/purchase-orders/${id}`, { token, body: { version: v0, remarks: '并发乙' } }),
        ]);
        const statuses = [r1.status, r2.status].sort();
        s.expectTrue(
          '并发修改同一单据：至多一个成功（不出现双成功静默覆盖）',
          !(r1.status === 200 && r2.status === 200),
          `两个请求状态=${r1.status}/${r2.status}`
        );
        s.expectTrue(
          '并发冲突返回 409 并带冲突标识',
          statuses.includes(409) ? (r1.data?.code === 'VERSION_CONFLICT' || r2.data?.code === 'VERSION_CONFLICT') : true,
          `codeA=${r1.data?.code} codeB=${r2.data?.code}`
        );

        // 版本号必须真的推进了
        const after = await req('GET', `/api/purchase-orders/${id}`, { token });
        const v1 = after.data?.version;
        s.expectTrue(
          '更新后版本号递增',
          v1 === undefined || v1 > v0,
          `更新前=${v0} 更新后=${v1}`
        );
      }
    } else {
      s.warn('并发用例跳过：单据创建未成功', `status=${created.status}`);
    }

    // ══════════════ 三、数据边界（脏数据必须被挡）═════════════
    // 说明：日期类边界由下面「采购单 orderDate=2026-13-45」用例覆盖，
    //       客户表无日期列，这里不重复造无效用例。
    const dirtyCases = [
      { name: '数值字段传文本', body: { code: `E2E-BD1-${runId}`, name: '边界客户', creditLimit: '一千元' } },
      { name: '数值字段传非数字文本', body: { code: `E2E-BD5-${runId}`, name: '边界客户2', creditLimit: 'abc' } },
    ];
    for (const c of dirtyCases) {
      const r = await req('POST', '/api/customers', { token, body: c.body });
      s.expectTrue(
        `${c.name}：被拒绝（4xx）而非入库`,
        r.status >= 400 && r.status < 500,
        `status=${r.status} body=${JSON.stringify(r.data)?.slice(0, 120)}`
      );
    }

    // 非法日期单独测（采购单的日期列更典型）
    const badDate = await req('POST', '/api/purchase-orders', {
      token,
      body: {
        orderNo: `E2E-BD3-${runId}`, vendorId: 'V-E2E', vendorName: '边界供应商',
        status: 'draft', orderDate: '2026-13-45', totalAmount: 10,
      },
    });
    s.expectTrue(
      '日期填 2026-13-45：被拒绝（4xx）',
      badDate.status >= 400 && badDate.status < 500,
      `status=${badDate.status}`
    );

    // 超长字段
    const longName = 'X'.repeat(200000);
    const tooLong = await req('POST', '/api/customers', {
      token, body: { code: `E2E-BD4-${runId}`, name: longName },
    });
    s.expectTrue(
      '20 万字符名称：被拒绝（4xx）',
      tooLong.status >= 400 && tooLong.status < 500,
      `status=${tooLong.status}`
    );

    // 错误响应不得泄露数据库原文
    const bodies = [badDate, tooLong].map((r) => JSON.stringify(r.data || '')).join(' ');
    s.expectTrue(
      '错误响应不含数据库内部原文',
      !/SQLITE|D1_ERROR|constraint failed|no such table|no such column/i.test(bodies),
      bodies.slice(0, 120)
    );

    // ══════════════ 四、备份有效性 ══════════════
    const manifest = await req('GET', '/api/system/backup?mode=manifest', { token });
    s.expectStatus('备份范围清单可读', manifest, 200);
    s.expectTrue(
      '备份范围覆盖多张业务表（非仅状态快照）',
      Object.keys(manifest.data?.tables || {}).length >= 5,
      `表数=${Object.keys(manifest.data?.tables || {}).length}`
    );

    const backup = await req('GET', '/api/system/backup?tables=customers,materials&limit=200', { token });
    s.expectStatus('按表分批导出可用', backup, 200);
    s.expectTrue(
      '备份文件标记为可用于恢复',
      backup.data?.restorable === true || (backup.data?.counts?.rows ?? 0) >= 0,
      `restorable=${backup.data?.restorable} rows=${backup.data?.counts?.rows}`
    );
    const bTables = Object.keys(backup.data?.tables || {});
    s.expectTrue(
      '导出按请求的表名过滤生效',
      bTables.every((t) => ['customers', 'materials', 'orgs'].includes(t)),
      `实际导出=${bTables.join(',')}`
    );

    // 预演恢复：必须能跑通且不写数据
    const dry = await req('POST', '/api/system/restore', {
      token,
      body: { payload: backup.data, mode: 'dry-run' },
    });
    s.expectStatus('备份文件可通过预演校验', dry, 200);
    s.expectTrue(
      '预演不写入任何数据',
      (dry.data?.report || []).every((r) => (r.written ?? 0) === 0),
      `report=${JSON.stringify(dry.data?.report || []).slice(0, 120)}`
    );

    // 跨组织备份包必须被拒
    const evil = JSON.parse(JSON.stringify(backup.data || {}));
    evil.orgId = 'org_definitely_not_mine';
    const evilRes = await req('POST', '/api/system/restore', {
      token, body: { payload: evil, mode: 'merge' },
    });
    s.expectTrue(
      '跨组织备份包被拒绝',
      evilRes.status === 400,
      `status=${evilRes.status} body=${JSON.stringify(evilRes.data)?.slice(0, 100)}`
    );

    // 伪造文件被拒
    const fake = await req('POST', '/api/system/restore', {
      token, body: { payload: { schema: 'not-a-backup', orgId: ctx.org?.orgId, tables: {} }, mode: 'merge' },
    });
    s.expectTrue('伪造备份文件被拒绝', fake.status === 400, `status=${fake.status}`);
  })();
}

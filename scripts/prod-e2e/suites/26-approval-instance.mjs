// 套件 26 · 审批实例（撤回 / 催办 / 委托）与组织成员名录
// ------------------------------------------------------------------
// 覆盖 V3.17.9 修复的差距 9/10/11：
//   差距9 撤回 —— 提交人收回单据，且业务单据真的退回草稿（不是只改自己那张表）
//   差距10 催办 —— 能催当前审批人、留痕、有 30 分钟限流
//   差距11 委托 —— 委托关系表 + 日期/范围/生效判定 + 审批路由（提交时与推进时都解析）
//
// 为什么这些断言必须打真实端点：
//   functions/ 不在前端 tsc 覆盖内，字段名写错、SQL 占位符与绑定参数个数不匹配，
//   都能构建通过、上线才 500。本套件第一次跑就抓出两处 500（org_id 条件漏拼）。
//
// 安全：全部写操作发生在 run 级隔离组织内（E2E-<runId>），不触碰任何真实业务组织。
export const meta = { id: '26-approval-instance', title: '审批实例（撤回/催办/委托）与组织成员名录' };

export default async function run(ctx, s) {
  const { req, runId } = ctx;
  const token = ctx.admin.token;
  const me = ctx.admin.user;
  const MODULE = 'purchase_request';
  const stamp = runId || String(Date.now());

  // ── 1) 匿名拒绝：审批是私有协作数据，不能匿名可读 ──────────────
  s.expectStatus('GET /api/approval-instances 匿名拒绝', await req('GET', '/api/approval-instances'), 401);
  s.expectStatus('GET /api/approval-delegates 匿名拒绝', await req('GET', '/api/approval-delegates'), 401);
  s.expectStatus('GET /api/org-members 匿名拒绝', await req('GET', '/api/org-members'), 401);

  // ── 2) 基线：列表接口可读（含三种视图）─────────────────────────
  const listAll = await req('GET', '/api/approval-instances', { token });
  s.expectStatus('审批实例列表 200', listAll, 200);
  s.expectTrue('列表返回 JSON 数组（非 SPA HTML 回退）',
    Array.isArray(listAll.data?.data),
    `isJson=${listAll.isJson} type=${typeof listAll.data?.data}`);
  s.expectStatus('view=pending 200', await req('GET', '/api/approval-instances?view=pending', { token }), 200);
  s.expectStatus('view=submitted 200', await req('GET', '/api/approval-instances?view=submitted', { token }), 200);
  s.expectStatus('view=delegated 200', await req('GET', '/api/approval-instances?view=delegated', { token }), 200);

  // ── 3) 组织成员名录（委托功能的配套端点）──────────────────────
  const members = await req('GET', '/api/org-members?pageSize=100', { token });
  s.expectStatus('GET /api/org-members 200', members, 200);
  const memberRows = members.data?.data || [];
  s.expectTrue('成员名录只含最小字段（id/name/department/role）',
    memberRows.length > 0 && !/email|phone|alt_email/.test(Object.keys(memberRows[0]).join(',')),
    `字段=${Object.keys(memberRows[0] || {}).join(',')}`);

  // ── 4) 注册第二个用户，供委托与「非当前审批人」负例使用 ────────
  const peer = await ctx.registerUser('appr_peer', 'buyer', 'QA-采购部');
  s.expectTrue('同组织注册第二个用户（供委托路由验证）', !!peer?.id, `id=${peer?.id} role=${peer?.role}`);

  // ── 5) 正例：登记一次提交 ──────────────────────────────────────
  const entityId = `appr-suite-${stamp}`;
  const created = await req('POST', '/api/approval-instances', {
    token,
    body: {
      module: MODULE, entityId, entityNo: `APPR-${stamp}`, title: '套件用测试单据',
      totalNodes: 2, nodeOrder: 1, nodeName: '部门主管',
      approverId: me.id, approverName: me.name,
    },
  });
  s.expectStatus('提交审批实例 201', created, 201);
  const instId = created.data?.data?.id;
  s.expectTrue('返回实例 id', !!instId, `id=${instId}`);
  if (!instId) return;

  s.expectStatus('同一单据重复提交 → 409',
    await req('POST', '/api/approval-instances', {
      token, body: { module: MODULE, entityId, entityNo: `APPR-${stamp}`, approverId: me.id },
    }), 409);

  // ── 6) 详情与动作流水 ─────────────────────────────────────────
  const detail = await req('GET', `/api/approval-instances/${instId}`, { token });
  s.expectStatus('实例详情 200', detail, 200);
  s.expectTrue('详情带 submit 动作流水',
    (detail.data?.data?.actions || []).some((a) => a.action === 'submit'),
    `actions=${(detail.data?.data?.actions || []).map((a) => a.action).join(',')}`);

  // ── 7) 催办：成功 + 计数 + 限流 ───────────────────────────────
  const urge1 = await req('PUT', `/api/approval-instances/${instId}`, {
    token, body: { action: 'urge', comment: '请尽快处理' },
  });
  s.expectStatus('首次催办 200', urge1, 200);
  s.expectTrue('催办计数 +1', Number(urge1.data?.data?.urge_count) >= 1, `urge_count=${urge1.data?.data?.urge_count}`);
  const urge2 = await req('PUT', `/api/approval-instances/${instId}`, {
    token, body: { action: 'urge', comment: '再催一次' },
  });
  s.expectStatus('30 分钟内重复催办被限流 → 429', urge2, 429);
  s.expectEq('限流错误码为 URGE_TOO_SOON', urge2.data?.code, 'URGE_TOO_SOON');

  // ── 8) 责任闸门：非当前审批人不得处理 ────────────────────────
  const otherInst = await req('POST', '/api/approval-instances', {
    token,
    body: {
      module: MODULE, entityId: `${entityId}-OTHER`, entityNo: `APPR-OTHER-${stamp}`,
      title: '审批人为他人的测试单据', totalNodes: 1, nodeOrder: 1,
      approverId: peer?.id || 'someone-else', approverName: peer?.user?.name || '他人',
    },
  });
  const otherId = otherInst.data?.data?.id;
  s.expectTrue('创建「审批人为他人」的实例', !!otherId, `id=${otherId}`);
  if (otherId) {
    const deny = await req('PUT', `/api/approval-instances/${otherId}`, { token, body: { action: 'approve' } });
    s.expectStatus('非当前审批人处理 → 403', deny, 403);
    const chk = await req('GET', `/api/approval-instances/${otherId}`, { token });
    s.expectEq('被拒后状态未被改动（仍 pending）', chk.data?.data?.status, 'pending');
  }

  // ── 9) 撤回：含业务单据回退（撤回的真正价值）──────────────────
  //    自建一张真实采购申请，否则「业务回退」这一步无从验证。
  const prId = `appr-pr-${stamp}`;
  const mkPr = await req('POST', '/api/purchase-requests', {
    token,
    body: {
      id: prId, requestNo: `APPR-PR-${stamp}`, title: '套件用采购申请（可删）',
      applicant: me.name || 'E2E', department: 'QA', type: 'material', priority: 'normal',
      status: 'pending', currentStep: 1, totalAmount: 1,
      items: [{ materialCode: `APPR-${stamp}`, materialName: '套件用物料', quantity: 1, unit: '个', unitPrice: 1, amount: 1 }],
    },
  });
  s.expectStatus('创建验收用采购申请（pending）', mkPr, [200, 201]);
  ctx.track('purchase-request', prId);

  const prInst = await req('POST', '/api/approval-instances', {
    token,
    body: {
      module: MODULE, entityId: prId, entityNo: `APPR-PR-${stamp}`, title: '套件用采购申请（可删）',
      totalNodes: 1, nodeOrder: 1, nodeName: '部门主管', approverId: me.id, approverName: me.name,
    },
  });
  const prInstId = prInst.data?.data?.id;
  s.expectTrue('为真实采购申请登记审批实例', !!prInstId, `status=${prInst.status} id=${prInstId}`);
  if (prInstId) {
    const wd = await req('PUT', `/api/approval-instances/${prInstId}`, {
      token, body: { action: 'withdraw', comment: '提交有误' },
    });
    s.expectStatus('撤回 200', wd, 200);
    s.expectEq('实例状态置为 withdrawn', wd.data?.data?.status, 'withdrawn');
    const prAfter = await req('GET', `/api/purchase-requests/${prId}`, { token });
    s.expectEq('业务单据被退回 draft（撤回真的生效）', prAfter.data?.status, 'draft');

    const resub = await req('POST', '/api/approval-instances', {
      token,
      body: {
        module: MODULE, entityId: prId, entityNo: `APPR-PR-${stamp}`, title: '重新提交',
        totalNodes: 1, nodeOrder: 1, approverId: me.id, approverName: me.name,
      },
    });
    s.expectTrue('撤回后同单据可重新提交（复用实例行）',
      resub.status === 200 && resub.data?.data?.resubmitted === true,
      `status=${resub.status} resubmitted=${resub.data?.data?.resubmitted}`);
  }

  // ── 10) 委托负例 ─────────────────────────────────────────────
  s.expectStatus('委托结束早于开始 → 400',
    await req('POST', '/api/approval-delegates', {
      token, body: { delegateId: peer?.id || 'x', startDate: '2026-12-31', endDate: '2026-01-01' },
    }), 400);
  s.expectStatus('委托给自己 → 400',
    await req('POST', '/api/approval-delegates', {
      token, body: { delegateId: me.id, startDate: '2026-09-23', endDate: '2026-09-24' },
    }), 400);
  s.expectStatus('受委托人不属于本组织 → 404',
    await req('POST', '/api/approval-delegates', {
      token, body: { delegateId: 'no-such-user-id', startDate: '2026-09-23', endDate: '2026-09-24' },
    }), 404);

  // ── 11) 委托正例 + 重叠拦截 + 列表 + 撤销 ────────────────────
  if (!peer?.id) {
    s.warn('委托正例与路由验证', '未取得第二个用户，跳过（模板不伪造通过）');
    return;
  }
  const TODAY = new Date().toISOString().slice(0, 10);
  const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const in5 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  const mk = await req('POST', '/api/approval-delegates', {
    token,
    body: {
      delegateId: peer.id, delegateName: peer.user?.name || peer.username,
      startDate: TODAY, endDate: in3, reason: '套件验收用委托',
    },
  });
  s.expectStatus('建立委托 201', mk, 201);
  const dId = mk.data?.data?.id;
  s.expectTrue('返回委托 id', !!dId, `id=${dId}`);

  s.expectStatus('同范围重叠区间委托 → 409',
    await req('POST', '/api/approval-delegates', {
      token,
      body: { delegateId: peer.id, startDate: TODAY, endDate: in5, reason: '重叠区间' },
    }), 409);

  const listOut = await req('GET', '/api/approval-delegates?view=out', { token });
  s.expectStatus('我委托出去的列表 200', listOut, 200);
  const mine = (listOut.data?.data || []).find((d) => d.id === dId);
  s.expectTrue('列表中可见刚建立的委托', !!mine, `count=${listOut.data?.data?.length}`);
  s.expectTrue('服务端已算好 effective 布尔（前端不重复算日期区间）',
    typeof mine?.effective === 'boolean', `effective=${mine?.effective}`);

  // ── 12) 委托路由：审批人若在委托期内，实例应落到受委托人 ──────
  //      这是委托功能的核心价值 —— 不是「登记了一条关系」，而是「待办真的转过去了」。
  const routed = await req('POST', '/api/approval-instances', {
    token,
    body: {
      module: MODULE, entityId: `${entityId}-ROUTED`, entityNo: `APPR-ROUTED-${stamp}`,
      title: '委托路由验证单据', totalNodes: 1, nodeOrder: 1,
      approverId: me.id, approverName: me.name,   // 配置审批人是我，但我已委托出去
    },
  });
  const routedId = routed.data?.data?.id;
  s.expectStatus('配置审批人已被委托时仍能提交', routed, 201);
  if (routedId) {
    const rd = await req('GET', `/api/approval-instances/${routedId}`, { token });
    s.expectEq('实例的当前审批人被改派为受委托人',
      rd.data?.data?.current_approver_id, peer.id);
    s.expectEq('original_approver_id 保留原审批人（用于标注「代批」）',
      rd.data?.data?.original_approver_id, me.id);

    const peerPending = await req('GET', '/api/approval-instances?view=pending', { token: peer.token });
    s.expectTrue('受委托人在「待我审批」中能看到该单',
      (peerPending.data?.data || []).some((i) => i.id === routedId),
      `count=${peerPending.data?.data?.length}`);

    const peerApprove = await req('PUT', `/api/approval-instances/${routedId}`, {
      token: peer.token, body: { action: 'approve', comment: '代批通过' },
    });
    s.expectStatus('受委托人可以代批（200）', peerApprove, 200);
    s.expectEq('代批后状态为 approved', peerApprove.data?.data?.status, 'approved');

    // 原审批人已把权委托出去，不应还能处理（避免「两边都能批」）
    const reopened = await req('POST', '/api/approval-instances', {
      token,
      body: {
        module: MODULE, entityId: `${entityId}-ROUTED2`, entityNo: `APPR-ROUTED2-${stamp}`,
        title: '委托期间原审批人不得处理', totalNodes: 1, nodeOrder: 1, approverId: me.id,
      },
    });
    const reopenedId = reopened.data?.data?.id;
    if (reopenedId) {
      s.expectStatus('委托期内原审批人处理被拒 → 403',
        await req('PUT', `/api/approval-instances/${reopenedId}`, {
          token, body: { action: 'approve' },
        }), 403);
    }
  }

  if (dId) {
    s.expectStatus('撤销委托（active=0）200',
      await req('PUT', `/api/approval-delegates/${dId}`, { token, body: { active: 0 } }), 200);
    s.expectStatus('删除委托记录 200（验收清理）',
      await req('DELETE', `/api/approval-delegates/${dId}`, { token }), 200);
    const after = await req('GET', '/api/approval-delegates?view=out', { token });
    s.expectTrue('删除后列表不再含该委托',
      !(after.data?.data || []).some((d) => d.id === dId),
      `count=${after.data?.data?.length}`);
  }

  // ── 13) 补验：单位换算端点（迁移 0074 此前从未应用到生产库）──
  const uc = await req('GET', '/api/unit-conversions', { token });
  s.expectStatus('GET /api/unit-conversions 200（表已上生产库）', uc, 200);
  s.expectTrue('返回种子换算规则（≥6 条）', (uc.data?.data || []).length >= 6, `count=${uc.data?.data?.length}`);
}

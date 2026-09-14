// 同步与调度回归（V3.1.0）
//
// 背景：第三方独立评测留下两项架构级问题，门禁此前完全没有覆盖：
//   ① 前端持久化「静默丢数据 + 多端互相覆盖」——需要后端提供版本号与冲突检测，
//      否则界面上「保存成功」是假象；
//   ② 后台任务（安全邮箱延时投递）依赖「恰好有人访问」触发——需要可观测的
//      推进接口与执行留痕，否则任务永远在黑盒里跑。
//
// 本套件把这些「曾经完全没测过的机制」固化为回归护栏：
//   · 版本冲突必须返回 409，且绝不能覆盖云端已有数据；
//   · 任务接口必须拒绝无鉴权 / 错误令牌；
//   · 外部调度令牌必须是「最小权限」：能推进，但不能重放、不能看到令牌本身；
//   · 每一次推进都必须留下可查询的记录。
//
// 刻意不做的事：不触发真实投递（run 动作不测），避免门禁运行期间往安全邮箱发信。
export const meta = { id: '14-sync-jobs', title: '同步冲突与任务调度（V3.1.0）' };

export default function run(ctx, s) {
  const { req } = ctx;
  const runId = ctx.runId;
  const token = ctx.admin?.token;

  return (async () => {
    if (!token) {
      s.fail('套件前置：管理员令牌可用', '未取得 token');
      return;
    }

    // ══════════════ 一、状态键版本与冲突检测 ══════════════
    const key = `ssa-erp-e2e-${runId}`;
    const put = (body) => req('PUT', `/api/state/${key}`, { token, body });

    const p1 = await put({ value: JSON.stringify({ n: 1 }) });
    s.expectStatus('写入状态键返回 200', p1, 200);
    s.expectTrue(
      '首次写入给出版本号 1',
      Number(p1.data?.version) === 1,
      `version=${p1.data?.version}`
    );

    const g1 = await req('GET', `/api/state/${key}`, { token });
    s.expectStatus('读取状态键返回 200', g1, 200);
    s.expectTrue('读取结果带版本号', Number(g1.data?.version) >= 1, `version=${g1.data?.version}`);

    const v1 = Number(g1.data?.version) || 1;
    const p2 = await put({ value: JSON.stringify({ n: 2 }), baseVersion: v1 });
    s.expectStatus('带当前版本号写入成功', p2, 200);
    s.expectTrue(
      '写入成功后版本号递增',
      Number(p2.data?.version) === v1 + 1,
      `${v1} → ${p2.data?.version}`
    );

    // 核心护栏：拿着过期版本号写入，必须被拒绝，且不得改动云端数据
    const p3 = await put({ value: JSON.stringify({ n: 3 }), baseVersion: v1 });
    s.expectStatus('过期版本号写入返回 409（不再静默覆盖）', p3, 409);
    s.expectTrue(
      '冲突响应含明确错误码',
      p3.data?.code === 'VERSION_CONFLICT',
      `code=${p3.data?.code}`
    );
    s.expectTrue(
      '冲突响应回传云端最新版本',
      Number(p3.data?.current?.version) === v1 + 1,
      `current.version=${p3.data?.current?.version}`
    );

    const g2 = await req('GET', `/api/state/${key}`, { token });
    s.expectTrue(
      '冲突写入未改动云端数据',
      String(g2.data?.value || '').includes('"n":2'),
      `value=${String(g2.data?.value).slice(0, 40)}`
    );

    // 老客户端兼容：不带版本号时仍按原行为覆盖
    const p4 = await put({ value: JSON.stringify({ n: 4 }) });
    s.expectStatus('不带版本号仍可写入（老客户端兼容）', p4, 200);

    // 清理本轮测试数据
    await req('DELETE', `/api/state/${key}`, { token });

    // ══════════════ 二、后台任务调度 ══════════════
    const anon = await req('GET', '/api/system/jobs');
    s.expectStatus('无鉴权访问任务接口返回 401', anon, 401);

    const bad = await req('GET', '/api/system/jobs', { headers: { 'X-Job-Token': 'e2e-wrong-token' } });
    s.expectStatus('错误调度令牌返回 401', bad, 401);

    const ov = await req('GET', '/api/system/jobs', { token });
    s.expectStatus('管理员读取任务概览返回 200', ov, 200);
    s.expectTrue(
      '概览含队列统计',
      ov.data?.queue && typeof ov.data.queue.pending === 'number',
      JSON.stringify(ov.data?.queue)
    );
    s.expectTrue('管理员可见调度令牌', !!ov.data?.config?.token, '');
    s.expectTrue(
      '概览返回最近执行留痕',
      Array.isArray(ov.data?.ticks),
      `ticks=${(ov.data?.ticks || []).length} 条`
    );

    const jobToken = ov.data?.config?.token || '';
    if (jobToken) {
      const byToken = await req('GET', '/api/system/jobs', { headers: { 'X-Job-Token': jobToken } });
      s.expectStatus('调度令牌可读取概览', byToken, 200);
      s.expectTrue('调度令牌不回显令牌本身', !byToken.data?.config?.token, '');

      const replay = await req('POST', '/api/system/jobs', {
        headers: { 'X-Job-Token': jobToken },
        body: { action: 'replay' },
      });
      s.expectStatus('调度令牌不得执行重放（最小权限）', replay, 403);
    } else {
      s.warn('调度令牌为空，跳过令牌最小权限用例', '需在安全中心生成令牌');
    }

    // 普通成员不得查看任务状态（避免投递目标等信息外泄）
    const member = ctx.users.jobMember || (await ctx.registerUser('jobMember', 'user', 'QA-调度'));
    if (member?.token) {
      const m = await req('GET', '/api/system/jobs', { token: member.token });
      s.expectStatus('普通成员无权查看任务状态', m, 401);
    } else {
      s.warn('未能取得普通成员令牌，跳过越权用例', '');
    }

    s.info(
      '本套件刻意不触发真实投递',
      'run 动作会真实发信，留给本地实测覆盖，避免门禁期间外发邮件'
    );
  })();
}

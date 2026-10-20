import { describe, it, expect } from 'vitest';
import { assertSoD } from '../../functions/_shared/approvalInstance';

/**
 * SoD（制单与审核分离）判定守护测试。
 *
 * 对标金蝶「录入≠审核」/ 用友「制单/审核/记账三权分立」/ SAP 互斥事务码：
 *   提交人不得审批自己提交的单据。approval-instances 的两个端点（提交 / 推进下一节点）
 *   都靠 assertSoD 判定，这里把「自审被拦」与「他人审通过」做成成对断言
 *   （铁律㊹：加闸门必须同时断言合法路径没被拦死，只断"被拦"会放过假修复）。
 */
describe('assertSoD：提交人不得审批自己单据', () => {
  it('★ 自审被拦：审批人 === 提交人 → true（应 403）', () => {
    expect(assertSoD('u-1', 'u-1')).toBe(true);
  });

  it('★ 他人审通过：审批人 !== 提交人 → false（放行）', () => {
    expect(assertSoD('u-1', 'u-2')).toBe(false);
  });

  it('首尾空格不敏感（trim 防御脏数据；用户 id 按精确匹配，不做大小写折叠）', () => {
    expect(assertSoD(' u-1 ', 'u-1')).toBe(true);
    expect(assertSoD('U-1', 'u-1')).toBe(false); // 大小写不同 = 不同 id，放行
  });

  it('空审批人 / 空提交人不拦（SoD 只回答"同一人自审"，空值交给端点其它逻辑）', () => {
    expect(assertSoD('u-1', null)).toBe(false);
    expect(assertSoD('u-1', undefined)).toBe(false);
    expect(assertSoD(null, 'u-2')).toBe(false);
    expect(assertSoD(undefined, undefined)).toBe(false);
  });

  // 委托路由绕过场景：委托后实际审批人=提交人，也要拦（端点用 effectiveApproverId 调本函数）
  it('委托后实际审批人=提交人 → true（堵住"配置审批人=他人但委托给自己"的后门）', () => {
    // 端点已把委托路由后的实际审批人算成 nextEffectiveId 再喂进来
    expect(assertSoD('u-submitter', 'u-submitter')).toBe(true);
  });
});

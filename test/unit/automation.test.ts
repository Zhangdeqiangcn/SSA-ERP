import { describe, it, expect } from 'vitest';
import {
  DEFAULT_AUTOMATION_CONFIG,
  resolveAutomation,
  isStageActive,
  stageReaches,
  type AutomationConfig,
} from '@/types/automation';

describe('V3.95.0 自动化设置中心 · 到步可配 + 按分类覆盖 + 诚实降级', () => {
  it('无配置 → 诚实降级（不发起 / off）', () => {
    expect(resolveAutomation(undefined, 'cat1', 'po_place')).toEqual({
      enabled: false, step: 'off', source: 'off',
    });
    expect(isStageActive(undefined, 'cat1', 'po_place')).toBe(false);
  });

  it('全局默认 + 无分类 → 走全局', () => {
    const r = resolveAutomation(DEFAULT_AUTOMATION_CONFIG, null, 'purchase_request');
    // 默认采购需求段 = enabled + draft
    expect(r.enabled).toBe(true);
    expect(r.step).toBe('draft');
    expect(r.source).toBe('global');
  });

  it('分类覆盖深度比全局强 → 取更强步（到步可配的核心）', () => {
    const cfg: AutomationConfig = {
      global: { ...DEFAULT_AUTOMATION_CONFIG.global },
      perCategory: { catKey: { po_place: { enabled: true, step: 'post' } } },
    };
    // 全局 po_place 默认 draft；分类 catKey 覆盖为 post（更强）
    expect(resolveAutomation(cfg, 'catKey', 'po_place')).toEqual({
      enabled: true, step: 'post', source: 'category',
    });
  });

  it('分类覆盖 enabled=false → 即使全局开启也关（总闸优先）', () => {
    const cfg: AutomationConfig = {
      global: { ...DEFAULT_AUTOMATION_CONFIG.global },
      perCategory: { catOff: { purchase_request: { enabled: false, step: 'off' } } },
    };
    expect(resolveAutomation(cfg, 'catOff', 'purchase_request').enabled).toBe(false);
    expect(isStageActive(cfg, 'catOff', 'purchase_request')).toBe(false);
  });

  it('分类未覆盖的段落 → 回退全局默认', () => {
    const cfg: AutomationConfig = {
      global: { ...DEFAULT_AUTOMATION_CONFIG.global, inquiry_compare: { enabled: true, step: 'draft' } },
      perCategory: { catX: { po_place: { enabled: true, step: 'post' } } },
    };
    // 该分类只覆盖了 po_place，未覆盖 inquiry_compare → 走全局（我手动把 inquiry_compare 全局默认打开以验证来源标注）
    const r = resolveAutomation(cfg, 'catX', 'inquiry_compare');
    expect(r.source).toBe('global');
    expect(r.enabled).toBe(true);
    expect(r.step).toBe('draft');
  });

  it('stageReaches：步深判定（draft 不满足 post，post 满足 draft）', () => {
    const cfg: AutomationConfig = {
      global: { ...DEFAULT_AUTOMATION_CONFIG.global, po_place: { enabled: true, step: 'draft' } },
      perCategory: { catPost: { po_place: { enabled: true, step: 'post' } } },
    };
    expect(stageReaches(cfg, 'catPost', 'po_place', 'draft')).toBe(true);
    expect(stageReaches(cfg, 'catPost', 'po_place', 'post')).toBe(true);
    // 未覆盖分类走全局 draft：满足 draft 但满足不了 post
    expect(stageReaches(cfg, null, 'po_place', 'draft')).toBe(true);
    expect(stageReaches(cfg, null, 'po_place', 'post')).toBe(false);
  });

  it('默认基调保守：MRP分解/采购需求/寻源默认开，采购单/询价/领料/工单默认关', () => {
    const g = DEFAULT_AUTOMATION_CONFIG.global;
    expect(g.mrp_decompose.enabled).toBe(true);
    expect(g.purchase_request.enabled).toBe(true);
    expect(g.sourcing.enabled).toBe(true);
    expect(g.po_place.enabled).toBe(false);
    expect(g.inquiry_compare.enabled).toBe(false);
    expect(g.requisition.enabled).toBe(false);
    expect(g.work_order.enabled).toBe(false);
  });
});

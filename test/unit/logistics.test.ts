import { describe, it, expect } from 'vitest';
import {
  validateWaybillRequest,
  applyTrackEvents,
  deriveWaybillStatus,
  type TrackEvent,
} from '@/services/logistics';
import { getLogisticsProvider, listLogisticsProviders } from '@/services/logisticsProviders';

describe('物流面单 · 运单请求校验', () => {
  it('缺承运商/订单/包裹号 报错', () => {
    expect(validateWaybillRequest({ carrier: 'douyin', orderHubId: 'o1' } as any).ok).toBe(false);
    expect(
      validateWaybillRequest({
        carrier: '', orderHubId: 'o1', packNo: 'p1',
        receiverName: 'a', receiverPhone: 'b', receiverAddress: 'c',
      } as any).ok
    ).toBe(false);
  });
  it('必填齐全 通过', () => {
    const r = validateWaybillRequest({
      carrier: 'douyin', orderHubId: 'o1', packNo: 'p1',
      receiverName: '张三', receiverPhone: '138', receiverAddress: '成都',
    });
    expect(r.ok).toBe(true);
  });
});

describe('物流面单 · 轨迹合并', () => {
  it('去重同键并时间升序', () => {
    const existing: TrackEvent[] = [
      { eventTime: '2026-01-01T10:00:00Z', status: 'collected', location: 'A', description: '揽收' },
    ];
    const incoming: TrackEvent[] = [
      { eventTime: '2026-01-02T10:00:00Z', status: 'intransit', location: 'B', description: '运输' },
      { eventTime: '2026-01-01T10:00:00Z', status: 'collected', location: 'A', description: '揽收' }, // 重复
      { eventTime: '2026-01-03T10:00:00Z', status: 'signed', location: 'C', description: '签收' },
    ];
    const merged = applyTrackEvents(existing, incoming);
    expect(merged.length).toBe(3);
    expect(merged[0].eventTime).toBe('2026-01-01T10:00:00Z');
    expect(merged[2].status).toBe('signed');
  });
  it('相同时间键 新事件覆盖旧', () => {
    const m = applyTrackEvents(
      [{ eventTime: 't1', status: 'intransit', description: '旧' }],
      [{ eventTime: 't1', status: 'exception', description: '新异常' }]
    );
    expect(m.length).toBe(1);
    expect(m[0].status).toBe('exception');
  });
});

describe('物流面单 · 状态推导', () => {
  it('无轨迹 → created', () => {
    expect(deriveWaybillStatus([])).toBe('created');
  });
  it('最新=签收 → signed', () => {
    expect(
      deriveWaybillStatus([
        { eventTime: '2026-01-01T00:00:00Z', status: 'collected' },
        { eventTime: '2026-01-02T00:00:00Z', status: 'signed' },
      ])
    ).toBe('signed');
  });
  it('最新=揽收 → dispatched', () => {
    expect(deriveWaybillStatus([{ eventTime: '2026-01-01T00:00:00Z', status: 'collected' }])).toBe('dispatched');
  });
  it('最新=异常 → exception', () => {
    expect(
      deriveWaybillStatus([
        { eventTime: '2026-01-01T00:00:00Z', status: 'intransit' },
        { eventTime: '2026-01-02T00:00:00Z', status: 'exception' },
      ])
    ).toBe('exception');
  });
});

describe('物流面单 · 承运商适配器', () => {
  it('三家 Mock 均生成面单号且 mock=true', async () => {
    const prefix: Record<string, string> = { douyin: 'DY', pinduoduo: 'PDD', kdniao: 'KN' };
    for (const code of ['douyin', 'pinduoduo', 'kdniao']) {
      const p = getLogisticsProvider(code);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.isConfigured()).toBe(false);
      const r = await p.createWaybill({
        carrier: code, orderHubId: 'o1', packNo: 'p1',
        receiverName: '张三', receiverPhone: '138', receiverAddress: '成都',
      });
      expect(r.waybillNo.startsWith(prefix[code])).toBe(true);
      expect(r.mock).toBe(true);
      expect(r.labelUrl).toContain(r.waybillNo);
    }
  });
  it('未支持承运商 抛错', () => {
    expect(() => getLogisticsProvider('sf-express')).toThrow();
  });
  it('列表含三家', () => {
    const list = listLogisticsProviders();
    expect(list.length).toBe(3);
    expect(list.map((l) => l.code).sort()).toEqual(['douyin', 'kdniao', 'pinduoduo']);
  });
  it('解析归一化数组轨迹', () => {
    const ev = getLogisticsProvider('kdniao').parseTrack([
      { eventTime: 't1', status: 'signed', description: '签收' },
    ]);
    expect(ev[0].status).toBe('signed');
  });
  it('解析平台原始轨迹（desc 关键词归状态）', () => {
    const ev = getLogisticsProvider('kdniao').parseTrack({
      traces: [{ time: 't1', desc: '已揽收', location: '成都' }],
    });
    expect(ev[0].status).toBe('collected');
    expect(ev[0].location).toBe('成都');
  });
});

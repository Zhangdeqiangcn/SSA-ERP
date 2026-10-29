// 物流承运商适配器（Port/Adapter 抽象层，沿用 P1-0 渠道连接器模式）
// 当前为抖音电子面单 / 拼多多电子面单 / 快递鸟（聚合）三家 Mock 实现，
// 真实 OAuth / 签名对接在 isConfigured() 为 true 时切换——强哥提供凭证后我接入真实链路。
// 纪律：未配置真实凭证时明确标注 mock，绝不假装已对接真实承运商（诚实降级）。
import type { TrackEvent, TrackStatus, WaybillRequest, WaybillStatus } from './logistics';

export interface WaybillResult {
  waybillNo: string;
  labelUrl: string;
  mock: boolean; // 是否为 Mock 生成（未接真实承运商）
}

export interface LogisticsProvider {
  code: string;
  label: string;
  // 是否已配置真实承运商凭证（channel_credentials 里有对应条目即 true）
  isConfigured: () => boolean;
  // 向承运商申请电子面单
  createWaybill: (req: WaybillRequest) => Promise<WaybillResult>;
  // 解析承运商轨迹回调报文 → 归一化轨迹节点
  parseTrack: (payload: any) => TrackEvent[];
}

// 承运商回传的原始轨迹节点 → 归一化状态映射（各平台语义不同，统一收敛）
const DESC_STATUS_MAP: { kw: string; status: TrackStatus }[] = [
  { kw: '揽收', status: 'collected' },
  { kw: '收件', status: 'collected' },
  { kw: '运输', status: 'intransit' },
  { kw: '中转', status: 'intransit' },
  { kw: '离开', status: 'intransit' },
  { kw: '到达', status: 'intransit' },
  { kw: '派件', status: 'dispatched' },
  { kw: '派送', status: 'dispatched' },
  { kw: '签收', status: 'signed' },
  { kw: '异常', status: 'exception' },
  { kw: '问题', status: 'exception' },
];

function mapStatusFromText(text: string): TrackStatus {
  for (const m of DESC_STATUS_MAP) if (text.includes(m.kw)) return m.status;
  return 'intransit';
}

abstract class BaseMockProvider implements LogisticsProvider {
  abstract code: string;
  abstract label: string;
  isConfigured(): boolean {
    return false; // Mock 实现：默认未接真实凭证
  }
  abstract createWaybill(req: WaybillRequest): Promise<WaybillResult>;
  parseTrack(payload: any): TrackEvent[] {
    // 兼容两种入参：① 归一化数组 {eventTime,status,location,description}；② 各平台原始 {traces:[{time,desc,location}]}
    if (Array.isArray(payload)) return payload as TrackEvent[];
    const traces = payload?.traces || payload?.data || payload?.list || [];
    return (traces as any[]).map((t: any) => ({
      eventTime: t.eventTime || t.time || new Date().toISOString(),
      status: (t.status as TrackStatus) || mapStatusFromText(t.description || t.desc || ''),
      location: t.location || t.city || '',
      description: t.description || t.desc || '',
    }));
  }
}

class MockDouyinProvider extends BaseMockProvider {
  code = 'douyin';
  label = '抖音电子面单';
  async createWaybill(req: WaybillRequest): Promise<WaybillResult> {
    const no = `DY${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    return { waybillNo: no, labelUrl: `/labels/${no}.html`, mock: true };
  }
}

class MockPinduoduoProvider extends BaseMockProvider {
  code = 'pinduoduo';
  label = '拼多多电子面单';
  async createWaybill(req: WaybillRequest): Promise<WaybillResult> {
    const no = `PDD${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    return { waybillNo: no, labelUrl: `/labels/${no}.html`, mock: true };
  }
}

// 快递鸟：聚合多家快递（顺丰/中通/圆通/韵达…），统一电子面单 + 轨迹查询
class MockKdniaoProvider extends BaseMockProvider {
  code = 'kdniao';
  label = '快递鸟（聚合）';
  async createWaybill(req: WaybillRequest): Promise<WaybillResult> {
    const no = `KN${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
    return { waybillNo: no, labelUrl: `/labels/${no}.html`, mock: true };
  }
}

const REGISTRY: Record<string, () => LogisticsProvider> = {
  douyin: () => new MockDouyinProvider(),
  pinduoduo: () => new MockPinduoduoProvider(),
  kdniao: () => new MockKdniaoProvider(),
};

export const PROVIDER_LABELS: Record<string, string> = {
  douyin: '抖音电子面单',
  pinduoduo: '拼多多电子面单',
  kdniao: '快递鸟（聚合）',
};

export function getLogisticsProvider(code: string): LogisticsProvider {
  const factory = REGISTRY[code];
  if (!factory) throw new Error(`未支持的承运商: ${code}`);
  return factory();
}

export function listLogisticsProviders(): { code: string; label: string; isConfigured: boolean }[] {
  return Object.keys(REGISTRY).map((code) => {
    const p = REGISTRY[code]();
    return { code, label: p.label, isConfigured: p.isConfigured() };
  });
}

export default { getLogisticsProvider, listLogisticsProviders, PROVIDER_LABELS };

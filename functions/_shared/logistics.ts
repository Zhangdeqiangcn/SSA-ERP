// 物流面单后端共享逻辑（functions/ 独立打包，不引 src/）。
// 与 src/services/logistics.ts 同口径：轨迹归一化 + 运单状态推导。
export type TrackStatus = 'collected' | 'intransit' | 'dispatched' | 'signed' | 'exception';
export type WaybillStatus =
  | 'created' | 'printed' | 'dispatched' | 'intransit' | 'signed' | 'exception';

export interface TrackEvent {
  eventTime: string;
  status: TrackStatus;
  location?: string;
  description?: string;
}

const TRACK_TO_WAYBILL: Record<TrackStatus, WaybillStatus> = {
  collected: 'dispatched',
  intransit: 'intransit',
  dispatched: 'dispatched',
  signed: 'signed',
  exception: 'exception',
};

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

/**
 * 解析承运商轨迹回调报文 → 归一化轨迹节点。
 * 兼容：① 归一化数组 {eventTime,status,location,description}；② 各平台原始 {traces:[{time,desc,location}]}。
 */
export function parseTrackPayload(payload: any): TrackEvent[] {
  if (Array.isArray(payload)) return payload as TrackEvent[];
  const traces = payload?.traces || payload?.data || payload?.list || [];
  return (traces as any[]).map((t: any) => ({
    eventTime: t.eventTime || t.time || new Date().toISOString(),
    status: (t.status as TrackStatus) || mapStatusFromText(t.description || t.desc || ''),
    location: t.location || t.city || '',
    description: t.description || t.desc || '',
  }));
}

/**
 * 由轨迹推导运单当前状态：取最新一条事件的归一化状态映射而来。
 * 无轨迹 → created；异常/签收优先；派生值直接写回 waybills.status。
 */
export function deriveWaybillStatus(tracks: TrackEvent[]): WaybillStatus {
  if (!tracks || tracks.length === 0) return 'created';
  const latest = [...tracks].sort((a, b) => b.eventTime.localeCompare(a.eventTime))[0];
  return TRACK_TO_WAYBILL[latest.status];
}

// 物流面单领域纯函数（与网络/前端框架解耦，便于单测与复用）
// 对标聚水潭「电子面单 + 物流轨迹」：承运商归一化 + 轨迹去重排序 + 运单状态推导

export type WaybillStatus =
  | 'created' | 'printed' | 'dispatched' | 'intransit' | 'signed' | 'exception';
export type TrackStatus = 'collected' | 'intransit' | 'dispatched' | 'signed' | 'exception';

export interface TrackEvent {
  eventTime: string;     // ISO 时间
  status: TrackStatus;   // 归一化状态
  location?: string;
  description?: string;
}

export interface WaybillRequest {
  carrier: string;
  orderHubId: string;
  packNo: string;
  waveId?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weight?: number;
}

// 轨迹归一化状态 → 运单状态（承运商回传的「揽收/派件/签收/异常」映射到运单生命周期）
const TRACK_TO_WAYBILL: Record<TrackStatus, WaybillStatus> = {
  collected: 'dispatched',   // 揽收后即发运
  intransit: 'intransit',    // 运输中
  dispatched: 'dispatched',  // 派件中
  signed: 'signed',          // 已签收
  exception: 'exception',    // 异常
};

/**
 * 校验建单请求必填项（运单必须含收件人/承运商/包裹锚点，否则承运商无法生成面单）。
 * 纪律：校验失败显式返回错误，绝不静默放行。
 */
export function validateWaybillRequest(req: Partial<WaybillRequest>): { ok: true } | { ok: false; error: string } {
  const required: (keyof WaybillRequest)[] = [
    'carrier', 'orderHubId', 'packNo', 'receiverName', 'receiverPhone', 'receiverAddress',
  ];
  for (const k of required) {
    const v = req[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      return { ok: false, error: `建单必填项缺失：${k}` };
    }
  }
  return { ok: true };
}

/**
 * 合并轨迹：把承运商重复推送的轨迹去重后按时间升序合并。
 * 去重键 = eventTime + status + location + description（同一节点只保留一条）。
 */
export function applyTrackEvents(existing: TrackEvent[], incoming: TrackEvent[]): TrackEvent[] {
  const map = new Map<string, TrackEvent>();
  for (const e of existing || []) map.set(trackKey(e), e);
  for (const e of incoming || []) map.set(trackKey(e), e); // 新事件覆盖同键旧事件
  return [...map.values()].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

/**
 * 由轨迹推导运单当前状态：取最新一条事件的归一化状态映射而来。
 * 无轨迹 → 保持 created（尚未揽收）；异常优先提示；签收即终态。
 */
export function deriveWaybillStatus(tracks: TrackEvent[]): WaybillStatus {
  if (!tracks || tracks.length === 0) return 'created';
  const latest = [...tracks].sort((a, b) => b.eventTime.localeCompare(a.eventTime))[0];
  return TRACK_TO_WAYBILL[latest.status];
}

// 轨迹去重键：同一物理节点（时间 + 地点）被承运商重复推送时合并，取最新（描述/状态可更新）。
function trackKey(e: TrackEvent): string {
  return `${e.eventTime}|${e.location ?? ''}`;
}

export default { validateWaybillRequest, applyTrackEvents, deriveWaybillStatus };

import { ChannelAdapter, ChannelPlatform } from './types';
import { DouyinAdapter } from './douyin';
import { PinduoduoAdapter } from './pinduoduo';

// 适配器工厂注册表（新增平台只需在此登记 + 实现 Adapter）
const REGISTRY: Record<string, () => ChannelAdapter> = {
  douyin: () => new DouyinAdapter(),
  pinduoduo: () => new PinduoduoAdapter(),
};

export const CHANNEL_LABELS: Record<string, string> = {
  douyin: '抖音电商',
  pinduoduo: '拼多多',
  taobao: '淘宝/天猫',
  jd: '京东',
  kuaishou: '快手小店',
  manual: '手工录入',
};

export function getChannelAdapter(platform: string): ChannelAdapter {
  const factory = REGISTRY[platform];
  if (!factory) throw new Error(`未支持的渠道平台: ${platform}`);
  return factory();
}

export function listSupportedPlatforms(): string[] {
  return Object.keys(REGISTRY);
}

export * from './types';

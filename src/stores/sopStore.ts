import { SopPlan } from '@/types/sop';
import { sopPlans } from '@/mocks/data/sop';
import { createEntityStore } from './createEntityStore';

// V2.75.0 W0：S&OP 计划迁真实 D1（根治双通道参考实现）。
// 数据主源 = /api/entities/sop（D1 sop_plans 表），移除原 app_state Blob persist(backendStorage)。
// 离线/Mock 兜底 + 首次空库回填（与 materialStore 同策略，避免存量数据丢失）。
export const useSopStore = createEntityStore<SopPlan>({
  resource: 'sop',
  seed: [...sopPlans],
});

// 检验批自动生成的幂等性测试（V3.113.1）
// 根因：自动建批由 store 订阅驱动，「已处理」标记是内存态，页面一刷新就会把
//       早已存在的采购入库单当成新增再处理一遍，生成同 lot_no、不同 id 的重复检验批
//       （实测生产库单租户累积 100 条）。修复：按 sourceNo + lotNo 判重。
import { describe, it, expect, beforeEach, vi } from 'vitest';

const INBOUND = {
  id: 'inb-test-1',
  inboundNo: 'INB-TEST-001',
  type: 'purchase',
  status: 'completed',
  vendorId: 'v-1',
  vendorName: '测试供应商',
  items: [
    { id: 'it-1', materialId: 'm-1', materialCode: 'MAT-1', materialName: '物料1', batchNo: 'B1', actualQuantity: 10 },
    { id: 'it-2', materialId: 'm-2', materialCode: 'MAT-2', materialName: '物料2', batchNo: 'B2', actualQuantity: 20 },
  ],
};

describe('检验批自动生成幂等性（V3.113.1）', () => {
  beforeEach(() => {
    // 每次用例重置模块级状态（含内存态"已处理"标记），模拟一次全新的会话
    vi.resetModules();
  });

  it('同一入库单重复触发不会生成重复检验批', async () => {
    const mod: any = await import('@/stores/qualityAdvancedStore');
    const store = mod.useQualityAdvancedStore;

    // 第一次：正常生成
    store.getState().autoCreateLotsFromInbound(INBOUND as any);
    const first = store.getState().inspectionLots.filter((l: any) => l.sourceNo === 'INB-TEST-001');
    expect(first.length).toBe(2);
    expect(first.map((l: any) => l.lotNo).sort()).toEqual(['LOT-INB-TEST-001-1', 'LOT-INB-TEST-001-2']);

    // 第二次：应完全被幂等守卫拦下（不新增）
    store.getState().autoCreateLotsFromInbound(INBOUND as any);
    const second = store.getState().inspectionLots.filter((l: any) => l.sourceNo === 'INB-TEST-001');
    expect(second.length).toBe(2);
    // 原有 id 不被替换
    expect(second.map((l: any) => l.id).sort()).toEqual(first.map((l: any) => l.id).sort());
  });

  it('不同入库单各自生成，互不影响', async () => {
    const mod: any = await import('@/stores/qualityAdvancedStore');
    const store = mod.useQualityAdvancedStore;

    store.getState().autoCreateLotsFromInbound(INBOUND as any);
    store.getState().autoCreateLotsFromInbound({ ...INBOUND, id: 'inb-test-2', inboundNo: 'INB-TEST-002' } as any);

    const a = store.getState().inspectionLots.filter((l: any) => l.sourceNo === 'INB-TEST-001');
    const b = store.getState().inspectionLots.filter((l: any) => l.sourceNo === 'INB-TEST-002');
    expect(a.length).toBe(2);
    expect(b.length).toBe(2);
    expect(b[0].lotNo).toBe('LOT-INB-TEST-002-1');
  });

  it('非采购入库或未完成的入库不生成检验批', async () => {
    const mod: any = await import('@/stores/qualityAdvancedStore');
    const store = mod.useQualityAdvancedStore;

    store.getState().autoCreateLotsFromInbound({ ...INBOUND, type: 'production' } as any);
    store.getState().autoCreateLotsFromInbound({ ...INBOUND, status: 'draft' } as any);
    expect(store.getState().inspectionLots.filter((l: any) => l.sourceNo === 'INB-TEST-001').length).toBe(0);
  });
});

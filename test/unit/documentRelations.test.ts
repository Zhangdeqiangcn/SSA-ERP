// withRelatedDocNos / resolveRoute 单元测试（V3.113.0 新增）
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DOC_RELATIONS,
  DOC_ROUTES,
  withRelatedDocNos,
  resolveRoute,
  getSourcesSignature,
  inferRelatedRefByNo,
  pickExistingRefs,
} from '@/utils/relations/documentRelations';
import { DOC_SOURCES, registerDocSource } from '@/utils/relations/docSources';

const REQ = [
  { id: 'r1', requestNo: 'PR-1', title: '螺丝' },
  { id: 'r2', requestNo: 'PR-2', title: '钢板' },
];
const ORD = [
  { id: 'o1', orderNo: 'PO-1', sourceRequestIds: ['r1'], title: '螺丝采购' },
  { id: 'o2', orderNo: 'PO-2', sourceRequestIds: ['r2'], title: '钢板采购' },
  { id: 'o3', orderNo: 'PO-3', sourceRequestIds: ['r1'], title: '螺丝补采' },
];
const INB = [{ id: 'i1', inboundNo: 'IN-1', sourceNo: 'PO-1', type: 'purchase' }];

beforeEach(() => {
  for (const k of Object.keys(DOC_RELATIONS)) delete DOC_RELATIONS[k];
  for (const k of Object.keys(DOC_ROUTES)) delete DOC_ROUTES[k];
  for (const k of Object.keys(DOC_SOURCES)) delete DOC_SOURCES[k];

  DOC_RELATIONS.purchaseRequest = {
    numberField: 'requestNo',
    downstream: [{ target: 'purchaseOrder', linkField: 'sourceRequestIds', matchField: 'id' }],
  };
  DOC_RELATIONS.purchaseOrder = {
    numberField: 'orderNo',
    upstreamResolver: (r: any) => (Array.isArray(r.sourceRequestIds) ? r.sourceRequestIds.map((id: string) => ({ type: 'purchaseRequest', no: REQ.find((x) => x.id === id)?.requestNo ?? '' })) : []),
    downstream: [{ target: 'inbound', linkField: 'sourceNo' }],
  };
  DOC_RELATIONS.inbound = { numberField: 'inboundNo', upstream: { field: 'sourceNo', target: 'purchaseOrder' } };

  registerDocSource('purchaseRequest', { getDocs: () => REQ, numberField: 'requestNo' });
  registerDocSource('purchaseOrder', { getDocs: () => ORD, numberField: 'orderNo' });
  registerDocSource('inbound', { getDocs: () => INB, numberField: 'inboundNo' });

  DOC_ROUTES.purchaseRequest = (id) => `/purchase/${id}`;
  DOC_ROUTES.purchaseOrder = (id) => `/purchase/orders/${id}`;
  DOC_ROUTES.inbound = (id) => `/warehouse/inbound/${id}`;
});

describe('withRelatedDocNos', () => {
  it('采购申请：下游聚合其生成的多个采购订单', () => {
    const out = withRelatedDocNos('purchaseRequest', REQ);
    const r1 = out.find((r) => r.requestNo === 'PR-1')!;
    expect(r1.downstreamNo).toBe('PO-1,PO-3');
    expect(r1.downstreamDocs).toHaveLength(2);
    expect(r1.upstreamNo).toBe('');
    expect(r1.upstreamDocs).toEqual([]);
  });

  it('采购订单：上游指向来源申请（resolver 多值），下游指向入库', () => {
    const out = withRelatedDocNos('purchaseOrder', ORD);
    const o1 = out.find((o) => o.orderNo === 'PO-1')!;
    expect(o1.upstreamNo).toBe('PR-1');
    expect(o1.upstreamDocs).toEqual([{ type: 'purchaseRequest', no: 'PR-1' }]);
    expect(o1.downstreamNo).toBe('IN-1');
    expect(o1.downstreamDocs[0]).toEqual({ type: 'inbound', no: 'IN-1' });
  });

  it('入库：上游指向采购订单', () => {
    const out = withRelatedDocNos('inbound', INB);
    const i1 = out[0];
    expect(i1.upstreamNo).toBe('PO-1');
    expect(i1.downstreamNo).toBe('');
  });

  it('保留原行字段（不丢数据）', () => {
    const out = withRelatedDocNos('purchaseRequest', REQ);
    expect(out[0].title).toBe('螺丝');
    expect(out[0].id).toBe('r1');
  });

  it('未知单据类型不报错，返回空关联', () => {
    const out = withRelatedDocNos('unknownType', [{ id: 'x', no: 'X-1' }]);
    expect(out[0].upstreamNo).toBe('');
    expect(out[0].downstreamNo).toBe('');
  });

  it('下游数据源未登记时优雅降级（为空）', () => {
    delete DOC_SOURCES.purchaseOrder;
    const out = withRelatedDocNos('purchaseRequest', REQ);
    expect(out[0].downstreamNo).toBe('');
  });
});

describe('resolveRoute', () => {
  it('按编号解析到对应 id 的详情页路由', () => {
    expect(resolveRoute('purchaseOrder', 'PO-1')).toBe('/purchase/orders/o1');
    expect(resolveRoute('purchaseRequest', 'PR-2')).toBe('/purchase/r2');
  });
  it('编号不存在时兜底返回 #', () => {
    expect(resolveRoute('purchaseOrder', 'PO-999')).toBe('#');
  });
});

// ★ V3.113.1：关联源数据版本追踪（修复「store 水合后详情页不重算 → 残留 mock 死链」）
describe('getSourcesSignature', () => {
  it('同一份数据引用 → 签名稳定', () => {
    const a = getSourcesSignature(['purchaseOrder', 'inbound']);
    const b = getSourcesSignature(['purchaseOrder', 'inbound']);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('数据被整体替换（模拟水合完成）→ 签名变化', () => {
    let docs = [...ORD];
    registerDocSource('sigProbe', { getDocs: () => docs, numberField: 'orderNo' });
    const before = getSourcesSignature(['sigProbe']);
    docs = [...ORD, { id: 'o4', orderNo: 'PO-4' }]; // store 水合：换成新数组引用
    const after = getSourcesSignature(['sigProbe']);
    expect(after).not.toBe(before);
  });

  it('未登记的类型不报错、签名稳定', () => {
    expect(() => getSourcesSignature(['neverRegisteredType'])).not.toThrow();
    expect(getSourcesSignature(['neverRegisteredType'])).toBe(getSourcesSignature(['neverRegisteredType']));
  });
});

// ★ V3.113.2：财务域来源单号可点化 —— 前缀推断 + 存在性校验（防止给出点不动的死链）
describe('inferRelatedRefByNo / pickExistingRefs', () => {
  beforeEach(() => {
    // 财务域样例数据
    registerDocSource('finInvoice', {
      getDocs: () => [{ id: 'fi-1', invoiceNo: 'INV-2024-0501' }],
      numberField: 'invoiceNo',
    });
    registerDocSource('salesInvoice', {
      getDocs: () => [{ id: 'si-1', invoiceNo: 'SI-2026-0701' }],
      numberField: 'invoiceNo',
    });
    DOC_ROUTES.finInvoice = () => '/finance/invoices';
    DOC_ROUTES.salesInvoice = (id) => `/sales/invoices/${id}`;
  });

  it('按前缀命中且目标真实存在 → 给出可点引用', () => {
    expect(inferRelatedRefByNo('INV-2024-0501')).toEqual([{ type: 'finInvoice', no: 'INV-2024-0501' }]);
    expect(inferRelatedRefByNo('SI-2026-0701')).toEqual([{ type: 'salesInvoice', no: 'SI-2026-0701' }]);
  });

  it('前缀命中但目标不存在 → 返回空（宁缺勿死链）', () => {
    expect(inferRelatedRefByNo('INV-9999-9999')).toEqual([]);
    expect(inferRelatedRefByNo('PO-NOT-EXIST')).toEqual([]);
  });

  it('未知前缀 / 空值 → 返回空且不抛错', () => {
    expect(inferRelatedRefByNo('FR-2026-0092')).toEqual([]); // 运费单无对应详情页
    expect(inferRelatedRefByNo('')).toEqual([]);
    expect(inferRelatedRefByNo(null)).toEqual([]);
    expect(inferRelatedRefByNo(undefined)).toEqual([]);
  });

  it('pickExistingRefs 丢弃解析不出路由的引用（死链防线）', () => {
    // 未登记路由的类型 → 解析为 '#' → 必须被丢弃
    registerDocSource('noRouteType', {
      getDocs: () => [{ id: 'x1', no: 'X-1' }],
      numberField: 'no',
    });
    const out = pickExistingRefs([
      { type: 'finInvoice', no: 'INV-2024-0501' },
      { type: 'noRouteType', no: 'X-1' },
      { type: 'neverRegistered', no: 'N-1' },
      { type: 'finInvoice', no: 'INV-DOES-NOT-EXIST' },
    ]);
    expect(out).toEqual([{ type: 'finInvoice', no: 'INV-2024-0501' }]);
  });
});

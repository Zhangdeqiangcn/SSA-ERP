// withRelatedDocNos / resolveRoute 单元测试（V3.113.0 新增）
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DOC_RELATIONS,
  DOC_ROUTES,
  withRelatedDocNos,
  resolveRoute,
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

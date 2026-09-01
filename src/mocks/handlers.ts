import { http, HttpResponse, delay } from 'msw';
import { materials, materialCategories } from './data/material';
import { vendors } from './data/vendor';
import { purchaseRequests, purchaseOrders, vendorQuotes } from './data/purchase';
import { inboundOrders, outboundOrders, checkTasks, inventoryRecords, inventoryAlerts } from './data/warehouse';

const handlers = [
  // Materials
  http.get('/api/materials', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;
    const name = url.searchParams.get('name');
    const code = url.searchParams.get('code');

    let filteredMaterials = [...materials];
    if (name) {
      filteredMaterials = filteredMaterials.filter(m => m.name.includes(name));
    }
    if (code) {
      filteredMaterials = filteredMaterials.filter(m => m.code.includes(code));
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = filteredMaterials.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: filteredMaterials.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/materials/:id', async ({ params }) => {
    await delay(200);
    const material = materials.find(m => m.id === params.id);
    if (!material) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '物料不存在' } },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: material });
  }),

  http.post('/api/materials', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const newMaterial = {
      ...body,
      id: `mat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, data: newMaterial });
  }),

  http.put('/api/materials/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: { ...body, id: params.id, updatedAt: new Date().toISOString() },
    });
  }),

  http.delete('/api/materials/:id', async () => {
    await delay(200);
    return HttpResponse.json({ success: true });
  }),

  // Categories
  http.get('/api/material-categories', async () => {
    await delay(200);
    return HttpResponse.json({ success: true, data: materialCategories });
  }),

  http.post('/api/material-categories', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: { ...body, id: `cat-${Date.now()}`, createdAt: new Date().toISOString() },
    });
  }),

  http.put('/api/material-categories/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: { ...body, id: params.id, updatedAt: new Date().toISOString() },
    });
  }),

  http.delete('/api/material-categories/:id', async () => {
    await delay(200);
    return HttpResponse.json({ success: true });
  }),

  // Vendors（V2.74.3：与真实 /api/vendors 端点同构，去掉 success 包裹）
  http.get('/api/vendors', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 20;
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const keyword = (url.searchParams.get('keyword') || '').trim();

    let filteredVendors = [...vendors];
    if (status) filteredVendors = filteredVendors.filter(v => v.status === status);
    if (type) filteredVendors = filteredVendors.filter(v => v.type === type);
    if (keyword) {
      const kw = keyword.toLowerCase();
      filteredVendors = filteredVendors.filter(v =>
        (v.code || '').toLowerCase().includes(kw) ||
        (v.name || '').toLowerCase().includes(kw) ||
        (v.contact || '').toLowerCase().includes(kw));
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = filteredVendors.slice(start, end);

    return HttpResponse.json({
      data: paginatedData,
      total: filteredVendors.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredVendors.length / pageSize),
    });
  }),

  http.get('/api/vendors/pending-approvals', async () => {
    await delay(200);
    const pending = vendors.filter(v => v.status === 'pending');
    return HttpResponse.json({ success: true, data: pending });
  }),

  http.get('/api/vendors/blacklist', async () => {
    await delay(200);
    const blacklisted = vendors.filter(v => v.status === 'blacklisted');
    return HttpResponse.json({ success: true, data: blacklisted });
  }),

  http.get('/api/vendors/:id', async ({ params }) => {
    await delay(200);
    const vendor = vendors.find(v => v.id === params.id);
    if (!vendor) {
      return HttpResponse.json({ error: '供应商不存在' }, { status: 404 });
    }
    return HttpResponse.json({ ...vendor });
  }),

  http.post('/api/vendors', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const created = {
      ...body,
      id: `ven-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vendors.push(created as any);
    return HttpResponse.json({ ...created });
  }),

  http.put('/api/vendors/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    const idx = vendors.findIndex(v => v.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: '供应商不存在' }, { status: 404 });
    vendors[idx] = { ...vendors[idx], ...body, updatedAt: new Date().toISOString() } as any;
    return HttpResponse.json({ ...vendors[idx] });
  }),

  http.delete('/api/vendors/:id', async ({ params }) => {
    await delay(200);
    const idx = vendors.findIndex(v => v.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: '供应商不存在' }, { status: 404 });
    vendors.splice(idx, 1);
    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/vendors/:id/approve', async ({ params }) => {
    await delay(300);
    const vendor = vendors.find(v => v.id === params.id);
    return HttpResponse.json({
      success: true,
      data: { ...vendor, status: 'approved', updatedAt: new Date().toISOString() },
    });
  }),

  http.post('/api/vendors/:id/blacklist', async ({ params }) => {
    await delay(300);
    const vendor = vendors.find(v => v.id === params.id);
    return HttpResponse.json({
      success: true,
      data: { ...vendor, status: 'blacklisted', blacklistedAt: new Date().toISOString() },
    });
  }),

  http.post('/api/vendors/:id/unblacklist', async ({ params }) => {
    await delay(300);
    const vendor = vendors.find(v => v.id === params.id);
    return HttpResponse.json({
      success: true,
      data: { ...vendor, status: 'approved', blacklistedAt: undefined, blacklistReason: undefined },
    });
  }),

  // Purchase Requests
  http.get('/api/purchase-requests', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = purchaseRequests.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: purchaseRequests.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/purchase-requests/:id', async ({ params }) => {
    await delay(200);
    const request = purchaseRequests.find(r => r.id === params.id);
    if (!request) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '采购申请不存在' } },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: request });
  }),

  http.post('/api/purchase-requests', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: {
        ...body,
        id: `pr-${Date.now()}`,
        requestNo: `PR${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.get('/api/purchase-requests/:id/quotes', async ({ params }) => {
    await delay(200);
    const quotes = vendorQuotes.filter(q => q.requestId === params.id);
    return HttpResponse.json({ success: true, data: quotes });
  }),

  // Purchase Orders
  http.get('/api/purchase-orders', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = purchaseOrders.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: purchaseOrders.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/purchase-orders/:id', async ({ params }) => {
    await delay(200);
    const order = purchaseOrders.find(o => o.id === params.id);
    if (!order) {
      return HttpResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '采购订单不存在' } },
        { status: 404 }
      );
    }
    return HttpResponse.json({ success: true, data: order });
  }),

  // Inbound Orders
  http.get('/api/inbound-orders', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = inboundOrders.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: inboundOrders.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/inbound-orders/:id', async ({ params }) => {
    await delay(200);
    const order = inboundOrders.find(o => o.id === params.id);
    return HttpResponse.json({ success: true, data: order });
  }),

  http.post('/api/inbound-orders', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      data: {
        ...body,
        id: `in-${Date.now()}`,
        inboundNo: `IN${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // Outbound Orders
  http.get('/api/outbound-orders', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = outboundOrders.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: outboundOrders.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/outbound-orders/:id', async ({ params }) => {
    await delay(200);
    const order = outboundOrders.find(o => o.id === params.id);
    return HttpResponse.json({ success: true, data: order });
  }),

  // Check Tasks
  http.get('/api/check-tasks', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = checkTasks.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: checkTasks.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/check-tasks/:id', async ({ params }) => {
    await delay(200);
    const task = checkTasks.find(t => t.id === params.id);
    return HttpResponse.json({ success: true, data: task });
  }),

  // Inventory
  http.get('/api/inventory', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = inventoryRecords.slice(start, end);

    return HttpResponse.json({
      success: true,
      data: {
        data: paginatedData,
        total: inventoryRecords.length,
        page,
        pageSize,
      },
    });
  }),

  http.get('/api/inventory/alerts', async () => {
    await delay(200);
    return HttpResponse.json({ success: true, data: inventoryAlerts });
  }),

  // Dashboard stats
  http.get('/api/dashboard/stats', async () => {
    await delay(300);
    return HttpResponse.json({
      success: true,
      data: {
        totalMaterials: materials.length,
        totalVendors: vendors.filter(v => v.status === 'approved').length,
        pendingPurchases: purchaseRequests.filter(r => r.status === 'pending').length,
        inventoryAlerts: inventoryAlerts.length,
        monthlyPurchaseAmount: [
          { month: '1月', amount: 125000 },
          { month: '2月', amount: 98000 },
          { month: '3月', amount: 156000 },
          { month: '4月', amount: 142000 },
          { month: '5月', amount: 198000 },
        ],
        inventoryByCategory: [
          { category: '钢材类', value: 45 },
          { category: '紧固件', value: 30 },
          { category: '五金配件', value: 15 },
          { category: '电气元件', value: 10 },
        ],
        pendingTasks: [
          { type: '采购审批', title: '设备维护用紧固件采购', priority: 'normal', dueDate: '2024-05-15' },
          { type: '入库待确认', title: '钢板 Q235B 入库', priority: 'urgent', dueDate: '2024-05-10' },
          { type: '采购审批', title: 'H型钢结构件材料', priority: 'high', dueDate: '2024-05-18' },
        ],
      },
    });
  }),
];

export default handlers;

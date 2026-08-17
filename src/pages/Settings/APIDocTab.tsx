import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Divider, Chip, Button, Alert, AlertTitle,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress,
  Tooltip, Stack,
} from '@mui/material';
import {
  ExpandMore, Http, PlayArrow, CheckCircle, ErrorOutline,
  Key, Security,
} from '@mui/icons-material';
import api from '@/services/apiService';

// ── 类型定义 ──

interface ApiParam {
  name: string;
  type: string;
  location: 'query' | 'path' | 'body';
  required: boolean;
  description: string;
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  params?: ApiParam[];
  /** 调用 apiService 的方法 */
  action?: () => Promise<unknown>;
  bodyExample?: string;
  responseExample?: string;
}

interface ApiModule {
  key: string;
  label: string;
  color: string;
  endpoints: ApiEndpoint[];
}

// ── Method 颜色映射 ──

const methodColors: Record<string, string> = {
  GET: '#22C55E',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  DELETE: '#EF4444',
  PATCH: '#8B5CF6',
};

const httpStatusText: Record<string, string> = {
  GET: '查询/获取资源',
  POST: '创建新资源',
  PUT: '更新资源',
  DELETE: '删除资源',
  PATCH: '部分更新资源',
};

// ── API 端点定义 ──

const apiModules: ApiModule[] = [
  {
    key: 'material', label: '物料管理', color: '#8B5CF6',
    endpoints: [
      { id: 'mat-list', method: 'GET', path: '/api/materials', description: '获取物料列表，支持分类、状态、关键词筛选', params: [
        { name: 'page', type: 'number', location: 'query', required: false, description: '页码' },
        { name: 'pageSize', type: 'number', location: 'query', required: false, description: '每页数量' },
        { name: 'categoryId', type: 'string', location: 'query', required: false, description: '分类ID' },
        { name: 'status', type: 'string', location: 'query', required: false, description: '状态：draft/active/inactive' },
        { name: 'keyword', type: 'string', location: 'query', required: false, description: '模糊查询关键词' },
      ], action: () => api.material.list(), responseExample: '{ "success": true, "data": [{ "id": "mat-001", "code": "MAT-001", "name": "钢板", "unit": "吨", ... }] }' },
      { id: 'mat-get', method: 'GET', path: '/api/materials/:id', description: '根据ID获取物料详情', params: [
        { name: 'id', type: 'string', location: 'path', required: true, description: '物料ID' },
      ], action: () => api.material.getById('mat-001'), responseExample: '{ "success": true, "data": { "id": "mat-001", "code": "MAT-001", "name": "钢板", ... } }' },
      { id: 'mat-create', method: 'POST', path: '/api/materials', description: '创建新物料', params: [
        { name: 'body', type: 'object', location: 'body', required: true, description: '物料数据' },
      ], action: () => api.material.create({ name: '测试物料', code: 'TEST', unit: '个', categoryId: 'cat-001' }), bodyExample: '{ "name": "物料名称", "code": "MAT-XXX", "unit": "个", "categoryId": "cat-001" }' },
      { id: 'mat-update', method: 'PUT', path: '/api/materials/:id', description: '更新物料信息', params: [
        { name: 'id', type: 'string', location: 'path', required: true, description: '物料ID' },
      ], action: () => api.material.update('mat-001', { name: '更新后的名称' }) },
      { id: 'mat-delete', method: 'DELETE', path: '/api/materials/:id', description: '删除物料', params: [
        { name: 'id', type: 'string', location: 'path', required: true, description: '物料ID' },
      ], action: () => api.material.delete('mat-001') },
    ],
  },
  {
    key: 'vendor', label: '供应商管理', color: '#F59E0B',
    endpoints: [
      { id: 'ven-list', method: 'GET', path: '/api/vendors', description: '获取供应商列表', params: [
        { name: 'page', type: 'number', location: 'query', required: false, description: '页码' },
        { name: 'type', type: 'string', location: 'query', required: false, description: '供应商类型' },
        { name: 'status', type: 'string', location: 'query', required: false, description: '状态' },
      ], action: () => api.vendor.list() },
      { id: 'ven-get', method: 'GET', path: '/api/vendors/:id', description: '获取供应商详情', params: [
        { name: 'id', type: 'string', location: 'path', required: true, description: '供应商ID' },
      ], action: () => api.vendor.getById('ven-001') },
      { id: 'ven-create', method: 'POST', path: '/api/vendors', description: '创建供应商', action: () => api.vendor.create({ name: '测试供应商', code: 'V-TEST' }) },
      { id: 'ven-update', method: 'PUT', path: '/api/vendors/:id', description: '更新供应商信息', action: () => api.vendor.update('ven-001', { name: '更新后供应商' }) },
      { id: 'ven-delete', method: 'DELETE', path: '/api/vendors/:id', description: '删除供应商', action: () => api.vendor.delete('ven-001') },
      { id: 'ven-blacklist', method: 'POST', path: '/api/vendors/:id/blacklist', description: '拉黑供应商', params: [
        { name: 'id', type: 'string', location: 'path', required: true, description: '供应商ID' },
        { name: 'reason', type: 'string', location: 'body', required: true, description: '拉黑原因' },
      ], action: () => api.vendor.blacklist('ven-001', '质量不合格') },
    ],
  },
  {
    key: 'customer', label: '客户管理', color: '#10B981',
    endpoints: [
      { id: 'cus-list', method: 'GET', path: '/api/customers', description: '获取客户列表', params: [
        { name: 'status', type: 'string', location: 'query', required: false, description: '状态' },
      ], action: () => api.customer.list() },
      { id: 'cus-get', method: 'GET', path: '/api/customers/:id', description: '获取客户详情', action: () => api.customer.getById('cus-001') },
      { id: 'cus-create', method: 'POST', path: '/api/customers', description: '创建客户', action: () => api.customer.create({ name: '测试客户', code: 'C-TEST' }) },
      { id: 'cus-update', method: 'PUT', path: '/api/customers/:id', description: '更新客户信息', action: () => api.customer.update('cus-001', { name: '更新后客户' }) },
      { id: 'cus-delete', method: 'DELETE', path: '/api/customers/:id', description: '删除客户', action: () => api.customer.delete('cus-001') },
    ],
  },
  {
    key: 'purchase', label: '采购管理', color: '#3B82F6',
    endpoints: [
      { id: 'pr-list', method: 'GET', path: '/api/purchase-requests', description: '获取采购申请列表', action: () => api.purchase.request.list() },
      { id: 'pr-get', method: 'GET', path: '/api/purchase-requests/:id', description: '获取采购申请详情', action: () => api.purchase.request.getById('pr-001') },
      { id: 'pr-create', method: 'POST', path: '/api/purchase-requests', description: '创建采购申请', action: () => api.purchase.request.create({ applicant: '张三', department: '采购部', title: '测试采购申请' }) },
      { id: 'pr-update', method: 'PUT', path: '/api/purchase-requests/:id', description: '更新采购申请', action: () => api.purchase.request.update('pr-001', {}) },
      { id: 'pr-delete', method: 'DELETE', path: '/api/purchase-requests/:id', description: '删除采购申请', action: () => api.purchase.request.delete('pr-001') },
      { id: 'po-list', method: 'GET', path: '/api/purchase-orders', description: '获取采购订单列表', action: () => api.purchase.order.list() },
      { id: 'po-get', method: 'GET', path: '/api/purchase-orders/:id', description: '获取采购订单详情', action: () => api.purchase.order.getById('po-001') },
      { id: 'po-create', method: 'POST', path: '/api/purchase-orders', description: '创建采购订单', action: () => api.purchase.order.create({ vendorId: 'ven-001', vendorName: '测试供应商' }) },
      { id: 'po-update', method: 'PUT', path: '/api/purchase-orders/:id', description: '更新采购订单', action: () => api.purchase.order.update('po-001', {}) },
      { id: 'po-confirm', method: 'POST', path: '/api/purchase-orders/:id/confirm', description: '确认采购订单', action: () => api.purchase.order.confirm('po-001') },
      { id: 'info-list', method: 'GET', path: '/api/purchase-info-records', description: '获取采购信息记录', action: () => api.purchase.infoRecord.list() },
      { id: 'info-create', method: 'POST', path: '/api/purchase-info-records', description: '创建采购信息记录', action: () => api.purchase.infoRecord.create({ vendorId: 'ven-001', materialId: 'mat-001' }) },
      { id: 'source-list', method: 'GET', path: '/api/source-list', description: '获取货源清单', action: () => api.purchase.sourceList.list() },
    ],
  },
  {
    key: 'sales', label: '销售管理', color: '#F97316',
    endpoints: [
      { id: 'so-list', method: 'GET', path: '/api/sales-orders', description: '获取销售订单列表', action: () => api.sales.order.list() },
      { id: 'so-get', method: 'GET', path: '/api/sales-orders/:id', description: '获取销售订单详情', action: () => api.sales.order.getById('so-001') },
      { id: 'so-create', method: 'POST', path: '/api/sales-orders', description: '创建销售订单', action: () => api.sales.order.create({ customerId: 'cus-001', customerName: '测试客户' }) },
      { id: 'so-update', method: 'PUT', path: '/api/sales-orders/:id', description: '更新销售订单', action: () => api.sales.order.update('so-001', {}) },
      { id: 'so-delete', method: 'DELETE', path: '/api/sales-orders/:id', description: '删除销售订单', action: () => api.sales.order.delete('so-001') },
      { id: 'sc-list', method: 'GET', path: '/api/sales-contracts', description: '获取销售合同列表', action: () => api.sales.contract.list() },
      { id: 'sc-create', method: 'POST', path: '/api/sales-contracts', description: '创建销售合同', action: () => api.sales.contract.create({ name: '测试合同', customerId: 'cus-001' }) },
      { id: 'prosp-list', method: 'GET', path: '/api/prospects', description: '获取意向客户列表', action: () => api.sales.prospect.list() },
      { id: 'prosp-convert', method: 'POST', path: '/api/prospects/:id/convert', description: '意向客户转化为正式客户', action: () => api.sales.prospect.convert('prosp-001') },
    ],
  },
  {
    key: 'warehouse', label: '仓储管理', color: '#06B6D4',
    endpoints: [
      { id: 'ib-list', method: 'GET', path: '/api/inbounds', description: '获取入库单列表', action: () => api.warehouse.inbound.list() },
      { id: 'ib-create', method: 'POST', path: '/api/inbounds', description: '创建入库单', action: () => api.warehouse.inbound.create({ type: 'purchase' }) },
      { id: 'ob-list', method: 'GET', path: '/api/outbounds', description: '获取出库单列表', action: () => api.warehouse.outbound.list() },
      { id: 'ob-create', method: 'POST', path: '/api/outbounds', description: '创建出库单', action: () => api.warehouse.outbound.create({ type: 'sale' }) },
      { id: 'inv-list', method: 'GET', path: '/api/inventory', description: '获取库存列表', action: () => api.warehouse.inventory.list() },
      { id: 'ck-list', method: 'GET', path: '/api/inventory-checks', description: '获取盘点任务', action: () => api.warehouse.check.list() },
    ],
  },
  {
    key: 'quality', label: '质量管理', color: '#EF4444',
    endpoints: [
      { id: 'insp-list', method: 'GET', path: '/api/inspections', description: '获取检验任务列表', action: () => api.quality.inspection.list() },
      { id: 'insp-create', method: 'POST', path: '/api/inspections', description: '创建检验任务', action: () => api.quality.inspection.create({ type: 'incoming' }) },
      { id: 'uq-list', method: 'GET', path: '/api/unqualified-items', description: '获取不合格品列表', action: () => api.quality.unqualified.list() },
      { id: 'fmea-list', method: 'GET', path: '/api/fmea', description: '获取FMEA记录', action: () => api.quality.fmea.list() },
    ],
  },
  {
    key: 'production', label: '生产管理', color: '#A855F7',
    endpoints: [
      { id: 'wo-list', method: 'GET', path: '/api/work-orders', description: '获取生产工单列表', action: () => api.production.workOrder.list() },
      { id: 'wo-create', method: 'POST', path: '/api/work-orders', description: '创建生产工单', action: () => api.production.workOrder.create({ productName: '测试物料', plannedQuantity: 100 }) },
      { id: 'bom-list', method: 'GET', path: '/api/boms', description: '获取BOM列表', action: () => api.production.bom.list() },
      { id: 'mrp-list', method: 'GET', path: '/api/mrp', description: '获取MRP建议', action: () => api.production.mrp.list() },
    ],
  },
  {
    key: 'finance', label: '财务管理', color: '#6366F1',
    endpoints: [
      { id: 'vch-list', method: 'GET', path: '/api/vouchers', description: '获取会计凭证列表', action: () => api.finance.voucher.list() },
      { id: 'vch-create', method: 'POST', path: '/api/vouchers', description: '创建会计凭证', action: () => api.finance.voucher.create({ remark: '测试凭证' }) },
      { id: 'ar-list', method: 'GET', path: '/api/receivables', description: '获取应收账款列表', action: () => api.finance.receivable.list() },
      { id: 'ap-list', method: 'GET', path: '/api/payables', description: '获取应付账款列表', action: () => api.finance.payable.list() },
    ],
  },
  {
    key: 'price', label: '价格管理', color: '#EC4899',
    endpoints: [
      { id: 'inq-list', method: 'GET', path: '/api/price-inquiries', description: '获取询价单列表', action: () => api.price.inquiry.list() },
      { id: 'inq-create', method: 'POST', path: '/api/price-inquiries', description: '创建询价单', action: () => api.price.inquiry.create({ inquiryNo: `INQ-${Date.now()}` }) },
      { id: 'pl-list', method: 'GET', path: '/api/price-list', description: '获取价目表', action: () => api.price.priceList.list() },
    ],
  },
  {
    key: 'system', label: '系统管理', color: '#64748B',
    endpoints: [
      { id: 'sys-status', method: 'GET', path: '/api/status', description: '获取系统状态（版本、存储数据量）', action: () => api.system.getStatus(), responseExample: '{ "success": true, "data": { "version": "1.0.0", "storeCount": 0, "storageKB": 0 } }' },
      { id: 'sys-export', method: 'GET', path: '/api/export', description: '导出全部数据', action: () => api.system.exportAll() },
      { id: 'sys-import', method: 'POST', path: '/api/import', description: '导入数据', action: () => api.system.importAll({}) },
    ],
  },
];

// ── 组件 ──

const APIDocTab: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [calling, setCalling] = useState(false);
  const [response, setResponse] = useState<{ success: boolean; data: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = useCallback((endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    setError(null);
  }, []);

  const handleTry = useCallback(async () => {
    if (!selectedEndpoint?.action) return;
    setCalling(true);
    setResponse(null);
    setError(null);
    try {
      const res = await selectedEndpoint.action();
      setResponse(res as { success: boolean; data: unknown });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalling(false);
    }
  }, [selectedEndpoint]);

  const selectedModule = useMemo(() => {
    if (!selectedEndpoint) return null;
    return apiModules.find(m =>
      m.endpoints.some(e => e.id === selectedEndpoint.id)
    ) ?? null;
  }, [selectedEndpoint]);

  return (
    <Box sx={{ height: 'calc(100vh - 300px)', minHeight: 500 }}>
      {/* 认证说明横幅 */}
      <Alert severity="info" icon={<Key />} sx={{ mb: 2, borderRadius: 2, fontSize: '0.8125rem' }}>
        <AlertTitle sx={{ fontWeight: 600, fontSize: '0.875rem' }}>认证方式（Demo 模式无需认证）</AlertTitle>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 0.5 }}>
          <Box>
            <Typography variant="caption" fontWeight={600}>Bearer Token：</Typography>
            <Typography component="code" variant="caption" sx={{ bgcolor: '#0F172A', color: '#22C55E', px: 1, py: 0.3, borderRadius: 0.5, ml: 0.5 }}>
              Authorization: Bearer {'{'}token{'}'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" fontWeight={600}>API Key：</Typography>
            <Typography component="code" variant="caption" sx={{ bgcolor: '#0F172A', color: '#F59E0B', px: 1, py: 0.3, borderRadius: 0.5, ml: 0.5 }}>
              X-API-Key: {'{'}key{'}'}
            </Typography>
          </Box>
        </Stack>
      </Alert>

      {/* 主体：左侧目录 + 右侧详情 */}
      <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
        {/* 左侧 API 目录树 */}
        <Paper
          elevation={0}
          data-testid="api-doc-tree"
          sx={{
            width: 300, minWidth: 280, flexShrink: 0, overflow: 'auto',
            border: '1px solid rgba(226,232,240,0.8)', borderRadius: 2,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Http fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>API 端点目录</Typography>
          </Box>
          {apiModules.map(mod => (
            <Accordion key={mod.key} disableGutters elevation={0}
              sx={{
                '&:before': { display: 'none' },
                borderBottom: '1px solid rgba(226,232,240,0.4)',
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}
                sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: mod.color, flexShrink: 0 }} />
                  <Typography variant="body2" fontWeight={600}>{mod.label}</Typography>
                  <Chip label={mod.endpoints.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 1 }}>
                {mod.endpoints.map(ep => (
                  <Box
                    key={ep.id}
                    onClick={() => handleSelect(ep)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.6,
                      borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem',
                      bgcolor: selectedEndpoint?.id === ep.id ? mod.color + '15' : 'transparent',
                      '&:hover': { bgcolor: mod.color + '08' },
                    }}
                  >
                    <Chip
                      label={ep.method}
                      size="small"
                      sx={{
                        height: 20, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: methodColors[ep.method] + '18', color: methodColors[ep.method],
                        minWidth: 48, fontFamily: 'monospace',
                      }}
                    />
                    <Typography variant="caption" fontFamily="monospace" fontSize="0.75rem"
                      noWrap sx={{ flex: 1 }}>
                      {ep.path}
                    </Typography>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        {/* 右侧详情区 */}
        <Paper
          elevation={0}
          data-testid="api-doc-detail"
          sx={{
            flex: 1, overflow: 'auto', p: 0,
            border: '1px solid rgba(226,232,240,0.8)', borderRadius: 2,
          }}
        >
          {!selectedEndpoint ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
              <Http sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
              <Typography color="text.secondary">从左侧选择一个 API 端点查看详情</Typography>
            </Box>
          ) : (
            <Box>
              {/* 端点标题 */}
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={selectedEndpoint.method}
                  sx={{
                    fontWeight: 700, fontFamily: 'monospace',
                    bgcolor: methodColors[selectedEndpoint.method] + '18',
                    color: methodColors[selectedEndpoint.method],
                  }}
                />
                <Typography variant="body1" fontFamily="monospace" fontWeight={600}>
                  {selectedEndpoint.path}
                </Typography>
                <Chip
                  label={httpStatusText[selectedEndpoint.method]} size="small"
                  sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontSize: '0.75rem' }}
                />
              </Box>

              <Box sx={{ p: 3 }}>
                {/* 描述 */}
                <Typography variant="body2" sx={{ mb: 3, color: '#475569' }}>
                  {selectedEndpoint.description}
                </Typography>

                {/* 请求参数 */}
                {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} mb={1}>请求参数</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                            <TableCell sx={{ fontWeight: 600 }}>参数名</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>位置</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>必填</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>说明</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedEndpoint.params.map(p => (
                            <TableRow key={p.name}>
                              <TableCell><Typography variant="caption" fontFamily="monospace">{p.name}</Typography></TableCell>
                              <TableCell><Chip label={p.type} size="small" sx={{ height: 20, fontSize: '0.65rem' }} /></TableCell>
                              <TableCell><Chip label={p.location} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} /></TableCell>
                              <TableCell>
                                {p.required
                                  ? <CheckCircle sx={{ fontSize: 16, color: '#EF4444' }} />
                                  : <Typography variant="caption" color="text.secondary">否</Typography>}
                              </TableCell>
                              <TableCell><Typography variant="caption">{p.description}</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* 请求体示例 */}
                {selectedEndpoint.bodyExample && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} mb={1}>请求体示例</Typography>
                    <Box component="pre"
                      sx={{
                        bgcolor: '#0F172A', color: '#22C55E', p: 2, borderRadius: 1.5,
                        fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto',
                        maxHeight: 200,
                      }}
                    >
                      {selectedEndpoint.bodyExample}
                    </Box>
                  </Box>
                )}

                {/* 分隔线 */}
                <Divider sx={{ my: 2 }} />

                {/* Try it 按钮 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Button
                    data-testid="api-doc-try"
                    variant="contained"
                    startIcon={calling ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                    onClick={handleTry}
                    disabled={calling || !selectedEndpoint.action}
                    size="small"
                  >
                    {calling ? '调用中...' : 'Try it'}
                  </Button>
                  {selectedModule && (
                    <Chip
                      icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedModule.color, ml: 1 }} />}
                      label={selectedModule.label}
                      size="small" variant="outlined"
                    />
                  )}
                </Box>

                {/* 响应展示区 */}
                <Box data-testid="api-doc-response">
                  {(response || error) && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>响应结果</Typography>
                        {response && (
                          <Chip
                            icon={response.success ? <CheckCircle fontSize="small" /> : <ErrorOutline fontSize="small" />}
                            label={response.success ? '200 OK' : 'Error'}
                            size="small"
                            color={response.success ? 'success' : 'error'}
                            variant="filled"
                          />
                        )}
                      </Box>
                      <Box component="pre"
                        sx={{
                          bgcolor: '#0F172A',
                          color: response?.success ? '#22C55E' : '#EF4444',
                          p: 2, borderRadius: 1.5,
                          fontSize: '0.75rem', fontFamily: 'monospace',
                          overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {error
                          ? `Error: ${error}`
                          : JSON.stringify(response, null, 2)}
                      </Box>

                      {/* 默认响应示例 */}
                      {selectedEndpoint.responseExample && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" fontWeight={600} mb={0.5} color="text.secondary">响应示例</Typography>
                          <Box component="pre"
                            sx={{
                              bgcolor: '#F8FAFC', color: '#334155', p: 2, borderRadius: 1.5,
                              fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto',
                              maxHeight: 200, border: '1px solid rgba(226,232,240,0.6)',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {selectedEndpoint.responseExample}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}

                  {!response && !error && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      点击 "Try it" 按钮测试此 API 端点
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default APIDocTab;

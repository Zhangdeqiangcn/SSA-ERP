import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Paper, MenuItem, Autocomplete, Alert, Stack, Grid,
} from '@mui/material';
import { Save, Send, ArrowBack } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  MaterialLineItemsGrid, IncotermsField, QualityStandardField,
  AttachmentUploader, PrintPreviewButton,
  GridColumn, AttachmentItem,
} from '@/components/common';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useSalesPriceStore } from '@/stores/salesPriceStore';
import { useVendorStore } from '@/stores/vendorStore';
import { Customer, type SalesOrder } from '@/types';
import type { ShippingMode } from '@/types/sales';
import { formatCurrency } from '@/utils/format';

interface OrderItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  deliveryDate: string;
}

const SalesOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const materials = useMaterialStore(s => s.materials);
  const { salesOrders, addSalesOrder, updateSalesOrder, projects } = useSalesStore();
  const customers = useCustomerStore((s) => s.customers);
  const applyCreditDelta = useCustomerStore((s) => s.applyCreditDelta);

  const existingOrder = useMemo(() =>
    (id ? salesOrders.find(o => o.id === id) : null) as
      | (SalesOrder & { qualityStandard?: string; attachments?: AttachmentItem[] })
      | null,
    [id, salesOrders]
  );

  const [customerName, setCustomerName] = useState(existingOrder?.customerName || '');
  const [customerCode, setCustomerCode] = useState(existingOrder?.customerCode || '');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (!existingOrder) return null;
    if (existingOrder.customerId) return customers.find((c) => c.id === existingOrder.customerId) || null;
    return customers.find((c) => c.name === existingOrder.customerName) || null;
  });
  const [contactName, setContactName] = useState(existingOrder?.contactName || '');
  const [contactPhone, setContactPhone] = useState(existingOrder?.contactPhone || '');
  const [orderType, setOrderType] = useState<string>(existingOrder?.type || 'standard');
  const [orderDate, setOrderDate] = useState(existingOrder?.orderDate || new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(existingOrder?.expectedDeliveryDate || '');
  const [paymentTerms, setPaymentTerms] = useState(existingOrder?.paymentTerms || '预付30%，货到60%，验收后10%');
  const [deliveryAddress, setDeliveryAddress] = useState(existingOrder?.deliveryAddress || '');
  const [tradeTerms, setTradeTerms] = useState(existingOrder?.tradeTerms || '');
  const [qualityStandard, setQualityStandard] = useState(existingOrder?.qualityStandard || 'GB/T');
  const [attachments, setAttachments] = useState<AttachmentItem[]>(existingOrder?.attachments || []);
  const [shipToAddress, setShipToAddress] = useState(existingOrder?.shipToAddress || '');
  const [salesPerson, setSalesPerson] = useState(existingOrder?.salesPerson || '陈伟');
  const [taxRate, setTaxRate] = useState(existingOrder?.taxRate ?? 13);
  const [remarks, setRemarks] = useState(existingOrder?.remarks || '');

  // P2-12 发货方式
  const [shippingMode, setShippingMode] = useState<ShippingMode>(existingOrder?.shippingMode || 'standard');
  const [directShipVendorId, setDirectShipVendorId] = useState(existingOrder?.directShipVendorId || '');
  const [directShipVendorName, setDirectShipVendorName] = useState(existingOrder?.directShipVendorName || '');
  const [thirdPartyCompanyName, setThirdPartyCompanyName] = useState(existingOrder?.thirdPartyCompanyName || '');

  const vendorStore = useVendorStore();
  const vendorOptions = vendorStore.vendors.map((v) => ({ id: v.id, name: v.name, code: v.code }));

  // 项目信息
  const [projectId, setProjectId] = useState(existingOrder?.projectId || '');
  const [projectNo, setProjectNo] = useState(existingOrder?.projectNo || '');
  const [projectName, setProjectName] = useState(existingOrder?.projectName || '');

  const [items, setItems] = useState<OrderItem[]>(() => {
    if (!existingOrder) return [];
    return existingOrder.items.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode || '',
      materialName: item.materialName || '',
      specification: item.specification || '',
      unit: item.unit || '件',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      deliveryDate: item.deliveryDate || '',
    }));
  });

  const materialOptions = materials.map(m => ({
    id: m.id, code: m.code, name: m.name, specification: m.specification || '', unit: m.unit, price: m.price,
  }));

  const projectOptions = projects.map(p => ({
    id: p.id, projectNo: p.projectNo, projectName: p.projectName, customerName: p.customerName,
  }));

  // ── 物料明细：Excel 式网格（多行复制粘贴 / 列显隐 / 物料号名称分列）──
  const computeRow = (row: any) => {
    const qty = Number(row.quantity) || 0;
    const price = Number(row.unitPrice) || 0;
    return { ...row, amount: qty * price };
  };

  // C5：选中物料时统一取价（客户级价目表 + 折扣 + 阶梯量价 + 促销）
  const handleMaterialPricing = (rowId: string, materialId: string): Record<string, any> => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    const qty = items.find((r) => r.id === rowId)?.quantity || 1;
    const resolved = useSalesPriceStore.getState().resolvePrice(selectedCustomer?.id, materialId, qty, mat.price);
    return { unitPrice: resolved.unitPrice };
  };

  const soColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 150, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 200, fixed: true },
    { key: 'specification', label: '规格', fillFromMaterial: 'specification', width: 160, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 70, hideable: true },
    { key: 'quantity', label: '数量', type: 'number', align: 'right', width: 100, min: 1, step: 1 },
    { key: 'unitPrice', label: '单价', type: 'number', align: 'right', width: 120, min: 0, step: 0.01 },
    { key: 'amount', label: '金额', type: 'readonly', align: 'right', width: 120 },
    { key: 'deliveryDate', label: '交期', type: 'date', width: 150, hideable: true },
  ];

  const makeNewRow = () => ({
    id: '', materialId: '', materialCode: '', materialName: '',
    specification: '', unit: '件', quantity: 1, unitPrice: 0, amount: 0, deliveryDate: '',
  });

  const handleProjectSelect = (project: typeof projectOptions[0] | null) => {
    if (project) {
      setProjectId(project.id);
      setProjectNo(project.projectNo);
      setProjectName(project.projectName);
      setCustomerName(project.customerName);
      // A3：若项目客户命中客户主数据，自动带出主数据（含信用/开票/联系人）
      const matched = customers.find((c) => c.name === project.customerName);
      if (matched) {
        setSelectedCustomer(matched);
        setCustomerCode(matched.code);
        setContactName(matched.contactName || '');
        setContactPhone(matched.contactPhone || '');
      }
    } else {
      setProjectId('');
      setProjectNo('');
      setProjectName('');
    }
  };

  const handleCustomerSelect = (c: Customer | null) => {
    setSelectedCustomer(c);
    if (c) {
      setCustomerName(c.name);
      setCustomerCode(c.code);
      setContactName(c.contactName || '');
      setContactPhone(c.contactPhone || '');
    }
  };

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const taxAmount = subtotal * taxRate / 100;
  const grandTotal = subtotal + taxAmount;

  const buildPrintRecord = (): Record<string, any> => ({
    orderNo: existingOrder?.orderNo || '(尚未保存)',
    customerName,
    customerCode,
    orderDate,
    expectedDeliveryDate,
    paymentTerms,
    tradeTerms,
    qualityStandard,
    salesPerson,
    projectName,
    grandTotal,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate,
    })),
  });

  const handleSave = () => {
    const formData = {
      customerId: selectedCustomer?.id || existingOrder?.customerId,
      customerName, customerCode, contactName, contactPhone,
      type: orderType, orderDate, expectedDeliveryDate,
      paymentTerms, deliveryAddress, tradeTerms, qualityStandard, shipToAddress, salesPerson, taxRate, remarks,
      projectId, projectNo, projectName,
      items, subtotal, taxAmount, grandTotal, attachments,
      shippingMode, directShipVendorId, directShipVendorName, thirdPartyCompanyName,
      // B1：草稿态不占用客户信用
      creditOccupied: false,
      creditAmount: 0,
    };
    // B1：暂存 = 回到草稿态，若本单此前已占用信用则先释放
    if (isEditMode && existingOrder) {
      const occupiedAmt = existingOrder.creditOccupied
        ? (existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0)
        : existingOrder.status !== 'draft' && existingOrder.customerId
          ? (existingOrder.grandTotal ?? 0)
          : 0;
      if (occupiedAmt > 0 && existingOrder.customerId) {
        applyCreditDelta(existingOrder.customerId, -occupiedAmt);
      }
    }
    if (isEditMode) {
      updateSalesOrder(id!, { ...formData, status: 'draft' } as any);
    } else {
      addSalesOrder({ ...formData, id: `so-${Date.now()}`, orderNo: `SO-${Date.now()}`, status: 'draft' } as any);
    }
    navigate('/sales/orders');
  };

  const [creditError, setCreditError] = useState('');

  const handleSubmit = () => {
    setCreditError('');
    if (!selectedCustomer) {
      setCreditError('请选择客户主数据（须为「客户列表」中的正式客户）。');
      return;
    }
    if (!customerName.trim()) { alert('请输入客户名称'); return; }
    if (items.length === 0) { alert('请添加至少一项物料'); return; }

    // ── A3 信用硬管控（对标 SAP / 用友 / 金蝶）──
    // 订单含税金额超过可用额度时，直接禁止提交（不保存、不跳转、不占用）。
    const limit = selectedCustomer.creditLimit;
    if (limit != null) {
      const used = selectedCustomer.usedCredit || 0;
      // 编辑同一客户时，原订单占用额已计入 used，需将其释放后再比较
      // B1 修正：仅当本单确已占用（creditOccupied，或历史非草稿单）才抵扣，草稿单不重复抵扣
      const prevAmount =
        isEditMode && existingOrder?.customerId === selectedCustomer.id
          ? existingOrder.creditOccupied
            ? (existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0)
            : existingOrder.status !== 'draft'
              ? (existingOrder.grandTotal || 0)
              : 0
          : 0;
      const effectiveAvailable = limit - used + prevAmount;
      if (grandTotal > effectiveAvailable + 0.005) {
        setCreditError(
          `客户「${selectedCustomer.name}」信用额度不足：订单含税金额 ${formatCurrency(grandTotal)} ` +
          `已超过可用额度 ${formatCurrency(Math.max(0, effectiveAvailable))}，禁止提交。`
        );
        return;
      }
    }

    const formData = {
      customerId: selectedCustomer.id,
      customerName, customerCode, contactName, contactPhone,
      type: orderType, orderDate, expectedDeliveryDate,
      paymentTerms, deliveryAddress, tradeTerms, qualityStandard, shipToAddress, salesPerson, taxRate, remarks,
      projectId, projectNo, projectName,
      items, subtotal, taxAmount, grandTotal, attachments,
      shippingMode, directShipVendorId, directShipVendorName, thirdPartyCompanyName,
      // B1：记录占用标记与占用金额快照（与采购订单对称，供删除时精确释放）
      creditOccupied: true,
      creditAmount: grandTotal,
    };

    // 信用占用回写：编辑同客户记差值；跨客户先释放旧客户再占新客户；新建直接占。
    if (isEditMode && existingOrder) {
      const prevId = existingOrder.customerId;
      const prevAmt = existingOrder.creditOccupied
        ? (existingOrder.creditAmount ?? existingOrder.grandTotal ?? 0)
        : existingOrder.status !== 'draft'
          ? (existingOrder.grandTotal || 0)
          : 0;
      if (prevId && prevId === selectedCustomer.id) {
        applyCreditDelta(selectedCustomer.id, grandTotal - prevAmt);
      } else {
        if (prevId) applyCreditDelta(prevId, -prevAmt);
        applyCreditDelta(selectedCustomer.id, grandTotal);
      }
      updateSalesOrder(id!, { ...formData, status: 'confirmed' } as any);
    } else {
      applyCreditDelta(selectedCustomer.id, grandTotal);
      addSalesOrder({ ...formData, id: `so-${Date.now()}`, orderNo: `SO-${Date.now()}`, status: 'confirmed' } as any);
    }
    navigate('/sales/orders');
  };

  return (
    <PageWrapper
      title={isEditMode ? `修改销售订单${existingOrder ? ' - ' + existingOrder.orderNo : ''}` : '新建销售订单'}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/orders')}>返回</Button>
          <PrintPreviewButton
            entity="salesOrder"
            record={buildPrintRecord()}
            showBoth
          />
          <Button variant="outlined" startIcon={<Save />} onClick={handleSave}>暂存</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handleSubmit}>{isEditMode ? '保存修改' : '提交订单'}</Button>
        </Stack>
      }
    >
      {creditError && (
        <Alert severity="error" data-testid="so-credit-error" sx={{ mb: 2 }} onClose={() => setCreditError('')}>
          {creditError}
        </Alert>
      )}
      {/* 基本信息 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>订单基本信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={projectOptions}
              getOptionLabel={(opt) => `${opt.projectName} (${opt.projectNo})`}
              value={projectOptions.find(p => p.id === projectId) || null}
              onChange={(_, v) => handleProjectSelect(v)}
              renderInput={(params) => <TextField {...params} label="关联项目" placeholder="选择或搜索项目" />}
              noOptionsText="未找到匹配项目"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth label="订单类型" value={orderType} onChange={e => setOrderType(e.target.value)}>
              <MenuItem value="standard">标准订单</MenuItem>
              <MenuItem value="sample">样品订单</MenuItem>
              <MenuItem value="maintenance">维修订单</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="订单日期" type="date" value={orderDate}
              onChange={e => setOrderDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={customers}
              getOptionLabel={(c) => `${c.name} (${c.code})`}
              value={selectedCustomer}
              onChange={(_, v) => handleCustomerSelect(v)}
              renderInput={(params) => <TextField {...params} label="客户主数据" placeholder="选择或搜索客户" required inputProps={{ ...params.inputProps, 'data-testid': 'so-customer-input' }} />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              noOptionsText="未找到匹配客户"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="客户编码" value={customerCode} disabled />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="销售员" value={salesPerson}
              onChange={e => setSalesPerson(e.target.value)} />
          </Grid>
          {selectedCustomer && (selectedCustomer.creditLimit != null) && (
            <Grid item xs={12}>
              <Alert severity={selectedCustomer.usedCredit && selectedCustomer.creditLimit - (selectedCustomer.usedCredit || 0) <= 0 ? 'warning' : 'info'} sx={{ mb: 0 }}>
                客户「{selectedCustomer.name}」授信 {formatCurrency(selectedCustomer.creditLimit)}，
                已用 {formatCurrency(selectedCustomer.usedCredit || 0)}，
                可用 {formatCurrency(Math.max(0, (selectedCustomer.creditLimit || 0) - (selectedCustomer.usedCredit || 0)))}
              </Alert>
            </Grid>
          )}
          {projectName && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 0 }}>
                关联项目：<strong>{projectNo}</strong> — {projectName}
              </Alert>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="联系人" value={contactName}
              onChange={e => setContactName(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="联系电话" value={contactPhone}
              onChange={e => setContactPhone(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="预计交期" type="date" value={expectedDeliveryDate}
              onChange={e => setExpectedDeliveryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="税率(%)" type="number" value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))} inputProps={{ min: 0, max: 100 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="付款条件" value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="交货地址" value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)} multiline rows={2} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <IncotermsField
              label="贸易条款"
              value={tradeTerms}
              onChange={setTradeTerms}
              required
              inputProps={{ 'data-testid': 'so-trade-terms' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <QualityStandardField
              label="质量标准"
              value={qualityStandard}
              onChange={setQualityStandard}
              inputProps={{ 'data-testid': 'so-quality-standard' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="送达方地址" value={shipToAddress}
              onChange={e => setShipToAddress(e.target.value)} multiline rows={2} inputProps={{ 'data-testid': 'so-ship-to' }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="备注" value={remarks} onChange={e => setRemarks(e.target.value)} multiline rows={2} />
          </Grid>
          {/* P2-12 发货方式 */}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="发货方式"
              value={shippingMode}
              onChange={(e) => setShippingMode(e.target.value as ShippingMode)}
              inputProps={{ 'data-testid': 'so-shipping-mode' }}
            >
              <MenuItem value="standard">标准发货</MenuItem>
              <MenuItem value="direct_ship">直接发运（供应商直发客户）</MenuItem>
              <MenuItem value="third_party">三方销售</MenuItem>
            </TextField>
          </Grid>
          {shippingMode === 'direct_ship' && (
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={vendorOptions}
                getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
                value={vendorOptions.find((v) => v.id === directShipVendorId) || null}
                onChange={(_, v) => {
                  setDirectShipVendorId(v?.id || '');
                  setDirectShipVendorName(v?.name || '');
                }}
                renderInput={(params) => (
                  <TextField {...params} label="直发供应商" placeholder="选择供应商" inputProps={{ ...params.inputProps, 'data-testid': 'so-direct-vendor' }} />
                )}
                noOptionsText="未找到匹配供应商"
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            </Grid>
          )}
          {shippingMode === 'third_party' && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="第三方公司名称"
                value={thirdPartyCompanyName}
                onChange={(e) => setThirdPartyCompanyName(e.target.value)}
                placeholder="请输入第三方公司名称"
                inputProps={{ 'data-testid': 'so-third-party-name' }}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* 物料明细 — Excel 式网格 */}
      <MaterialLineItemsGrid
        columns={soColumns}
        value={items}
        onChange={(rows) => setItems(rows as any)}
        materials={materialOptions}
        onMaterialChange={handleMaterialPricing}
        computeRow={computeRow}
        newRow={makeNewRow}
        storageKey="ssa-so-material-columns"
        addLabel="添加物料"
        testIdPrefix="so"
        emptyHint="请从下方「添加物料」录入，或直接从 Excel 复制多行后粘贴到任意单元格（物料编码/名称可自动匹配）。"
        footer={
          <Stack spacing={0.5} alignItems="flex-end" px={1} mt={1}>
            <Typography variant="body2" color="text.secondary">
              不含税金额：{formatCurrency(subtotal)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              税额({taxRate}%)：{formatCurrency(taxAmount)}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="primary">
              含税总额：{formatCurrency(grandTotal)}
            </Typography>
          </Stack>
        }
      />

      {/* 附件上传（合同 / 技术协议 / 图纸等） */}
      <Box sx={{ mt: 2 }}>
        <AttachmentUploader
          label="附件上传（合同 / 技术协议 / 图纸）"
          value={attachments}
          onChange={setAttachments}
          hint="支持上传签订的合同、技术协议、图纸等；可上传多个文件，点击删除可移除。"
        />
      </Box>
    </PageWrapper>
  );
};

export default SalesOrderForm;

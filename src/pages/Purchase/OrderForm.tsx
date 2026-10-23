import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Stack, Alert, Chip, Divider, MenuItem, Autocomplete,
  Tooltip, Radio, RadioGroup, FormControlLabel, FormLabel,
} from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';
import { Add, Delete, Save, Send, ArrowBack, AutoAwesome } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker, CustomFieldsSection, MaterialLineItemsGrid, GridColumn, PrintPreviewButton } from '@/components/common';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { usePriceStore } from '@/stores/priceStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePurchaseInfoRecordStore } from '@/stores/purchaseInfoRecordStore';
import { getActiveSourcesByVendor } from '@/stores/sourceListStore';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomFieldStore } from '@/stores/customFieldStore';
import { useOrderTemplateStore } from '@/stores/orderTemplateStore';
import { useDataDictStore } from '@/stores/dataDictStore';
import { useFinanceExtensionStore, getExchangeRate } from '@/stores/financeExtensionStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { formatCurrency } from '@/utils/format';
import { notifyError } from '@/utils/notify';
import { calcLineTax, calcTaxTotals, DEFAULT_TAX_RATE } from '@/utils/tax';
import { CURRENCY_OPTIONS, TAX_RATE_OPTIONS } from '@/constants/options';

interface OrderItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  /** 未税单价 */
  unitPrice: number;
  /** 未税金额 */
  amount: number;
  /** A2：税率（百分数整数） */
  taxRate: number;
  /** A2：行税额 */
  taxAmount: number;
  /** A2：含税单价 */
  priceWithTax: number;
  /** A2：价税合计 */
  amountWithTax: number;
  vendorId: string;
  vendorName: string;
  // 价目表来源
  sourcePriceItemId?: string;
  // 信息记录来源
  sourceInfoRecordId?: string;
  leadTime?: number;
  expectedDeliveryDate?: string;
}

/** A2：按当前含税/未税模式重算单行税价字段 */
const recalcLine = (item: OrderItem, taxIncl: boolean): OrderItem => {
  const r = calcLineTax({
    quantity: item.quantity,
    price: taxIncl ? item.priceWithTax || 0 : item.unitPrice || 0,
    taxRate: item.taxRate,
    taxIncluded: taxIncl,
  });
  return {
    ...item,
    unitPrice: r.unitPrice,
    amount: r.amount,
    taxRate: r.taxRate,
    taxAmount: r.taxAmount,
    priceWithTax: r.priceWithTax,
    amountWithTax: r.amountWithTax,
  };
};

/** A2：由「未税单价 + 数量 + 税率」生成完整税价字段（价目表抓价/模板/转单统一入口） */
const buildLineFromNetPrice = (quantity: number, netPrice: number, taxRate: number) => {
  const r = calcLineTax({ quantity, price: netPrice, taxRate, taxIncluded: false });
  return {
    unitPrice: r.unitPrice,
    amount: r.amount,
    taxRate: r.taxRate,
    taxAmount: r.taxAmount,
    priceWithTax: r.priceWithTax,
    amountWithTax: r.amountWithTax,
  };
};

const OrderForm: React.FC = () => {
  const { vendors, applyVendorCreditDelta, checkVendorCredit, checkVendorBlacklist } = useVendorStore();
  const { priceList } = usePriceStore();
  const { projects } = useSalesStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const materials = useMaterialStore(s => s.materials);
  const { purchaseOrders, purchaseRequests, addPurchaseOrder, updatePurchaseOrder, updatePurchaseRequest } = usePurchaseStore();
  const nextNo = useNumberingStore((s) => s.nextNo);

  // 编辑模式：找到已有订单
  const existingOrder = useMemo(() =>
    id ? purchaseOrders.find(o => o.id === id) : null,
    [id, purchaseOrders]
  );

  // 从采购申请转入：读取 URL 参数
  const [searchParams] = useSearchParams();
  const fromRequestIds = useMemo(() => {
    const raw = searchParams.get('fromRequests');
    if (!raw) return [];
    return raw.split(',').filter(Boolean);
  }, [searchParams]);

  // 从采购申请转入时，预填充的来源申请
  const sourceRequests = useMemo(() =>
    fromRequestIds.length > 0
      ? purchaseRequests.filter(r => fromRequestIds.includes(r.id))
      : [],
    [fromRequestIds, purchaseRequests]
  );

  // 是否是「从采购申请转入」模式
  const isConvertMode = fromRequestIds.length > 0 && sourceRequests.length > 0;

  // 从采购申请继承采购类型
  const purchaseType = useMemo<'material' | 'service'>(() => {
    if (existingOrder?.purchaseType) return existingOrder.purchaseType;
    if (isConvertMode) return sourceRequests[0]?.type || 'material';
    return 'material';
  }, [existingOrder, isConvertMode, sourceRequests]);

  const isServiceOrder = purchaseType === 'service';

  // P2-06 采购模式
  const [orderMode, setOrderMode] = useState<'standard' | 'consignment'>(
    existingOrder?.orderMode || 'standard'
  );

  // 基本信息
  const [vendorId, setVendorId] = useState(existingOrder?.vendorId || '');
  const [title, setTitle] = useState(() => {
    if (existingOrder) return `${existingOrder.vendorName} - 采购订单`;
    if (isConvertMode) {
      const firstReq = sourceRequests[0];
      return `采购订单 - ${firstReq.title}`;
    }
    return '';
  });
  const [paymentTerms, setPaymentTerms] = useState(existingOrder?.paymentTerms || '');
  const [tradeTerms, setTradeTerms] = useState(existingOrder?.tradeTerms || '');
  // A2 税价拆分：表头币种 / 价格类型 / 默认税率
  const [currency, setCurrency] = useState(existingOrder?.currency || 'CNY');
  const [taxIncluded, setTaxIncluded] = useState<boolean>(existingOrder?.taxIncluded ?? false);
  const [headerTaxRate, setHeaderTaxRate] = useState<number>(
    existingOrder?.items?.[0]?.taxRate ?? DEFAULT_TAX_RATE
  );
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    if (existingOrder?.expectedDeliveryDate) return existingOrder.expectedDeliveryDate;
    if (isConvertMode) {
      // V3.102.0：新申请单不再填表头期望日期（期望交货已下沉明细行 delivery_date），
      // 转单时期望交货优先取明细行第一项的期望交货时间，历史单兜底表头 expectedDate
      const src = sourceRequests[0];
      return src?.items?.[0]?.deliveryDate || src?.expectedDate || '';
    }
    return '';
  });
  const [remarks, setRemarks] = useState(existingOrder?.remarks || '');
  const [serviceDescription, setServiceDescription] = useState(() => {
    if (existingOrder?.remarks) return existingOrder.remarks;
    if (isConvertMode) return sourceRequests[0]?.reason || '';
    return '';
  });
  const [projectNo, setProjectNo] = useState(() => {
    if (existingOrder?.projectNo) return existingOrder.projectNo;
    if (isConvertMode) return sourceRequests[0]?.projectNo || '';
    return '';
  });
  const [projectName, setProjectName] = useState(() => {
    if (existingOrder?.projectName) return existingOrder.projectName;
    if (isConvertMode) return sourceRequests[0]?.projectName || '';
    return '';
  });
  // 获取某一物料在价目表中的所有有效报价（供初始化函数使用）
  const getPriceOptions = (materialId: string) => {
    return priceList.filter(p =>
      p.materialId === materialId &&
      p.status === 'active' &&
      (!p.expiryDate || p.expiryDate >= new Date().toISOString().split('T')[0])
    ).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)); // 最新在前
  };
  const [items, setItems] = useState<OrderItem[]>(() => {
    // 编辑模式：加载已有订单明细
    if (existingOrder) {
      return existingOrder.items.map(item => ({
        id: item.id,
        materialId: item.materialId,
        materialCode: item.materialCode || '',
        materialName: item.materialName || '',
        specification: item.specification || '',
        unit: item.unit || '件',
        quantity: item.orderedQuantity,
        ...buildLineFromNetPrice(item.orderedQuantity, item.unitPrice, item.taxRate ?? DEFAULT_TAX_RATE),
        vendorId: existingOrder.vendorId,
        vendorName: existingOrder.vendorName || '',
        expectedDeliveryDate: existingOrder.expectedDeliveryDate,
      }));
    }
    // 从采购申请转入模式：预填充明细
    if (isConvertMode) {
      let itemIdx = 0;
      const orderItems: OrderItem[] = [];
      sourceRequests.forEach(req => {
        req.items.forEach(reqItem => {
          const material = materials.find(m => m.id === reqItem.materialId);
          const priceOpts = material ? getPriceOptions(material.id) : [];
          const bestPrice = priceOpts.length > 0 ? priceOpts[0].unitPrice : (reqItem.estimatedPrice || 0);
          orderItems.push({
            id: `oi-convert-${itemIdx}`,
            materialId: reqItem.materialId,
            materialCode: material?.code || reqItem.materialCode || '',
            materialName: material?.name || reqItem.materialName || '',
            specification: material?.specification || reqItem.specification || '',
            unit: material?.unit || reqItem.unit || '件',
            quantity: reqItem.quantity,
            ...buildLineFromNetPrice(reqItem.quantity, bestPrice, DEFAULT_TAX_RATE),
            vendorId: '',
            vendorName: '',
            sourcePriceItemId: priceOpts.length > 0 ? priceOpts[0].id : undefined,
            expectedDeliveryDate: reqItem.deliveryDate || '',
          });
          itemIdx++;
        });
      });
      return orderItems;
    }
    return [];
  });
  // 聚合本单所有物料所属分类，用于展示相关物料责任人（采购视角：采购员）
  const poCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m?.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 自定义字段值（按设置页配置动态扩展）
  const [customFields, setCustomFields] = useState<Record<string, unknown>>(
    existingOrder?.customFields || {}
  );

  const vendorOptions = useMemo(() =>
    vendors.map(v => ({ id: v.id, name: v.name })),
    []
  );

  // 读取贸易条款配置（数据字典单一数据源）
  const tradeTermOptions = useDataDictStore((s) => s.tradeTerms);

  // A2：币种对本位币汇率（CNY=1，其余取汇率管理表）
  const exchangeRates = useFinanceExtensionStore((s) => s.exchangeRates);
  const exchangeRate = useMemo(() => getExchangeRate(currency, exchangeRates), [currency, exchangeRates]);

  // 读取订单模板（orderTemplateStore 单一数据源）
  const orderTemplates = useOrderTemplateStore((s) => s.templates);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(!isEditMode && orderTemplates.length > 0);

  // 应用模板
  const handleApplyTemplate = (template: any) => {
    setSelectedTemplate(template);
    setVendorId(template.vendorId || '');
    setTitle(template.title || '');
    setPaymentTerms(template.paymentTerms || '');
    setTradeTerms(template.tradeTerms || '');
    setDeliveryTerms(template.deliveryTerms || '');
    setRemarks(template.remarks || '');
    setExpectedDeliveryDate(template.expectedDeliveryDate || '');
    if (template.items && template.items.length > 0) {
      setItems(template.items.map((item: any) => ({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        materialId: item.materialId || '',
        materialCode: item.materialCode || '',
        materialName: item.materialName || '',
        specification: item.specification || '',
        unit: item.unit || '件',
        quantity: item.quantity || 1,
        ...buildLineFromNetPrice(item.quantity || 1, item.unitPrice || 0, item.taxRate ?? headerTaxRate),
        vendorId: template.vendorId || '',
        vendorName: template.vendorName || '',
      })));
    }
  };

  // A2 税价拆分：未税总额 / 税额合计 / 价税合计
  const { totalAmount, totalTaxAmount, grandTotal } = useMemo(() => calcTaxTotals(items), [items]);

  // B1 信用卡点：本单需占用的信用金额（价税合计口径，回落未税总额）
  const creditAmount = useMemo(() => grandTotal || totalAmount || 0, [grandTotal, totalAmount]);

  /** B1：编辑模式下本单已占用的旧额度（同供应商时可抵扣，避免重复占用被误拦） */
  const prevCredit = useMemo(() => {
    if (!isEditMode || !existingOrder?.creditOccupied) return { vendorId: '', amount: 0 };
    return { vendorId: existingOrder.vendorId, amount: existingOrder.creditAmount ?? 0 };
  }, [isEditMode, existingOrder]);

  /** B6：当前选中供应商的黑名单画像（实时预警 + 提交前硬拦截共用） */
  const blacklistInfo = useMemo(() => {
    if (!vendorId) return null;
    const bl = checkVendorBlacklist(vendorId);
    return bl.blacklisted ? bl : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, vendors]);

  /** B1：当前选中供应商的信用画像（实时展示 + 提交前预检共用） */
  const creditInfo = useMemo(() => {
    if (!vendorId) return null;
    const v = vendors.find((x) => x.id === vendorId);
    if (!v) return null;
    const offset = prevCredit.vendorId === vendorId ? prevCredit.amount : 0;
    const used = Math.max(0, (v.usedCredit ?? 0) - offset);
    const limit = v.creditLimit ?? null;
    const available = limit == null ? Infinity : limit - used;
    return {
      vendorName: v.name,
      limit,
      used,
      available,
      willExceed: limit != null && creditAmount > available,
    };
  }, [vendorId, vendors, prevCredit, creditAmount]);

  // P0-06：选中供应商的货源清单推荐物料（前5条 生效且在有效期内，按优先级升序）
  // 统一走 store 派生 selector，保证与货源清单联动口径一致
  const sourceChips = useMemo(() => {
    if (!vendorId) return [];
    return getActiveSourcesByVendor(vendorId)
      .slice(0, 5)
      .map((s) => {
        const mat = materials.find((m) => m.id === s.materialId);
        return { ...s, material: mat };
      })
      .filter((s) => s.material);
  }, [vendorId, materials]);

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      materialId: '',
      materialCode: '',
      materialName: '',
      specification: '',
      unit: '件',
      quantity: 1,
      ...buildLineFromNetPrice(1, 0, headerTaxRate),
      vendorId: vendorId,
      vendorName: vendorOptions.find(v => v.id === vendorId)?.name || '',
    }]);
  };

  // P0-06：点击货源清单 Chip 快速添加物料行
  const handleSourceChipClick = (chip: typeof sourceChips[number]) => {
    const newId = `item-src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems(prev => [...prev, {
      id: newId,
      materialId: chip.materialId,
      materialCode: chip.materialCode,
      materialName: chip.materialName,
      specification: chip.material?.specification || '',
      unit: chip.material?.unit || '件',
      quantity: 1,
      ...buildLineFromNetPrice(1, 0, headerTaxRate),
      vendorId: vendorId,
      vendorName: chip.vendorName,
    } as OrderItem]);
    // 添加后再触发自动取价
    setTimeout(() => handleMaterialChange(newId, chip.materialId), 0);
  };

  /** A2：表头税率变更 → 带出到所有行（行仍可单独覆盖） */
  const handleHeaderTaxRateChange = (rate: number) => {
    setHeaderTaxRate(rate);
    setItems(prev => prev.map(i => recalcLine({ ...i, taxRate: rate }, taxIncluded)));
  };

  /** A2：含税/未税切换 → 保持未税单价不变，仅切换录入口径 */
  const handleTaxIncludedChange = (next: boolean) => {
    setTaxIncluded(next);
    setItems(prev => prev.map(i => recalcLine(i, false)));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // 选择物料时，自动取价（优先级：信息记录 > 价目表 fallback）；纯函数便于网格 onMaterialChange 复用
  const buildPOMaterialPatch = (materialId: string, effectiveVendorId: string, quantity: number): Record<string, any> => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return {};

    // P0-05：优先查信息记录（供应商+物料+active）
    const infoRecords = usePurchaseInfoRecordStore.getState().records
      .filter(r => r.vendorId === effectiveVendorId && r.materialId === materialId && r.status === 'active')
      .sort((a, b) => a.unitPrice - b.unitPrice);

    const base: Record<string, any> = {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      specification: material.specification || '',
      unit: material.unit,
      sourceInfoRecordId: undefined as string | undefined,
      sourcePriceItemId: undefined as string | undefined,
      leadTime: undefined as number | undefined,
    };

    if (infoRecords.length > 0) {
      const best = infoRecords[0];
      return {
        ...base,
        ...buildLineFromNetPrice(quantity, best.unitPrice, headerTaxRate),
        vendorId: best.vendorId,
        vendorName: best.vendorName,
        sourceInfoRecordId: best.id,
        leadTime: best.leadTime,
      };
    }
    // Fallback：从价目表抓取价格
    const priceOpts = getPriceOptions(materialId);
    if (priceOpts.length > 0) {
      const bestPrice = priceOpts[0];
      return {
        ...base,
        ...buildLineFromNetPrice(quantity, bestPrice.unitPrice, headerTaxRate),
        vendorId: bestPrice.vendorId,
        vendorName: bestPrice.vendorName,
        sourcePriceItemId: bestPrice.id,
      };
    }
    return { ...base, ...buildLineFromNetPrice(quantity, 0, headerTaxRate) };
  };

  // ── 物料明细：Excel 式网格（多行复制粘贴 / 列显隐 / 物料号名称分列）──
  const poMaterialOptions = materials.map(m => ({
    id: m.id, code: m.code, name: m.name, specification: m.specification || '', unit: m.unit, price: m.price,
  }));

  // 选中物料时按当前主供应商自动取价
  const handlePOMaterialPricing = (rowId: string, materialId: string): Record<string, any> =>
    buildPOMaterialPatch(materialId, vendorId, items.find(i => i.id === rowId)?.quantity || 1);

  // 单价/数量/税率任一变化 → 重算单行税价（与表头含税口径一致）
  const computePORow = (row: any): Record<string, any> => recalcLine(row as OrderItem, taxIncluded);

  // 设置某行供应商并重新取价
  const setRowVendor = (rowId: string, vId: string, vName: string, unitPrice?: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      const patch = unitPrice != null
        ? buildLineFromNetPrice(item.quantity, unitPrice, item.taxRate ?? headerTaxRate)
        : {};
      return { ...item, vendorId: vId, vendorName: vName, ...patch, sourceInfoRecordId: undefined, sourcePriceItemId: undefined };
    }));
  };

  const poColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 130, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 180, fixed: true },
    { key: 'specification', label: '规格', fillFromMaterial: 'specification', width: 140, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 60, hideable: true },
    { key: 'quantity', label: '数量', type: 'number', align: 'right', width: 80, min: 1, step: 1 },
    { key: 'unitPrice', label: '未税单价', type: 'number', align: 'right', width: 110, min: 0, step: 0.01 },
    { key: 'taxRate', label: '税率(%)', type: 'number', align: 'right', width: 80, min: 0, max: 100, step: 1 },
    { key: 'priceWithTax', label: '含税单价', type: 'number', align: 'right', width: 110, min: 0, step: 0.01, hideable: true },
    { key: 'amount', label: '未税金额', type: 'readonly', align: 'right', width: 110 },
    { key: 'taxAmount', label: '税额', type: 'readonly', align: 'right', width: 90, hideable: true },
    { key: 'amountWithTax', label: '价税合计', type: 'readonly', align: 'right', width: 110 },
    {
      key: 'vendorId', label: '供应商', width: 230,
      renderCell: (row) => {
        const opts = row.materialId ? getVendorOptionsForMaterial(row.materialId) : [];
        const cur = opts.find((v: any) => v.id === row.vendorId) || null;
        return (
          <Box>
            <Autocomplete
              size="small"
              options={opts}
              getOptionLabel={(o: any) => `${o.name} (${formatCurrency(o.unitPrice)})`}
              value={cur}
              onChange={(_, nv: any) => { if (nv) setRowVendor(row.id, nv.id, nv.name, nv.unitPrice); }}
              renderInput={(params) => <TextField {...params} placeholder="选择供应商" />}
              isOptionEqualToValue={(o: any, v: any) => o.id === v.id}
              noOptionsText="该物料暂无有效价目表"
              sx={{ minWidth: 200 }}
            />
            {row.sourceInfoRecordId && (() => {
              const irs = usePurchaseInfoRecordStore.getState().records
                .filter(r => r.vendorId === vendorId && r.materialId === row.materialId && r.status === 'active')
                .sort((a, b) => a.unitPrice - b.unitPrice);
              if (!irs.length) return null;
              const min = irs[0].unitPrice, max = irs[irs.length - 1].unitPrice;
              const txt = irs.length > 1 ? ` ${formatCurrency(min)} ~ ${formatCurrency(max)}` : ` ${formatCurrency(min)}`;
              return <Chip size="small" color="info" variant="outlined" label={`信息记录取价${txt}`} sx={{ mt: 0.5 }} />;
            })()}
            {row.sourcePriceItemId && (() => {
              const src = priceList.find(p => p.id === row.sourcePriceItemId);
              return src ? <Chip size="small" color="success" variant="outlined" label={`价目表 ${src.sourceApprovalNo}`} sx={{ mt: 0.5 }} /> : null;
            })()}
            <Tooltip title="从价目表/信息记录抓取最新价格">
              <span>
                <IconButton size="small" color="success" onClick={() => handleFetchPrice(row.id)}
                  disabled={!row.materialId || (getPriceOptions(row.materialId).length === 0 && usePurchaseInfoRecordStore.getState().records.filter(r => r.vendorId === vendorId && r.materialId === row.materialId && r.status === 'active').length === 0)}>
                  <AutoAwesome fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
    { key: 'expectedDeliveryDate', label: '预计交货', type: 'date', width: 140, hideable: true },
  ];

  const makePORow = () => ({
    id: '', materialId: '', materialCode: '', materialName: '', specification: '', unit: '件',
    quantity: 1, ...buildLineFromNetPrice(1, 0, headerTaxRate),
    vendorId: vendorId, vendorName: vendorOptions.find(v => v.id === vendorId)?.name || '',
    expectedDeliveryDate: '',
  });

  const handleMaterialChange = (itemId: string, materialId: string, overrideVendorId?: string) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    const effectiveVendorId = overrideVendorId ?? vendorId;
    const qty = items.find(i => i.id === itemId)?.quantity || 1;
    const patch = buildPOMaterialPatch(materialId, effectiveVendorId, qty);
    setItems(prev => prev.map(item => (item.id !== itemId ? item : { ...item, ...patch })));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value } as OrderItem;
      // A2：数量/单价/含税单价/税率任一变化都重算整行税价
      if (field === 'quantity' || field === 'unitPrice' || field === 'priceWithTax' || field === 'taxRate') {
        return recalcLine(updated, taxIncluded);
      }
      return updated;
    }));
  };

  /** A2：录入单价（按当前口径写入 unitPrice 或 priceWithTax） */
  const handlePriceInput = (id: string, value: number) => {
    handleItemChange(id, taxIncluded ? 'priceWithTax' : 'unitPrice', value);
  };

  // 手动抓取价格（信息记录优先，价目表 fallback）
  const handleFetchPrice = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      // 优先查信息记录
      const infoRecords = usePurchaseInfoRecordStore.getState().records
        .filter(r => r.vendorId === vendorId && r.materialId === item.materialId && r.status === 'active')
        .sort((a, b) => a.unitPrice - b.unitPrice);
      if (infoRecords.length > 0) {
        const best = infoRecords[0];
        return {
          ...item,
          ...buildLineFromNetPrice(item.quantity, best.unitPrice, item.taxRate ?? headerTaxRate),
          vendorId: best.vendorId,
          vendorName: best.vendorName,
          sourceInfoRecordId: best.id,
          sourcePriceItemId: undefined,
          leadTime: best.leadTime,
        };
      }
      // Fallback：价目表
      const priceOpts = getPriceOptions(item.materialId);
      if (priceOpts.length > 0) {
        const best = priceOpts[0];
        return {
          ...item,
          ...buildLineFromNetPrice(item.quantity, best.unitPrice, item.taxRate ?? headerTaxRate),
          vendorId: best.vendorId,
          vendorName: best.vendorName,
          sourcePriceItemId: best.id,
          sourceInfoRecordId: undefined,
        };
      }
      return item;
    }));
  };

  // 获取某物料的可用供应商（从价目表）
  const getVendorOptionsForMaterial = (materialId: string) => {
    if (!materialId) return [];
    const priceOpts = getPriceOptions(materialId);
    return priceOpts.map(p => ({ id: p.vendorId, name: p.vendorName, unitPrice: p.unitPrice }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入订单标题';
    if (!vendorId) newErrors.vendorId = '请选择供应商';
    if (items.length === 0) newErrors.items = '请添加至少一项物料';
    items.forEach(item => {
      if (!item.materialId) newErrors[`item_${item.id}_material`] = '请选择物料';
      if (item.quantity <= 0) newErrors[`item_${item.id}_qty`] = '数量必须大于0';
      if (item.unitPrice < 0) newErrors[`item_${item.id}_price`] = '单价不能为负';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * B6 黑名单硬卡点：选中供应商处于黑名单时阻断落库（暂存与提交共用）。
   * 返回 true 表示已被拦截，调用方须立即 return。
   */
  const blockedByBlacklist = (): boolean => {
    if (!vendorId) return false;
    const bl = checkVendorBlacklist(vendorId);
    if (!bl.blacklisted) return false;
    notifyError(
      `供应商已列入黑名单，采购订单无法保存：\n` +
        `供应商：${bl.vendorName || vendorId}\n` +
        `拉黑原因：${bl.reason || '未填写'}\n` +
        `拉黑时间：${bl.blacklistedAt || '—'}\n\n` +
        `请更换合格供应商，或由采购部在「供应商管理 → 黑名单管理」解除黑名单后重试。`
    );
    return true;
  };

  const handleSaveDraft = () => {
    // B6：黑名单供应商连草稿都不允许落库
    if (blockedByBlacklist()) return;
    const now = new Date().toISOString();
    // B1：暂存 = 回到草稿态，不占用供应商信用；若本单此前已占用则先释放
    if (prevCredit.vendorId) {
      applyVendorCreditDelta(prevCredit.vendorId, -prevCredit.amount);
    }
    const orderItems = items.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      orderedQuantity: item.quantity,
      deliveredQuantity: 0,
      unitPrice: item.unitPrice,
      amount: item.amount,
      // A2 税价拆分
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      priceWithTax: item.priceWithTax,
      amountWithTax: item.amountWithTax,
    }));

    if (isEditMode && existingOrder) {
      updatePurchaseOrder(id!, {
        vendorId,
        status: 'created',
        purchaseType,
        orderMode,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        expectedDeliveryDate,
        remarks: isServiceOrder ? serviceDescription : remarks,
        projectNo: projectNo || undefined,
        projectName: projectName || undefined,
        updatedAt: now,
        customFields,
        updatedBy: '当前用户',
        // B1：草稿态不占用信用
        creditOccupied: false,
        creditAmount: 0,
      });
    } else {
      const orderNo = nextNo('PO');
      addPurchaseOrder({
        id: `po-${Date.now()}`,
        orderNo,
        vendorId,
        vendorName: vendors.find(v => v.id === vendorId)?.name || '',
        status: 'created',
        purchaseType,
        orderMode,
        sourceRequestIds: fromRequestIds,
        orderDate: now.split('T')[0],
        expectedDeliveryDate,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        deliveryAddress: '',
        remarks: isServiceOrder ? serviceDescription : remarks,
        projectNo: projectNo || undefined,
        projectName: projectName || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: '当前用户',
        customFields,
        updatedBy: '当前用户',
        // B1：草稿态不占用信用
        creditOccupied: false,
        creditAmount: 0,
      });
      // 回写采购申请：标记已转订单，形成 PR→PO 血缘闭环
      fromRequestIds.forEach((rid) => updatePurchaseRequest(rid, { status: 'ordered' }));
    }
    navigate('/purchase/orders');
  };

  const handleSubmit = () => {
    if (!validate()) {
      const errorMessages = Object.values(errors).filter(Boolean).join('\n');
      notifyError(`请修正以下问题：\n${errorMessages}`);
      return;
    }
    // 自定义字段必填校验
    const cfDefs = useCustomFieldStore.getState().fields.purchaseOrder || [];
    for (const def of cfDefs) {
      if (def.required) {
        const v = customFields[def.key];
        if (v === undefined || v === null || v === '' || (def.type === 'checkbox' && v === false)) {
          notifyError(`请填写必填自定义字段：${def.label}`);
          return;
        }
      }
    }
    // ===== B6 黑名单卡点：优先于信用检查，命中即阻断，订单不落库 =====
    if (blockedByBlacklist()) return;

    const now = new Date().toISOString();

    // ===== B1 信用卡点：提交前预检 → 释放旧占用 → 占用新额度（失败即回滚并阻断） =====
    const offset = prevCredit.vendorId === vendorId ? prevCredit.amount : 0;
    const chk = checkVendorCredit(vendorId, creditAmount - offset);
    if (!chk.ok) {
      notifyError(
        `供应商信用额度不足，订单无法提交：\n` +
          `供应商：${chk.vendorName || vendorId}\n` +
          `授信额度：${formatCurrency(chk.limit ?? 0, currency)}\n` +
          `已占用：${formatCurrency(Math.max(0, chk.used - offset), currency)}\n` +
          `本单需占用：${formatCurrency(creditAmount, currency)}\n` +
          `可用额度：${formatCurrency(Math.max(0, chk.available + offset), currency)}\n\n` +
          `请调整订单金额，或联系财务提升授信额度后重试。`
      );
      return;
    }
    // 先释放本单旧占用（换供应商 / 改金额场景），再按新金额占用
    if (prevCredit.vendorId) {
      applyVendorCreditDelta(prevCredit.vendorId, -prevCredit.amount);
    }
    const occupied = applyVendorCreditDelta(vendorId, creditAmount);
    if (!occupied) {
      // 占用失败 → 回滚旧占用，保持数据一致
      if (prevCredit.vendorId) {
        applyVendorCreditDelta(prevCredit.vendorId, prevCredit.amount);
      }
      notifyError('供应商信用额度占用失败，订单未提交。请核对供应商授信设置后重试。');
      return;
    }

    const orderItems = items.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      orderedQuantity: item.quantity,
      deliveredQuantity: 0,
      unitPrice: item.unitPrice,
      amount: item.amount,
      // A2 税价拆分
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      priceWithTax: item.priceWithTax,
      amountWithTax: item.amountWithTax,
    }));

    if (isEditMode && existingOrder) {
      updatePurchaseOrder(id!, {
        vendorId,
        vendorName: vendors.find(v => v.id === vendorId)?.name || existingOrder.vendorName,
        status: 'created',
        orderMode,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        expectedDeliveryDate,
        remarks,
        projectNo: projectNo || undefined,
        projectName: projectName || undefined,
        updatedAt: now,
        customFields,
        updatedBy: '当前用户',
        // B1：记录占用标记与占用金额快照
        creditOccupied: true,
        creditAmount,
      });
    } else {
      const orderNo = nextNo('PO');
      addPurchaseOrder({
        id: `po-${Date.now()}`,
        orderNo,
        vendorId,
        vendorName: vendors.find(v => v.id === vendorId)?.name || '',
        status: 'created',
        orderMode,
        sourceRequestIds: fromRequestIds,
        orderDate: now.split('T')[0],
        expectedDeliveryDate,
        items: orderItems,
        totalAmount,
        currency,
        exchangeRate,
        taxIncluded,
        totalTaxAmount,
        grandTotal,
        paymentTerms,
        tradeTerms,
        deliveryAddress: '',
        remarks,
        projectNo: projectNo || undefined,
        projectName: projectName || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: '当前用户',
        customFields,
        updatedBy: '当前用户',
        // B1：记录占用标记与占用金额快照
        creditOccupied: true,
        creditAmount,
      });
      // 回写采购申请：标记已转订单，形成 PR→PO 血缘闭环
      fromRequestIds.forEach((rid) => updatePurchaseRequest(rid, { status: 'ordered' }));
    }
    navigate('/purchase/orders');
  };

  const buildPrintRecord = (): Record<string, any> => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return {
      orderNo: existingOrder?.orderNo || '(尚未保存)',
      vendorName: vendor?.name || title || '',
      vendorCode: vendor?.code || '',
      orderDate: existingOrder?.orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate,
      paymentTerms,
      tradeTerms,
      currency,
      projectName,
      projectNo,
      remarks,
      items: items.map((it: OrderItem) => ({
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount,
        taxRate: it.taxRate,
        taxAmount: it.taxAmount,
        priceWithTax: it.priceWithTax,
        amountWithTax: it.amountWithTax,
        expectedDeliveryDate: it.expectedDeliveryDate,
      })),
    };
  };

  return (
    <PageWrapper
      title={isEditMode ? `修改采购订单${existingOrder ? ' - ' + existingOrder.orderNo : ''}` : '新建采购订单'}
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="purchase-order" currentStatus="po_draft" />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/purchase/orders')}>返回</Button>
          <PrintPreviewButton entity="purchaseOrder" record={buildPrintRecord()} showBoth />
          <Button variant="outlined" startIcon={<Save />} onClick={handleSaveDraft}>暂存</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handleSubmit}>{isEditMode ? '保存修改' : '提交订单'}</Button>
        </Stack>
      }
    >
      {/* 从采购申请转入的提示 */}
      {isConvertMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {isServiceOrder
            ? <>已从 <strong>{sourceRequests.length}</strong> 条服务采购申请转入：{sourceRequests.map(r => r.requestNo).join('、')}（服务类订单不涉及收货/质检/入库）</>
            : <>已从 <strong>{sourceRequests.length}</strong> 条采购申请转入物料明细：{sourceRequests.map(r => r.requestNo).join('、')}</>
          }
        </Alert>
      )}

      {/* 基本信息 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>订单信息</Typography>

        {/* 模板选择（仅新建模式） */}
        {!isEditMode && orderTemplates.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #86EFAC' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={showTemplateSelect ? 1.5 : 0}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={600} color="success.main">
                  📋 订单模板
                </Typography>
                {selectedTemplate && (
                  <Chip label={selectedTemplate.name} size="small" color="success" onDelete={() => {
                    setSelectedTemplate(null);
                    // Reset form
                    setVendorId('');
                    setTitle('');
                    setPaymentTerms('');
                    setTradeTerms('');
                    setDeliveryTerms('');
                    setRemarks('');
                    setItems([]);
                  }} />
                )}
              </Stack>
              <Button size="small" variant="text"
                onClick={() => setShowTemplateSelect(!showTemplateSelect)}>
                {showTemplateSelect ? '收起' : '展开'}
              </Button>
            </Stack>
            {showTemplateSelect && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {orderTemplates.map((tpl: any) => (
                  <Chip
                    key={tpl.id}
                    label={tpl.name}
                    variant={selectedTemplate?.id === tpl.id ? 'filled' : 'outlined'}
                    color={selectedTemplate?.id === tpl.id ? 'success' : 'default'}
                    onClick={() => handleApplyTemplate(tpl)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* P2-06 采购模式 */}
        <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500, fontSize: '0.875rem' }}>采购模式</FormLabel>
        <RadioGroup
          row
          value={orderMode}
          onChange={(e) => setOrderMode(e.target.value as 'standard' | 'consignment')}
          data-testid="po-order-mode"
          sx={{ mb: 2 }}
        >
          <FormControlLabel value="standard" control={<Radio />} label="标准采购" />
          <FormControlLabel value="consignment" control={<Radio />} label="寄售采购" />
        </RadioGroup>

        <Grid2 container spacing={2}>
          <Grid2 xs={12} sm={6}>
            <TextField
              fullWidth label="订单标题" value={title}
              onChange={e => setTitle(e.target.value)}
              error={!!errors.title} helperText={errors.title}
              placeholder="如：钢板Q235B采购订单"
            />
          </Grid2>
          <Grid2 xs={12} sm={6}>
            <Autocomplete
              options={vendorOptions}
              getOptionLabel={(o) => o.name}
              value={vendorOptions.find(v => v.id === vendorId) || null}
              onChange={(_, newVal) => {
                const oldVendorId = vendorId;
                setVendorId(newVal?.id || '');
                // 同步更新所有未选择供应商的行
                if (newVal) {
                  setItems(prev => prev.map(item => {
                    if (!item.vendorId) {
                      return { ...item, vendorId: newVal.id, vendorName: newVal.name };
                    }
                    return item;
                  }));
                  // 供应商切换后，为已有物料的行重新取价
                  if (newVal.id !== oldVendorId) {
                    const currentItems = items;
                    currentItems
                      .filter(it => it.materialId)
                      .forEach(it => {
                        handleMaterialChange(it.id, it.materialId, newVal.id);
                      });
                  }
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="主供应商" error={!!errors.vendorId} helperText={errors.vendorId} required />
              )}
            />
          </Grid2>
          {/* B6 黑名单卡点：选中黑名单供应商即时预警，提交/暂存均会被阻断 */}
          {blacklistInfo && (
            <Grid2 xs={12}>
              <Alert severity="error" data-testid="po-vendor-blacklist" sx={{ py: 0.5 }}>
                供应商「{blacklistInfo.vendorName}」已列入黑名单（{blacklistInfo.blacklistedAt || '—'}）：
                {blacklistInfo.reason || '未填写原因'} —— 本单无法提交或暂存，请更换供应商。
              </Alert>
            </Grid2>
          )}
          {/* B1 信用卡点：选中供应商后实时展示授信画像与超额预警 */}
          {creditInfo && (
            <Grid2 xs={12}>
              <Alert
                severity={creditInfo.willExceed ? 'error' : creditInfo.limit == null ? 'info' : 'success'}
                data-testid="po-vendor-credit"
                sx={{ py: 0.5 }}
              >
                {creditInfo.limit == null ? (
                  <>供应商「{creditInfo.vendorName}」未设置授信额度，不做信用管控。</>
                ) : (
                  <>
                    供应商「{creditInfo.vendorName}」授信额度 {formatCurrency(creditInfo.limit, currency)}，
                    已占用 {formatCurrency(creditInfo.used, currency)}，
                    可用 <strong data-testid="po-credit-available">{formatCurrency(creditInfo.available, currency)}</strong>
                    ，本单需占用 <strong data-testid="po-credit-need">{formatCurrency(creditAmount, currency)}</strong>
                    {creditInfo.willExceed && ' —— 已超出可用额度，提交将被阻断'}
                  </>
                )}
              </Alert>
            </Grid2>
          )}
          <Grid2 xs={12} sm={6}>
            <TextField fullWidth label="付款条件" value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              placeholder="如：货到验收后30天付清" />
          </Grid2>
          <Grid2 xs={12} sm={6}>
            <Autocomplete
              options={tradeTermOptions}
              value={tradeTerms || null}
              onChange={(_, newVal) => setTradeTerms(newVal || '')}
              renderInput={(params) => (
                <TextField {...params} label="贸易条件" placeholder="选择或输入贸易条款" />
              )}
              freeSolo
              isOptionEqualToValue={(o, v) => o === v}
            />
          </Grid2>
          <Grid2 xs={12} sm={6}>
            <TextField fullWidth label="交付条件" value={deliveryTerms}
              onChange={e => setDeliveryTerms(e.target.value)}
              placeholder="如：含运费到厂" />
          </Grid2>
          {/* A2 税价拆分：币种 / 价格类型 / 默认税率 */}
          <Grid2 xs={12} sm={4}>
            <TextField
              select fullWidth label="币种" value={currency}
              onChange={e => setCurrency(e.target.value)}
              data-testid="po-currency"
              helperText="影响金额展示与后续汇率折算"
            >
              {CURRENCY_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>
          <Grid2 xs={12} sm={4}>
            <TextField
              select fullWidth label="价格类型" value={taxIncluded ? 'true' : 'false'}
              onChange={e => handleTaxIncludedChange(e.target.value === 'true')}
              data-testid="po-tax-included"
              helperText={taxIncluded ? '单价按含税价录入，自动反算未税' : '单价按未税价录入，自动计算税额'}
            >
              <MenuItem value="false">未税价</MenuItem>
              <MenuItem value="true">含税价</MenuItem>
            </TextField>
          </Grid2>
          <Grid2 xs={12} sm={4}>
            <TextField
              select fullWidth label="默认税率" value={headerTaxRate}
              onChange={e => handleHeaderTaxRateChange(Number(e.target.value))}
              data-testid="po-tax-rate"
              helperText="带出到全部行，行内可单独调整"
            >
              {TAX_RATE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid2>
          <Grid2 xs={12} sm={6}>
            <TextField fullWidth label="期望交货日期" type="date" value={expectedDeliveryDate}
              onChange={e => setExpectedDeliveryDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid2>
          <Grid2 xs={12}>
            <TextField fullWidth label="备注" value={remarks} onChange={e => setRemarks(e.target.value)}
              multiline rows={2} />
          </Grid2>
          <Grid2 xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={projects}
              getOptionLabel={(opt) => `${opt.projectName} (${opt.projectNo})`}
              value={null}
              onChange={(_, v) => {/* mock */}}
              renderInput={(params) => (
                <TextField {...params} label="关联项目（编号+名称）" placeholder="选择或搜索项目" />
              )}
              noOptionsText="未找到匹配项目"
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
          </Grid2>
        </Grid2>
      </Paper>

      {/* 采购明细 */}
      {isServiceOrder ? (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>服务描述</Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            label="服务内容描述"
            value={serviceDescription}
            onChange={e => setServiceDescription(e.target.value)}
            placeholder="请详细描述服务采购的内容、范围、要求等..."
            helperText="服务类采购不涉及物料明细、收货入库和质检流程"
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            服务类采购订单不涉及收货/质检/入库操作，确认后直接进入付款流程。
          </Alert>
        </Paper>
      ) : (
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>物料明细</Typography>
          <Typography variant="caption" color="text.secondary">
            选择物料后自动从价目表抓取最新价格；支持 Excel 多行复制粘贴、可配置显示列，物料号与名称分列录入。
          </Typography>
        </Box>

        {errors.items && <Alert severity="error" sx={{ mb: 2 }}>{errors.items}</Alert>}

        {/* P0-06：货源清单推荐物料 */}
        {sourceChips.length > 0 && (
          <Box data-testid="so-source-chips" sx={{ mb: 2, p: 1.5, bgcolor: '#EFF6FF', borderRadius: 2, border: '1px solid #93C5FD' }}>
            <Typography variant="caption" color="primary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
              该供应商货源清单推荐物料（点击快速添加）：
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {sourceChips.map(chip => (
                <Chip
                  key={chip.id}
                  label={`${chip.materialCode} ${chip.materialName}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  clickable
                  onClick={() => handleSourceChipClick(chip)}
                  icon={chip.fixedVendor ? <AutoAwesome sx={{ fontSize: 14 }} /> : undefined}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* 物料责任人（采购视角：采购员）—— 自动按各物料分类聚合显示 */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <ResponsiblePersons
            categoryIds={poCategoryIds}
            roles={['buyer']}
            title="相关物料责任人（采购）"
          />
        </Paper>

        <MaterialLineItemsGrid
          columns={poColumns}
          value={items}
          onChange={(rows) => setItems(rows as any)}
          materials={poMaterialOptions}
          onMaterialChange={handlePOMaterialPricing}
          computeRow={computePORow}
          newRow={makePORow}
          storageKey="ssa-po-material-columns"
          addLabel="添加物料"
          testIdPrefix="po"
          footer={
            <Stack direction="row" justifyContent="space-between" alignItems="center" px={1}>
              <Typography variant="body2" color="text.secondary">
                共 {items.length} 项物料
              </Typography>
              <Box sx={{ textAlign: 'right' }} data-testid="po-total-block">
                <Typography variant="body2" color="text.secondary">
                  未税总额：<strong data-testid="po-total-net">{formatCurrency(totalAmount, currency)}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  税额合计：<strong data-testid="po-total-tax">{formatCurrency(totalTaxAmount, currency)}</strong>
                </Typography>
                <Typography variant="subtitle1" fontWeight={600} color="primary" data-testid="po-grand-total">
                  价税合计：{formatCurrency(grandTotal, currency)}
                </Typography>
              </Box>
            </Stack>
          }
        />
      </Paper>
      )}

      {/* 自定义字段 */}
      <Paper sx={{ p: 3 }}>
        <CustomFieldsSection entity="purchaseOrder" value={customFields} onChange={setCustomFields} />
      </Paper>
    </PageWrapper>
  );
};

export default OrderForm;

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Grid,
  Divider,
  Typography,
  TableFooter,
  Autocomplete,
  Stack,
  Chip,
  Tooltip,
} from '@mui/material';
import { Add, Delete, ArrowBack, Save } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageWrapper } from '@/components/layout';
import { FlowTracker, MaterialLineItemsGrid, GridColumn, findMissingRequired } from '@/components/common';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';
import { useMaterialStore, findCategoryById } from '@/stores/materialStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useProductionStore } from '@/stores/productionStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useUserStore } from '@/stores/userStore';
import { useMessageStore } from '@/stores/messageStore';
import { useGlobalToastStore } from '@/stores/globalToastStore';
import { useCustomFields } from '@/stores/customFieldStore';
// V3.95.0 自动化设置中心：自动通知/自动询价改为按「按物料分类」开关门控（不发起则静默跳过）
import { useAutomationStore } from '@/stores/automationStore';
import { isStageActive } from '@/types/automation';
import { formatCurrency } from '@/utils/format';
import { generatePurchaseRequestNo } from '@/utils/codeGenerator';

const purchaseSchema = z.object({
  title: z.string().min(1, '请输入标题'),
  type: z.string().min(1, '请选择类型'),
  priority: z.string().min(1, '请选择优先级'),
  department: z.string().min(1, '请输入部门'),
  // 期望交货时间已下沉到明细行（物料明细表必填列），表头不再强制
  expectedDate: z.string().optional(),
  reason: z.string().min(1, '请输入申请原因'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

/** 来源类型 */
type SourceType = 'manual' | 'salesOrder' | 'workOrder' | 'mrp';

const SOURCE_OPTIONS: { value: SourceType; label: string; desc: string }[] = [
  { value: 'manual', label: '手工创建', desc: '手动录入物料明细' },
  { value: 'salesOrder', label: '销售订单', desc: '从销售订单拉取物料需求' },
  { value: 'workOrder', label: '生产工单', desc: '从生产工单拉取物料需求' },
  { value: 'mrp', label: 'MRP需求', desc: '从MRP运算结果拉取采购建议' },
];

interface ItemRow {
  id: string;
  materialCode: string;   // 物料编码（手工输入/粘贴）
  materialId: string;     // 物料ID（匹配后回填）
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  estimatedAmount: number;
  /** 本行期望交货时间（明细级必填，区别于表头的整单期望日期） */
  deliveryDate: string;
}

const PurchaseForm: React.FC = () => {
  const { projects, salesOrders } = useSalesStore();
  const { workOrders, mrpRecommendations } = useProductionStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const materials = useMaterialStore(s => s.materials);
  const categories = useMaterialStore(s => s.categories);
  const vendors = useVendorStore(s => s.vendors);
  const users = useUserStore(s => s.users);
  const { purchaseRequests, addPurchaseRequest, updatePurchaseRequest, addVendorQuote } = usePurchaseStore();
  // V3.94.0 自配置字段定义：分类上的「供应商类别」、供应商上的「供应商类别」用于示例 B 自动询价匹配
  const categoryFieldDefs = useCustomFields('category');
  const vendorFieldDefs = useCustomFields('vendor');
  // V3.95.0 自动化设置中心：自动通知/询价按「按物料分类」开关门控
  const autoConfig = useAutomationStore(s => s.config);

  // 查找已有采购申请数据（编辑模式）
  const existingRequest = isEdit ? purchaseRequests.find(r => r.id === id) : undefined;

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      title: '',
      type: 'material',
      priority: 'normal',
      department: '',
      expectedDate: '',
      reason: '',
    },
  });

  // 监听采购类型，用于条件渲染
  const purchaseType = watch('type');

  const [items, setItems] = useState<ItemRow[]>([]);
  // 聚合本单所有物料所属分类，用于展示相关物料责任人（采购视角：采购员）
  const itemCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((it) => {
      if (it.materialId) {
        const m = materials.find((mm) => mm.id === it.materialId);
        if (m?.categoryId) ids.add(m.categoryId);
      }
    });
    return [...ids];
  }, [items, materials]);
  const [serviceDescription, setServiceDescription] = useState(existingRequest?.remarks || '');
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);
  // F8-1: 申请号（暂存时即生成，提交时可复用或重新生成）
  const [requestNo, setRequestNo] = useState<string>('');
  // F8-3: 来源类型 & 关联单据
  const [sourceType, setSourceType] = useState<SourceType>('manual');
  const [sourceDoc, setSourceDoc] = useState<any>(null);

  // 编辑模式：回填已有数据
  useEffect(() => {
    if (isEdit && existingRequest) {
      reset({
        title: existingRequest.title,
        type: existingRequest.type,
        priority: existingRequest.priority,
        department: existingRequest.department,
        expectedDate: existingRequest.expectedDate,
        reason: existingRequest.reason || '',
      });
      setRequestNo(existingRequest.requestNo);
      // 回填来源
      if ((existingRequest as any).sourceType) {
        setSourceType((existingRequest as any).sourceType || 'manual');
      }
      // 回填物料明细
      const filledItems: ItemRow[] = (existingRequest.items || []).map(item => ({
        id: item.id,
        materialCode: item.materialCode || materials.find(m => m.id === item.materialId)?.code || '',
        materialId: item.materialId,
        materialName: item.materialName || '',
        specification: item.specification || '',
        unit: item.unit || '',
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice || 0,
        estimatedAmount: item.estimatedAmount || 0,
        deliveryDate: item.deliveryDate || '',
      }));
      setItems(filledItems);
      // 回填项目（如有）
      if ((existingRequest as any).projectNo) {
        const proj = projects.find(p => p.projectNo === (existingRequest as any).projectNo);
        if (proj) setSelectedProject(proj);
      }
    }
  }, [isEdit, existingRequest, reset]);

  // ======================== 编号生成（F8-1）========================

  /** 生成或复用申请号 */
  const ensureRequestNo = (dept: string): string => {
    if (requestNo) return requestNo;
    const no = generatePurchaseRequestNo(dept, purchaseRequests.map(r => r.requestNo));
    setRequestNo(no);
    return no;
  };

  // ======================== 物料明细操作 ========================

  const addItem = (row?: Partial<ItemRow>) => {
    const newItem: ItemRow = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialCode: row?.materialCode || '',
      materialId: row?.materialId || '',
      materialName: row?.materialName || '',
      specification: row?.specification || '',
      unit: row?.unit || '',
      quantity: row?.quantity ?? 1,
      estimatedPrice: row?.estimatedPrice ?? 0,
      estimatedAmount: row?.estimatedAmount ?? 0,
      deliveryDate: row?.deliveryDate || '',
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  /** 通过物料编码/名称模糊匹配物料主数据 */
  const lookupMaterial = (keyword: string) => {
    if (!keyword.trim()) return null;
    const kw = keyword.trim().toLowerCase();
    // 优先精确匹配编码
    let mat = materials.find(m => m.code.toLowerCase() === kw);
    if (!mat) mat = materials.find(m => m.name.toLowerCase() === kw);
    if (!mat) mat = materials.find(m => m.code.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw));
    return mat || null;
  };

  /** 更新行数据 */
  const updateItem = (id: string, field: keyof ItemRow, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updatedItem = { ...item, [field]: value };
      // 当物料编码变化时，自动带回物料信息
      if (field === 'materialCode') {
        const mat = lookupMaterial(String(value));
        if (mat) {
          updatedItem.materialId = mat.id;
          updatedItem.materialCode = mat.code; // 标准化编码
          updatedItem.materialName = mat.name;
          updatedItem.specification = mat.specification || '';
          updatedItem.unit = mat.unit || '';
          updatedItem.estimatedPrice = mat.price || 0;
        } else {
          // 清空关联字段（用户可能还在输入中）
          updatedItem.materialId = '';
          updatedItem.materialName = '';
          updatedItem.specification = '';
          updatedItem.unit = '';
        }
      }
      // 重算金额
      if (field === 'quantity' || field === 'estimatedPrice') {
        updatedItem.estimatedAmount = Number(updatedItem.quantity || 0) * Number(updatedItem.estimatedPrice || 0);
      }
      return updatedItem;
    }));
  };

  // ======================== Excel 粘贴支持（F8-2）========================

  /** 解析粘贴文本为多行物料编码（支持纯文本多行，或 TSV 多列取首列） */
  const parsePasteLines = (text: string): string[] => {
    return text
      .split(/[\r\n]+/)
      .map(line => line.split('\t')[0].trim()) // 取首列（物料编码）
      .filter(line => line.length > 0);
  };

  /** 物料号列 / 批量粘贴区：拦截多行编码粘贴，批量导入并自动匹配物料信息（F8-2） */
  const handleMaterialPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const lines = parsePasteLines(text);
    if (lines.length <= 1) return; // 单行放行（走默认输入匹配）
    e.preventDefault();
    lines.forEach(code => {
      const mat = lookupMaterial(code);
      addItem({
        materialCode: mat ? mat.code : code,
        materialId: mat?.id || '',
        materialName: mat?.name || '',
        specification: mat?.specification || '',
        unit: mat?.unit || '',
        quantity: 1,
        estimatedPrice: mat?.price || 0,
        estimatedAmount: mat?.price || 0,
      });
    });
  };

  // ======================== 来源单据填充（F8-3）========================

  /** 根据来源单据填充物料明细 */
  const fillItemsFromSource = () => {
    if (!sourceDoc) return;
    let rows: ItemRow[] = [];

    switch (sourceType) {
      case 'salesOrder': {
        // 从销售订单 items 填充
        const orderItems = (sourceDoc.items || []) as Array<{
          materialId?: string; materialCode?: string;
          materialName?: string; specification?: string;
          unit?: string; quantity?: number; unitPrice?: number;
        }>;
        rows = orderItems.map((oi, idx) => {
          const mat = oi.materialId ? materials.find(m => m.id === oi.materialId) : null;
          return {
            id: `item-${Date.now()}-${idx}`,
            materialCode: oi.materialCode || mat?.code || '',
            materialId: oi.materialId || mat?.id || '',
            materialName: oi.materialName || mat?.name || '',
            specification: oi.specification || mat?.specification || '',
            unit: oi.unit || mat?.unit || '',
            quantity: oi.quantity ?? 1,
            estimatedPrice: oi.unitPrice || mat?.price || 0,
            estimatedAmount: (oi.quantity ?? 1) * (oi.unitPrice || mat?.price || 0),
            deliveryDate: (oi as any).deliveryDate || (oi as any).expectedDeliveryDate || '',
          };
        });
        break;
      }
      case 'workOrder': {
        // 从生产工单 materials 填充
        const woMaterials = (sourceDoc.materials || []) as Array<{
          materialId?: string; materialCode?: string;
          materialName?: string; requiredQty?: number;
        }>;
        rows = woMaterials.map((wm, idx) => {
          const mat = wm.materialId ? materials.find(m => m.id === wm.materialId) : null;
          return {
            id: `item-${Date.now()}-${idx}`,
            materialCode: wm.materialCode || mat?.code || '',
            materialId: wm.materialId || mat?.id || '',
            materialName: wm.materialName || mat?.name || '',
            specification: mat?.specification || '',
            unit: mat?.unit || '',
            quantity: wm.requiredQty ?? 1,
            estimatedPrice: mat?.price || 0,
            estimatedAmount: (wm.requiredQty ?? 1) * (mat?.price || 0),
            deliveryDate: (wm as any).requiredDate || '',
          };
        });
        break;
      }
      case 'mrp': {
        // 从 MRP 建议填充
        const rec = sourceDoc;
        const mat = rec.materialId ? materials.find(m => m.id === rec.materialId) : null;
        rows = [{
          id: `item-${Date.now()}-0`,
          materialCode: mat?.code || '',
          materialId: rec.materialId || mat?.id || '',
          materialName: mat?.name || rec.materialName || '',
          specification: mat?.specification || '',
          unit: mat?.unit || '',
          quantity: rec.suggestedOrderQty || 1,
          estimatedPrice: mat?.price || 0,
          estimatedAmount: (rec.suggestedOrderQty || 1) * (mat?.price || 0),
          deliveryDate: (rec as any).requiredDate || (rec as any).deliveryDate || '',
        }];
        break;
      }
    }

    if (rows.length > 0) {
      setItems(prev => [...prev, ...rows]);
    }
  };

  /** 获取当前来源类型的可选单据列表 */
  const getSourceOptions = (): any[] => {
    switch (sourceType) {
      case 'salesOrder':
        return salesOrders.filter(o => o.status !== 'cancelled');
      case 'workOrder':
        return workOrders.filter(o => o.status !== 'closed');
      case 'mrp':
        return mrpRecommendations;
      default:
        return [];
    }
  };

  /** 获取来源单据的展示标签 */
  const getSourceOptionLabel = (doc: any): string => {
    switch (sourceType) {
      case 'salesOrder':
        return `${doc.orderNo || ''} ${doc.customerName || ''}`.trim();
      case 'workOrder':
        return `${doc.orderNo || ''} ${doc.productName || ''}`.trim();
      case 'mrp':
        return `${doc.materialName || ''} (建议${doc.suggestedOrderQty || 0})`.trim();
      default:
        return '';
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0);

  // ── 物料清单：复用通用模块 MaterialLineItemsGrid（与采购订单/询价/合同/销售订单一致）──
  const prMaterialOptions = useMemo(
    () => materials.map(m => ({ id: m.id, code: m.code, name: m.name, specification: m.specification || '', unit: m.unit, price: m.price })),
    [materials],
  );

  /** 选中物料后返回补丁：用物料主数据价格回填预估单价（code/name/spec/unit 由列的 fillFromMaterial 自动填充） */
  const handlePRMaterialChange = (rowId: string, materialId: string): Partial<Record<string, any>> => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return {};
    return { estimatedPrice: mat.price || 0 };
  };

  /** 数量/单价任一变化 → 重算预估金额（保留原 updateItem 的逻辑） */
  const computePRRow = (row: any): Record<string, any> => ({
    estimatedAmount: (row.quantity || 0) * (row.estimatedPrice || 0),
  });

  const prColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 130, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 180, fixed: true },
    { key: 'specification', label: '规格', fillFromMaterial: 'specification', width: 140, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 60, hideable: true },
    { key: 'quantity', label: '数量', type: 'number', align: 'right', width: 80, min: 1, step: 1 },
    { key: 'estimatedPrice', label: '预估单价', type: 'number', align: 'right', width: 110, min: 0, step: 0.01, fillFromMaterial: 'price' },
    { key: 'estimatedAmount', label: '预估金额', type: 'readonly', align: 'right', width: 110 },
    { key: 'deliveryDate', label: '期望交货时间', type: 'date', width: 150, hideable: false, required: true },
  ];

  const makePRRow = (): ItemRow => ({
    id: `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    materialCode: '', materialId: '', materialName: '',
    specification: '', unit: '', quantity: 1,
    estimatedPrice: 0, estimatedAmount: 0, deliveryDate: '',
  });

  // ======================== 提交 / 暂存 ========================

  // ── V3.94.0 自动化联动 + V3.95.0 自动化设置中心门控：由物料所属分类反查采购员 / 供应商类别 ──
  // 示例A：归集本单所有物料所属分类挂的「采购员」。V3.95.0：仅对「采购需求/通知采购员」段
  //   在该分类下已发起（isStageActive）的分类才归集；未开启的分类静默跳过（不通知、不筛选），
  //   但 buyerIds/buyerNames 字段仍全量记录（仅影响下游自动通知是否发，不影响数据落地）。
  const resolveBuyers = (): { ids: string[]; names: string; activeCatCount: number } => {
    const ids: string[] = [];
    const seen = new Set<string>();
    let activeCatCount = 0;
    const seenCat = new Set<string>();
    items.forEach((it) => {
      if (!it.materialId) return;
      const m = materials.find((mm) => mm.id === it.materialId);
      if (!m?.categoryId) return;
      // V3.95.0 门控：该分类的「采购需求/通知采购员」段是否发起（分类覆盖 > 全局）
      if (!isStageActive(autoConfig, m.categoryId, 'purchase_request')) return;
      if (!seenCat.has(m.categoryId)) { seenCat.add(m.categoryId); activeCatCount += 1; }
      const cat = findCategoryById(categories, m.categoryId);
      const buyers = (cat?.responsiblePersons?.buyer as string[] | undefined) || [];
      buyers.forEach((b) => { if (!seen.has(b)) { seen.add(b); ids.push(b); } });
    });
    const names = ids.map((id) => users.find((u) => u.id === id)?.name || id).join('、');
    return { ids, names, activeCatCount };
  };

  // 示例B：归集本单物料分类上「供应商类别」字段值，匹配供应商同名字段，自动发起询价。
  // V3.95.0 门控：仅对「询价比价」段在该分类下已发起的分类才收集 wanted（未开启的分类不询价）。
  const autoInquiryByVendorCategory = (prId: string, prNo: string, prTitle: string) => {
    const catDef = categoryFieldDefs.find((d) => d.label.includes('供应商类别'));
    const vendorDef = vendorFieldDefs.find((d) => d.label.includes('供应商类别'));
    if (!catDef || !vendorDef) return;
    const wanted = new Set<string>();
    items.forEach((it) => {
      if (!it.materialId) return;
      const m = materials.find((mm) => mm.id === it.materialId);
      if (!m?.categoryId) return;
      // V3.95.0 门控：该分类的「询价比价」段是否发起
      if (!isStageActive(autoConfig, m.categoryId, 'inquiry_compare')) return;
      const cat = findCategoryById(categories, m.categoryId);
      const val = cat?.attributes?.[catDef.key];
      if (val != null && val !== '') wanted.add(String(val));
    });
    if (wanted.size === 0) return;
    const matched = vendors.filter((v) => {
      const vc = v.customFields?.[vendorDef.key];
      return vc != null && wanted.has(String(vc));
    });
    if (matched.length === 0) return;
    const quoteItems = items.map((it) => ({
      materialId: it.materialId,
      materialName: it.materialName,
      quantity: it.quantity,
      unitPrice: it.estimatedPrice || 0,
      amount: it.estimatedAmount || (it.quantity * (it.estimatedPrice || 0)),
    }));
    matched.forEach((v) => {
      addVendorQuote({
        id: `vq-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        requestId: prId,
        vendorId: v.id,
        vendorName: v.name,
        items: quoteItems,
        totalAmount,
        validUntil: '',
        remarks: `由采购申请 ${prNo}（${prTitle}）按物料分类「供应商类别」自动发起询价`,
        submittedAt: new Date().toISOString(),
      } as any);
    });
    useGlobalToastStore.getState().show(`已按供应商类别向 ${matched.length} 家供应商自动发起询价`, 'success');
    // V3.95.0 记自动化运行日志（询价比价段；取本单第一个带分类的物料作代表）
    const repMat = items.find((it) => it.materialId && materials.find((mm) => mm.id === it.materialId)?.categoryId);
    const repCatId = repMat?.materialId ? materials.find((mm) => mm.id === repMat.materialId)?.categoryId || '' : '';
    useAutomationStore.getState().log({
      stage: 'inquiry_compare',
      categoryId: repCatId,
      actor: '当前用户',
      action: `采购申请 ${prNo}（${prTitle}）按物料分类「供应商类别」自动向 ${matched.length} 家供应商发起询价`,
      result: 'success',
    });
  };

  const onSubmit = (data: PurchaseFormData) => {
    // 物料采购：明细「期望交货时间」为必填，逐行校验，缺则拦截提交并定位到缺失行/列
    if (data.type === 'material') {
      const missing = findMissingRequired(items, prColumns);
      if (missing.length > 0) {
        useGlobalToastStore.getState().show(
          `物料明细必填项不完整，无法提交：第 ${missing.map((m) => m.index).join('、')} 行缺少 ${missing[0].missing.join('、')}`,
          'error',
        );
        return;
      }
    }
    const now = new Date().toISOString();
    const no = ensureRequestNo(data.department);
    const requestItems = items.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      estimatedPrice: item.estimatedPrice,
      estimatedAmount: item.estimatedAmount,
      deliveryDate: item.deliveryDate,
    }));

    if (isEdit && existingRequest) {
      updatePurchaseRequest(id!, {
        title: data.title,
        type: data.type as 'material' | 'service',
        priority: data.priority as any,
        department: data.department,
        expectedDate: data.expectedDate,
        reason: data.reason,
        remarks: data.type === 'service' ? serviceDescription : undefined,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject?.projectNo,
        projectName: selectedProject?.projectName,
        updatedAt: now,
        updatedBy: '当前用户',
      });
    } else {
      const prId = `pr-${Date.now()}`;
      // 示例A：由物料分类反查归属采购员（V3.95.0：仅归集「采购需求」段已开启的分类）
      const { ids: buyerIds, names: buyerNames, activeCatCount } = resolveBuyers();
      addPurchaseRequest({
        id: prId,
        requestNo: no,
        title: data.title,
        applicant: '当前用户',
        department: data.department,
        type: data.type as 'material' | 'service',
        priority: data.priority as any,
        reason: data.reason,
        remarks: data.type === 'service' ? serviceDescription : undefined,
        expectedDate: data.expectedDate || '',
        status: 'pending',
        sourceType,
        sourceNo: sourceDoc ? (sourceDoc.orderNo || sourceDoc.id) : undefined,
        sourceName: sourceDoc ? getSourceOptionLabel(sourceDoc) : undefined,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject?.projectNo,
        projectName: selectedProject?.projectName,
        buyerIds,
        buyerNames,
        createdAt: now,
        updatedAt: now,
        createdBy: '当前用户',
        updatedBy: '当前用户',
      });
      // 示例A：自动通知归属采购员办理（V3.95.0：仅当本单确有分类开启了「采购需求」段）
      if (buyerIds.length) {
        buyerIds.forEach((bid) => {
          void useMessageStore.getState().send({
            title: '新的采购申请待办理',
            body: `您负责的采购申请「${data.title}」(${no}) 已提交，请及时处理。`,
            type: 'announce',
            recipientId: bid,
            refModule: 'purchase-request',
            refId: prId,
          });
        });
        useGlobalToastStore.getState().show(`已通知 ${buyerIds.length} 名采购员办理`, 'success');
        useAutomationStore.getState().log({
          stage: 'purchase_request',
          categoryId: '',
          actor: '当前用户',
          action: `采购申请 ${no}（${data.title}）按物料分类自动通知 ${buyerIds.length} 名采购员办理`,
          result: 'success',
        });
      } else if (activeCatCount > 0) {
        // 开启了采购需求段的分类存在，但那些分类上没挂采购员 → 提示寻源/异常（sourcing 段）
        useAutomationStore.getState().log({
          stage: 'sourcing',
          categoryId: '',
          actor: '当前用户',
          action: `采购申请 ${no} 已开启采购需求但「未维护采购员」，请对应采购员寻源/处理异常`,
          result: 'skipped',
        });
      }
      // 示例B：按物料分类「供应商类别」自动向匹配供应商发起询价
      autoInquiryByVendorCategory(prId, no, data.title);
    }
    navigate('/purchase/requests');
  };

  const handleSaveDraft = () => {
    const now = new Date().toISOString();
    const dept = control._formValues.department || '';
    const no = ensureRequestNo(dept);
    const requestItems = items.map(item => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      estimatedPrice: item.estimatedPrice,
      estimatedAmount: item.estimatedAmount,
      deliveryDate: item.deliveryDate,
    }));

    if (isEdit && existingRequest) {
      updatePurchaseRequest(id!, {
        title: control._formValues.title || existingRequest.title,
        status: 'draft',
        type: (control._formValues.type || existingRequest.type) as 'material' | 'service',
        remarks: control._formValues.type === 'service' ? serviceDescription : undefined,
        items: requestItems,
        totalAmount,
        projectNo: selectedProject?.projectNo,
        projectName: selectedProject?.projectName,
        updatedAt: now,
        updatedBy: '当前用户',
      });
    } else {
        addPurchaseRequest({
        id: `pr-${Date.now()}`,
        requestNo: no,
        title: '草稿 - 采购申请',
        applicant: '当前用户',
        department: dept,
        type: (control._formValues.type || 'material') as 'material' | 'service',
        priority: 'normal',
        reason: '',
        remarks: control._formValues.type === 'service' ? serviceDescription : undefined,
        expectedDate: '',
        status: 'draft',
        sourceType,
        sourceNo: sourceDoc ? (sourceDoc.orderNo || sourceDoc.id) : undefined,
        sourceName: sourceDoc ? getSourceOptionLabel(sourceDoc) : undefined,
        items: requestItems,
        totalAmount,
        // 草稿亦反查采购员（V3.95.0：仅归集「采购需求」段已开启的分类；便于后续提交即通知，不在此处发消息）
        ...(() => {
          const rb = resolveBuyers();
          return { buyerIds: rb.ids, buyerNames: rb.names };
        })(),
        createdAt: now,
        updatedAt: now,
        createdBy: '当前用户',
        updatedBy: '当前用户',
      });
    }
    navigate('/purchase/requests');
  };

  // ======================== 渲染 ========================

  return (
    <PageWrapper
      title={isEdit ? `编辑采购申请${existingRequest ? ` - ${existingRequest.requestNo}` : ''}` : '新建采购申请'}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker
            module="purchase-request"
            currentStatus={existingRequest ? existingRequest.status : 'draft'}
          />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mr: 1 }}>
            取消
          </Button>
          <Button variant="outlined" onClick={handleSaveDraft} sx={{ mr: 1 }}>
            暂存
          </Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSubmit(onSubmit)}>
            {isEdit ? '保存修改' : '提交申请'}
          </Button>
        </Box>
      }
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {/* ========== 申请信息 ========== */}
        <Divider sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary">申请信息</Typography>
        </Divider>

        <Grid container spacing={2}>
          {/* F8-1: 采购申请号（自动生成，只读展示） */}
          <Grid item xs={12} md={4}>
            <TextField
              label="采购申请号"
              value={requestNo || (isEdit ? existingRequest?.requestNo : '提交/暂存时自动生成')}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ bgcolor: 'action.disabledBackground' }}
            />
          </Grid>
          <Grid item xs={12} md={8} />

          <Grid item xs={12}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="标题" fullWidth error={!!errors.title} helperText={errors.title?.message} />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="申请类型" fullWidth error={!!errors.type} helperText={errors.type?.message}>
                  <MenuItem value="material">物料采购</MenuItem>
                  <MenuItem value="service">服务采购</MenuItem>
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="优先级" fullWidth error={!!errors.priority} helperText={errors.priority?.message}>
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="normal">普通</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="urgent">紧急</MenuItem>
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="department"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="部门" fullWidth error={!!errors.department} helperText={errors.department?.message} />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Controller
              name="expectedDate"
              control={control}
              render={({ field }) => (
                <TextField {...field} type="date" label="期望日期" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.expectedDate} helperText={errors.expectedDate?.message} />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              size="small"
              options={projects}
              getOptionLabel={(opt) => `${opt.projectName} (${opt.projectNo})`}
              value={selectedProject}
              onChange={(_, v) => setSelectedProject(v)}
              renderInput={(params) => (
                <TextField {...params} label="关联项目（编号+名称）" placeholder="选择或搜索项目" />
              )}
              noOptionsText="未找到匹配项目"
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
          </Grid>

          {/* F8-3: 来源选择 */}
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="来源类型"
              value={sourceType}
              onChange={e => { setSourceType(e.target.value as SourceType); setSourceDoc(null); }}
              fullWidth
              size="small"
            >
              {SOURCE_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            {sourceType !== 'manual' ? (
              <Autocomplete
                size="small"
                options={getSourceOptions()}
                getOptionLabel={getSourceOptionLabel}
                value={sourceDoc}
                onChange={(_, v) => setSourceDoc(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`关联${SOURCE_OPTIONS.find(o => o.value === sourceType)?.label || '单据'}`}
                    placeholder={`选择${SOURCE_OPTIONS.find(o => o.value === sourceType)?.desc || ''}`}
                  />
                )}
                noOptionsText="未找到可用单据"
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            ) : (
              <TextField
                label="来源说明"
                value="手工创建 — 手动录入物料明细"
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ bgcolor: 'action.disabledBackground' }}
              />
            )}
          </Grid>
          {sourceType !== 'manual' && sourceDoc && (
            <Grid item xs={12}>
              <Button variant="outlined" size="small" startIcon={<Add />} onClick={fillItemsFromSource}>
                从{SOURCE_OPTIONS.find(o => o.value === sourceType)?.label}拉取物料明细
              </Button>
            </Grid>
          )}

          <Grid item xs={12}>
            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="申请原因" fullWidth multiline rows={2} error={!!errors.reason} helperText={errors.reason?.message} />
              )}
            />
          </Grid>
        </Grid>

        {/* ========== 物料明细 或 服务描述 ========== */}
        {purchaseType === 'service' ? (
          <>
            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">服务描述</Typography>
            </Divider>
            <TextField
              fullWidth
              multiline
              minRows={4}
              maxRows={10}
              label="服务内容描述"
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              placeholder="请详细描述服务采购的内容、范围、要求等..."
              helperText="服务采购不需要物料明细，请在此描述服务内容"
            />
          </>
        ) : (
          <>
            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" color="text.secondary">物料明细</Typography>
            </Divider>

            <MaterialLineItemsGrid
              columns={prColumns}
              value={items}
              onChange={(rows) => setItems(rows as ItemRow[])}
              materials={prMaterialOptions}
              onMaterialChange={(rowId, matId) => handlePRMaterialChange(rowId, matId)}
              computeRow={computePRRow}
              newRow={makePRRow}
              storageKey="ssa-pr-material-columns"
              addLabel="添加物料"
              testIdPrefix="pr"
              footer={
                <Stack direction="row" justifyContent="space-between" sx={{ px: 1 }}>
                  <Typography variant="body2">共 {items.length} 项</Typography>
                  <Typography variant="subtitle1" fontWeight={600} color="primary">
                    合计：{formatCurrency(totalAmount)}
                  </Typography>
                </Stack>
              }
            />

            {/* 物料责任人（采购视角：采购员）—— 自动按各物料分类聚合显示 */}
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <ResponsiblePersons
                categoryIds={itemCategoryIds}
                roles={['buyer']}
                title="相关物料责任人（采购）"
              />
            </Paper>
          </>
        )}
      </Box>
    </PageWrapper>
  );
};

export default PurchaseForm;

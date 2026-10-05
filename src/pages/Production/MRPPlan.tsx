import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert, Tooltip,
  LinearProgress, Card, CardContent, Divider, Checkbox, Snackbar,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactoryIcon from '@mui/icons-material/Factory';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SaveIcon from '@mui/icons-material/Save';
import { FlowTracker } from '@/components/common';
import SubstituteAdvisor from '@/components/material/SubstituteAdvisor';
import { useProductionStore } from '@/stores/productionStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useBOMStore } from '@/stores/bomStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { plannedOrderApi } from '@/services/plannedOrderApi';
import { MRPRecommendation } from '@/types/production';
import type {
  SalesOrder, SalesOrderStatus, PurchaseOrder, PurchaseOrderStatus, Material, BOMHeader,
} from '@/types';
import { resolveBOM } from '@/utils/bomResolver';
import { computeSupply } from '@/utils/supply';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import type { InventoryRecord } from '@/types/warehouse';
import type { QualityHold } from '@/types/supplyChain';

const PRIORITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'default' }> = {
  urgent: { label: '紧急', color: 'error' },
  high: { label: '高', color: 'warning' },
  normal: { label: '正常', color: 'default' },
};

/**
 * 单行净需求计算结果（本地组件状态，不污染 store）
 */
export interface MrpResultRow {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  gross: number;   // 毛需求（经 BOM 多级展开后）
  onHand: number;  // 可用量（★ 已扣质量扣留，见 utils/supply.ts）
  holdQty: number; // 质量扣留量（单独展示，说明可用量为何比在库少）
  onOrder: number; // 在途（已下单未到货）
  safetyStock: number; // 安全库存（B8：纳入净需求分层，不被消耗）
  net: number;     // 净需求 = max(0, 毛需求 + 安全库存 - 现有库存 - 在途)
  planned: number; // 计划订单量（B8：按 lotSize/MOQ 批量取整，net 为 0 则为 0）
  /** A3：该物料的加权综合废品率（%，按 BOM 用量加权的废品损耗系数） */
  scrapRate: number;
  /** A3：因废品率额外放大的需求量（= 净需求 × 废品率）；>0 时界面上单独标注 */
  scrapLoss: number;
  lotSize: number; // B8：采购/生产批量（0 表示不取整，按净需求下单）
  leadTime: number; // B8：有效提前期（天；采购用 leadTime，自制用 cycleTime）
  demandDate: string; // B8：需求日期（取最早销售订单交期，缺省今天+30天）
  releaseDate: string; // B8：建议下单/开工日期 = 需求日期 - 提前期（提前期偏置排产）
  /** B1：低层码 —— 该物料在一棵 BOM 树中所处的最深层级 */
  lowLevelCode: number;
  /** B1：期间桶 —— 毛需求按「周」分摊后的分布（键为周起始日 YYYY-MM-DD） */
  buckets: MrpBucket[];
  /** B1：需求是否跨多个期间桶（是 → 界面提示可分次投放，不必一次性备齐） */
  multiPeriod: boolean;
}

/**
 * B1：期间桶 —— 把一个物料的毛需求按时间切成若干段。
 *
 * 为什么需要它：MRP 只给出「总毛需求」时，计划员看到「需要 1000 件」无法判断
 *   是「下周就要 1000」还是「分三个月每月 333」—— 前者必须紧急备货，
 *   后者可以按批投放、少占资金与仓库。切桶就是把「有多少」变成「什么时候要多少」。
 *
 * 为什么桶宽取 7 天（周）：制造业的排产与采购跟单节奏以周为单位（周计划会、周对账），
 *   桶宽与业务节奏对齐才不会出现「桶边界落在会议之间」的对不齐问题。
 *   改桶宽只需改下面 BUCKET_DAYS 一个常量。
 */
export interface MrpBucket {
  /** 桶起始日（含），YYYY-MM-DD */
  start: string;
  /** 桶结束日（含），YYYY-MM-DD */
  end: string;
  /** 落在本桶内的毛需求量 */
  qty: number;
}

/** B1：期间桶宽度（天）。7 = 周桶，与制造业周计划节奏对齐 */
const BUCKET_DAYS = 7;
/** B1：最多展示多少个桶，防止长交期订单把界面撑爆 */
const MAX_BUCKETS = 8;

// 已关闭/取消的销售订单状态不计入需求
const EXCLUDED_SO_STATUS = new Set<SalesOrderStatus>(['completed', 'cancelled']);
// 已收货/关闭/取消的采购订单不计入在途
const TERMINAL_PO_STATUS = new Set<PurchaseOrderStatus>(['received', 'closed', 'cancelled']);
const MAX_BOM_DEPTH = 10;

// ── 日期工具（B8 提前期偏置排产）──
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * B1：把日期归到所在期间桶的起点。
 * 采用「周一为桶起点」（而不是「从今天起每 7 天切一刀」）——
 * 制造业的排产、跟单、周例会都以自然周为节奏，桶边界必须落在周一，
 * 否则计划员看到的「本周需求」会和实际周计划对不上号。
 * getDay() 周日为 0，故周日需往前推 6 天落到上一周一。
 */
function weekStart(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay(); // 0=周日 … 6=周六
  const back = dow === 0 ? 6 : dow - 1;
  r.setDate(r.getDate() - back);
  return r;
}

/**
 * 计算净需求（纯函数，供点击处理器调用）。
 * - 需求来源：活跃销售订单行项目（按 materialId 汇总）
 * - 通过 BOM 多级递归展开（productId 命中 BOM 即继续向下展开，深度封顶 10）
 * - 供应：现有库存(material.currentStock) + 在途采购(orderedQuantity - deliveredQuantity)
 * - B8 增强：消费物料主数据的安全库存 / 批量(lotSize,MOQ) / 提前期(leadTime,cycleTime)
 *   · 净需求 = max(0, 毛需求 + 安全库存 - 现有库存 - 在途)  （安全库存分层，不被消耗）
 *   · 计划订单量 = 按 lotSize 向上取整到整数倍，且不低于 MOQ（lotSize<=1 则不取整）
 *   · 建议下单/开工日期 = 需求日期 - 有效提前期（提前期偏置排产）
 */
function computeNetRequirements(
  salesOrders: SalesOrder[],
  materials: Material[],
  bomList: BOMHeader[],
  purchaseOrders: PurchaseOrder[],
  // ★ V3.47.0 3-04：传入库存记录与质量扣留单，让 onHand 走统一供应量口径
  //   （此前只取 material.currentStock ⇒ **不扣质量冻结**，
  //     而 ATP 页同一物料扣冻结 ⇒ 同一物料两个页面报出不同可用量）
  inventoryRecords: InventoryRecord[] = [],
  qualityHolds: QualityHold[] = [],
): MrpResultRow[] {
  const materialById = new Map(materials.map((m) => [m.id, m]));
  // 以 productId 为键索引 BOM：用于判断某物料本身是否为“成品/半成品”（拥有自己的 BOM）
  const bomByProductId = new Map(bomList.map((b) => [b.productId, b]));

  // ── B1 低层码（Low-Level Code, LLC）────────────────────────────
  // 定义：一个物料在所有 BOM 路径中所处的**最深层级**。顶层成品为 0，
  //   它的直接组件为 1，再下一层为 2，以此类推；若同一物料出现在多个层级，
  //   取其中**最深**的那个值。
  //
  // 为什么必须取最深而不能取最浅：
  //   同一个通用件（比如一颗标准螺栓）可能既直接用在成品上（层级 1），
  //   又用在某个半成品上（层级 3）。如果按最浅的层级 1 去算，
  //   系统会先算出螺栓的总需求，之后展开半成品时又会**再算一遍**螺栓需求，
  //   两次结果互相覆盖 —— 最终净需求忽大忽小，这是经典 MRP 缺陷。
  //   取最深层级可以保证：所有可能产生该物料需求的父件，都在它之前被算完。
  //   这就是 LLC 的全部意义 —— 它决定运算顺序，不是一条展示用的标签。
  //
  // 实现：从每个「顶层物料」（不作为任何 BOM 的组件出现的物料）出发做深度优先，
  //   沿途给遇到的每个物料登记 max(已有层级, 当前深度)。
  const lowLevelCode = new Map<string, number>();
  const isChildOfSomeBom = new Set<string>();
  for (const b of bomList) {
    for (const it of b.items ?? []) isChildOfSomeBom.add(it.materialId);
  }
  const walkLLC = (materialId: string, depth: number, seen: Set<string>) => {
    if (depth > MAX_BOM_DEPTH) return;
    // 同一路径内防环：BOM 数据若被人为配成环（A 含 B、B 含 A），没有这道闸会栈溢出
    if (seen.has(materialId)) return;
    const prev = lowLevelCode.get(materialId);
    if (prev === undefined || depth > prev) lowLevelCode.set(materialId, depth);
    const bom = bomByProductId.get(materialId);
    if (!bom?.items?.length) return;
    const nextSeen = new Set(seen);
    nextSeen.add(materialId);
    for (const it of bom.items) walkLLC(it.materialId, depth + 1, nextSeen);
  };
  for (const b of bomList) {
    // 顶层 = 有 BOM 但自己不作为任何 BOM 的组件
    if (!isChildOfSomeBom.has(b.productId)) walkLLC(b.productId, 0, new Set());
  }
  // 兜底：既非顶层也未被遍历到的物料（例如 BOM 数据存在环），至少给个 0
  for (const m of materials) {
    if (!lowLevelCode.has(m.id)) lowLevelCode.set(m.id, 0);
  }

  const grossDemand = new Map<string, number>();
  // 需求日期：取该物料被需求的最早销售订单交期（B8 提前期偏置用）
  const demandDateByMaterial = new Map<string, string>();
  const recordDemand = (materialId: string, soDate?: string) => {
    if (!soDate) return;
    const cur = demandDateByMaterial.get(materialId);
    if (!cur || soDate < cur) demandDateByMaterial.set(materialId, soDate);
  };

  // ── B1 期间桶累积 ─────────────────────────────────────────────
  // 与毛需求同时累积：按「贡献需求的那张销售订单的交期」把数量丢进对应周桶。
  // 用 map<materialId, map<bucketStart, qty>> 而不是数组，是因为同一物料在
  //   多级展开中会被多次累加，且各订单交期散乱，先按桶起点归并最后再排序更稳。
  const bucketAccum = new Map<string, Map<string, number>>();
  const recordBucket = (materialId: string, qty: number, soDate?: string) => {
    if (!(qty > 0)) return;
    const base = parseDate(soDate) ?? parseDate(fmtDate(addDays(new Date(), 30)))!;
    const start = fmtDate(weekStart(base));
    const m = bucketAccum.get(materialId) ?? new Map<string, number>();
    m.set(start, (m.get(start) ?? 0) + qty);
    bucketAccum.set(materialId, m);
  };

  // ── A3 废品率加权（按 BOM 用量加权，避免多来源时简单平均失真）──
  // 同一物料可能被多个 BOM 项引用、且各 BOM 项维护的废品率不同，
  // 因此用「该 BOM 项贡献的需求量」作权数累积，最后除以总贡献量得到综合废品率。
  const scrapWeighted = new Map<string, number>(); // Σ(需求量 × 废品率)
  const scrapQty = new Map<string, number>();      // Σ需求量
  const recordScrap = (materialId: string, qty: number, ratePct: number) => {
    if (!(ratePct > 0) || !(qty > 0)) return;
    scrapWeighted.set(materialId, (scrapWeighted.get(materialId) ?? 0) + qty * ratePct);
    scrapQty.set(materialId, (scrapQty.get(materialId) ?? 0) + qty);
  };

  /**
   * A3：单层需求量放大 —— 计划用量 = 净用量 ÷ (1 - 废品率)
   * 采用「合格产出反推」口径而非「净用量 ×(1+废品率)」，两者差异会随废品率上升而放大：
   * 废品率 10% 时，(1+10%)=1.10 与 1/(1-10%)=1.1111 相对差约 1%，废品率越高差距越大。
   * 反推口径与 MRP 教科书一致（为得到 N 件合格投入，需投入 N/(1-废品率)）。
   * 废品率按 0~99 夹取，避免脏数据（100%）导致除零产生 Infinity。
   */
  const inflateForScrap = (qty: number, scrapRatePct?: number): number => {
    const r = Math.min(Math.max(scrapRatePct ?? 0, 0), 99) / 100;
    return r > 0 ? qty / (1 - r) : qty;
  };

  // 多级 BOM 展开：把对某个物料/产品的需求，向下展开为其组件物料需求
  const explode = (materialId: string, qty: number, depth: number, soDate?: string) => {
    if (depth > MAX_BOM_DEPTH) return;
    const bom = bomByProductId.get(materialId);
    if (bom && bom.items && bom.items.length > 0) {
      for (const item of bom.items) {
        // A3：先按该 BOM 项的废品率放大需求量，再决定向下展开还是作为叶子累加
        const need = inflateForScrap(qty * item.quantity, item.scrapRate);
        recordScrap(item.materialId, need, item.scrapRate ?? 0);
        const childBom = bomByProductId.get(item.materialId);
        if (childBom && item.materialId !== materialId) {
          // 该组件本身也是一个拥有 BOM 的产品 → 继续向下展开（多级）
          explode(item.materialId, need, depth + 1, soDate);
        } else {
          // 叶子物料（采购件/原材料）：直接累加需求
          grossDemand.set(item.materialId, (grossDemand.get(item.materialId) ?? 0) + need);
          recordDemand(item.materialId, soDate);
          // B1：同时按交期落进期间桶
          recordBucket(item.materialId, need, soDate);
        }
      }
    } else {
      // 无 BOM 的叶子物料：需求直接落在本物料上
      grossDemand.set(materialId, (grossDemand.get(materialId) ?? 0) + qty);
      recordDemand(materialId, soDate);
      // B1：同时按交期落进期间桶
      recordBucket(materialId, qty, soDate);
    }
  };

  // 1) 汇总活跃销售订单的毛需求（同时记录最早需求日期）
  for (const so of salesOrders) {
    if (EXCLUDED_SO_STATUS.has(so.status)) continue;
    for (const line of so.items) {
      explode(line.materialId, line.quantity, 0, so.expectedDeliveryDate);
    }
  }

  // 2) 汇总在途供应（已下单未到货的采购量）
  const onOrder = new Map<string, number>();
  for (const po of purchaseOrders) {
    if (TERMINAL_PO_STATUS.has(po.status)) continue;
    for (const li of po.items) {
      const remaining = li.orderedQuantity - li.deliveredQuantity;
      if (remaining > 0) {
        onOrder.set(li.materialId, (onOrder.get(li.materialId) ?? 0) + remaining);
      }
    }
  }

  // 3) 计算净需求 + 批量规则 + 提前期偏置
  const fallbackDate = fmtDate(addDays(new Date(), 30));
  const rows: MrpResultRow[] = [];
  for (const [materialId, gross] of grossDemand) {
    const mat = materialById.get(materialId);
    if (!mat) continue; // 引用的物料在物料主数据中不存在，跳过
    // ★ 统一供应量口径：在库量 − 质量扣留量（此前用 currentStock 不扣冻结）
    const supply = computeSupply({ material: mat, inventoryRecords, qualityHolds });
    const onHand = supply.availableQty;
    const oo = onOrder.get(materialId) ?? 0;
    const safetyStock = mat.safetyStock ?? 0;
    // 安全库存分层：净需求须把安全库存补回，保障安全库存不被消耗
    // （口径边界：MRP 只扣「可用量」，**不扣销售订单承诺量** ——
    //  销售承诺由需求侧本身承载，若再扣一次等于同一份库存被扣两次，
    //  会让计划员虚假地认为缺料更严重而多采购。对标 SAP MRP 元素。）
    const net = Math.max(0, gross + safetyStock - onHand - oo);

    // A3：综合废品率 = Σ(需求量×废品率) / Σ需求量；某物料若在全 BOM 中废品率均为 0，则为 0
    const sw = scrapWeighted.get(materialId) ?? 0;
    const sq = scrapQty.get(materialId) ?? 0;
    const scrapRate = sq > 0 ? Math.round((sw / sq) * 100) / 100 : 0;
    // A3：废品放大量 —— 毛需求中「因废品率而多出来的部分」，用于界面单独标注
    const scrapLoss = sq > 0 ? Math.round((gross - gross / (1 + sw / sq / 100)) * 100) / 100 : 0;

    // 批量规则（lotSize / MOQ）：计划订单量向上取整到 lotSize 整数倍，且不低于 MOQ
    const lotSize = mat.lotSize && mat.lotSize > 1 ? mat.lotSize : 0;
    const moq = mat.moq ?? 0;
    let planned = net;
    if (lotSize > 0 && net > 0) {
      planned = Math.ceil(net / lotSize) * lotSize;
    }
    if (moq > 0 && planned < moq) planned = moq;
    if (net === 0) planned = 0;

    // 提前期偏置：采购用 leadTime，自制用 cycleTime（缺省 0 → 建议下单日期=需求日期）
    const isMake = mat.makeOrBuy === 'make';
    const effLead = isMake
      ? (mat.cycleTime ?? mat.leadTime ?? 0)
      : (mat.leadTime ?? 0);
    const demandDate = demandDateByMaterial.get(materialId) ?? fallbackDate;
    const releaseDate = effLead > 0
      ? fmtDate(addDays(parseDate(demandDate)!, -effLead))
      : demandDate;

    // B1：期间桶 —— 取该物料累积的周桶，按起点升序，转为连续区间并截断到上限。
    const acc = bucketAccum.get(materialId) ?? new Map<string, number>();
    const buckets: MrpBucket[] = [...acc.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .slice(0, MAX_BUCKETS)
      .map(([start, qty]) => ({
        start,
        end: fmtDate(addDays(parseDate(start)!, BUCKET_DAYS - 1)),
        qty: Math.round(qty * 100) / 100,
      }));

    rows.push({
      materialId,
      materialCode: mat.code,
      materialName: mat.name,
      unit: mat.unit,
      gross,
      onHand,
      holdQty: supply.holdQty,
      onOrder: oo,
      safetyStock,
      net,
      planned,
      scrapRate,
      scrapLoss,
      lotSize,
      leadTime: effLead,
      demandDate,
      releaseDate,
      lowLevelCode: lowLevelCode.get(materialId) ?? 0,
      buckets,
      // B1：落在 2 个以上期间桶 = 需求是分期的，可分次投放（不必一次备齐全部资金与仓位）
      multiPeriod: buckets.length > 1,
    });
  }

  // B1：排序口径改为「先按低层码升序，同层再按净需求降序」。
  //   低层码优先是为了让计划员顺着「成品 → 半成品 → 零件」的层级往下读 ——
  //   这与 MRP 的运算顺序一致，也与「先定成品排产、再定零件采购」的实际决策顺序一致。
  //   原先只按净需求降序，会把深层小零件排在成品之前，读起来是断的。
  rows.sort((a, b) => (a.lowLevelCode - b.lowLevelCode) || (b.net - a.net));
  return rows;
}

export default function MRPPlan() {
  const navigate = useNavigate();
  const { mrpRecommendations, addWorkOrder } = useProductionStore();
  const { addPurchaseRequest } = usePurchaseStore();
  const { bomList } = useBOMStore();
  // B2：落库时需要判断物料是自制还是采购（决定建议类型）
  const { materials } = useMaterialStore();
  // ★ V3.47.0 3-04：净需求要扣质量扣留，必须拿到库存记录与扣留单
  const { inventoryRecords } = useWarehouseStore();
  const { qualityHolds } = useWarehouseAdvancedStore();

  const [lastCalcTime, setLastCalcTime] = useState<string>('2024-05-10 14:30');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState('');

  // 净需求计算结果（本地状态）
  const [mrpResult, setMrpResult] = useState<MrpResultRow[]>([]);
  const [hasComputed, setHasComputed] = useState(false);

  // ── B2：计划订单落库 ──────────────────────────────────────────────
  // 运算批次号：一次「计算净需求」= 一个批次。落库时必须带上同一个批次号，
  // 后端的唯一约束 (org, run_id, material_code, type) 才能把「重复提交」识别成
  // 「更新同一批」而不是「新增一批」——这是幂等的全部原理所在。
  // 因此本批次号在**计算时**生成并固定，不随落库次数变化。
  const [mrpRunId, setMrpRunId] = useState<string>('');
  const [persisting, setPersisting] = useState(false);
  const [lastPersistInfo, setLastPersistInfo] = useState<string>('');


  // ── 计算净需求（真实 MRP 运算）──
  const handleCompute = () => {
    setLoading(true);
    setSelectedIds(new Set());
    // 通过 getState() 在点击处理器内读取其它 store 的最新数据
    setTimeout(() => {
      const { salesOrders } = useSalesStore.getState();
      const { materials } = useMaterialStore.getState();
      const { bomList: boms } = useBOMStore.getState();
      const { purchaseOrders } = usePurchaseStore.getState();

      const rows = computeNetRequirements(salesOrders, materials, boms, purchaseOrders, inventoryRecords, qualityHolds);
      setMrpResult(rows);
      setHasComputed(true);

      // B2：本次运算固定一个批次号。格式 RUN-<时间戳>，既可读又天然递增（便于按批倒序）。
      // 落库失败后再次点击「落库」，用的还是这个批次号 → 不会产生重复行。
      setMrpRunId(`RUN-${Date.now()}`);
      setLastPersistInfo('');

      const now = new Date();
      setLastCalcTime(now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    }, 300);
  };

  // ── B2：把本次运算结果整批落成计划订单 ──────────────────────────
  //
  // 与下面「生成采购申请 / 生成工单」的分工（这是 B2 的核心设计）：
  //   「落库」     —— 系统动作：把算出来的东西**存下来**，形成可查、可复算的记录。
  //                   此时不动任何下游单据，计划员可以慢慢看、慢慢判断。
  //   「转正式单」 —— 人的判断：确认要执行后，才去生成采购申请 / 工单。
  // 为什么必须分开：MRP 结果在计划员眼里是「建议」不是「命令」。若算完即下单，
  //   一次参数配错就会直接产生一堆不该有的采购申请，而撤回下游单据的成本极高。
  //   中间多一道「计划订单」，是给人和机器之间留出判断的余地。
  const handlePersist = async () => {
    if (!hasComputed || mrpResult.length === 0) {
      setSnackbar('请先点击「计算净需求」');
      return;
    }
    if (!mrpRunId) {
      setSnackbar('运算批次号缺失，请重新计算后再落库');
      return;
    }

    // 只落「有实际建议量」的行：净需求为 0 或计划量为 0 的行落库只会制造噪声，
    // 让计划员在几十条无意义的 0 里找那几条真正要办的事。
    const rows = mrpResult
      .filter(r => r.planned > 0 || r.net > 0)
      .map(r => ({
        materialCode: r.materialCode,
        materialName: r.materialName,
        unit: r.unit,
        // 建议类型由物料的「自制/外购」属性决定（makeOrBuy），而不是靠猜测：
        //   自制件（make）→ 建议生产；外购件（buy）→ 建议采购。
        // 属性缺失时保守地按「外购」处理：下采购申请是可逆的（可以撤单），
        //   而误开生产工单会占用产能与工时，纠错成本更高。
        type: (materials.some(m => m.code === r.materialCode && m.makeOrBuy === 'make')
          ? 'manufacture' : 'purchase') as 'purchase' | 'manufacture',
        grossQty: r.gross,
        onHandQty: r.onHand,
        onOrderQty: r.onOrder,
        netQty: r.net,
        plannedQty: r.planned,
        dueDate: r.demandDate,
        // B1 期间桶的落点：取最近的那个桶（最早要货的周），让计划订单也能按周聚合看
        bucketStart: r.buckets.length > 0 ? r.buckets[0].start : undefined,
        lowLevelCode: r.lowLevelCode,
        priority: r.net > 0 && r.releaseDate <= new Date().toISOString().split('T')[0] ? 'urgent' : 'normal',
        reason: `净需求 ${r.net} = 毛需求 ${r.gross} − 现有 ${r.onHand} − 在途 ${r.onOrder}` +
          (r.scrapRate > 0 ? `（毛需求已含按废品率 ${r.scrapRate}% 的放大）` : ''),
      }));

    if (rows.length === 0) {
      setSnackbar('本次运算没有需要落库的建议（所有物料净需求均为 0）');
      return;
    }

    setPersisting(true);
    try {
      const res = await plannedOrderApi.persist(mrpRunId, rows);
      setLastPersistInfo(
        `批次 ${res.runId}：新增 ${res.inserted} 条、更新 ${res.updated} 条` +
        (res.skipped > 0 ? `、跳过 ${res.skipped} 条` : ''),
      );
      setSnackbar(
        `计划订单已落库（批次 ${res.runId}）：新增 ${res.inserted} 条、更新 ${res.updated} 条` +
        (res.skipped > 0 ? `，跳过 ${res.skipped} 条无效数据` : '') +
        '。同一批次重复点击只会更新，不会产生重复记录。',
      );
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '未知错误';
      setSnackbar(`落库失败：${msg}（同一批次可安全重试，不会产生重复记录）`);
    } finally {
      setPersisting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === mrpRecommendations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mrpRecommendations.map(m => m.id)));
    }
  };

  const selectedRows = mrpRecommendations.filter(m => selectedIds.has(m.id));
  const selectedPurchase = selectedRows.filter(m => m.type === 'purchase');
  const selectedManufacture = selectedRows.filter(m => m.type === 'manufacture');

  // ── 一键生成采购申请 ──
  const handleGenPurchaseRequest = () => {
    if (selectedPurchase.length === 0) {
      setSnackbar('请选择类型为"采购"的MRP建议');
      return;
    }
    const now = new Date().toISOString();
    const nowDate = now.split('T')[0];
    const seq = String(Date.now()).slice(-6);
    const requestId = `pr-mrp-${Date.now()}`;
    const requestNo = `PR-MRP-${seq}`;

    const totalAmount = selectedPurchase.reduce((sum, m) => {
      return sum + m.suggestedQuantity * 100; // 估算单价100
    }, 0);

    addPurchaseRequest({
      id: requestId,
      requestNo,
      title: `MRP自动生成采购申请 - ${nowDate}`,
      applicant: 'MRP系统',
      department: '生产部',
      type: 'material',
      priority: selectedPurchase.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
      reason: '根据MRP运算结果自动生成',
      expectedDate: selectedPurchase[0]?.suggestedDate || nowDate,
      status: 'draft',
      totalAmount,
      projectNo: undefined,
      projectName: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: 'MRP系统',
      updatedBy: 'MRP系统',
      items: selectedPurchase.map((m, i) => ({
        id: `pri-mrp-${i}`,
        materialId: `mat-${m.materialCode}`,
        materialCode: m.materialCode,
        materialName: m.materialName,
        specification: '',
        unit: m.unit,
        quantity: m.suggestedQuantity,
        estimatedPrice: 100,
        estimatedAmount: m.suggestedQuantity * 100,
        deliveryDate: m.suggestedDate,
        remarks: m.reason,
      })),
    });

    // 从 MRP 列表中移除已处理的建议
    selectedPurchase.forEach(m => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(new Set());
    setSnackbar(`已生成采购申请 ${requestNo}，共 ${selectedPurchase.length} 条物料`);
  };

  // ── 一键生成生产工单 ──
  const handleGenWorkOrder = () => {
    if (selectedManufacture.length === 0) {
      setSnackbar('请选择类型为"生产"的MRP建议');
      return;
    }

    // 按产品分组生成工单
    const productGroups = new Map<string, MRPRecommendation[]>();
    selectedManufacture.forEach(m => {
      const key = m.materialCode;
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(m);
    });

    const now = new Date().toISOString();
    let woCount = 0;

    // 查找对应的BOM（★ V3.46.0 收敛到 resolveBOM：原 find 无 released 优先/无有效期判定，
    //   同一产品存在多版 BOM 时，MRP 算出的需求量与领料页可能不是同一版 BOM 的口径）
    const findBOM = (materialCode: string) => resolveBOM(bomList, materialCode);

    productGroups.forEach((items, materialCode) => {
      const firstItem = items[0];
      const bom = findBOM(materialCode);
      const seq = String(Date.now() + woCount).slice(-8);
      const woId = `wo-mrp-${Date.now()}-${woCount}`;
      const woNo = `WO-MRP-${seq}`;
      const neededQty = items.reduce((sum, m) => sum + m.suggestedQuantity, 0);

      addWorkOrder({
        id: woId,
        orderNo: woNo,
        status: 'draft',
        productCode: materialCode,
        productName: firstItem.materialName,
        bomId: bom?.id || '',
        bomNo: bom?.bomNo || '',
        routeId: '',
        routeNo: '',
        plannedQuantity: neededQty,
        completedQuantity: 0,
        scrapQuantity: 0,
        plannedStartDate: now.split('T')[0],
        plannedEndDate: firstItem.suggestedDate,
        priority: items.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
        workshop: '生产一车间',
        supervisor: '',
        note: '根据MRP运算结果自动生成',
        createdAt: now,
        updatedAt: now,
        createdBy: 'MRP系统',
        updatedBy: 'MRP系统',
      });
      woCount++;
    });

    // 从 MRP 列表中移除
    selectedManufacture.forEach(m => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(new Set());
    setSnackbar(`已生成 ${woCount} 张生产工单`);
  };

  const urgentCount = mrpRecommendations.filter(m => m.priority === 'urgent').length;
  const purchaseCount = mrpRecommendations.filter(m => m.type === 'purchase').length;
  const makeCount = mrpRecommendations.filter(m => m.type === 'manufacture').length;

  const netCount = mrpResult.filter(r => r.net > 0).length;
  // A3：有多少物料的计划用量被废品率放大了（用于在汇总行给出可感知的提示）
  const scrapAffectedCount = mrpResult.filter(r => r.scrapRate > 0).length;
  // B1：有多少物料的需求是分期的（可分次投放，不必一次备齐）
  const multiPeriodCount = mrpResult.filter(r => r.multiPeriod).length;
  // B1：最大低层码 = BOM 树的实际深度，让计划员知道展开到了第几层
  const maxLlc = mrpResult.reduce((mx, r) => Math.max(mx, r.lowLevelCode), 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>MRP 物料需求计划</Typography>
        <FlowTracker module="mrp" currentStatus="mrp_result" />
        <Box flex={1} />
        <Typography variant="caption" color="text.secondary">上次运算：{lastCalcTime}</Typography>
        <Button
          variant="contained"
          data-testid="mrp-compute"
          startIcon={<RefreshIcon />}
          onClick={handleCompute}
          disabled={loading}
          size="small"
        >
          {loading ? '运算中...' : '计算净需求'}
        </Button>
        {/* B2：落库按钮 —— 只在算过之后才有意义，故与「计算」并列但独立 */}
        <Button
          variant="outlined"
          data-testid="mrp-persist"
          startIcon={<SaveIcon />}
          onClick={handlePersist}
          disabled={!hasComputed || persisting || mrpResult.length === 0}
          size="small"
        >
          {persisting ? '落库中...' : '落库为计划订单'}
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* B2：落库结果回执 —— 让用户看到「这一批」到底写进去了什么 */}
      {lastPersistInfo && (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="mrp-persist-info" onClose={() => setLastPersistInfo('')}>
          {lastPersistInfo}
          {'　'}同一批次重复点击「落库」只会更新已有记录，不会产生重复行；已确认的建议不会被覆盖。
        </Alert>
      )}

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '建议采购', value: purchaseCount, icon: <ShoppingCartIcon />, color: '#1976d2' },
          { label: '建议生产', value: makeCount, icon: <FactoryIcon />, color: '#388e3c' },
          { label: '紧急需求', value: urgentCount, icon: <WarningAmberIcon />, color: '#d32f2f' },
          { label: '建议总数', value: mrpRecommendations.length, icon: <RefreshIcon />, color: '#7b1fa2' },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {urgentCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          发现 <b>{urgentCount}</b> 条紧急物料需求，请尽快处理！
        </Alert>
      )}

      {/* 净需求计算结果（真实 MRP 运算） */}
      {!hasComputed ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          点击右上角「计算净需求」，系统将基于<b>活跃销售订单</b>（排除已关闭/取消）经 <b>BOM 多级展开</b>，
          结合<b>现有库存</b>与<b>在途采购</b>，计算各物料的净需求与计划订单量。
          展开时按 BOM 各行维护的<b>废品率</b>反推计划用量（<code>净用量 ÷ (1 − 废品率)</code>），逐层放大后汇总。
          <br />
          <b>低层码</b>：结果按物料在 BOM 树中的最深层级排序（顶层成品为 0，数字越大越靠近原材料），
          与 MRP 的运算顺序一致，便于顺着「成品 → 半成品 → 零件」逐层核对。
          <b>期间分布</b>：毛需求按周切分（周一为桶起点，每周一桶），
          可据此判断是某一周集中要货（需紧急备货）还是多周分摊（可分次投放、少占资金与仓位）。
        </Alert>
      ) : (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>净需求计算结果</Typography>
            <Box flex={1} />
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="mrp-summary"
            >
              共 {netCount} 个物料存在净需求
              {scrapAffectedCount > 0 && ` · ${scrapAffectedCount} 个物料已按废品率放大用量`}
              {` · BOM 展开 ${maxLlc} 层（层级列 0 为成品，数字越大越靠近原材料）`}
              {multiPeriodCount > 0 && ` · ${multiPeriodCount} 个物料需求分期，可分次投放不必一次备齐`}
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Tooltip title="低层码：该物料在 BOM 树中的最深层级（顶层成品为 0）。同时出现在多层时取最深值，用于保证父件先算、子件后算">
                      <span>层级</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>毛需求</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    <Tooltip title="毛需求按周切分的分布（周一为桶起点）。可看出需求集中在某一周还是可分次投放">
                      <span>期间分布</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    <Tooltip title="BOM 中维护的废品率，按各 BOM 项贡献的需求量加权平均。MRP 已按 净用量÷(1-废品率) 反推计划用量">
                      <span>废品率</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>现有库存</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>在途</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>净需求</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>计划订单量</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>安全库存</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>批量</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>提前期(天)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>需求日期</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>建议下单日期</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>替代料建议</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mrpResult.map((row) => (
                  <TableRow key={row.materialId} data-testid="mrp-result-row" hover>
                    <TableCell>
                      <Typography
                        variant="caption"
                        fontFamily="monospace"
                        sx={{
                          display: 'inline-block', minWidth: 20, textAlign: 'center',
                          px: 0.5, py: 0.25, borderRadius: 0.5,
                          bgcolor: row.lowLevelCode === 0 ? 'primary.50' : 'grey.100',
                          color: row.lowLevelCode === 0 ? 'primary.main' : 'text.secondary',
                          fontWeight: 600,
                        }}
                        data-testid="mrp-llc"
                      >
                        {row.lowLevelCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.materialCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.materialName}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" data-testid="mrp-gross">
                        {row.gross} {row.unit}
                      </Typography>
                      {row.scrapLoss > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          含废品损耗 +{row.scrapLoss} {row.unit}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* B1 期间分布：每个桶一行「MM-DD 起 N 单位」，直观看出缺料集中在哪一周 */}
                      {row.buckets.length === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Box data-testid="mrp-buckets" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {row.buckets.map((b) => (
                            <Tooltip key={b.start} title={`${b.start} ~ ${b.end}`}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${b.start.slice(5)}·${b.qty}`}
                                sx={{ height: 20, fontSize: '0.6875rem', fontFamily: 'monospace' }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      )}
                      {row.multiPeriod && (
                        <Typography variant="caption" color="success.main">
                          需求分 {row.buckets.length} 期，可分次投放
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={row.scrapRate > 0 ? 'warning.main' : 'text.disabled'}
                        fontWeight={row.scrapRate > 0 ? 600 : 400}
                        data-testid="mrp-scrap-rate"
                      >
                        {row.scrapRate > 0 ? `${row.scrapRate}%` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onHand} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onOrder} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.net > 0 ? 'error.main' : 'text.secondary'}
                        data-testid="mrp-net"
                      >
                        {row.net > 0 ? `${row.net} ${row.unit}` : '0'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.planned > 0 ? 'primary.main' : 'text.secondary'}
                        data-testid="mrp-planned"
                      >
                        {row.planned > 0 ? `${row.planned} ${row.unit}` : '无需补充'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={row.net > 0 && row.onHand < row.safetyStock ? 'error.main' : 'text.secondary'}>
                        {row.safetyStock} {row.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.lotSize > 0 ? `${row.lotSize} ${row.unit}` : '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.leadTime > 0 ? `${row.leadTime}` : '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace">{row.demandDate}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="secondary.main">
                        {row.releaseDate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <SubstituteAdvisor materialCode={row.materialCode} neededQty={row.net} dense />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1, mb: 2,
          bgcolor: '#EFF6FF', borderRadius: 2,
          border: '1px solid rgba(59,130,246,.2)',
        }}>
          <Chip label={`已选 ${selectedIds.size} 条`} size="small" sx={{ bgcolor: '#DBEAFE', color: '#3B82F6', fontWeight: 600 }} />
          {selectedPurchase.length > 0 && (
            <Button size="small" startIcon={<AddShoppingCartIcon sx={{ fontSize: 14 }} />} onClick={handleGenPurchaseRequest}
              sx={{ fontSize: '0.8125rem', color: '#2563EB' }}>
              生成采购申请 ({selectedPurchase.length})
            </Button>
          )}
          {selectedManufacture.length > 0 && (
            <Button size="small" startIcon={<EngineeringIcon sx={{ fontSize: 14 }} />} onClick={handleGenWorkOrder}
              sx={{ fontSize: '0.8125rem', color: '#16A34A' }}>
              生成生产工单 ({selectedManufacture.length})
            </Button>
          )}
          <Box flex={1} />
          <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
            取消选择
          </Button>
        </Box>
      )}

      {/* 需求明细表（历史/种子 MRP 建议） */}
      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>需求明细</Typography>
          <Box flex={1} />
          <Typography variant="caption" color="text.secondary">共 {mrpRecommendations.length} 条建议</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selectedIds.size === mrpRecommendations.length && mrpRecommendations.length > 0}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < mrpRecommendations.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>优先级</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>当前库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>安全库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>需求量</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>在途量</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>建议量</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>建议日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>原因说明</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mrpRecommendations.map(row => {
                const priorConf = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
                const stockAlert = row.currentStock < row.safetyStock;
                const isSelected = selectedIds.has(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    selected={isSelected}
                    onClick={() => toggleSelect(row.id)}
                    sx={{
                      bgcolor: row.priority === 'urgent' ? 'error.50' : 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(row.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.materialCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.materialName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={row.type === 'purchase' ? <ShoppingCartIcon sx={{ fontSize: '0.9rem !important' }} /> : <FactoryIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label={row.type === 'purchase' ? '采购' : '生产'}
                        size="small"
                        color={row.type === 'purchase' ? 'info' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={priorConf.label} size="small" color={priorConf.color} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={stockAlert ? '低于安全库存' : ''}>
                        <Typography variant="body2" color={stockAlert ? 'error.main' : 'text.primary'} fontWeight={stockAlert ? 600 : 400}>
                          {row.currentStock} {row.unit}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.safetyStock} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.requiredQuantity} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onOrderQuantity} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={row.suggestedQuantity > 0 ? 'primary.main' : 'text.secondary'}>
                        {row.suggestedQuantity > 0 ? `${row.suggestedQuantity} ${row.unit}` : '无需补充'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.suggestedDate}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">{row.reason}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

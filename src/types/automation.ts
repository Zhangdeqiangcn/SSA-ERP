/**
 * V3.95.0 自动化设置中心（物料类别分工驱动的表单自动流转）
 * ------------------------------------------------------------
 * 强哥诉求：销售订单→BOM→MRP 分解为采购需求/领料单/生产任务；采购拿到采购需求后按
 * 「价目表是否有有效价 × 是否有供应商」三档分流——有价有供应商→自动下采购单；有供应商没价
 * →自动询价比价；无供应商→提示对应采购员寻源/处理异常。这些自动表单流转「是否发起、做到哪一步」
 * 由管理员在「按物料分类」配置确认（到步可配），并保留运行日志。
 *
 * 本文件只放**纯类型 + 常量 + 纯 resolver**（不依赖 store，可单测）；
 * zustand + D1 共享 store 在 src/stores/automationStore.ts。
 */

/** 自动化段落（表单流转的一个环节） */
export type AutomationStage =
  | 'mrp_decompose'   // MRP 分解：销售订单 BOM 展开 → 净需求 → 生成采购需求 / 领料单 / 生产工单
  | 'purchase_request'// 采购需求生成 + 通知对应采购员
  | 'inquiry_compare' // 有供应商无价：自动询价 + 比价
  | 'po_place'        // 有价有供应商：自动下采购单
  | 'sourcing'        // 无供应商：提示对应采购员寻源/处理异常
  | 'requisition'     // 仓库领料单
  | 'work_order';     // 生产工单

/** 执行到哪一步（强哥拍板「到步可配」） */
export type ExecuteStep =
  | 'off'     // 不发起（该段停用）
  | 'suggest' // 仅给建议/提示（生成提示，不落单据，人工决定）
  | 'draft'   // 生成草稿待确认（自动建单据但状态=草稿/待审批，人工一键生效）
  | 'post';   // 直接生效过账（自动建并生效，财务最激进）

/** 段落级配置 */
export interface StageConfig {
  enabled: boolean;
  step: ExecuteStep;
}

/** 全局默认 + 按物料分类覆盖 */
export interface AutomationConfig {
  /** 各段落全局默认 */
  global: Record<AutomationStage, StageConfig>;
  /** 按物料分类 id 的覆盖；key=categoryId，value 只写需要覆盖的段落（未写段落回退全局） */
  perCategory: Record<string, Partial<Record<AutomationStage, StageConfig>>>;
  updatedAt?: string;
}

/** 自动化运行日志单条（谁 / 何时 / 哪段 / 结果） */
export interface AutomationLogEntry {
  id: string;
  stage: AutomationStage;
  categoryId: string;
  categoryName?: string;
  actor: string;
  action: string;      // 触发动作描述（如「采购申请 PR-xxx 自动通知 2 名采购员」）
  result: string;      // 结果（success / skipped / info …）
  detail?: string;
  at: string;
}

/** 段落中文标签（设置矩阵与日志共用） */
export const AUTOMATION_STAGE_LABELS: Record<AutomationStage, string> = {
  mrp_decompose: 'MRP 分解',
  purchase_request: '采购需求 / 通知采购员',
  inquiry_compare: '询价比价',
  po_place: '自动下采购单',
  sourcing: '寻源 / 异常提示',
  requisition: '仓库领料单',
  work_order: '生产工单',
};

/** 执行步中文标签 */
export const EXECUTE_STEP_LABELS: Record<ExecuteStep, string> = {
  off: '不发起',
  suggest: '仅建议（不落单据）',
  draft: '生成草稿待确认',
  post: '直接生效过账',
};

/** 全局默认配置（保守基调：默认都不发起，管理员显式开启；符合「准确度优先」） */
export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  global: {
    mrp_decompose: { enabled: true, step: 'suggest' },
    purchase_request: { enabled: true, step: 'draft' },
    inquiry_compare: { enabled: false, step: 'draft' },
    po_place: { enabled: false, step: 'draft' },
    sourcing: { enabled: true, step: 'suggest' },
    requisition: { enabled: false, step: 'draft' },
    work_order: { enabled: false, step: 'draft' },
  },
  perCategory: {},
};

/** 执行步的数值强度（用于「至少到哪一步」判定） */
const STEP_RANK: Record<ExecuteStep, number> = { off: 0, suggest: 1, draft: 2, post: 3 };

/**
 * 纯 resolver：给定某物料分类（categoryId，可为空=无分类）与段落，
 * 返回该段落实际生效的配置——按物料分类覆盖 > 全局默认。
 *
 * 语义：
 * - enabled：分类覆盖若写了该段则用覆盖的 enabled，否则用全局。
 * - step：取「覆盖 vs 全局」中**更强的执行步**（rank 取大），但 enabled=false 恒为 off。
 *   （避免「分类只调深度、却忘了全局是关」导致矛盾；enabled 是总闸，step 是深度。）
 * - source 标注入口（'category' | 'global' | 'off'），供界面标注"该值来自哪里"。
 */
export function resolveAutomation(
  cfg: AutomationConfig | undefined,
  categoryId: string | null | undefined,
  stage: AutomationStage,
): { enabled: boolean; step: ExecuteStep; source: 'category' | 'global' | 'off' } {
  if (!cfg) return { enabled: false, step: 'off', source: 'off' };
  const g = cfg.global?.[stage] ?? { enabled: false, step: 'off' as ExecuteStep };
  const c = categoryId ? cfg.perCategory?.[categoryId]?.[stage] : undefined;

  const enabled = c ? c.enabled : g.enabled;
  if (!enabled) return { enabled: false, step: 'off', source: 'off' };

  const step: ExecuteStep = STEP_RANK[c?.step ?? 'off'] >= STEP_RANK[g.step]
    ? (c?.step ?? g.step)
    : g.step;
  return { enabled: true, step, source: c ? 'category' : 'global' };
}

/** 便捷判定：该段在该分类下是否"发起"（enabled 且非 off） */
export function isStageActive(
  cfg: AutomationConfig | undefined,
  categoryId: string | null | undefined,
  stage: AutomationStage,
): boolean {
  const r = resolveAutomation(cfg, categoryId, stage);
  return r.enabled && r.step !== 'off';
}

/** 便捷判定：该段执行步是否"达到或超过"目标步（用于"做到哪一步"门控） */
export function stageReaches(
  cfg: AutomationConfig | undefined,
  categoryId: string | null | undefined,
  stage: AutomationStage,
  minStep: ExecuteStep,
): boolean {
  const r = resolveAutomation(cfg, categoryId, stage);
  if (!r.enabled || r.step === 'off') return false;
  return STEP_RANK[r.step] >= STEP_RANK[minStep];
}

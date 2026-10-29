import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeConfig, writeRow } from './entityBackedShared';
import {
  AutomationConfig,
  AutomationLogEntry,
  AutomationStage,
  StageConfig,
  DEFAULT_AUTOMATION_CONFIG,
} from '@/types/automation';

/**
 * V3.95.0 自动化设置中心 store（组织共享配置，D1 单一权威源）
 * ------------------------------------------------------------
 * 范式对齐 settingsStore / customFieldStore（config 类经 entityRepo + writeConfig 写穿 D1，
 * 整块单行 payload，避免各终端配置漂移）：
 *   · automation_config  单行（id='automation-config'）：{ global, perCategory }
 *   · automation_logs    逐行：每次自动化触发记一条（谁/何时/哪段/结果）
 * resolver 纯函数（resolveAutomation / isStageActive / stageReaches）在 types/automation.ts。
 * 未登录/离线静默兜底（保留内存默认态），不阻断业务。
 */

const CFG_RES = 'automationConfig';
const LOG_RES = 'automationLog';
const CFG_ID = 'automation-config';

interface AutomationState {
  config: AutomationConfig;
  runLogs: AutomationLogEntry[];
  loaded: boolean;
  /** 全局某段开关/深度 */
  setGlobalStage: (stage: AutomationStage, patch: Partial<StageConfig>) => void;
  /** 按物料分类覆盖某段（categoryId 为空串表示"清除该分类该段覆盖"） */
  setCategoryStage: (
    categoryId: string,
    stage: AutomationStage,
    patch: Partial<StageConfig> | null,
  ) => void;
  /** 清除某分类全部覆盖，回到全局默认 */
  clearCategory: (categoryId: string) => void;
  /** 记录一条自动化运行日志（乐观 + 即发即弃写穿 D1，失败不阻断） */
  log: (entry: Omit<AutomationLogEntry, 'id' | 'at'> & { at?: string }) => void;
  /** 从 D1 水合配置 + 最近日志；离线/未登录保留内存默认 */
  load: () => Promise<void>;
}

function snapshotConfig(s: AutomationState) {
  return s.config;
}

let hydrating = false;

export const useAutomationStore = create<AutomationState>()((set, get) => ({
  config: DEFAULT_AUTOMATION_CONFIG,
  runLogs: [],
  loaded: false,

  setGlobalStage: (stage, patch) =>
    set((s) => ({
      config: {
        ...s.config,
        global: { ...s.config.global, [stage]: { ...s.config.global[stage], ...patch } },
        updatedAt: new Date().toISOString(),
      },
    })),

  setCategoryStage: (categoryId, stage, patch) =>
    set((s) => {
      const per = { ...s.config.perCategory };
      if (patch === null) {
        // 清除该分类该段覆盖 → 回退全局
        const next = { ...per[categoryId] };
        delete next[stage];
        if (Object.keys(next).length === 0) delete per[categoryId];
        else per[categoryId] = next;
      } else {
        // 覆盖值：以「该段当前生效值（分类覆盖 ?? 全局）」为基底合并 patch，保证 enabled/step 完整
        const g: StageConfig = s.config.global[stage];
        const base: StageConfig = { ...(per[categoryId]?.[stage] || g) };
        per[categoryId] = { ...per[categoryId], [stage]: { ...base, ...patch } };
      }
      return {
        config: { ...s.config, perCategory: per, updatedAt: new Date().toISOString() },
      };
    }),

  clearCategory: (categoryId) =>
    set((s) => {
      const per = { ...s.config.perCategory };
      delete per[categoryId];
      return { config: { ...s.config, perCategory: per, updatedAt: new Date().toISOString() } };
    }),

  log: (entry) => {
    const row: AutomationLogEntry = {
      id: `alog-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      ...entry,
    };
    set((s) => ({ runLogs: [row, ...s.runLogs].slice(0, 200) })); // 本地仅保留最近 200 条（完整在 D1）
    if (isAuthed()) writeRow(LOG_RES, row.id, row);
  },

  load: async () => {
    if (!isAuthed()) return;
    hydrating = true;
    try {
      const [cfgRes, logRes] = await Promise.all([
        entityRepo.list<AutomationConfig>(CFG_RES, { page: 1, pageSize: 10 }),
        entityRepo.list<AutomationLogEntry>(LOG_RES, { page: 1, pageSize: 200 }),
      ]);
      const cfgRows = parsePayload<AutomationConfig>(cfgRes?.data || []);
      // payload 内含 id（writeConfig 把 id 塞进 payload，同 settingsStore 范式）；类型无 id 字段，用宽松判据
      const cfg = cfgRows.find((r) => (r as unknown as { id?: string })?.id === CFG_ID);
      if (cfg?.global) {
        // 归一化：补齐可能缺失的段落（向后兼容旧配置）
        const normalized: AutomationConfig = {
          global: { ...DEFAULT_AUTOMATION_CONFIG.global, ...cfg.global },
          perCategory: cfg.perCategory || {},
          updatedAt: cfg.updatedAt,
        };
        set({ config: normalized });
      }
      const logRows = parsePayload<AutomationLogEntry>(logRes?.data || []);
      if (logRows.length) set({ runLogs: logRows });
    } catch {
      /* 离线/异常：保留内存默认态，不阻断 UI */
    } finally {
      hydrating = false;
      set({ loaded: true });
    }
  },
}));

// 任何配置变更 → 写穿 D1（hydrate 自身 set 不触发）
useAutomationStore.subscribe((s) => {
  if (hydrating) return;
  if (isAuthed()) writeConfig(CFG_RES, CFG_ID, { id: CFG_ID, ...snapshotConfig(s) });
});

// 模块加载即自动水合（未登录/离线静默兜底）
void useAutomationStore.getState().load();

import { create } from 'zustand';
import { BOMHeader, BOMItem } from '@/types/bom';
import { bomApi } from '@/services/bomApi';
import { resolveBOM } from '@/utils/bomResolver';
import {
  bomList as mockBomList,
  bomTreeData as mockBomTreeData,
} from '@/mocks/data/bom';

// BOM Store（V3.6.0 C1 数据关系化首个样板域）
//
// ── 改造前的问题（第一性原理）────────────────────────────────────
// 此前 bomList / bomTreeData 整体存在 `app_state` 的一个 JSON 大对象里
// （persist 的 name: 'ssa-erp-bom'），带来三个硬缺陷：
//   ① 无法按子件反查「这个零件被哪些产品用到」—— 后端没有表可 WHERE；
//   ② 无法做关系约束（同层重复序号、引用不存在的父件都拦不住）；
//   ③ 无法分页，明细增长后只能整包传，且受 A5 的 8 MB 硬顶限制。
//
// ── 改造后的数据流（关键设计）─────────────────────────────────────
//   数据主源 = D1 关系表（bom_headers + bom_items），经 bomApi 读写；
//   内存种子 = mocks/data/bom（**不落任何存储**），仅用于 D1 拉取完成前先渲染出内容。
//
// 为什么初始值用 mock 种子而不是空数组：
//   本项目前端大量页面（MRP、成本卷积、工单详情）在挂载时**同步**读 bomList。
//   若初始为空数组，首屏必然出现「BOM 列表为空 → MRP 算不出东西」的中间态。
//   用内存种子先把界面撑起来，load() 成功后被 D1 数据整体覆盖 ——
//   这是「渐进增强」，不是「双写」（种子从不下发到后端，只存在于这一个 JS 对象的初始值里）。
//
// ── 为什么连 persist 都删掉了（重要，与初版设计不同）────────────────
// 初版曾保留 `persist(backendStorage, { name: 'ssa-erp-bom' })` 作为「本地降级缓存」，
// 但那是错的：backendStorage 的落点就是 `app_state` 的那个 JSON 大对象 ——
// 保留它等于**双通道照旧**（D1 写一份、app_state 写一份），C1 想根治的问题一个没解决。
// 参照 V2.75.0 S&OP 迁移的既有先例（sopStore 迁 D1 后即移除 persist），此处同样移除。
//
// 那么「未登录/离线时界面不可用」怎么办？答案由组件内存态承担：
//   store 初始值仍是 mock 种子（内存中的一份，不落任何存储），
//   load() 成功后用 D1 数据覆盖；失败则保留种子并给出 syncError。
// 这样：① `app_state` 里不会再出现 'ssa-erp-bom' 键；
//      ② 用户增删改一律以 D1 为准，不存在「两边不一致以谁为准」的问题；
//      ③ 界面在任何情况下都有内容可渲染，不会白屏。
//
// ── 为什么对外 API 形状一个字都不改 ───────────────────────────────
// 本 store 有 15 个消费方（BOMList / BOMDetail / BOMForm / CostRollup /
// MaterialDetail / CostCollection / MRPPlan / MTOCreate / WorkOrderDetail /
// SalesOrderDetail / apiService / productionVersionStore / bomCost …）。
// 若趁机把 `bomList` 改名或改成异步选择器，15 处都要动，回归风险远超收益。
// 因此**保持 bomList / bomTreeData / selectedBOMId + 5 个方法的原签名**，
// 只把内部实现从「改数组」换成「打 D1」。这样样板才能被复制：
// 下一个域（price / quality）只需照抄这个形状，消费方代码零改动。

interface BOMState {
  bomList: BOMHeader[];
  bomTreeData: BOMItem[];
  selectedBOMId: string | null;

  /** 是否已完成一次 D1 拉取（页面可据此决定是否显示加载态） */
  loaded: boolean;
  /** 最近一次同步失败的可读原因（为空表示正常） */
  syncError: string;

  addBOM: (bom: BOMHeader) => void;
  updateBOM: (id: string, updates: Partial<BOMHeader>) => void;
  deleteBOM: (id: string) => void;

  setBomTreeData: (data: BOMItem[]) => void;
  setSelectedBOM: (id: string | null) => void;
  getBOMById: (id: string) => BOMHeader | undefined;
  getBOMByProductCode: (productCode: string) => BOMHeader | undefined;

  /** 从 D1 拉取全量 BOM（表头 + 嵌套明细）。失败时保留本地缓存并记录原因。 */
  load: () => Promise<void>;
}

/** 首次空库回填的标记键：每设备只回填一次，避免多端互相重复写入 */
const BACKFILL_FLAG = 'ssa-erp-bom-backfilled-v2';

/** 生成带前缀的本地 id（与既有 mock id 风格一致，便于人工识别来源） */
const localId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useBOMStore = create<BOMState>()((set, get) => ({
      bomList: [...mockBomList],
      bomTreeData: [...mockBomTreeData],
      selectedBOMId: null,
      loaded: false,
      syncError: '',

      // ── 增：乐观更新本地 → 打 D1 → 成功用后端返回替换、失败回滚 ──────
      // 为什么乐观更新：BOM 创建后要立刻跳转到详情页，若等网络往返会有一秒空白。
      // 为什么失败必须回滚：不回滚的话界面显示「创建成功」但刷新就消失，
      //   用户会以为系统丢数据（这正是 V3.1.0 之前 persist 静默失败的教训）。
      addBOM: (bom) => {
        const optimistic: BOMHeader = {
          ...bom,
          id: bom.id || localId('bom'),
          createdAt: bom.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ bomList: [...state.bomList, optimistic] }));

        void (async () => {
          try {
            const created = await bomApi.create(optimistic as never);
            set((state) => ({
              bomList: state.bomList.map((b) => (b.id === optimistic.id ? created : b)),
              syncError: '',
            }));
          } catch (e: any) {
            set((state) => ({
              bomList: state.bomList.filter((b) => b.id !== optimistic.id),
              syncError: `BOM「${optimistic.bomNo || optimistic.id}」保存到服务器失败，已撤回：${readableError(e)}`,
            }));
          }
        })();
      },

      // ── 改：同样乐观 + 失败回滚 ────────────────────────────────────
      updateBOM: (id, updates) => {
        const prev = get().bomList.find((b) => b.id === id);
        set((state) => ({
          bomList: state.bomList.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        }));

        void (async () => {
          try {
            await bomApi.update(id, updates as never);
            set({ syncError: '' });
          } catch (e: any) {
            if (prev) {
              set((state) => ({ bomList: state.bomList.map((b) => (b.id === id ? prev : b)) }));
            }
            set({ syncError: `BOM「${prev?.bomNo || id}」修改未保存：${readableError(e)}` });
          }
        })();
      },

      // ── 删：先备份整表再乐观删，失败整表还原（删错比改错更难挽回）────
      deleteBOM: (id) => {
        const prev = [...get().bomList];
        const target = get().bomList.find((b) => b.id === id);
        set((state) => ({ bomList: state.bomList.filter((b) => b.id !== id) }));

        void (async () => {
          try {
            await bomApi.remove(id);
            set({ syncError: '' });
          } catch (e: any) {
            set({ bomList: prev, syncError: `BOM「${target?.bomNo || id}」删除失败：${readableError(e)}` });
          }
        })();
      },

      setBomTreeData: (data) => set({ bomTreeData: data }),
      setSelectedBOM: (id) => set({ selectedBOMId: id }),
      getBOMById: (id) => get().bomList.find((b) => b.id === id),
      getBOMByProductCode: (productCode) => resolveBOM(get().bomList, productCode),

      load: async () => {
        try {
          const res = await bomApi.list({ page: 1, pageSize: 200 });
          const data = res?.data || [];

          // 首次拉取为空：把 mock 种子回填到 D1，避免「换存储 = 数据清零」。
          // 一次性标记放在 localStorage，多端不会互相重复回填。
          if (data.length === 0 && !localStorage.getItem(BACKFILL_FLAG)) {
            localStorage.setItem(BACKFILL_FLAG, '1');
            for (const bom of mockBomList) {
              try {
                await bomApi.create(bom as never);
              } catch {
                /* 单条失败（如编号冲突）不阻断其余回填，尽力而为 */
              }
            }
            const again = await bomApi.list({ page: 1, pageSize: 200 });
            set({
              bomList: again?.data || [],
              bomTreeData: (again?.data || []).flatMap((d: any) => d.items || []),
              loaded: true,
              syncError: '',
            });
            return;
          }

          if (data.length > 0) {
            set({
              bomList: data,
              bomTreeData: data.flatMap((d: any) => d.items || []),
              loaded: true,
              syncError: '',
            });
          } else {
            // 空库且已回填过（用户确实把 BOM 全删了）：如实反映为空，不回填。
            // 这里刻意不退回 mock —— 否则用户删完刷新又「长回来」，像灵异事件。
            set({ bomList: [], bomTreeData: [], loaded: true, syncError: '' });
          }
        } catch (e: any) {
          // 未登录 / 离线 / 接口异常：保留内存中的种子让界面继续可用，但如实记下原因。
          // 注意这里**不退回 localStorage 的旧快照** —— 本 store 已不再往 app_state 写，
          // 手上这份就是初始种子；如实告知「读不到服务器」比展示一份来路不明的旧数据更安全。
          set({ loaded: true, syncError: `无法从服务器读取 BOM：${readableError(e)}` });
        }
      },
    }));

/** 把 axios / 网络错误转成强哥看得懂的一句话（不暴露堆栈与状态码术语） */
function readableError(e: any): string {
  const status = e?.response?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有 BOM 的修改权限';
  if (status === 409) return '数据与服务器冲突（可能是编号重复），请刷新后重试';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

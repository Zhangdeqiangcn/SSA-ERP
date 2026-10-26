// 单据数据源登记（V3.113.0 新增）
// 第一性原理：下游单号是"反向查谁以本单为来源"，需要在运行时拿到"目标单据类型的全部数据"。
// 这里集中登记「每种单据类型 → 如何取到它的全部数据（含 id 与编号字段）」，供反向查与编号→路由解析复用。
// 各域 store 在模块加载时调用 registerDocSource 自注册（或在此集中登记）。

/** 单据数据源描述 */
export interface DocSource {
  /** 返回该类型全部单据（含 id 与编号字段）；下游反向查与编号→id 解析都依赖它 */
  getDocs: () => Array<Record<string, any>>;
  /** 编号字段名（如 requestNo / orderNo / inboundNo） */
  numberField: string;
  /** 可选：触发该数据源对应的 store 预拉取（仅"进页才 hydrate"的 store 需要，保证下游反向查能拿到数据） */
  ensureLoaded?: () => void;
}

/** 各单据类型 → 数据源登记表（由探查结果集中填充） */
export const DOC_SOURCES: Record<string, DocSource> = {};

/** 注册/覆盖某单据类型的数据源（幂等，可多次调用） */
export function registerDocSource(type: string, source: DocSource): void {
  DOC_SOURCES[type] = source;
}

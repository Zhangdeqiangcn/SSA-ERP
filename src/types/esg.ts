import { BaseEntity } from './common';

/** ESG 报告：环境(E)/社会(S)/治理(G)三类可持续发展指标（P2-30） */
export type EsgCategory = 'E' | 'S' | 'G';

export const ESG_CATEGORY_LABELS: Record<EsgCategory, string> = {
  E: '环境 Environmental',
  S: '社会 Social',
  G: '治理 Governance',
};

export type EsgStatus = 'draft' | 'published';

export const ESG_STATUS_LABELS: Record<EsgStatus, string> = {
  draft: '草稿',
  published: '已发布',
};

export interface EsgReport extends BaseEntity {
  reportNo: string;
  /** 报告期，如 2026-H1 */
  period: string;
  category: EsgCategory;
  /** 指标名称，如 单位产品碳排放 */
  indicator: string;
  value: number;
  unit: string;
  /** 目标值（可选，用于达标率评估） */
  target?: number;
  status: EsgStatus;
  remark?: string;
}

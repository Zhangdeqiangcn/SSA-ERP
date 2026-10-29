// 打印模板域 API 服务层（V3.7.0 C1 数据关系化 · 第二个域）
//
// 与 bomApi 同样的组织原则：把「唯一权威实现」收在一处，
// 上层（store）负责缓存与失败回退策略，本层只做 HTTP。
//
// 特别注意：模板正文里的图片在服务端被外置为 {{asset:<id>}}，读取时已还原成
// data URL 返回，所以**本层看到的对象形状与改造前完全一致**。
// 6 个消费方（打印预览、模板设计器、各单据打印入口）无需改动。
import apiClient from './api';
import type { PrintTemplate } from '@/stores/printTemplateStore';

export interface PrintTemplateListResult {
  success: boolean;
  templates: PrintTemplate[];
  total: number;
  assetCount: number;
}

export const printTemplateApi = {
  /** 全量列表（模板是少量基础配置，一次取全；支持按 entity 过滤） */
  list: (params?: { entity?: string }) =>
    apiClient.get<PrintTemplateListResult>('/print-templates', { params }),

  /** 单条 */
  get: (id: string) => apiClient.get<{ success: boolean; template: PrintTemplate }>(`/print-templates/${id}`),

  /** 创建或整条保存（模板设计器每次保存整份配置） */
  save: (tpl: Partial<PrintTemplate>) =>
    apiClient.post<{ success: boolean; template: PrintTemplate; assets: number }>('/print-templates', tpl),

  /** 更新（只改传了的字段） */
  update: (id: string, patch: Partial<PrintTemplate>) =>
    apiClient.put<{ success: boolean; template: PrintTemplate }>(`/print-templates/${id}`, patch),

  /** 删除（连带清理图片资源） */
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; deletedAssets: number; freedBytes: number }>(
      `/print-templates/${id}`
    ),
};

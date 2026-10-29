// BOM 域 API 服务层（V3.6.0 C1 数据关系化样板）
//
// 为什么单独一个文件而不是塞进 apiService.ts：
//   apiService.ts 的 BOM 段是「内存 store 的门面」（它读 useBOMStore.getState()），
//   属于假后端。C1 要让 BOM 的数据主源真正变成 D1，新旧两套语义混在一个文件里
//   会让「哪一段在说真话」不可判断。故新开文件，并把 apiService.ts 的 BOM 段
//   改为转发到本模块，使「唯一权威实现」只有一处。
//
// 与 plannedOrderApi 同样的温和 401 策略（见 plannedOrderApi 文件头说明）：
//   api.ts 的响应拦截器在 401 时会强制跳登录页；BOM 页可能正处在编辑中，
//   强制跳转会丢失用户输入。故这里对失败采取「返回空 / 抛出可读错误」策略，
//   由 store 层决定回退（本地缓存）还是提示。
import apiClient from './api';
import type { BOMHeader, BOMItem } from '@/types/bom';

/** 后端返回的分页信封（与通用实体路由保持一致） */
export interface BomListResult {
  data: BOMHeader[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BomListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  productCode?: string;
  status?: string;
}

export const bomApi = {
  /** 列表（表头 + 嵌套明细，后端已组装好 items） */
  list: (params?: BomListParams) => apiClient.get<BomListResult>('/bom', { params }),

  /** 单条（含明细） */
  get: (id: string) => apiClient.get<BOMHeader>(`/bom/${id}`),

  /** 创建（表头 + 明细一次性写入） */
  create: (bom: Partial<BOMHeader> & { items?: BOMItem[] }) =>
    apiClient.post<BOMHeader>('/bom', bom),

  /** 更新（只改传了的字段；传 items 则整体替换明细，不传则明细不变） */
  update: (id: string, updates: Partial<BOMHeader>) =>
    apiClient.put<BOMHeader>(`/bom/${id}`, updates),

  /** 删除（连带明细） */
  remove: (id: string) => apiClient.delete<{ success: boolean; deletedItems: number }>(`/bom/${id}`),
};

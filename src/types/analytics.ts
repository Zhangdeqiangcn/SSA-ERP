// 智能分析模块类型定义（P3-6）

/** 智能补货建议（由需求预测生成，并联动生成采购申请） */
export interface ForecastSuggestion {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  avgMonthlyDemand: number;
  safetyStock: number;
  reorderPoint: number;
  currentStock: number;
  suggestedOrderQty: number;
  generatedRequestNo?: string;
  createdAt: string;
}

/** 发票 OCR 识别与生成凭证的历史记录 */
export interface OcrHistoryItem {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  seller: string;
  buyer: string;
  amount: number; // 不含税金额
  taxAmount: number; // 税额
  total: number; // 价税合计
  voucherNo: string;
  createdAt: string;
}

export { api, apiClient } from './api';
export { materialApi } from './material';
export { vendorApi } from './vendor';
export { purchaseApi } from './purchase';
// 统一 API Facade（桥接 Zustand Store 的 RESTful 风格接口）
import apiServiceDefault, {
  materialApi as _materialApi,
  vendorApi as _vendorApi,
  customerApi as _customerApi,
  purchaseApi as _purchaseApi,
  salesApi as _salesApi,
  warehouseApi as _warehouseApi,
  qualityApi as _qualityApi,
  productionApi as _productionApi,
  financeApi as _financeApi,
  priceApi as _priceApi,
  systemApi as _systemApi,
} from './apiService';

export {
  apiServiceDefault as apiService,
  _materialApi as materialApiService,
  _vendorApi as vendorApiService,
  _customerApi as customerApiService,
  _purchaseApi as purchaseApiService,
  _salesApi as salesApiService,
  _warehouseApi as warehouseApiService,
  _qualityApi as qualityApiService,
  _productionApi as productionApiService,
  _financeApi as financeApiService,
  _priceApi as priceApiService,
  _systemApi as systemApiService,
};
// C7 服务端化雏形：持久化抽象层 + 审计包装
export {
  getDriver,
  setDriver,
  listCollections,
  estimateStorageKB,
  readCollection,
  withAudit,
  getServerStatus,
  type StorageDriver,
  type ServerStatus,
} from './serverService';

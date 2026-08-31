# SSA ERP V2.64-B 缺口清单详细说明
## —— B2序列号驱动 + B2工单领料 + B4 NCR重处置 + B5交期回写

> **编制日期**：2026-08-25  
> **目的**：向强哥详细说明四个缺口的技术细节、影响范围、修复方案，确认后再启动开发

---

## 缺口一：B2-① 序列号驱动入库过账

### 📋 现状问题

**代码事实**：
- `src/types/warehouse.ts:25` 已有 `serialNos?: string[]` 字段
- `src/types/material.ts` 有 `serialized: boolean` 字段（标识物料是否序列号管理）
- **但入库过账时未强制校验**：用户可以不填序列号就完成入库

**影响**：
- 序列号追溯断链：无法追踪单个产品的生产/流通历史
- 对标差距：SAP QM/IM 强制序列号管控；金蝶序列号管理要求入库必须登记序列号

### 🔧 修复方案

**改动点**：
1. `src/stores/warehouseStore.ts` - `addInboundOrder` 方法：
   ```typescript
   // 新增校验：若物料是serialized，必须提供serialNos
   const material = useMaterialStore.getState().materials.find(m => m.id === item.materialId);
   if (material?.serialized && (!item.serialNos || item.serialNos.length === 0)) {
     throw new Error(`物料 ${item.materialCode} 启用了序列号管理，必须登记序列号`);
   }
   ```

2. `src/pages/Warehouse/InboundForm.tsx` - 入库表单：
   - 当物料是serialized时，显示序列号输入框（支持批量录入）
   - 校验序列号唯一性（不能重复）

3. `src/stores/warehouseStore.ts` - 入库过账：
   - 入库成功后，更新SerialMaster状态（inbound: serialNo → status='in_stock'）

4. `src/stores/warehouseStore.ts` - 出库过账：
   - 出库时按FIFO消耗序列号（serialNos中取出消耗的序列号）
   - 更新SerialMaster状态（outbound: status='shipped'）

**工作量**：M（1周）  
**涉及文件**：warehouseStore.ts, InboundForm.tsx, OutboundForm.tsx, serialStore.ts（新建）  
**风险**：低（向后兼容，非serialized物料不受影响）

---

## 缺口二：B2-② 工单领料出库单生成

### 📋 现状问题

**代码事实**：
- `src/pages/Production/WorkOrderDetail.tsx:153` 有领料UI（`handleGenFGInbound`调用`completeWorkOrder`）
- `src/stores/productionStore.ts` 有领料相关逻辑，但**未生成真实出库单**
- 影响：原料库存与实际生产消耗脱节

**影响**：
- 库存数据不准：领料未扣减库存，导致库存虚高
- 成本核算失真：生产领料不入成本，完工入库时成本不完整
- 对标差距：SAP PP 发料过账（261）；金蝶生产领料单联动库存

### 🔧 修复方案

**改动点**：
1. `src/stores/productionStore.ts` - 领料方法：
   ```typescript
   issueMaterials: (woId: string, items: { materialId: string; qty: number }[]) => boolean {
     // 1. 校验库存充足
     // 2. 调用 warehouseStore.addOutboundOrder(type='production_issue')
     // 3. 回写工单领料明细（issuedMaterials[]）
   }
   ```

2. `src/pages/Production/WorkOrderDetail.tsx` - 领料表单：
   - 选择物料+数量 → 提交 → 调用issueMaterials
   - 显示已领料明细（可追溯）

3. `src/stores/warehouseStore.ts` - 生产领料出库：
   - type='production_issue'的出库单过账时扣减库存
   - **不生成凭证**（生产领料待完工入库时成本归集）

**工作量**：M（1周）  
**涉及文件**：productionStore.ts, WorkOrderDetail.tsx, warehouseStore.ts  
**风险**：中（需校验库存充足，避免负库存）

---

## 缺口三：B4 完善NCR处置联动

### 📋 现状问题

**代码事实**：
- `src/stores/qualityStore.ts:113-170` `disposeUnqualified`方法：
  - `scrap`报废：✅ 已生成出库单（type='scrap'）+ 凭证
  - `rework`返工：❌ 仅状态闭环，无库存变化
  - `return_vendor`退货：❌ 仅状态闭环，无库存变化
  - `concession`让步接收：❌ 仅状态闭环，无凭证

**影响**：
- 返工品重新入库无记录，库存数量不准
- 退货供应商无出库单，应付账款未冲销
- 让步接收折价无凭证，成本核算不准确

### 🔧 修复方案

**改动点**：
1. `src/stores/qualityStore.ts` - 完善处置逻辑：
   ```typescript
   disposeUnqualified: (id, payload) => {
     const method = payload.disposition;
     
     if (method === 'scrap') {
       // 已有：生成报废出库单 + 凭证（借6602管理费用/贷1403原材料）
     } else if (method === 'rework') {
       // 新增：生成返工入库单（type='rework'），库存增加
       // 凭证：借1403原材料/贷6601生产损失
     } else if (method === 'return_vendor') {
       // 新增：生成退货出库单（type='return'），库存减少
       // 凭证：借2202应付账款/贷1403原材料（冲销原采购）
     } else if (method === 'concession') {
       // 新增：不生成出入库，但记录折价凭证
       // 凭证：借6602管理费用/贷1403原材料（折价损失）
     }
   }
   ```

2. `src/types/quality.ts` - 扩展处置类型：
   - 明确定义rework/concession/return_vendor的库存和凭证处理规则

**工作量**：M（1周）  
**涉及文件**：qualityStore.ts, types/quality.ts  
**风险**：中（需确保四种处置方式的幂等守卫，防止重复生成）

---

## 缺口四：B5 门户交期回写PO

### 📋 现状问题

**代码事实**：
- `src/stores/purchaseStore.ts:confirmOrderByVendor` 只回写：
  ```typescript
  status: 'vendorConfirmed',
  confirmedBy: info.operator,
  confirmedAt: new Date().toISOString()
  ```
- **未回写`expectedDeliveryDate`**：供应商确认的交期未同步到PO

**影响**：
- 交期承诺无追溯：PO显示的原交期 vs 供应商确认交期不一致
- 对标差距：SAP PO确认含confirmed delivery date；金蝶供应商门户交期协同

### 🔧 修复方案

**改动点**：
1. `src/types/purchase.ts` - PO类型扩展：
   ```typescript
   vendorConfirmedDate?: string;  // 供应商确认的交期
   vendorConfirmedNote?: string;  // 供应商备注
   ```

2. `src/stores/purchaseStore.ts` - 确认方法扩展：
   ```typescript
   confirmOrderByVendor: (poId, info) => {
     return {
       ...po,
       status: 'vendorConfirmed',
       confirmedBy: info.operator,
       confirmedAt: new Date().toISOString(),
       vendorConfirmedDate: info.confirmedDeliveryDate || po.expectedDeliveryDate, // 同步交期
       vendorConfirmedNote: info.note,
     }
   }
   ```

3. `src/pages/Vendor/VendorOrderConfirm.tsx` - 门户表单：
   - 显示PO原交期（只读）
   - 供应商可填写确认交期（editable，默认与原交期一致）
   - 提交时携带`confirmedDeliveryDate`

**工作量**：S（3天）  
**涉及文件**：types/purchase.ts, purchaseStore.ts, VendorOrderConfirm.tsx  
**风险**：低（向后兼容，原有字段不变）

---

## 执行优先级建议

| 优先级 | 缺口 | 理由 |
|--------|------|------|
| P0 | **B5 交期回写** | 工作量最小（3天），影响客户体验，快速见效 |
| P1 | **B4 NCR重处置** | 影响库存和财务准确性，与P0无依赖 |
| P2 | **B2-② 工单领料** | 影响成本核算，需配合B2-①序列号 |
| P3 | **B2-① 序列号驱动** | 工作量最大，但向后兼容无风险 |

**预计总工作量**：3-4周  
**建议分批交付**：
- **第1周**：B5 + B4（快速见效）
- **第2周**：B2-②（工单领料）
- **第3-4周**：B2-①（序列号驱动）

---

## 确认后启动

### 强哥确认的缺口设计方案

| 缺口 | 设计方案 | 状态 |
|------|----------|------|
| **B5 交期回写** | 新增独立列`vendorConfirmedDate`记录供应商确认交期，**不修改**PO原`expectedDeliveryDate` | ✅ 已确认 |
| **B4 NCR重处置** | 四种处置方式（scrap/rework/return_vendor/concession）**都需要生成凭证** | ✅ 已确认 |
| **B2-① 序列号** | 需要追溯全生命周期：生产→入库→出库→售后 | ✅ 已确认 |
| **B2-② 工单领料** | 领料占用库存，库存不足时阻断领料 | ✅ 已确认 |

### 执行顺序（已确认）
1. **第1周**：B5 + B4（快速见效）
2. **第2周**：B2-② 工单领料
3. **第3-4周**：B2-① 序列号驱动

### 已确认，启动开发

# V3.18.0 候选版本检查清单

## 已完成工作

### 1. Bug修复
- [x] P0-06: AQL code重复赋值Bug已修复
  - 文件: `src/utils/aql.ts`
  - 修复: 移除冗余的 `return { ...plan, code }`，改为直接 `return resolvePlan(code, aql)`

### 2. PDF导出功能
- [x] 创建 `src/utils/pdfExport.ts` 工具函数
- [x] 集成到财务报表页面 `FinancialStatements.tsx`
- [ ] 待验证: Vite构建是否通过

### 3. 代码质量检查
- [x] TypeScript类型检查通过（0新增错误）

## 待本机执行

### 构建验证
```bash
cd "C:/Users/zhangdeqiang/WorkBuddy/2026-05-08-task-1/ssa-erp"
npm run build
```

### E2E测试（四大流程）
1. **P2P（采购到付款）**
   - 采购申请 → 审批 → 订单 → 收货 → 入库 → 凭证
   
2. **O2C（订单到收款）**
   - 销售订单 → 信用检查 → 发货 → 出库 → COGS凭证
   
3. **Plan2Produce（计划到生产）**
   - MRP运算 → 工单 → 领料 → 报工 → 完工入库
   
4. **R2R（记录到报告）**
   - 凭证生成 → 过账 → 期末结转 → 三大报表

### 部署
```bash
node scripts/deploy.mjs
```

### 版本同步（如需升V3.18.0）
五处同步：
1. `src/version.ts`: `APP_VERSION='3.18.0'`
2. `package.json`: `"version": "3.18.0"`
3. `docs/ssa-erp-master-plan.md`: 添加V3.18.0记录
4. `src/content/manual.tsx`: 添加V3.18.0使用说明
5. `.workbuddy/memory/MEMORY.md`: 版本沿革更新

### 推送
```bash
push-github.bat
```

## V2.56对标报告核查结论

### 已修复（V2.56→V3.17.9）
- ✅ P0-01: 3个白屏页面（ProjectDetail/OutboundDetail/WorkOrderDetail）
- ✅ P0-08: 供应商激活死路（已有审批流）
- ✅ P0-09: 组织加入无审核（已有邀请码机制）
- ✅ P0-10: 密码SHA-256+无限流（已有PBKDF2+loginGuard）
- ✅ P1-04: 金税/数电票（TaxConfig页面存在）
- ✅ P1-05: 电子会计档案（InvoiceVerification页面存在）
- ✅ P2-08: 合并报表（ConsolidatedReport.tsx可用）

### 本次新增
- ✅ P1-06: PDF导出引擎（已创建工具函数并集成）
- ✅ P0-06: AQL code重复赋值（已修复）

### 仍待实现（非 blocker）
- P1-11: 标准成本法（需较大开发量）
- P2-09: 管理会计（成本中心/利润中心）
- P2-13: 字段级变更历史

## 总结

V2.56报告的多数关键问题已在V3.x期间修复。本次V3.18.0候选主要补充了PDF导出功能和修复了一个小Bug。TypeScript类型检查已通过，等待本机构建和测试验证后即可部署。

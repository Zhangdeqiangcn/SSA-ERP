/**
 * 供应商门户 · 采购模块 → 采购对账单（V3.116.0）
 * 路由：/vendor-portal/purchase/statements
 *
 * 为什么单独一页而不是继续塞在「财务管理」的 Tab 里：
 *   对账单本质是**采购履约的结算凭证** —— 供应商是对着采购订单/入库单核数、核完再开票。
 *   放在采购模块下，入口与业务动线一致（订单确认 → 发货 → 对账 → 开票 → 收款）。
 *   财务模块保留「开票申请 / 付款计划查询」，作为资金侧的视角。
 *
 * 实现上不复制一份代码：直接复用 VendorFinancePage 的 statement 模式，
 *   保证列表/新建/审批/开票/回写财务台账这一整条链路只有一套实现、一套口径。
 */
import React from 'react';
import VendorFinancePage from './VendorFinancePage';

const VendorStatementPage: React.FC = () => (
  <VendorFinancePage mode="statement" title="采购对账单" />
);

export default VendorStatementPage;

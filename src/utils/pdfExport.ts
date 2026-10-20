/**
 * PDF导出工具函数
 * 通过浏览器打印对话框生成PDF（兼容所有浏览器）
 * 使用时机：用户点击"导出PDF"按钮 → 打开打印预览 → 用户选择"另存为PDF"
 */

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { notifyError } from '@/utils/notify';

/**
 * 打印指定元素并允许用户保存为PDF
 * @param elementId - 要打印的HTML元素ID
 * @param title - 打印标题（显示在打印对话框中）
 */
export function printToPDF(elementId: string, title: string = '打印'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found`);
    return;
  }

  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notifyError('请允许弹窗以继续操作');
    return;
  }

  // 获取元素样式
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  // 构建打印内容
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        ${styles}
        @media print {
          body { margin: 0; padding: 20px; }
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>
      <div id="print-content">${element.innerHTML}</div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
}

/**
 * 导出凭证为PDF
 */
export function exportVoucherToPDF(voucherData: any): void {
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="font-family: SimSun, serif; padding: 40px; max-width: 800px; margin: 0 auto;">
      <h1 style="text-align: center; margin-bottom: 30px;">记账凭证</h1>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="border: 1px solid #000; padding: 8px; width: 20%;">凭证编号：</td>
          <td style="border: 1px solid #000; padding: 8px; width: 30%;">${voucherData.voucherNo || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; width: 20%;">日期：</td>
          <td style="border: 1px solid #000; padding: 8px; width: 30%;">${voucherData.date || '-'}</td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 8px; background: #f5f5f5;">摘要</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f5f5f5;">科目</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f5f5f5;">借方金额</th>
            <th style="border: 1px solid #000; padding: 8px; background: #f5f5f5;">贷方金额</th>
          </tr>
        </thead>
        <tbody>
          ${(voucherData.entries || []).map((entry: any, idx: number) => `
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">${entry.summary || '-'}</td>
              <td style="border: 1px solid #000; padding: 8px;">${entry.accountName || entry.accountCode || '-'}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${entry.debit ? entry.debit.toFixed(2) : '-'}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${entry.credit ? entry.credit.toFixed(2) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right;">
        <p>合计：${voucherData.totalDebit?.toFixed(2) || '0.00'} 元</p>
        <p>制单人：${voucherData.createdBy || '-'} &nbsp;&nbsp; 审核人：${voucherData.reviewedBy || '-'} &nbsp;&nbsp; 记账人：${voucherData.bookedBy || '-'}</p>
      </div>
    </div>
  `;
  // 必须先赋 id：printToPDF 是按 id 取元素的，缺 id 会取到 null 后静默返回
  element.id = 'temp-print-voucher';
  document.body.appendChild(element);
  printToPDF(element.id, '记账凭证');
  setTimeout(() => document.body.removeChild(element), 1000);
}

/**
 * 导出报表为PDF
 */
export function exportReportToPDF(reportData: any, reportType: string): void {
  const element = document.createElement('div');
  const titles: Record<string, string> = {
    balanceSheet: '资产负债表',
    incomeStatement: '利润表',
    cashFlow: '现金流量表',
    trialBalance: '试算平衡表'
  };

  element.innerHTML = `
    <div style="font-family: SimSun, serif; padding: 40px; max-width: 900px; margin: 0 auto;">
      <h1 style="text-align: center; margin-bottom: 10px;">${titles[reportType] || '报表'}</h1>
      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        ${reportData.period || '报告期'} &nbsp;&nbsp; 单位：元
      </p>
      ${reportData.content || '<p>暂无数据</p>'}
      <div style="margin-top: 40px; text-align: right; font-size: 14px; color: #666;">
        <p>编制单位：${reportData.companyName || '-'}</p>
        <p>编制日期：${new Date().toLocaleDateString('zh-CN')}</p>
      </div>
    </div>
  `;
  element.id = 'temp-print-report';
  document.body.appendChild(element);
  printToPDF(element.id, titles[reportType] || '报表');
  setTimeout(() => document.body.removeChild(element), 1000);
}

/**
 * 通用导出函数（供页面调用）
 */
export function exportToPDF(elementId: string, fileName: string = 'document'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    notifyError('未找到要导出的内容');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notifyError('请允许弹窗以继续操作');
    return;
  }

  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${fileName}</title>
      <style>
        ${styles}
        @media print {
          body { margin: 0; padding: 20px; }
          @page { size: A4; margin: 2cm; }
        }
      </style>
    </head>
    <body>
      <div style="padding: 20px;">
        ${element.innerHTML}
      </div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
}

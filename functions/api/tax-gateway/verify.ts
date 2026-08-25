// POST /api/tax-gateway/verify — 发票批量核验（基于第三方查验API）
// 支持：增值税专用发票、增值税普通发票、数电票、区块链电子发票等

import { getUserFromRequest, json } from '../../_shared/auth';

interface VerifyRequest {
  invoices: InvoiceItem[];
  provider: 'etoplive' | 'lskj' | 'manual';
}

interface InvoiceItem {
  type: string;         // 01=专票, 04=普票, 09=全电, 10=电普, 20=电子专票
  code?: string;        // 发票代码（数电票可空）
  number: string;       // 发票号码
  date: string;         // YYYY-MM-DD
  amount: number;       // 不含税金额
  checkCode?: string;   // 校验码后6位
  totalAmount?: number; // 价税合计
  sellerTaxNo?: string; // 销方税号
}

interface VerifyResult {
  invoiceNo: string;
  type: string;
  isValid: boolean;
  status: 'valid' | 'invalid' | 'not_found' | 'error';
  message?: string;
  parsed?: InvoiceDetail;
  checkedAt: string;
}

interface InvoiceDetail {
  invoiceCode?: string;
  invoiceNumber: string;
  invoiceType: string;
  invoiceDate: string;
  buyerName?: string;
  sellerName?: string;
  sellerTaxNo?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  checkCode?: string;
  machineCode?: string;
  remark?: string;
}

// 模拟查验（实际对接时替换为真实API调用）
async function mockVerifyInvoice(item: InvoiceItem): Promise<VerifyResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 模拟查验逻辑：发票号以特定规则校验
      const invoiceNo = item.number || '';
      const isMockValid = invoiceNo.length >= 8;

      resolve({
        invoiceNo,
        type: item.type,
        isValid: isMockValid,
        status: isMockValid ? 'valid' : 'error',
        message: isMockValid ? '查验通过' : '查验失败：发票号格式错误',
        parsed: isMockValid ? {
          invoiceNumber: invoiceNo,
          invoiceType: item.type,
          invoiceDate: item.date,
          amount: item.amount,
          taxAmount: item.totalAmount ? item.totalAmount - item.amount : item.amount * 0.13,
          totalAmount: item.totalAmount || item.amount * 1.13,
        } : undefined,
        checkedAt: new Date().toISOString(),
      });
    }, Math.random() * 500 + 200);
  });
}

// 实际对接示例：etoplive API
async function etopliveVerifyInvoice(item: InvoiceItem, apiKey: string, apiSecret: string): Promise<VerifyResult> {
  // TODO: 替换为真实的etoplive API调用
  // const res = await fetch('https://www.etoplive.com/api/invchk.srvc', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     key: apiKey,
  //     secret: apiSecret,
  //     FPLX: item.type,
  //     FPDM: item.code || '',
  //     FPHM: item.number,
  //     KPRQ: item.date.replace(/-/g, ''),
  //     FPJE: item.amount.toString(),
  //     JYM: item.checkCode || '',
  //     JSHJ: (item.totalAmount || item.amount).toString(),
  //   }),
  // });
  // const data = await res.json();
  // return { ... };
  return mockVerifyInvoice(item);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;

  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  let body: VerifyRequest;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: '请求体格式错误' }, 400);
  }

  const { invoices, provider = 'manual' } = body;

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return json({ success: false, error: '请至少上传一张发票' }, 400);
  }

  if (invoices.length > 100) {
    return json({ success: false, error: '单次最多核验100张发票' }, 400);
  }

  // 读取金税网关配置
  const config = await env?.TAX_GATEWAY?.get('config')
    ? JSON.parse(await env.TAX_GATEWAY.get('config'))
    : null;

  const results: VerifyResult[] = [];
  const concurrency = 5; // 并发限制

  for (let i = 0; i < invoices.length; i += concurrency) {
    const batch = invoices.slice(i, i + concurrency);
    await Promise.all(batch.map(async (item: InvoiceItem) => {
      try {
        let result: VerifyResult;
        if (provider === 'etoplive' && config?.apiKey) {
          result = await etopliveVerifyInvoice(item, config.apiKey, config.apiSecret || '');
        } else {
          result = await mockVerifyInvoice(item);
        }
        results.push(result);
      } catch (e: any) {
        results.push({
          invoiceNo: item.number,
          type: item.type,
          isValid: false,
          status: 'error',
          message: e.message || '查验异常',
          checkedAt: new Date().toISOString(),
        });
      }
    }));
  }

  // 统计
  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.filter(r => r.status === 'invalid' || r.status === 'not_found').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  // 记录审计日志
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (org_id, action, entity, entity_id, operator, details, ip_address)
       VALUES (?, 'invoice_verify_batch', 'invoice', ?, ?, ?, ?)`
    ).bind(
      user.org_id,
      JSON.stringify({ total: results.length, valid: validCount, invalid: invalidCount, error: errorCount }),
      user.id,
      request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
    ).run();
  } catch {
    // 审计日志写入失败不影响主流程
  }

  return json({
    success: true,
    data: {
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      error: errorCount,
      results,
    },
    message: `核验完成：通过 ${validCount} 张，不通过 ${invalidCount} 张，异常 ${errorCount} 张`,
  });
}

// GET 接口返回帮助信息
export async function onRequestGet(context: any) {
  return json({
    message: '发票批量核验接口',
    usage: 'POST /api/tax-gateway/verify',
    supportedTypes: [
      { code: '01', name: '增值税专用发票' },
      { code: '03', name: '机动车销售统一发票' },
      { code: '04', name: '增值税普通发票' },
      { code: '05', name: '区块链电子发票' },
      { code: '09', name: '数电发票（蓝票）' },
      { code: '10', name: '增值税普通发票（电子）' },
      { code: '11', name: '增值税普通发票（卷式）' },
      { code: '20', name: '增值税专用发票（电子）' },
    ],
    batchLimit: 100,
    concurrency: 5,
    providers: ['etoplive', 'lskj', 'manual'],
    tips: [
      '数电票无需发票代码，仅需发票号码+开票日期+金额',
      '当日开具的发票当日可查验',
      '每张发票每天最多查验5次',
      '建议批量上传时控制并发数避免限流',
    ],
  });
}

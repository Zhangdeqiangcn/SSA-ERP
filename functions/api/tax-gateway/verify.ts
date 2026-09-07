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
  /** 本张发票核验走的是真实第三方通道还是本地模拟（V2.80 新增，用于前端明确标注真/假） */
  channel?: 'real' | 'mock';
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
        message: isMockValid ? '模拟查验通过（未配置真实通道）' : '查验失败：发票号格式错误',
        parsed: isMockValid ? {
          invoiceNumber: invoiceNo,
          invoiceType: item.type,
          invoiceDate: item.date,
          amount: item.amount,
          taxAmount: item.totalAmount ? item.totalAmount - item.amount : item.amount * 0.13,
          totalAmount: item.totalAmount || item.amount * 1.13,
        } : undefined,
        channel: 'mock',
        checkedAt: new Date().toISOString(),
      });
    }, Math.random() * 500 + 200);
  });
}

// ── 真实查验通道骨架（V2.80） ──────────────────────────────────
// 税务局官平台对企业不开放公开 API，须经持牌第三方（etoplive / 航信 / 百望 / 票联云等）。
// 凭证来自 KV 命名空间 TAX_GATEWAY 的 config：{ provider, apiKey, apiSecret, ... }
// 未配置 apiKey 时绝不调用真实接口（本函数与上层路由默认走 mock）。
interface GatewayConfig {
  provider?: string;
  apiKey?: string;
  apiSecret?: string;
  [k: string]: any;
}

/** 统一映射第三方返回为 VerifyResult */
function toResult(
  item: InvoiceItem,
  ok: boolean,
  detail: Partial<InvoiceDetail>,
  msg: string,
  channel: 'real' | 'mock'
): VerifyResult {
  return {
    invoiceNo: item.number,
    type: item.type,
    isValid: ok,
    status: ok ? 'valid' : 'invalid',
    message: msg,
    parsed: ok
      ? {
          invoiceNumber: item.number,
          invoiceType: item.type,
          invoiceDate: item.date,
          amount: item.amount,
          taxAmount: detail.taxAmount ?? (item.totalAmount ? item.totalAmount - item.amount : item.amount * 0.13),
          totalAmount: detail.totalAmount ?? item.totalAmount ?? item.amount * 1.13,
          ...detail,
        }
      : undefined,
    channel,
    checkedAt: new Date().toISOString(),
  };
}

// etoplive 真实查验（按官方发票查验接口参数构造，application/x-www-form-urlencoded）
async function etopliveVerifyInvoice(item: InvoiceItem, cfg: GatewayConfig): Promise<VerifyResult> {
  const body = new URLSearchParams({
    key: cfg.apiKey || '',
    secret: cfg.apiSecret || '',
    FPLX: item.type,
    FPDM: item.code || '',
    FPHM: item.number,
    KPRQ: item.date.replace(/-/g, ''),
    FPJE: item.amount.toString(),
    JYM: item.checkCode || '',
    JSHJ: (item.totalAmount || item.amount).toString(),
  });
  const res = await fetch('https://www.etoplive.com/api/invchk.srvc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    return toResult(item, false, {}, `真实查验失败：HTTP ${res.status}`, 'real');
  }
  const data: any = await res.json().catch(() => null);
  // 各服务商返回结构需按实际文档微调；此处按常见“成功/一致”字段判定
  const success =
    !!data && (data.code === '0' || data.success === true || data.status === 'SUCCESS' || data.fpzt === '正常' || data.valid === true);
  if (!success) {
    return toResult(
      item,
      false,
      {},
      `真实查验不一致：${data?.message || data?.msg || JSON.stringify(data || {}).slice(0, 80)}`,
      'real'
    );
  }
  return toResult(
    item,
    true,
    {
      invoiceCode: item.code,
      buyerName: data.gmfmc || data.buyerName,
      sellerName: data.xsfmc || data.sellerName,
      sellerTaxNo: data.xsfsh || data.sellerTaxNo,
      taxAmount: Number(data.se || data.taxAmount || (item.totalAmount ? item.totalAmount - item.amount : item.amount * 0.13)),
      totalAmount: Number(data.jshj || data.totalAmount || item.totalAmount),
    },
    '真实查验通过（第三方通道）',
    'real'
  );
}

// 通用路由：按 config.provider 选择真实服务商；未实现则抛错（上层转 error 状态，绝不静默回退 mock 误判为通过）
async function realVerifyInvoice(item: InvoiceItem, cfg: GatewayConfig): Promise<VerifyResult> {
  switch (cfg.provider) {
    case 'etoplive':
      return etopliveVerifyInvoice(item, cfg);
    // 航信 / 百望 / 票联云等同理，按各自文档实现后加入 case；当前未接通
    default:
      throw new Error(`服务商 ${cfg.provider || '未指定'} 真实通道研发中，请改用 etoplive 或配置 manual 走模拟`);
  }
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

  // 真实通道判定：KV 配置了 apiKey 且 provider 非 manual 才走真实第三方；否则一律模拟兜底
  const useReal = !!(config?.apiKey && config?.provider && config.provider !== 'manual');

  for (let i = 0; i < invoices.length; i += concurrency) {
    const batch = invoices.slice(i, i + concurrency);
    await Promise.all(batch.map(async (item: InvoiceItem) => {
      try {
        let result: VerifyResult;
        if (useReal) {
          try {
            result = await realVerifyInvoice(item, config);
          } catch (e: any) {
            result = {
              invoiceNo: item.number,
              type: item.type,
              isValid: false,
              status: 'error',
              message: e.message || '真实通道异常',
              channel: 'real',
              checkedAt: new Date().toISOString(),
            };
          }
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
          channel: useReal ? 'real' : 'mock',
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
      // V2.80：明确告知前端本次批次走的是真实第三方通道还是本地模拟兜底
      verifiedBy: useReal ? 'real' : 'mock',
    },
    message: `核验完成：通过 ${validCount} 张，不通过 ${invalidCount} 张，异常 ${errorCount} 张${useReal ? '（真实通道）' : '（模拟兜底）'}`,
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

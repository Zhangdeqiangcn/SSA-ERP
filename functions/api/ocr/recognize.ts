// POST /api/ocr/recognize — 发票 OCR 识别（基于 Tesseract.js）
import { getUserFromRequest, json } from '../../_shared/auth';
import { createWorker } from 'tesseract.js';

interface ParsedInvoice {
  invoiceNo: string;
  invoiceDate: string;
  buyer: string;
  seller: string;
  amount: number;
  taxRate: string;
  taxAmount: number;
  total: number;
  rawText: string;
  confidence: number;
  duration: number;
}

function parseInvoiceText(text: string): Partial<ParsedInvoice> {
  const pick = (label: string) => {
    const m = text.match(new RegExp(`${label}[：:\\s]*([^\\n]+)`));
    return m ? m[1].trim() : '';
  };
  const num = (label: string) => {
    const v = pick(label).replace(/[, ¥￥\s]/g, '');
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  return {
    invoiceNo: pick('发票号码') || pick('发票代码') || pick('No') || '',
    invoiceDate: pick('开票日期') || pick('日期') || '',
    buyer: pick('购买方') || pick('购方') || '',
    seller: pick('销售方') || pick('销方') || '',
    amount: num('金额'),
    taxRate: pick('税率') || '',
    taxAmount: num('税额'),
    total: num('价税合计') || num('合计') || 0,
  };
}

export async function onRequestPost(context: any) {
  const { request, env } = context;

  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ success: false, error: '未登录' }, 401);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: '请上传发票图片' }, 400);
  }
  const imageFile = formData.get('image') as File;

  if (!imageFile) {
    return json({ success: false, error: '请上传发票图片' }, 400);
  }

  const language = (formData.get('language') as string) || 'chi_sim+eng';
  const startTime = Date.now();

  try {
    const worker = await createWorker(language, 1, {
      logger: (m) => {
        console.log(`OCR progress: ${m.status} ${Math.round((m.progress || 0) * 100)}%`);
      },
    });

    const arrayBuffer = await imageFile.arrayBuffer();
    const { data } = await worker.recognize(arrayBuffer as unknown as Blob);

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const confidence = Number(data.confidence) || 0;
    const text = data.text || '';
    const parsed = parseInvoiceText(text);

    await worker.terminate();

    return json({
      success: true,
      data: {
        ...parsed,
        rawText: text,
        confidence,
        duration,
      },
    });
  } catch (error: any) {
    return json({
      success: false,
      error: error.message || 'OCR 识别失败',
    }, 500);
  }
}

export async function onRequestGet(context: any) {
  return json({
    message: 'OCR 识别接口',
    usage: 'POST /api/ocr/recognize',
    params: {
      image: '图片文件 (PNG/JPEG/BMP/WebP)',
      language: '语言包，默认 chi_sim+eng',
    },
    supportedLanguages: [
      'eng', 'chi_sim', 'chi_tra', 'jpn', 'kor',
      'fra', 'deu', 'spa', 'ara', 'rus',
    ],
    tips: [
      '支持多语言组合，如 chi_sim+eng',
      '建议图片分辨率 200-300 DPI',
      '裁剪发票区域可提高识别准确率',
    ],
  });
}

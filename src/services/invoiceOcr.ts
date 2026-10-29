// 发票 OCR 增强服务层（V2.80）
// ───────────────────────────────────────────────────────────────
// 提供两项能力：
// 1. preprocessInvoiceImage —— 浏览器端图像预处理（灰度 + Otsu 二值化 + 轻量降噪 + 适度放大），
//    显著提升 Tesseract（光学字符识别引擎）对中文发票的识别率。
// 2. extractInvoiceFields —— 把 OCR 原始文字用大模型智能抽取成结构化字段，
//    替换脆弱的正则硬匹配；无模型配置 / 调用失败 / 返回非 JSON 时返回 null（由调用方回退正则）。
// 两项都不引入任何付费依赖，纯前端 + 用户已配置的本地模型。

import { useAIStore } from '@/stores/aiStore';

/** OCR 抽取后的结构化发票字段（与 InvoiceOcr 页 ParsedInvoice 对齐并扩展） */
export interface ExtractedInvoice {
  invoiceCode?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  buyerName?: string;
  buyerTaxNo?: string;
  sellerName?: string;
  sellerTaxNo?: string;
  amount?: number;
  taxRate?: string;
  taxAmount?: number;
  totalAmount?: number;
  items?: string;
}

// ── 图像预处理 ──────────────────────────────────────────────────
/**
 * 把上传的图片做灰度化 + Otsu 全局二值化 + 3x3 中值滤波降噪 + 适度放大，
 * 返回处理后的 Blob（PNG），可直接喂给 Tesseract 识别。
 * 不依赖任何外部库，使用浏览器原生 canvas / ImageData。
 */
export async function preprocessInvoiceImage(file: File): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);
  const { width, height } = bitmap;

  // 适度放大：中文发票识别在小图上易丢笔画，放大到宽度 ~1600 更稳；过大则 tesseract 慢
  const targetW = Math.min(Math.max(width, 1200), 1600);
  const scale = targetW / width;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file; // 环境不支持 canvas，原样返回
  ctx.drawImage(bitmap, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const gray = toGray(img.data);
  const binary = otsuBinarize(gray, w, h);
  const denoised = medianFilter(binary, w, h, 1);

  // 写回 canvas（黑字白底）
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < denoised.length; i++) {
    const v = denoised[i]; // 0=黑 255=白
    out.data[i * 4] = v;
    out.data[i * 4 + 1] = v;
    out.data[i * 4 + 2] = v;
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || file), 'image/png');
  });
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img as unknown as ImageBitmap);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

/** RGBA → 灰度（亮度法） */
function toGray(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < out.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return out;
}

/** Otsu 全局阈值二值化，返回 0(黑字)/255(白底) */
function otsuBinarize(gray: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) {
    // 发票文字多为深色，背景浅色 → 低于阈值判为文字(黑)
    out[i] = gray[i] < threshold ? 0 : 255;
  }
  return out;
}

/** 3x3 中值滤波去椒盐噪点（二值图） */
function medianFilter(bin: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(bin.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vals: number[] = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          vals.push(bin[ny * w + nx]);
        }
      }
      vals.sort((a, b) => a - b);
      out[y * w + x] = vals[Math.floor(vals.length / 2)];
    }
  }
  return out;
}

// ── 大模型结构化抽取 ────────────────────────────────────────────
const EXTRACT_SYSTEM_PROMPT = `你是一名发票信息抽取专家。请从用户提供的发票 OCR（光学字符识别）原始文字中，抽取结构化字段。
只输出一个 JSON 对象，不要输出任何解释、前言或Markdown代码块标记。
字段说明：
- invoiceCode: 发票代码（数电票通常为空字符串）
- invoiceNo: 发票号码（必填，字符串）
- invoiceDate: 开票日期，格式 YYYY-MM-DD
- buyerName: 购买方名称
- buyerTaxNo: 购买方纳税人识别号（税号）
- sellerName: 销售方名称
- sellerTaxNo: 销售方纳税人识别号（税号）
- amount: 金额（不含税），数字
- taxRate: 税率，如 "13%"
- taxAmount: 税额，数字
- totalAmount: 价税合计，数字
- items: 主要货物或应税劳务名称，逗号分隔的字符串
无法识别的字段请填空字符串或 0。`;

/**
 * 把 OCR 原始文字交给大模型抽取结构化字段。
 * 返回 null 表示应回退到正则（无模型配置 / 网络错 / 解析失败）。
 */
export async function extractInvoiceFields(rawText: string): Promise<ExtractedInvoice | null> {
  try {
    const model = useAIStore.getState().getActiveModel();
    if (!model || !model.apiKey) return null;

    const base = model.baseUrl.replace(/\/+$/, '');
    const url = `${base}/chat/completions`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        temperature: 0,
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: `发票 OCR 文字如下：\n${rawText}` },
        ],
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (!content) return null;

    const json = parseJsonLoose(content);
    if (!json || !json.invoiceNo) return null;

    const num = (v: any) => {
      const n = parseFloat(String(v).replace(/[, ¥￥]/g, ''));
      return isNaN(n) ? 0 : n;
    };
    return {
      invoiceCode: json.invoiceCode ?? '',
      invoiceNo: String(json.invoiceNo),
      invoiceDate: json.invoiceDate ?? '',
      buyerName: json.buyerName ?? '',
      buyerTaxNo: json.buyerTaxNo ?? '',
      sellerName: json.sellerName ?? '',
      sellerTaxNo: json.sellerTaxNo ?? '',
      amount: num(json.amount),
      taxRate: json.taxRate ?? '',
      taxAmount: num(json.taxAmount),
      totalAmount: num(json.totalAmount),
      items: json.items ?? '',
    };
  } catch {
    return null;
  }
}

/** 宽松解析 JSON：支持 ```json 包裹、前后多余文字 */
function parseJsonLoose(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

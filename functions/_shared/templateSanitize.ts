/**
 * 服务端打印模板 HTML 净化器（白名单，纯函数，无 DOM 依赖）。
 *
 * 安全目标：在落库前把用户可控的模板 HTML 净化成「再差也只会渲染排版」的片段，
 * 从写入源头断掉审计报告中 [致命] SEC-001 的存储型 XSS。
 * 本函数在 Cloudflare Worker（无 DOM）环境下可直接运行——只用正则与字符串解析。
 *
 * 净化规则：
 *   1. 整段删除 <script>/<style> 及其内容；删除 <iframe>/<object>/<embed>/
 *      <link>/<meta>/<base>/<form>/<svg>/<foreignObject> 等危险标签（含自闭合 / 游离闭合）；
 *   2. 所有标签仅保留白名单内的属性，事件属性 on* 因此被自然丢弃；
 *   3. <img> 仅保留 src / alt / width / height / style；其中 src 仅放行
 *      http/https（以及相对值）与 data:image（非 svg），禁止 javascript: 与危险 data:；
 *   4. <a>   仅保留 href / target / rel；href 禁止 javascript: 与 data: 协议；
 *   5. style 值剔除 expression( / url(javascript / @import / javascript: / vbscript:；
 *   6. 文本节点原样保留；畸形 HTML（未闭合、属性无引号）不抛异常，最坏返回安全片段。
 */
export function sanitizeTemplateHtml(dirty: string): string {
  if (typeof dirty !== 'string') return '';
  if (dirty === '') return '';

  // ── 第一步：整段删除带内容的危险标签（script/style 必须连内容一起删）──
  let s = dirty;
  for (const t of ['script', 'style'] as const) {
    const re = new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`, 'gi');
    s = s.replace(re, '');
  }

  // ── 第二步：删除其余危险标签（自闭合 / 无闭合）及其游离闭合标签 ──
  const REMOVE_TAGS = [
    'iframe', 'object', 'embed', 'link', 'meta', 'base',
    'form', 'svg', 'foreignobject', 'frame', 'noscript',
  ];
  s = s.replace(new RegExp(`<(?:${REMOVE_TAGS.join('|')})\\b[^>]*\\/?>`, 'gi'), '');
  s = s.replace(new RegExp(`<\\/(?:${REMOVE_TAGS.join('|')})\\s*>`, 'gi'), '');

  // ── 第三步：逐个标签做属性白名单 ──
  // 仅把 `<字母...>` / `</字母...>` 当作标签处理；形如 `< 2 & 3 >` 的纯文本片段原样保留，
  // 避免把文本里的尖括号误判为标签而吞掉内容。
  const re = /<\/?[a-zA-Z][^>]*>/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out += s.slice(last, m.index);
    last = m.index + m[0].length;
    out += sanitizeTag(m[0]);
  }
  out += s.slice(last);
  return out;
}

/** 允许出现的标签白名单（排版标签 + img + a） */
const ALLOWED_TAGS = new Set([
  'p', 'div', 'span', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'small',
  'sub', 'sup', 'section', 'img', 'a',
]);

/** 通用排版标签允许保留的属性 */
const GENERIC_SAFE_ATTRS = new Set([
  'style', 'class', 'align', 'width', 'height', 'border',
  'cellpadding', 'cellspacing', 'colspan', 'rowspan',
]);

interface ParsedAttr {
  name: string;
  value: string | null;
}

/** 解析单个标签内的属性（兼容双引号 / 单引号 / 裸值 / 布尔属性） */
function parseAttributes(tag: string): ParsedAttr[] {
  const attrs: ParsedAttr[] = [];
  const re = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) {
    const name = m[1].toLowerCase();
    let value: string | null = null;
    if (m[2] !== undefined) {
      value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    }
    attrs.push({ name, value });
  }
  return attrs;
}

/** 属性值转义，保证重新拼回 HTML 属性时安全（浏览器会把 &amp; 还原为 &，URL 不受影响） */
function escapeAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 净化 style 值，剔除可执行的危险片段 */
function cleanStyle(style: string): string {
  if (!style) return '';
  return style
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*['"]?\s*javascript:/gi, '')
    .replace(/@import/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .trim();
}

/** img 的 src 是否安全（放行 http/https/相对值 与 data:image 非 svg，禁止 javascript: 与危险 data:） */
function isSafeImgSrc(v: string | null): boolean {
  if (v === null) return false;
  const raw = v.trim();
  if (raw === '') return false;
  if (/^javascript:/i.test(raw)) return false;
  if (/^data:/i.test(raw)) return /^data:image\/(?!svg)/i.test(raw);
  return true;
}

/** a 的 href 是否安全（禁止 javascript: 与 data:，其余放行） */
function isSafeHref(v: string | null): boolean {
  if (v === null) return false;
  const raw = v.trim();
  if (raw === '') return false;
  if (/^javascript:/i.test(raw)) return false;
  if (/^data:/i.test(raw)) return false;
  return true;
}

/** 对单个标签字符串做白名单净化，返回净化后的标签字符串 */
function sanitizeTag(tag: string): string {
  const isClose = /^<\//.test(tag);
  const nameMatch = /^<\/?([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
  if (!nameMatch) return ''; // 无法识别的尖括号片段，直接丢弃
  const name = nameMatch[1].toLowerCase();

  if (isClose) {
    return ALLOWED_TAGS.has(name) ? `</${name}>` : '';
  }

  if (!ALLOWED_TAGS.has(name)) {
    // 未知标签：丢弃标签本身，其内部文本 / 子标签由文本与后续处理保留
    return '';
  }

  const attrs = parseAttributes(tag);
  const kept: string[] = [];

  if (name === 'img') {
    for (const a of attrs) {
      if (a.name === 'src') {
        if (isSafeImgSrc(a.value)) kept.push(`src="${escapeAttr(a.value ?? '')}"`);
      } else if (a.name === 'alt' || a.name === 'width' || a.name === 'height') {
        kept.push(`${a.name}="${escapeAttr(a.value ?? '')}"`);
      } else if (a.name === 'style') {
        const clean = cleanStyle(a.value ?? '');
        if (clean) kept.push(`style="${escapeAttr(clean)}"`);
      }
    }
    return kept.length ? `<img ${kept.join(' ')}>` : '<img>';
  }

  if (name === 'a') {
    for (const a of attrs) {
      if (a.name === 'href') {
        if (isSafeHref(a.value)) kept.push(`href="${escapeAttr(a.value ?? '')}"`);
      } else if (a.name === 'target' || a.name === 'rel') {
        kept.push(`${a.name}="${escapeAttr(a.value ?? '')}"`);
      }
    }
    return kept.length ? `<a ${kept.join(' ')}>` : '<a>';
  }

  // 通用排版标签：仅保留安全属性，并净化 style
  for (const a of attrs) {
    if (!GENERIC_SAFE_ATTRS.has(a.name)) continue;
    if (a.name === 'style') {
      const clean = cleanStyle(a.value ?? '');
      if (clean) kept.push(`style="${escapeAttr(clean)}"`);
    } else if (a.value === null || a.value === '') {
      kept.push(a.name);
    } else {
      kept.push(`${a.name}="${escapeAttr(a.value)}"`);
    }
  }
  return kept.length ? `<${name} ${kept.join(' ')}>` : `<${name}>`;
}

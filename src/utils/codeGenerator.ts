/**
 * 物料编码生成工具（层级前缀模型）
 *
 * 设计：物料分类即编码规则。每个分类带一个 `code`（已存为全路径编码，如
 * 钢材=01、Q235板材=0102、钢板=010201），其下物料编码 = 分类全路径编码 + 流水号。
 * 例：Q235板材（0102）下第 2 个物料 → 0102002。
 * 流水号位数由分类的 `sequenceLength` 决定（默认 3）。
 */

// 查找分类节点
const findCategoryNode = (
  categories: { id: string; code: string; parentId?: string | null; sequenceLength?: number; children?: any[] }[],
  categoryId: string
): { id: string; code: string; sequenceLength?: number } | null => {
  for (const node of categories) {
    if (node.id === categoryId) return node;
    if (node.children) {
      const found = findCategoryNode(node.children, categoryId);
      if (found) return found;
    }
  }
  return null;
};

// 获取分类的全路径编码（分类的 code 字段本身即全路径编码）
export const getCategoryFullCode = (
  categories: { id: string; code: string; parentId?: string | null; children?: any[] }[],
  categoryId: string
): string => {
  const node = findCategoryNode(categories, categoryId);
  return node?.code || '';
};

// 获取下一个流水号（基于已有编码中该前缀下的最大序号）
export const getNextSequence = (
  existingCodes: string[],
  prefix: string,
  seqLength: number
): string => {
  let maxSeq = 0;
  const seqPrefix = prefix || '';
  const seqRegex = new RegExp(
    `${seqPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d{${seqLength}})`
  );

  for (const code of existingCodes) {
    const match = code.match(seqRegex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = maxSeq + 1;
  return nextSeq.toString().padStart(seqLength, '0');
};

// 根据分类自动生成物料编码：分类全路径编码 + 流水号
export const generateMaterialCodeByCategory = (
  categoryId: string | undefined,
  categories: { id: string; code: string; parentId?: string | null; sequenceLength?: number; children?: any[] }[],
  materials: { code: string }[]
): string => {
  if (!categoryId) return '';
  const cat = findCategoryNode(categories, categoryId);
  if (!cat || !cat.code) return '';
  const seqLen = cat.sequenceLength ?? 3;
  const existingCodes = materials.map((m) => m.code);
  const next = getNextSequence(existingCodes, cat.code, seqLen);
  return `${cat.code}${next}`;
};

// ============================ 采购申请编号生成 ============================

/** 部门名称 → 编号映射（可按需扩展） */
const DEPT_CODE_MAP: Record<string, string> = {
  '生产部': 'PD',
  '采购部': 'PU',
  '设备部': 'EQ',
  '技术部': 'TD',
  '安全部': 'SD',
  '质量部': 'QA',
  '财务部': 'FI',
  '仓储部': 'WH',
  '销售部': 'SA',
  '人事部': 'HR',
  '行政部': 'AD',
};

/**
 * 生成采购申请号
 * 格式：PR-{部门编号}-{YYYYMMDD}-{3位流水号}
 * 例：PR-PD-20260724-001
 */
export const generatePurchaseRequestNo = (
  department: string,
  existingNos: string[]
): string => {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
  ].join('');

  const deptCode = DEPT_CODE_MAP[department] || 'XX';
  const prefix = `PR-${deptCode}-${dateStr}-`;

  // 从现有编号中提取当日同部门最大流水号
  let maxSeq = 0;
  for (const no of existingNos) {
    if (no.startsWith(prefix)) {
      const seq = parseInt(no.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * 前端离线兜底单号（仅在使用前端模拟数据层、且调用方未传入单号时生效）。
 * 格式：前缀-YYYYMMDD-4位(当日流水+2位随机尾)，保证单号美观，并大幅降低多端同日碰撞概率。
 * 说明：走后端 functions 的建单接口已由 functions/_shared/numbering.ts 在 D1 内原子取号，
 * 此函数仅用于前端 apiService 层的本地兜底，不依赖 localStorage，浏览器与 Node 测试环境均可运行。
 */
const _localDocSeq: Record<string, number> = {};
export const generateLocalDocNo = (prefix: string): string => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const key = `${prefix}-${ymd}`;
  _localDocSeq[key] = (_localDocSeq[key] || 0) + 1;
  const seq = _localDocSeq[key].toString().padStart(4, '0');
  // 2 位 36 进制随机尾，规避多端同日同序碰撞
  const tail = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return `${prefix}-${ymd}-${seq}${tail}`;
};

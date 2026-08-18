const findCategoryNode = (categories, categoryId) => {
  for (const node of categories) {
    if (node.id === categoryId) return node;
    if (node.children) {
      const found = findCategoryNode(node.children, categoryId);
      if (found) return found;
    }
  }
  return null;
};
const getCategoryFullCode = (categories, categoryId) => {
  const node = findCategoryNode(categories, categoryId);
  return (node == null ? void 0 : node.code) || "";
};
const getNextSequence = (existingCodes, prefix, seqLength) => {
  let maxSeq = 0;
  const seqPrefix = prefix || "";
  const seqRegex = new RegExp(
    `${seqPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{${seqLength}})`
  );
  for (const code of existingCodes) {
    const match = code.match(seqRegex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  const nextSeq = maxSeq + 1;
  return nextSeq.toString().padStart(seqLength, "0");
};
const generateMaterialCodeByCategory = (categoryId, categories, materials) => {
  if (!categoryId) return "";
  const cat = findCategoryNode(categories, categoryId);
  if (!cat || !cat.code) return "";
  const seqLen = cat.sequenceLength ?? 3;
  const existingCodes = materials.map((m) => m.code);
  const next = getNextSequence(existingCodes, cat.code, seqLen);
  return `${cat.code}${next}`;
};
const DEPT_CODE_MAP = {
  "生产部": "PD",
  "采购部": "PU",
  "设备部": "EQ",
  "技术部": "TD",
  "安全部": "SD",
  "质量部": "QA",
  "财务部": "FI",
  "仓储部": "WH",
  "销售部": "SA",
  "人事部": "HR",
  "行政部": "AD"
};
const generatePurchaseRequestNo = (department, existingNos) => {
  const now = /* @__PURE__ */ new Date();
  const dateStr = [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0")
  ].join("");
  const deptCode = DEPT_CODE_MAP[department] || "XX";
  const prefix = `PR-${deptCode}-${dateStr}-`;
  let maxSeq = 0;
  for (const no of existingNos) {
    if (no.startsWith(prefix)) {
      const seq = parseInt(no.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  const nextSeq = (maxSeq + 1).toString().padStart(3, "0");
  return `${prefix}${nextSeq}`;
};
export {
  getCategoryFullCode as a,
  generatePurchaseRequestNo as b,
  getNextSequence as c,
  generateMaterialCodeByCategory as g
};

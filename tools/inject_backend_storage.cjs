// 一次性脚本：为业务 store 注入 backendStorage 适配器（authStore 除外，保持本地登录态）
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'stores');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'authStore.ts');

let changed = 0;
let skipped = 0;

for (const f of files) {
  const fp = path.join(dir, f);
  let src = fs.readFileSync(fp, 'utf8');

  // 1) 加 import（在 zustand/middleware 那条 import 之后）
  if (!src.includes("from './persistStorage'") && !src.includes('from "./persistStorage"')) {
    const importLine = "import { persist } from 'zustand/middleware';";
    if (!src.includes(importLine)) {
      console.log(`[skip-import] ${f}: 未找到 zustand/middleware import`);
      skipped++;
      continue;
    }
    src = src.replace(importLine, importLine + "\nimport { backendStorage } from './persistStorage';");
  }

  // 2) 注入 storage: backendStorage, （在 persist 选项对象的 { 之后）
  //    关键：creator 内部方法也可能出现 "}),\n"，必须要求其后紧跟 "{"（即 options 对象开头）
  if (!src.includes('storage: backendStorage')) {
    const m = src.match(/\}\),\r?\n\s*\{/);
    if (!m) {
      console.log(`[skip-inject] ${f}: 未找到 persist 选项边界 }),\n {...`);
      skipped++;
      continue;
    }
    const at = m.index + m[0].length - 1; // "{" 的位置
    const nl = src.lastIndexOf('\n', at) + 1;
    const indent = src.slice(nl, at); // { 之前的缩进
    src =
      src.slice(0, at + 1) +
      ' storage: backendStorage,\n' +
      indent +
      src.slice(at + 1);
  }

  fs.writeFileSync(fp, src, 'utf8');
  changed++;
}

console.log(`\n完成：已修改 ${changed} 个文件，跳过 ${skipped} 个`);

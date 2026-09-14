// 后端静态自查：functions/ 与 scripts 不在 tsc 范围内（tsconfig 的 include 只有 src），
// 因此这里补两道检查，充当后端的「类型/引用」安全网：
//
//   ① 语法检查（transformSync）——单文件解析，只验语法；
//   ② 打包检查（build，bundle: true）——真正**解析整条导入链**，能发现
//      单文件解析发现不了的错误：
//        · 相对路径写错 / 目标文件不存在
//        · 从目标模块导入了并不存在的具名导出（改名后漏改调用点）
//      这正是「后端不参与 tsc」这个盲区里最容易漏掉、又只会在部署时才炸的一类问题。
//
// 用法：node scripts/_audit_syntax.mjs
import fs from 'fs';
import path from 'path';
import { transformSync, buildSync } from 'esbuild';

const roots = ['functions'];
let files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) files.push(p);
  }
};
roots.forEach((r) => { if (fs.existsSync(r)) walk(r); });

// ── ① 语法检查 ──────────────────────────────────────────────
let syntaxBad = 0;
for (const f of files) {
  try {
    transformSync(fs.readFileSync(f, 'utf8'), { loader: f.endsWith('.tsx') ? 'tsx' : 'ts' });
  } catch (e) {
    syntaxBad++;
    console.log('SYNTAX ERROR ' + f + ' :: ' + (e.message || '').split('\n')[0]);
  }
}
console.log(`[1/2] 语法检查：已解析 ${files.length} 个文件，语法错误 ${syntaxBad} 个`);

// ── ② 打包检查（导入链解析） ─────────────────────────────────
let bundleBad = 0;
for (const f of files) {
  try {
    buildSync({
      entryPoints: [f],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      target: 'es2020',
      // 只校验「我方代码的相对导入链」，第三方包一律视为外部依赖：
      //   · 它们由部署时的打包器（wrangler）按 Worker 目标环境解析，
      //     在本地按 Node 条件解析反而会走进 Node 分支（引用 fs/stream 等），造成假警报；
      //   · 本检查要抓的是「相对路径写错 / 导入了不存在的具名导出」，与第三方无关。
      packages: 'external',
      external: ['cloudflare:*'],
      logLevel: 'silent',
      absWorkingDir: process.cwd(),
    });
  } catch (e) {
    bundleBad++;
    const msgs = (e.errors || []).map((x) => x.text + (x.location ? ` @${x.location.file}:${x.location.line}` : ''));
    console.log('BUNDLE ERROR ' + f + ' :: ' + (msgs.join(' | ') || e.message || '').split('\n')[0]);
  }
}
console.log(`[2/2] 打包检查：已解析 ${files.length} 条导入链，引用错误 ${bundleBad} 个`);

process.exit(syntaxBad + bundleBad > 0 ? 1 : 0);

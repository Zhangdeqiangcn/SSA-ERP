# SSA ERP 上线发布指南（Cloudflare Pages · 免费永久）

> 结论：本系统是**前端 SPA + Cloudflare Pages Functions 后端**（账号/组织数据按公司码共享）。
> 构建产物在 `dist/`，后端在 `functions/`（D1 数据库 + KV 会话）。
> 用 Cloudflare Pages 托管前端 + 函数，**永久免费、无限带宽**，低成本上线。

---

## 一、两种方式任选

### 方式 A：Git 自动部署（推荐，以后 push 自动上线）
1. 把本仓库推送到 GitHub。
2. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages** → 关联 GitHub 仓库。
3. 构建设置：
   - Framework preset：**Vite**
   - Build command：`npm run build`
   - Output directory：`dist`
   - 注意：`npm run build` 仅 esbuild 转译，不跑类型检查；上线前应先用 `build-with-gate.bat`（先 `tsc --noEmit` 门禁）确保零类型错误。
4. 点 **Save and Deploy**，约 2 分钟得到 `xxx.pages.dev` 地址，直接可访问。
5. 以后每次 `git push`，Cloudflare 自动重新构建上线。

### 方式 B：直接上传 dist（无需 Git）
1. 本地执行 `npm run build`，生成 `dist/` 文件夹。
2. Cloudflare 控制台 → **Pages → 创建项目 → 直接上传** → 把 `dist` 文件夹拖进去即可。
3. 适合不打算用 Git 的小范围试用。

### 方式 C：一键部署脚本（推荐，含 D1 迁移）⚠️ 防生产漏迁移
> V2.76.0 踩坑：`wrangler pages deploy` 只传前端 + 函数，**不会 apply D1 迁移**，曾导致迁移 0019 漏推到生产、序列号创建全断。
> 本脚本把「deploy 前先 apply 远程迁移」变成强制步骤，杜绝遗漏。

1. 确保根目录 `.env.local` 含 `CLOUDFLARE_API_TOKEN`（wrangler 不自动读，非交互环境必填）。
2. 构建：`npm run build`（先 tsc 门禁 + 生成 dist/）。
3. 一键部署：`npm run deploy`
   - 脚本依次执行：`d1 migrations apply ssa-erp-db --remote`（**幂等**，已应用跳过、只补未应用）→ `pages deploy dist`。
   - 每次含迁移的升版务必走此脚本，不要再裸跑 `wrangler pages deploy`。

---

## 二、自定义域名（可选）
Pages 项目内 **Custom domains** 添加你的域名，Cloudflare 会自动签发并续期 HTTPS 证书。
只需在域名服务商处加一条 CNAME 指向 `xxx.pages.dev`（控制台会给出确切值）。

---

## 三、已为你备好的文件
- `public/_redirects`：`/* /index.html 200`，SPA 路由回退，保证刷新任意子页面不会 404 白屏。

---

## 四、必须注意
1. **数据存储**：业务数据按「公司码（组织）」存于后端 D1 数据库，登录后多人/多设备实时共享；未登录时降级为浏览器本地数据，离线可用。
2. **后端依赖**：本项目含 `functions/`（Cloudflare Pages Functions）身份与主数据接口，部署时需绑定 D1 数据库与 KV 命名空间，否则登录与多人共享不可用。
3. **国内访问**：Cloudflare 在国内偶有波动但总体可用；若不稳定可换 GitHub Pages / Vercel（国内需梯子）。
4. **版本号**：每次改动请同步 `src/version.ts` 与 `package.json` 的 `version`（见文件顶部说明）。

---

## 五、本地验证命令
```bash
npm install        # 安装依赖（首次）
npm run dev        # 本地开发，访问 http://localhost:3001
npm run build      # 生成可上线的 dist/
npm run preview    # 本地预览 dist 产物
```

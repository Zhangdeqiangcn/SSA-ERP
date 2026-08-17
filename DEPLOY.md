# SSA ERP 上线发布指南（Cloudflare Pages · 免费永久）

> 结论：本系统是**纯前端 SPA**（无后端，数据存浏览器 localStorage），构建产物在 `dist/`。
> 用 Cloudflare Pages 静态托管即可，**永久免费、无限带宽**，半年零成本。

---

## 一、两种方式任选

### 方式 A：Git 自动部署（推荐，以后 push 自动上线）
1. 把本仓库推送到 GitHub。
2. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages** → 关联 GitHub 仓库。
3. 构建设置：
   - Framework preset：**Vite**
   - Build command：`npm run build`
   - Output directory：`dist`
4. 点 **Save and Deploy**，约 2 分钟得到 `xxx.pages.dev` 地址，直接可访问。
5. 以后每次 `git push`，Cloudflare 自动重新构建上线。

### 方式 B：直接上传 dist（无需 Git）
1. 本地执行 `npm run build`，生成 `dist/` 文件夹。
2. Cloudflare 控制台 → **Pages → 创建项目 → 直接上传** → 把 `dist` 文件夹拖进去即可。
3. 适合不打算用 Git 的小范围试用。

---

## 二、自定义域名（可选）
Pages 项目内 **Custom domains** 添加你的域名，Cloudflare 会自动签发并续期 HTTPS 证书。
只需在域名服务商处加一条 CNAME 指向 `xxx.pages.dev`（控制台会给出确切值）。

---

## 三、已为你备好的文件
- `public/_redirects`：`/* /index.html 200`，SPA 路由回退，保证刷新任意子页面不会 404 白屏。

---

## 四、必须注意
1. **数据不共享**：当前数据存于浏览器 localStorage，每人/每设备各一份。
   - 自己或少数人用同一浏览器 → 没问题。
   - 多人、多设备要看到同一份业务数据 → 需加后端 + 数据库（建议 Oracle 免费机 或 Supabase 免费库），到时再升级。
2. **国内访问**：Cloudflare 在国内偶有波动但总体可用；若不稳定可换 GitHub Pages / Vercel（国内需梯子）。
3. **版本号**：每次改动请同步 `src/version.ts` 与 `package.json` 的 `version`（见文件顶部说明）。

---

## 五、本地验证命令
```bash
npm install        # 安装依赖（首次）
npm run dev        # 本地开发，访问 http://localhost:3001
npm run build      # 生成可上线的 dist/
npm run preview    # 本地预览 dist 产物
```

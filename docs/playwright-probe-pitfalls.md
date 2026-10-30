# Playwright 探针常见误判清单（SSA ERP 专用）

> 来源：V3.119.0（2026-10-30）复核 15 个关联列表页时，我先后误报三次，每次都得出「有一堆 bug」的错误结论。这份清单是为了下次不再重犯。

---

## 一、误判 #1：路由凭命名习惯猜

**症状**：某几个页面「0 行、0 关联列」，看起来像这些页面根本没做关联改造。

**根因**：项目路由命名不统一，我按 REST 习惯用了复数/全称，实际都不是。

| 我猜的（✗ 不存在） | 实际路由（✓） |
|---|---|
| `/sales/quotations` | `/sales/quotation` |
| `/price/lists` | `/price/list` |
| `/price/inquiries` | `/price/inquiry` |
| `/warehouse/finished-goods` | `/warehouse/fg-inbound` |
| `/warehouse/inspection-notices` | `/warehouse/inspection-notice` |
| `/warehouse/checks` | `/warehouse/check` |

**规避**：路由一律从 `src/App.tsx` 的 `<Route path=...>` 抄，不猜。

```bash
# 一次性列出某模块全部真实路由
grep -n 'path="sales/\|path="price/\|path="warehouse/' src/App.tsx | sed 's/ element=.*//'
```

---

## 二、误判 #2：dev 模式下伪造登录态

**症状**：所有页面都是空表、0 行。

**根因**：`src/stores/authStore.ts` 在 dev 模式会自动注入演示管理员：

```ts
if (import.meta.env.DEV) {
  const hadSession = !!localStorage.getItem('auth-storage');
  if (!useAuthStore.getState().currentUser && !hadSession) {
    // 自动注入 dev-admin
  }
}
```

我一开始用 `addInitScript` 写了 `ssa-erp-auth-token` 假 token，结果 `hadSession=true` **反而阻断了自动注入** —— 越"帮忙"越坏。

**规避**：dev 环境**什么都不注入**，让自动注入机制生效。真实持久化键名是 `auth-storage`（不是我猜的 `ssa-erp-auth-token`）。

---

## 三、误判 #3：用 `r.children[idx]` 取单元格

**症状**：表头写「生产工单」，格子里却是「2024-05-12」这种日期；于是判定「关联列串列了 / 整列不可点」。我据此报了 7 处「有值但不可点」。

**根因**：`DataTable` 用了虚拟滚动，`tbody` 里会插入占位行：

```tsx
<TableRow data-testid="dt-vpad-top" aria-hidden>
  <TableCell colSpan={columns.length + 2} />
</TableRow>
```

占位行只有 **1 个** `colSpan` 单元格。按 `r.children[idx]` 取值时，colspan 单元格把 `children` 索引整体错位，于是取到了相邻列。

**规避**：表头与 body 单元格都按 `data-col-id` 精确匹配。

```js
// ✗ 错误：虚拟滚动下会串列
const cell = row.children[ths.indexOf(th)];

// ✓ 正确
const cell = row.querySelector(`td[data-col-id="${th.getAttribute('data-col-id')}"]`);
```

> 为此在 V3.119.0 给 `DataTable` 的 body `TableCell` 补了 `data-col-id`（表头早已有）。修正后 7 处「死链」归零 —— 全是假象。

---

## 四、另外两条同类陷阱

### 4.1 只看前 N 行判定「整列有无可点元素」
数据在第 6 行之后的列会被误判成「整列不可点」。**必须 `forEach` 全表扫描**。

### 4.2 一个页面可能有多张 DataTable
`querySelectorAll('th')` 会把所有表的表头合并，误报「重复列头」。
例：盘点任务页 = 主表 + 循环盘点计划表，两张表都有「操作」列。

---

## 五、正确的探针骨架

```js
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 } });
// dev 环境不注入任何登录态，交给 authStore 自动注入
const page = await ctx.newPage();
page.on('pageerror', e => errs.push(e.message));

await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3300);   // store 水合

const info = await page.evaluate(() => {
  const ths = [...document.querySelectorAll('th[data-col-id]')];
  const rel = ths
    .map(t => ({ id: t.getAttribute('data-col-id'), name: t.textContent.trim() }))
    .filter(x => x.id.startsWith('relUp_') || x.id.startsWith('relDown_'));

  // 排除 aria-hidden 的虚拟占位行
  const rows = [...document.querySelectorAll('tbody tr')]
    .filter(r => !r.hasAttribute('aria-hidden'));

  return rel.map(x => {
    let withText = 0, clickable = 0;
    rows.forEach(r => {
      const cell = r.querySelector(`td[data-col-id="${x.id}"]`);
      if (!cell) return;
      const t = (cell.textContent || '').trim();
      if (t && t !== '-') {
        withText++;
        if (cell.querySelector('button, a')) clickable++;
      }
    });
    return { name: x.name, withText, clickable };
  });
});
```

---

## 六、验收口径

| 状态 | 含义 | 是否缺陷 |
|---|---|---|
| `withText > 0` 且 `clickable == 0` | 有单号但点不动 | **是** |
| `withText == 0` | 整列空 | 需查是「关系错 / 种子断层 / 数据模型缺失」三选一 |
| `withText > 0` 且 `clickable > 0` | 正常 | 否 |

「关联列为空」的三类成因要**分层排查**：
1. **关系定义错** —— 不报错不崩溃，只是永远匹配不到
2. **种子数据断层** —— 关系对了但单号在目标表不存在
3. **数据模型缺失** —— 类型里根本没有可用字段

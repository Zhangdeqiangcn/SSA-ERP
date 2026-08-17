# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v49-a1-voucher.spec.ts >> A1-3 状态机全链路：制单→审核→过账→冲销
- Location: e2e\v49-a1-voucher.spec.ts:90:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 5000
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "折叠或展开侧边栏" [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - generic [ref=e9]:
        - heading "SSA ERP" [level=6] [ref=e10]
        - generic [ref=e12]: v2.0
      - generic "切换组织" [ref=e14]:
        - combobox [ref=e15] [cursor=pointer]: 集团总部
        - textbox: ORG-001
        - img
        - group
      - generic [ref=e17]:
        - img [ref=e18]
        - textbox "搜索菜单、单据、物料… (Ctrl+K)" [ref=e21]
        - generic [ref=e22]: Ctrl K
      - navigation [ref=e23]:
        - list [ref=e24]:
          - listitem [ref=e25]:
            - link "finance" [ref=e26] [cursor=pointer]:
              - /url: /finance
          - listitem [ref=e27]:
            - img [ref=e28]
          - listitem [ref=e30]:
            - link "vouchers" [ref=e31] [cursor=pointer]:
              - /url: /finance/vouchers
      - button "消息通知" [ref=e32] [cursor=pointer]:
        - generic [ref=e33]:
          - img [ref=e34]
          - generic [ref=e36]: "10"
      - button "我的待办" [ref=e37] [cursor=pointer]:
        - generic [ref=e38]:
          - img [ref=e39]
          - generic [ref=e41]: "8"
      - button "键盘快捷键" [ref=e42] [cursor=pointer]:
        - img [ref=e43]
      - button "用户菜单" [ref=e45] [cursor=pointer]:
        - generic [ref=e46]: 张
  - generic [ref=e48]:
    - generic [ref=e49]:
      - list [ref=e51]:
        - listitem [ref=e52]:
          - link "仪表盘" [ref=e53] [cursor=pointer]:
            - /url: /
            - img [ref=e55]
            - generic [ref=e58]: 仪表盘
        - listitem [ref=e59]:
          - link "个人工作台" [ref=e60] [cursor=pointer]:
            - /url: /workbench
            - img [ref=e62]
            - generic [ref=e65]: 个人工作台
      - generic [ref=e66]:
        - generic [ref=e67]: 主数据
        - list [ref=e68]:
          - listitem [ref=e69]:
            - button "物料管理" [ref=e70] [cursor=pointer]:
              - img [ref=e72]
              - generic [ref=e75]: 物料管理
              - img [ref=e76]
          - listitem [ref=e78]:
            - button "供应商管理" [ref=e79] [cursor=pointer]:
              - generic [ref=e81]:
                - img [ref=e82]
                - generic [ref=e84]: "2"
              - generic [ref=e86]: 供应商管理
              - img [ref=e87]
      - generic [ref=e89]:
        - generic [ref=e90]: 供应链
        - list [ref=e91]:
          - listitem [ref=e92]:
            - button "采购管理" [ref=e93] [cursor=pointer]:
              - img [ref=e95]
              - generic [ref=e98]: 采购管理
              - img [ref=e99]
          - listitem [ref=e101]:
            - button "价格管理" [ref=e102] [cursor=pointer]:
              - img [ref=e104]
              - generic [ref=e107]: 价格管理
              - img [ref=e108]
          - listitem [ref=e110]:
            - button "仓储物流" [ref=e111] [cursor=pointer]:
              - img [ref=e113]
              - generic [ref=e116]: 仓储物流
              - img [ref=e117]
      - generic [ref=e119]:
        - generic [ref=e120]: 销售管理
        - list [ref=e121]:
          - listitem [ref=e122]:
            - button "销售管理" [ref=e123] [cursor=pointer]:
              - img [ref=e125]
              - generic [ref=e128]: 销售管理
              - img [ref=e129]
          - listitem [ref=e131]:
            - link "市场分析" [ref=e132] [cursor=pointer]:
              - /url: /sales/analysis
              - img [ref=e134]
              - generic [ref=e137]: 市场分析
          - listitem [ref=e138]:
            - link "项目管理" [ref=e139] [cursor=pointer]:
              - /url: /sales/projects
              - img [ref=e141]
              - generic [ref=e144]: 项目管理
      - generic [ref=e145]:
        - generic [ref=e146]: 生产与质量
        - list [ref=e147]:
          - listitem [ref=e148]:
            - button "质量管理" [ref=e149] [cursor=pointer]:
              - generic [ref=e151]:
                - img [ref=e152]
                - generic [ref=e154]: "3"
              - generic [ref=e156]: 质量管理
              - img [ref=e157]
          - listitem [ref=e159]:
            - button "BOM管理" [ref=e160] [cursor=pointer]:
              - img [ref=e162]
              - generic [ref=e165]: BOM管理
              - img [ref=e166]
          - listitem [ref=e168]:
            - button "生产管理" [ref=e169] [cursor=pointer]:
              - img [ref=e171]
              - generic [ref=e174]: 生产管理
              - img [ref=e175]
      - generic [ref=e177]:
        - generic [ref=e178]: 财务与报表
        - list [ref=e179]:
          - listitem [ref=e180]:
            - button "财务管理" [ref=e181] [cursor=pointer]:
              - generic [ref=e183]:
                - img [ref=e184]
                - generic [ref=e186]: "2"
              - generic [ref=e188]: 财务管理
              - img [ref=e189]
          - listitem [ref=e191]:
            - button "报表中心" [ref=e192] [cursor=pointer]:
              - img [ref=e194]
              - generic [ref=e197]: 报表中心
              - img [ref=e198]
      - generic [ref=e200]:
        - generic [ref=e201]: 平台生态
        - list [ref=e202]:
          - listitem [ref=e203]:
            - button "平台生态" [ref=e204] [cursor=pointer]:
              - img [ref=e206]
              - generic [ref=e209]: 平台生态
              - img [ref=e210]
          - listitem [ref=e212]:
            - link "报表权限与订阅" [ref=e213] [cursor=pointer]:
              - /url: /reports/permissions
              - img [ref=e215]
              - generic [ref=e218]: 报表权限与订阅
      - generic [ref=e219]:
        - generic [ref=e220]: 智能分析
        - list [ref=e221]:
          - listitem [ref=e222]:
            - link "经营驾驶舱" [ref=e223] [cursor=pointer]:
              - /url: /analytics/cockpit
              - img [ref=e225]
              - generic [ref=e229]: 经营驾驶舱
          - listitem [ref=e230]:
            - link "需求预测与补货" [ref=e231] [cursor=pointer]:
              - /url: /analytics/forecast
              - img [ref=e233]
              - generic [ref=e236]: 需求预测与补货
          - listitem [ref=e237]:
            - link "发票OCR与凭证" [ref=e238] [cursor=pointer]:
              - /url: /analytics/ocr
              - img [ref=e240]
              - generic [ref=e243]: 发票OCR与凭证
      - list [ref=e245]:
        - listitem [ref=e246]:
          - link "系统设置" [ref=e247] [cursor=pointer]:
            - /url: /settings
            - img [ref=e249]
            - generic [ref=e252]: 系统设置
        - listitem [ref=e253]:
          - link "供应商门户" [ref=e254] [cursor=pointer]:
            - /url: /vendor-portal/login
            - img [ref=e256]
            - generic [ref=e259]: 供应商门户
      - generic [ref=e260]:
        - generic [ref=e261]: 测试与诊断
        - list [ref=e262]:
          - listitem [ref=e263]:
            - link "全流程自检" [ref=e264] [cursor=pointer]:
              - /url: /test/flow
              - img [ref=e266]
              - generic [ref=e269]: 全流程自检
    - separator [ref=e270]
    - generic [ref=e271]: SSA ERP v2.0.0 · 钢材供应链版
  - main "主内容区" [ref=e272]:
    - generic [ref=e274]:
      - generic [ref=e275]:
        - heading "记账凭证" [level=5] [ref=e276]
        - generic [ref=e277]: 共 8 张凭证 / 18 条分录
        - button "新增凭证" [ref=e278] [cursor=pointer]:
          - img [ref=e280]
          - text: 新增凭证
      - generic [ref=e282]:
        - generic [ref=e285]:
          - text: 凭证总数
          - heading "8" [level=6] [ref=e286]
        - generic [ref=e289]:
          - text: 制单
          - heading "0" [level=6] [ref=e290]
        - generic [ref=e293]:
          - text: 已审核
          - heading "0" [level=6] [ref=e294]
        - generic [ref=e297]:
          - text: 已过账
          - heading "7" [level=6] [ref=e298]
        - generic [ref=e301]:
          - text: 已冲销
          - heading "1" [level=6] [ref=e302]
        - generic [ref=e305]:
          - text: 借贷不平
          - heading "0" [level=6] [ref=e306]
      - alert [ref=e307]:
        - img [ref=e309]
        - generic [ref=e311]: 已生成红字凭证 记-202608-0002 冲销 记-202608-0001
        - button "Close" [ref=e313] [cursor=pointer]:
          - img [ref=e314]
      - generic [ref=e317]:
        - generic [ref=e319]:
          - generic [ref=e320]: 状态
          - generic [ref=e321]:
            - combobox "状态 全部状态" [ref=e322] [cursor=pointer]: 全部状态
            - textbox: all
            - img
            - group:
              - generic: 状态
        - generic [ref=e324]:
          - generic: 会计期间
          - generic [ref=e325]:
            - combobox "会计期间" [ref=e326] [cursor=pointer]
            - textbox
            - img
            - group:
              - generic: 会计期间
        - generic [ref=e328]:
          - generic: 搜索凭证号 / 摘要 / 科目
          - generic [ref=e329]:
            - textbox "搜索凭证号 / 摘要 / 科目" [ref=e330]
            - group:
              - generic: 搜索凭证号 / 摘要 / 科目
      - generic [ref=e331]:
        - generic [ref=e332]:
          - button [ref=e333] [cursor=pointer]:
            - img [ref=e334]
          - heading "记-202608-0002" [level=6] [ref=e336]
          - generic [ref=e338]: 已过账
          - paragraph [ref=e339]: 2026-08-04
          - generic [ref=e341]: 2 行
          - generic [ref=e343]: 红冲 记-202608-0001
          - paragraph [ref=e344]: 借 ¥-5,000 / 贷 ¥-5,000
        - separator [ref=e345]
        - generic [ref=e346]:
          - generic [ref=e347]: 制单：当前用户 · 过账：当前用户
          - button "生成红字凭证冲销本张凭证" [ref=e348] [cursor=pointer]: 冲销
      - generic [ref=e349]:
        - generic [ref=e350]:
          - button [ref=e351] [cursor=pointer]:
            - img [ref=e352]
          - heading "记-202608-0001" [level=6] [ref=e354]
          - generic [ref=e356]: 已冲销
          - paragraph [ref=e357]: 2026-08-04
          - generic [ref=e359]: 2 行
          - generic [ref=e361]: 已由 记-202608-0002 冲销
          - paragraph [ref=e362]: 借 ¥5,000 / 贷 ¥5,000
        - separator [ref=e363]
        - generic [ref=e364]:
          - generic [ref=e365]: 制单：当前用户 · 审核：当前用户 · 过账：当前用户
          - generic [ref=e366]: 已冲销，不可再操作
      - generic [ref=e367]:
        - generic [ref=e368]:
          - button [ref=e369] [cursor=pointer]:
            - img [ref=e370]
          - heading "V-DEPR-2026-01" [level=6] [ref=e372]
          - generic [ref=e374]: 已过账
          - paragraph [ref=e375]: 2026-01-31
          - generic [ref=e377]: 2 行
          - paragraph [ref=e378]: 借 ¥10,000 / 贷 ¥10,000
        - separator [ref=e379]
        - generic [ref=e380]:
          - generic [ref=e381]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e382] [cursor=pointer]: 冲销
      - generic [ref=e383]:
        - generic [ref=e384]:
          - button [ref=e385] [cursor=pointer]:
            - img [ref=e386]
          - heading "V-PAY-2026-01" [level=6] [ref=e388]
          - generic [ref=e390]: 已过账
          - paragraph [ref=e391]: 2026-01-31
          - generic [ref=e393]: 2 行
          - paragraph [ref=e394]: 借 ¥30,000 / 贷 ¥30,000
        - separator [ref=e395]
        - generic [ref=e396]:
          - generic [ref=e397]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e398] [cursor=pointer]: 冲销
      - generic [ref=e399]:
        - generic [ref=e400]:
          - button [ref=e401] [cursor=pointer]:
            - img [ref=e402]
          - heading "V-PMT-2026-01" [level=6] [ref=e404]
          - generic [ref=e406]: 已过账
          - paragraph [ref=e407]: 2026-01-20
          - generic [ref=e409]: 2 行
          - paragraph [ref=e410]: 借 ¥56,500 / 贷 ¥56,500
        - separator [ref=e411]
        - generic [ref=e412]:
          - generic [ref=e413]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e414] [cursor=pointer]: 冲销
      - generic [ref=e415]:
        - generic [ref=e416]:
          - button [ref=e417] [cursor=pointer]:
            - img [ref=e418]
          - heading "V-COST-2026-01" [level=6] [ref=e420]
          - generic [ref=e422]: 已过账
          - paragraph [ref=e423]: 2026-01-16
          - generic [ref=e425]: 2 行
          - paragraph [ref=e426]: 借 ¥140,000 / 贷 ¥140,000
        - separator [ref=e427]
        - generic [ref=e428]:
          - generic [ref=e429]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e430] [cursor=pointer]: 冲销
      - generic [ref=e431]:
        - generic [ref=e432]:
          - button [ref=e433] [cursor=pointer]:
            - img [ref=e434]
          - heading "V-SALE-2026-01" [level=6] [ref=e436]
          - generic [ref=e438]: 已过账
          - paragraph [ref=e439]: 2026-01-15
          - generic [ref=e441]: 3 行
          - paragraph [ref=e442]: 借 ¥220,000 / 贷 ¥220,000
        - separator [ref=e443]
        - generic [ref=e444]:
          - generic [ref=e445]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e446] [cursor=pointer]: 冲销
      - generic [ref=e447]:
        - generic [ref=e448]:
          - button [ref=e449] [cursor=pointer]:
            - img [ref=e450]
          - heading "V-PUR-2026-01" [level=6] [ref=e452]
          - generic [ref=e454]: 已过账
          - paragraph [ref=e455]: 2026-01-10
          - generic [ref=e457]: 3 行
          - paragraph [ref=e458]: 借 ¥56,500 / 贷 ¥56,500
        - separator [ref=e459]
        - generic [ref=e460]:
          - generic [ref=e461]: 制单：王会计 · 过账：王会计
          - button "生成红字凭证冲销本张凭证" [ref=e462] [cursor=pointer]: 冲销
      - text: 凭证状态流转：制单 → 审核 → 过账 → 冲销。仅「已过账」凭证进入总账明细并被三大报表取数；保存前强制校验 Σ借 = Σ贷。
```

# Test source

```ts
  49  |   // 展开第一张凭证看到分录明细行
  50  |   const firstRow = page.getByTestId('voucher-row').first();
  51  |   await firstRow.locator('button').first().click();
  52  |   await expect(firstRow.getByText('合计')).toBeVisible();
  53  | 
  54  |   expect(errors).toEqual([]);
  55  | });
  56  | 
  57  | test('A1-2 借贷不平衡时禁止保存，一键补平后可保存', async ({ page }) => {
  58  |   const errors = await captureErrors(page);
  59  |   await gotoVouchers(page);
  60  | 
  61  |   await page.getByTestId('voucher-new-btn').click();
  62  |   await expect(page.getByRole('heading', { name: '新增记账凭证' })).toBeVisible();
  63  | 
  64  |   // 只填借方 → 必然不平衡
  65  |   await fillLine(page, 0, '采购原材料', '原材料', 'debit', 10000);
  66  | 
  67  |   // 不平衡告警出现，保存按钮禁用
  68  |   await expect(page.getByTestId('voucher-balance-tip')).toBeVisible();
  69  |   await expect(page.getByTestId('voucher-diff')).toContainText('差额');
  70  |   await expect(page.getByTestId('voucher-save')).toBeDisabled();
  71  | 
  72  |   // 第二行选科目但金额留空，仍不平衡
  73  |   const acc1 = page.getByTestId('vi-account-1').locator('input');
  74  |   await acc1.click();
  75  |   await acc1.fill('应付账款');
  76  |   await page.getByRole('option').first().click();
  77  |   await expect(page.getByTestId('voucher-save')).toBeDisabled();
  78  | 
  79  |   // 一键补平 → 平衡，保存启用
  80  |   await page.getByTestId('voucher-autofill').click();
  81  |   await expect(page.getByTestId('voucher-diff')).toContainText('借贷平衡');
  82  |   await expect(page.getByTestId('voucher-save')).toBeEnabled();
  83  | 
  84  |   await page.getByTestId('voucher-save').click();
  85  |   await expect(page.getByTestId('voucher-op-msg')).toContainText('已保存（制单）');
  86  | 
  87  |   expect(errors).toEqual([]);
  88  | });
  89  | 
  90  | test('A1-3 状态机全链路：制单→审核→过账→冲销', async ({ page }) => {
  91  |   const errors = await captureErrors(page);
  92  |   await gotoVouchers(page);
  93  | 
  94  |   // 制单：借 管理费用 5000 / 贷 银行存款 5000
  95  |   await page.getByTestId('voucher-new-btn').click();
  96  |   await fillLine(page, 0, '支付办公费', '管理费用', 'debit', 5000);
  97  |   await fillLine(page, 1, '银行付款', '银行存款', 'credit', 5000);
  98  |   await expect(page.getByTestId('voucher-diff')).toContainText('借贷平衡');
  99  |   await page.getByTestId('voucher-save').click();
  100 |   await expect(page.getByTestId('voucher-op-msg')).toContainText('已保存（制单）');
  101 | 
  102 |   // 新凭证排在最前，取其凭证号
  103 |   const newRow = page.getByTestId('voucher-row').first();
  104 |   const voucherNo = (await newRow.getByTestId('voucher-no').innerText()).trim();
  105 |   expect(voucherNo).toContain('记-');
  106 | 
  107 |   // 制单态：状态芯片为「制单」
  108 |   await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('制单');
  109 | 
  110 |   // 未审核不能过账（过账按钮不存在）
  111 |   await expect(page.getByTestId(`voucher-post-${voucherNo}`)).toHaveCount(0);
  112 | 
  113 |   // 审核
  114 |   await page.getByTestId(`voucher-review-${voucherNo}`).click();
  115 |   await expect(page.getByTestId('voucher-op-msg')).toContainText('审核通过');
  116 |   await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已审核');
  117 | 
  118 |   // 已审核不可删除/修改（按钮不存在）
  119 |   await expect(page.getByTestId(`voucher-delete-${voucherNo}`)).toHaveCount(0);
  120 | 
  121 |   // 过账 → 写入总账明细
  122 |   await page.getByTestId(`voucher-post-${voucherNo}`).click();
  123 |   await expect(page.getByTestId('voucher-op-msg')).toContainText('已过账');
  124 |   await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已过账');
  125 | 
  126 |   // 过账后进入 accountEntries（总账明细），报表可取数
  127 |   await page.waitForFunction(() => (window as any).__ssaStores);
  128 |   const posted = await page.evaluate(
  129 |     (no) =>
  130 |       (window as any).__ssaStores.useFinanceStore
  131 |         .getState()
  132 |         .accountEntries.filter((e: any) => e.voucherNo === no).length,
  133 |     voucherNo
  134 |   );
  135 |   expect(posted).toBe(2);
  136 | 
  137 |   // 冲销 → 生成红字凭证
  138 |   await page.getByTestId(`voucher-reverse-${voucherNo}`).click();
  139 |   await expect(page.getByTestId('voucher-op-msg')).toContainText('红字凭证');
  140 |   await expect(page.getByTestId(`voucher-status-${voucherNo}`)).toHaveText('已冲销');
  141 | 
  142 |   // 红冲后该科目净发生额归零
  143 |   const net = await page.evaluate(() => {
  144 |     const s = (window as any).__ssaStores.useFinanceStore.getState();
  145 |     return s.accountEntries
  146 |       .filter((e: any) => e.debitAccount === '管理费用' && String(e.voucherNo).startsWith('记-'))
  147 |       .reduce((sum: number, e: any) => sum + e.amount, 0);
  148 |   });
> 149 |   expect(net).toBe(0);
      |               ^ Error: expect(received).toBe(expected) // Object.is equality
  150 | 
  151 |   expect(errors).toEqual([]);
  152 | });
  153 | 
  154 | test('A1-4 状态筛选与检索可用', async ({ page }) => {
  155 |   const errors = await captureErrors(page);
  156 |   await gotoVouchers(page);
  157 | 
  158 |   // 存量凭证均为已过账
  159 |   await page.getByTestId('voucher-filter-status').click();
  160 |   await page.getByRole('option', { name: '已过账' }).click();
  161 |   await expect(page.getByTestId('voucher-row').first()).toBeVisible();
  162 | 
  163 |   // 筛选「制单」应无结果（尚未手工制单）
  164 |   await page.getByTestId('voucher-filter-status').click();
  165 |   await page.getByRole('option', { name: '制单', exact: true }).click();
  166 |   await expect(page.getByText('没有符合条件的凭证。')).toBeVisible();
  167 | 
  168 |   // 恢复全部 + 关键字检索
  169 |   await page.getByTestId('voucher-filter-status').click();
  170 |   await page.getByRole('option', { name: '全部状态' }).click();
  171 |   await page.getByTestId('voucher-filter-kw').locator('input').fill('应付账款');
  172 |   await expect(page.getByTestId('voucher-row').first()).toBeVisible();
  173 | 
  174 |   expect(errors).toEqual([]);
  175 | });
  176 | 
  177 | test('A1-5 报表兼容：过账凭证进入科目余额表且总账平衡', async ({ page }) => {
  178 |   const errors = await captureErrors(page);
  179 |   await gotoVouchers(page);
  180 | 
  181 |   await page.goto('/finance/trial-balance');
  182 |   await expect(page.getByTestId('tb-total-debit')).toBeVisible();
  183 | 
  184 |   // 科目余额表借贷合计相等（总账平衡）
  185 |   const [d, c] = await Promise.all([
  186 |     page.getByTestId('tb-total-debit').innerText(),
  187 |     page.getByTestId('tb-total-credit').innerText(),
  188 |   ]);
  189 |   const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));
  190 |   expect(num(d)).toBeCloseTo(num(c), 1);
  191 | 
  192 |   expect(errors).toEqual([]);
  193 | });
  194 | 
```
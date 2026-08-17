# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: v31-linkage.spec.ts >> v31 跨域表单关联与可定制性 >> 系统维护·菜单定制（隐藏项）在侧边栏生效
- Location: e2e\v31-linkage.spec.ts:187:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByText('市场分析', { exact: true })
Expected: 0
Received: 1
Timeout:  30000ms

Call log:
  - Expect "toHaveCount" with timeout 30000ms
  - waiting for getByText('市场分析', { exact: true })
    61 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
        - button "消息通知" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]:
            - img [ref=e25]
            - generic [ref=e27]: "10"
        - button "我的待办" [ref=e28] [cursor=pointer]:
          - generic [ref=e29]:
            - img [ref=e30]
            - generic [ref=e32]: "8"
        - button "键盘快捷键" [ref=e33] [cursor=pointer]:
          - img [ref=e34]
        - button "用户菜单" [ref=e36] [cursor=pointer]:
          - generic [ref=e37]: 张
    - generic [ref=e39]:
      - generic [ref=e40]:
        - list [ref=e42]:
          - listitem [ref=e43]:
            - link "仪表盘" [ref=e44] [cursor=pointer]:
              - /url: /
              - img [ref=e46]
              - generic [ref=e49]: 仪表盘
          - listitem [ref=e50]:
            - link "个人工作台" [ref=e51] [cursor=pointer]:
              - /url: /workbench
              - img [ref=e53]
              - generic [ref=e56]: 个人工作台
        - generic [ref=e57]:
          - generic [ref=e58]: 主数据
          - list [ref=e59]:
            - listitem [ref=e60]:
              - button "物料管理" [ref=e61] [cursor=pointer]:
                - img [ref=e63]
                - generic [ref=e66]: 物料管理
                - img [ref=e67]
            - listitem [ref=e69]:
              - button "供应商管理" [ref=e70] [cursor=pointer]:
                - generic [ref=e72]:
                  - img [ref=e73]
                  - generic [ref=e75]: "2"
                - generic [ref=e77]: 供应商管理
                - img [ref=e78]
        - generic [ref=e80]:
          - generic [ref=e81]: 供应链
          - list [ref=e82]:
            - listitem [ref=e83]:
              - button "采购管理" [ref=e84] [cursor=pointer]:
                - img [ref=e86]
                - generic [ref=e89]: 采购管理
                - img [ref=e90]
            - listitem [ref=e92]:
              - button "价格管理" [ref=e93] [cursor=pointer]:
                - img [ref=e95]
                - generic [ref=e98]: 价格管理
                - img [ref=e99]
            - listitem [ref=e101]:
              - button "仓储物流" [ref=e102] [cursor=pointer]:
                - img [ref=e104]
                - generic [ref=e107]: 仓储物流
                - img [ref=e108]
        - generic [ref=e110]:
          - generic [ref=e111]: 销售管理
          - list [ref=e112]:
            - listitem [ref=e113]:
              - button "销售管理" [ref=e114] [cursor=pointer]:
                - img [ref=e116]
                - generic [ref=e119]: 销售管理
                - img [ref=e120]
            - listitem [ref=e122]:
              - link "市场分析" [ref=e123] [cursor=pointer]:
                - /url: /sales/analysis
                - img [ref=e125]
                - generic [ref=e128]: 市场分析
            - listitem [ref=e129]:
              - link "项目管理" [ref=e130] [cursor=pointer]:
                - /url: /sales/projects
                - img [ref=e132]
                - generic [ref=e135]: 项目管理
        - generic [ref=e136]:
          - generic [ref=e137]: 生产与质量
          - list [ref=e138]:
            - listitem [ref=e139]:
              - button "质量管理" [ref=e140] [cursor=pointer]:
                - generic [ref=e142]:
                  - img [ref=e143]
                  - generic [ref=e145]: "3"
                - generic [ref=e147]: 质量管理
                - img [ref=e148]
            - listitem [ref=e150]:
              - button "BOM管理" [ref=e151] [cursor=pointer]:
                - img [ref=e153]
                - generic [ref=e156]: BOM管理
                - img [ref=e157]
            - listitem [ref=e159]:
              - button "生产管理" [ref=e160] [cursor=pointer]:
                - img [ref=e162]
                - generic [ref=e165]: 生产管理
                - img [ref=e166]
        - generic [ref=e168]:
          - generic [ref=e169]: 财务与报表
          - list [ref=e170]:
            - listitem [ref=e171]:
              - button "财务管理" [ref=e172] [cursor=pointer]:
                - generic [ref=e174]:
                  - img [ref=e175]
                  - generic [ref=e177]: "2"
                - generic [ref=e179]: 财务管理
                - img [ref=e180]
            - listitem [ref=e182]:
              - button "报表中心" [ref=e183] [cursor=pointer]:
                - img [ref=e185]
                - generic [ref=e188]: 报表中心
                - img [ref=e189]
        - generic [ref=e191]:
          - generic [ref=e192]: 平台生态
          - list [ref=e193]:
            - listitem [ref=e194]:
              - button "平台生态" [ref=e195] [cursor=pointer]:
                - img [ref=e197]
                - generic [ref=e200]: 平台生态
                - img [ref=e201]
            - listitem [ref=e203]:
              - link "报表权限与订阅" [ref=e204] [cursor=pointer]:
                - /url: /reports/permissions
                - img [ref=e206]
                - generic [ref=e209]: 报表权限与订阅
        - generic [ref=e210]:
          - generic [ref=e211]: 智能分析
          - list [ref=e212]:
            - listitem [ref=e213]:
              - link "经营驾驶舱" [ref=e214] [cursor=pointer]:
                - /url: /analytics/cockpit
                - img [ref=e216]
                - generic [ref=e220]: 经营驾驶舱
            - listitem [ref=e221]:
              - link "需求预测与补货" [ref=e222] [cursor=pointer]:
                - /url: /analytics/forecast
                - img [ref=e224]
                - generic [ref=e227]: 需求预测与补货
            - listitem [ref=e228]:
              - link "发票OCR与凭证" [ref=e229] [cursor=pointer]:
                - /url: /analytics/ocr
                - img [ref=e231]
                - generic [ref=e234]: 发票OCR与凭证
        - list [ref=e236]:
          - listitem [ref=e237]:
            - link "系统设置" [ref=e238] [cursor=pointer]:
              - /url: /settings
              - img [ref=e240]
              - generic [ref=e243]: 系统设置
          - listitem [ref=e244]:
            - link "供应商门户" [ref=e245] [cursor=pointer]:
              - /url: /vendor-portal/login
              - img [ref=e247]
              - generic [ref=e250]: 供应商门户
        - generic [ref=e251]:
          - generic [ref=e252]: 测试与诊断
          - list [ref=e253]:
            - listitem [ref=e254]:
              - link "全流程自检" [ref=e255] [cursor=pointer]:
                - /url: /test/flow
                - img [ref=e257]
                - generic [ref=e260]: 全流程自检
      - separator [ref=e261]
      - generic [ref=e262]: SSA ERP v2.0.0 · 钢材供应链版
    - main "主内容区" [ref=e263]:
      - generic [ref=e265]:
        - generic [ref=e266]:
          - generic [ref=e267]:
            - heading "工作台" [level=4] [ref=e268]
            - paragraph [ref=e269]: 2026年6月23日 星期二 · 数据更新于 17:07
          - generic [ref=e271]: SSA ERP v2.0
          - button "刷新数据" [ref=e272] [cursor=pointer]:
            - img [ref=e273]
        - generic [ref=e275]:
          - generic [ref=e276]: 快捷入口
          - generic [ref=e277]:
            - button "新建采购申请" [ref=e278] [cursor=pointer]:
              - img [ref=e280]
              - text: 新建采购申请
            - button "创建工单" [ref=e282] [cursor=pointer]:
              - img [ref=e284]
              - text: 创建工单
            - button "发票登记" [ref=e286] [cursor=pointer]:
              - img [ref=e288]
              - text: 发票登记
            - button "库存查询" [ref=e290] [cursor=pointer]:
              - img [ref=e292]
              - text: 库存查询
            - button "质量报表" [ref=e294] [cursor=pointer]:
              - img [ref=e296]
              - text: 质量报表
            - button "生产报表" [ref=e298] [cursor=pointer]:
              - img [ref=e300]
              - text: 生产报表
        - generic [ref=e303]: 核心指标
        - generic [ref=e304]:
          - generic [ref=e308] [cursor=pointer]:
            - generic [ref=e309]:
              - paragraph [ref=e310]: 物料总数
              - heading "248" [level=4] [ref=e311]
              - generic [ref=e312]:
                - img [ref=e313]
                - generic [ref=e315]: +12%
                - generic [ref=e316]: 较上月
            - img [ref=e318]
          - generic [ref=e323] [cursor=pointer]:
            - generic [ref=e324]:
              - paragraph [ref=e325]: 供应商数
              - heading "36" [level=4] [ref=e326]
              - generic [ref=e327]:
                - img [ref=e328]
                - generic [ref=e330]: +5%
                - generic [ref=e331]: 较上月
            - img [ref=e333]
          - generic [ref=e338] [cursor=pointer]:
            - generic [ref=e339]:
              - paragraph [ref=e340]: 在途采购
              - heading "12" [level=4] [ref=e341]
              - generic [ref=e342]:
                - img [ref=e343]
                - generic [ref=e345]: "-3%"
                - generic [ref=e346]: 较上月
            - img [ref=e348]
          - generic [ref=e353] [cursor=pointer]:
            - generic [ref=e354]:
              - paragraph [ref=e355]: 库存预警
              - heading "7" [level=4] [ref=e356]
              - generic [ref=e357]:
                - img [ref=e358]
                - generic [ref=e360]: +2%
                - generic [ref=e361]: 较上月
            - img [ref=e363]
          - generic [ref=e368] [cursor=pointer]:
            - generic [ref=e369]:
              - paragraph [ref=e370]: 检验任务
              - heading "5" [level=4] [ref=e371]
              - generic [ref=e372]:
                - img [ref=e373]
                - generic [ref=e375]: +1%
                - generic [ref=e376]: 较上月
            - img [ref=e378]
          - generic [ref=e383] [cursor=pointer]:
            - generic [ref=e384]:
              - paragraph [ref=e385]: 生产工单
              - heading "3" [level=4] [ref=e386]
              - generic [ref=e387]:
                - img [ref=e388]
                - generic [ref=e390]: +0%
                - generic [ref=e391]: 较上月
            - img [ref=e393]
          - generic [ref=e398] [cursor=pointer]:
            - generic [ref=e399]:
              - paragraph [ref=e400]: 待付发票
              - heading "2" [level=4] [ref=e401]
              - generic [ref=e402]:
                - img [ref=e403]
                - generic [ref=e405]: +1%
                - generic [ref=e406]: 较上月
            - img [ref=e408]
          - generic [ref=e413] [cursor=pointer]:
            - generic [ref=e414]:
              - paragraph [ref=e415]: 逾期付款
              - heading "1" [level=4] [ref=e416]
              - generic [ref=e417]:
                - img [ref=e418]
                - generic [ref=e420]: +1%
                - generic [ref=e421]: 较上月
            - img [ref=e423]
        - generic [ref=e425]:
          - generic [ref=e427]:
            - generic [ref=e428]:
              - heading "月度采购金额趋势" [level=6] [ref=e429]
              - generic [ref=e430]:
                - img [ref=e431]
                - text: 21.4%
            - img [ref=e434]:
              - generic [ref=e442]:
                - generic [ref=e444]: 1月
                - generic [ref=e446]: 2月
                - generic [ref=e448]: 3月
                - generic [ref=e450]: 4月
                - generic [ref=e452]: 5月
                - generic [ref=e454]: 6月
              - generic [ref=e455]:
                - generic [ref=e457]: "0"
                - generic [ref=e459]: 200,000
                - generic [ref=e461]: 400,000
                - generic [ref=e463]: 600,000
              - generic [ref=e467]: 采购金额(元)
          - generic [ref=e469]:
            - generic [ref=e470]:
              - heading "月度质量合格率（%）" [level=6] [ref=e471]
              - generic [ref=e472]:
                - img [ref=e473]
                - text: 1.5%
            - img [ref=e476]:
              - generic [ref=e482]:
                - generic [ref=e484]: 1月
                - generic [ref=e486]: 3月
                - generic [ref=e488]: 5月
              - generic [ref=e489]:
                - generic [ref=e491]: "90"
                - generic [ref=e493]: "95"
                - generic [ref=e495]: "100"
              - generic [ref=e506]: 合格率
          - generic [ref=e508]:
            - heading "库存结构" [level=6] [ref=e509]
            - img [ref=e511]:
              - generic [ref=e519]:
                - generic [ref=e522]: 原材料
                - generic [ref=e525]: 半成品
                - generic [ref=e528]: 成品
                - generic [ref=e531]: 辅料
            - generic [ref=e532]:
              - generic [ref=e534]: 原材料 45%
              - generic [ref=e536]: 半成品 25%
              - generic [ref=e538]: 成品 20%
              - generic [ref=e540]: 辅料 10%
        - generic [ref=e541]:
          - generic [ref=e543]:
            - generic [ref=e544]:
              - heading "待我审批 3" [level=6] [ref=e545]:
                - text: 待我审批
                - generic [ref=e547]: "3"
              - generic [ref=e548] [cursor=pointer]: 全部
            - generic [ref=e549]:
              - generic [ref=e550]:
                - generic [ref=e552]: 供应商准入
                - generic [ref=e554]: 紧急
              - paragraph [ref=e555]: 武汉钢铁贸易有限公司
              - generic [ref=e556]:
                - generic [ref=e557]: 提交人：张三 · 2小时前
                - generic [ref=e558]:
                  - button "通过" [ref=e559] [cursor=pointer]: 通过
                  - button "拒绝" [ref=e560] [cursor=pointer]: 拒绝
            - generic [ref=e561]:
              - generic [ref=e562]:
                - generic [ref=e564]: 采购申请
                - generic [ref=e566]: 紧急
              - paragraph [ref=e567]: 热轧钢板 Q235B × 50吨
              - generic [ref=e568]:
                - generic [ref=e569]: 提交人：李四 · 3小时前
                - generic [ref=e570]:
                  - button "通过" [ref=e571] [cursor=pointer]: 通过
                  - button "拒绝" [ref=e572] [cursor=pointer]: 拒绝
            - generic [ref=e573]:
              - generic [ref=e576]: 付款审批
              - paragraph [ref=e577]: PMT-2024-0440 广东南方钢铁
              - generic [ref=e578]:
                - generic [ref=e579]: 提交人：王五 · 昨天
                - generic [ref=e580]:
                  - button "通过" [ref=e581] [cursor=pointer]: 通过
                  - button "拒绝" [ref=e582] [cursor=pointer]: 拒绝
          - generic [ref=e584]:
            - tablist [ref=e587]:
              - tab "待办事项 5" [selected] [ref=e588] [cursor=pointer]:
                - generic [ref=e589]:
                  - text: 待办事项
                  - generic [ref=e591]: "5"
              - tab "最近动态" [ref=e592] [cursor=pointer]: 最近动态
            - separator [ref=e594]
            - list [ref=e595]:
              - listitem [ref=e596] [cursor=pointer]:
                - generic [ref=e598]: 质检
                - paragraph [ref=e600]: IQC-2024-0512：宝钢钢板来料检验
                - img [ref=e601]
              - separator [ref=e603]
              - listitem [ref=e604] [cursor=pointer]:
                - generic [ref=e606]: 付款
                - paragraph [ref=e608]: PMT-2024-0440：广东南方钢铁逾期付款
                - img [ref=e609]
              - separator [ref=e611]
              - listitem [ref=e612] [cursor=pointer]:
                - generic [ref=e614]: 采购
                - paragraph [ref=e616]: MRP建议：热轧钢板Q235B库存告急
                - img [ref=e617]
              - separator [ref=e619]
              - listitem [ref=e620] [cursor=pointer]:
                - generic [ref=e622]: 审核
                - paragraph [ref=e624]: 供应商准入审核：武汉钢铁贸易有限公司
                - img [ref=e625]
              - separator [ref=e627]
              - listitem [ref=e628] [cursor=pointer]:
                - generic [ref=e630]: 盘点
                - paragraph [ref=e632]: 6月月度仓库盘点任务待启动
                - img [ref=e633]
  - generic [ref=e635]: 6月
```

# Test source

```ts
  100 |     await page.getByRole('button', { name: '创建' }).click();
  101 | 
  102 |     const after = await page.evaluate(() => (window as any).__ssaStores.useFinanceStore.getState().invoices.length);
  103 |     expect(after, '发票新建后数量应 +1').toBe(before + 1);
  104 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  105 |   });
  106 | 
  107 |   test('生产·工单生成领料出库并事件驱动扣减库存', async ({ page }) => {
  108 |     const errors: string[] = [];
  109 |     page.on('dialog', (d) => d.accept());
  110 |     page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  111 |     page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });
  112 | 
  113 |     await resetAndReady(page);
  114 |     // 取一个可生成领料的工单（非 draft/closed）
  115 |     const woId = await page.evaluate(() => {
  116 |       const wos = (window as any).__ssaStores.useProductionStore.getState().workOrders;
  117 |       const wo = wos.find((w: any) => w.status !== 'draft' && w.status !== 'closed');
  118 |       return wo?.id;
  119 |     });
  120 |     expect(woId, '应存在可生成领料的工单').toBeTruthy();
  121 | 
  122 |     const beforeOut = await page.evaluate(() => (window as any).__ssaStores.useWarehouseStore.getState().outboundOrders.length);
  123 | 
  124 |     await page.goto(`/production/orders/${woId}`);
  125 |     await page.getByRole('button', { name: '生成领料出库' }).click();
  126 | 
  127 |     const res = await page.evaluate(() => {
  128 |       const st = (window as any).__ssaStores.useWarehouseStore.getState();
  129 |       const ob = st.outboundOrders[st.outboundOrders.length - 1];
  130 |       return { outLen: st.outboundOrders.length, status: ob?.status, items: ob?.items?.length ?? 0 };
  131 |     });
  132 |     expect(res.outLen, '领料出库单应 +1').toBe(beforeOut + 1);
  133 |     expect(res.status, '领料出库应为 completed 以触发库存扣减').toBe('completed');
  134 |     expect(res.items, '领料明细应至少 1 种物料').toBeGreaterThan(0);
  135 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  136 |   });
  137 | 
  138 |   test('采购·采购申请转采购订单形成血缘闭环', async ({ page }) => {
  139 |     const errors: string[] = [];
  140 |     page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  141 |     page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('validateDOMNesting')) errors.push('console.error: ' + m.text()); });
  142 | 
  143 |     await resetAndReady(page);
  144 |     const setup = await page.evaluate(() => {
  145 |       const vendors = (window as any).__ssaStores.useVendorStore.getState().vendors;
  146 |       const materials = (window as any).__ssaStores.useMaterialStore.getState().materials;
  147 |       return {
  148 |         vendorId: vendors[0]?.id,
  149 |         vendorName: vendors[0]?.name,
  150 |         materialId: materials[0]?.id,
  151 |         materialCode: materials[0]?.code,
  152 |         materialName: materials[0]?.name,
  153 |       };
  154 |     });
  155 |     expect(setup.vendorId, '应存在供应商').toBeTruthy();
  156 | 
  157 |     const prId = await page.evaluate((m) => {
  158 |       const id = `pr-e2e-${Date.now()}`;
  159 |       (window as any).__ssaStores.usePurchaseStore.getState().addPurchaseRequest({
  160 |         id,
  161 |         requestNo: `PR-E2E-${Date.now()}`,
  162 |         title: 'E2E采购申请',
  163 |         status: 'pending',
  164 |         items: [{ id: 'pri-1', materialId: m.materialId, materialCode: m.materialCode, materialName: m.materialName, quantity: 10, estimatedPrice: 5 }],
  165 |         createdAt: new Date().toISOString(),
  166 |       });
  167 |       return id;
  168 |     }, setup);
  169 | 
  170 |     await page.goto(`/purchase/orders/create?fromRequests=${prId}`);
  171 |     await page.getByLabel('订单标题').waitFor();
  172 |     await page.getByLabel('主供应商').click();
  173 |     await page.getByRole('option', { name: setup.vendorName }).first().click();
  174 |     await page.getByRole('button', { name: '提交订单' }).click();
  175 | 
  176 |     const result = await page.evaluate((pid) => {
  177 |       const st = (window as any).__ssaStores.usePurchaseStore.getState();
  178 |       const po = st.purchaseOrders.find((o: any) => o.sourceRequestIds && o.sourceRequestIds.includes(pid));
  179 |       const pr = st.purchaseRequests.find((r: any) => r.id === pid);
  180 |       return { poFound: !!po, prStatus: pr?.status };
  181 |     }, prId);
  182 |     expect(result.poFound, '应生成关联了源采购申请的采购订单').toBe(true);
  183 |     expect(result.prStatus, '源采购申请状态应回写为 ordered').toBe('ordered');
  184 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  185 |   });
  186 | 
  187 |   test('系统维护·菜单定制（隐藏项）在侧边栏生效', async ({ page }) => {
  188 |     const errors: string[] = [];
  189 |     page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  190 | 
  191 |     await resetAndReady(page);
  192 |     await page.goto('/');
  193 |     // 隐藏「市场分析」(path: /sales/analysis)
  194 |     await page.evaluate(() => {
  195 |       localStorage.setItem('ssa-menu-config', JSON.stringify({ visible: { '/sales/analysis': false } }));
  196 |     });
  197 |     await page.reload();
  198 |     await page.waitForFunction(() => (window as any).__ssaStores);
  199 | 
> 200 |     await expect(page.getByText('市场分析', { exact: true })).toHaveCount(0);
      |                                                           ^ Error: expect(locator).toHaveCount(expected) failed
  201 |     // 对照组：未被隐藏的项仍可见
  202 |     await expect(page.getByText('仪表盘', { exact: true }).first()).toBeVisible();
  203 |     expect(errors, '页面运行时错误:\n' + errors.join('\n')).toEqual([]);
  204 |   });
  205 | });
  206 | 
```
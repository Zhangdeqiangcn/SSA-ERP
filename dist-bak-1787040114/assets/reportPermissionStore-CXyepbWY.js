import { a as create, p as persist } from "./vendor-DGU5TO-x.js";
import { l as backendStorage } from "./index-DeeqqmHA.js";
const DEFAULT_UNIT_RULES = [
  { id: "u1", fromUnit: "箱", toUnit: "个", factor: 12 },
  { id: "u2", fromUnit: "吨", toUnit: "公斤", factor: 1e3 },
  { id: "u3", fromUnit: "米", toUnit: "厘米", factor: 100 },
  { id: "u4", fromUnit: "千只", toUnit: "只", factor: 1e3 },
  { id: "u5", fromUnit: "卷", toUnit: "米", factor: 50 },
  { id: "u6", fromUnit: "捆", toUnit: "根", factor: 20 }
];
const seedRules = () => {
  try {
    const raw = localStorage.getItem("ssa-erp-unit-conversions");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem("ssa-erp-unit-conversions");
        return parsed;
      }
    }
  } catch {
  }
  return DEFAULT_UNIT_RULES.map((r) => ({ ...r }));
};
function convertUnit(value, from, to, rules) {
  if (from === to) return value;
  const direct = rules.find((r) => r.fromUnit === from && r.toUnit === to);
  if (direct) return value * direct.factor;
  const rev = rules.find((r) => r.fromUnit === to && r.toUnit === from);
  if (rev) return value / rev.factor;
  return null;
}
const useUnitConversionStore = create()(
  persist(
    (set) => ({
      rules: seedRules(),
      setRules: (rules) => set({ rules }),
      addRule: (rule) => set((state) => ({ rules: [...state.rules, { ...rule, id: `u-${Date.now()}` }] })),
      updateRule: (id, patch) => set((state) => ({
        rules: state.rules.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      removeRule: (id) => set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),
      resetRules: () => set({ rules: DEFAULT_UNIT_RULES.map((r) => ({ ...r })) })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-unit-conversions",
      version: 1
    }
  )
);
const DEFAULT_ORDER_TEMPLATES = [
  {
    id: "tpl-001",
    name: "钢板标准采购模板",
    vendorId: "ven-001",
    vendorName: "上海宝钢钢铁贸易有限公司",
    paymentTerms: "货到付款",
    tradeTerms: "CIF（到岸价）",
    deliveryTerms: "含运费到厂",
    remarks: "钢板类物料标准采购模板",
    expectedDeliveryDate: "",
    items: [
      { materialId: "mat-001", materialCode: "MAT202405010001", materialName: "钢板 Q235B", specification: "10mm*1500mm*6000mm", unit: "吨", quantity: 30, unitPrice: 4150 }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "tpl-002",
    name: "紧固件批量采购模板",
    vendorId: "ven-002",
    vendorName: "浙江温州紧固件有限公司",
    paymentTerms: "月结30天",
    tradeTerms: "FOB（离岸价）",
    deliveryTerms: "自提",
    remarks: "螺栓螺母类物料批量采购",
    expectedDeliveryDate: "",
    items: [
      { materialId: "mat-004", materialCode: "MAT202405010004", materialName: "螺栓 M10", specification: "M10*40 10.9级", unit: "套", quantity: 500, unitPrice: 2.3 },
      { materialId: "mat-005", materialCode: "MAT202405010005", materialName: "螺栓 M12", specification: "M12*50 8.8级", unit: "套", quantity: 300, unitPrice: 3 }
    ],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
const seedTemplates = () => {
  try {
    const raw = localStorage.getItem("ssa-order-templates");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem("ssa-order-templates");
        return parsed;
      }
    }
  } catch {
  }
  return DEFAULT_ORDER_TEMPLATES.map((t) => ({ ...t, items: t.items.map((i) => ({ ...i })) }));
};
const useOrderTemplateStore = create()(
  persist(
    (set) => ({
      templates: seedTemplates(),
      setTemplates: (templates) => set({ templates }),
      upsertTemplate: (template) => set((state) => {
        const idx = state.templates.findIndex((t) => t.id === template.id);
        if (idx >= 0) {
          const next = [...state.templates];
          next[idx] = template;
          return { templates: next };
        }
        return { templates: [...state.templates, template] };
      }),
      removeTemplate: (id) => set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),
      duplicateTemplate: (id) => set((state) => {
        const src = state.templates.find((t) => t.id === id);
        if (!src) return state;
        const clone = {
          ...src,
          id: `tpl-${Date.now()}`,
          name: `${src.name} (副本)`,
          items: src.items.map((i) => ({ ...i })),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        return { templates: [...state.templates, clone] };
      })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-order-templates",
      version: 1
    }
  )
);
const uid$3 = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const seedForm = {
  id: "lc-seed-1",
  name: "客户回访单",
  description: "低代码示例：客户回访信息登记",
  fields: [
    { key: "customer", label: "客户名称", type: "text", required: true },
    { key: "score", label: "满意度评分", type: "select", options: ["1", "2", "3", "4", "5"] },
    { key: "visitDate", label: "回访日期", type: "date" },
    { key: "note", label: "备注", type: "textarea" }
  ],
  createdAt: today(),
  updatedAt: today()
};
const useLowCodeStore = create()(
  persist(
    (set) => ({
      formDefinitions: [seedForm],
      formRecords: [
        {
          id: "lcr-seed-1",
          formId: "lc-seed-1",
          formName: "客户回访单",
          data: { customer: "示例客户A", score: "5", visitDate: today(), note: "满意" },
          createdAt: today()
        }
      ],
      addFormDefinition: (form) => set((s) => ({
        formDefinitions: [
          ...s.formDefinitions,
          { ...form, id: uid$3("lc"), createdAt: today(), updatedAt: today() }
        ]
      })),
      updateFormDefinition: (id, patch) => set((s) => ({
        formDefinitions: s.formDefinitions.map(
          (f) => f.id === id ? { ...f, ...patch, updatedAt: today() } : f
        )
      })),
      deleteFormDefinition: (id) => set((s) => ({ formDefinitions: s.formDefinitions.filter((f) => f.id !== id) })),
      submitForm: (formId, data) => set((s) => {
        const form = s.formDefinitions.find((f) => f.id === formId);
        return {
          formRecords: [
            ...s.formRecords,
            {
              id: uid$3("lcr"),
              formId,
              formName: form == null ? void 0 : form.name,
              data,
              createdAt: today()
            }
          ]
        };
      }),
      deleteRecord: (id) => set((s) => ({ formRecords: s.formRecords.filter((r) => r.id !== id) }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-lowcode"
    }
  )
);
const uid$2 = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const now$2 = () => (/* @__PURE__ */ new Date()).toISOString();
const seedDef = {
  id: "wf-seed-1",
  name: "采购申请审批流",
  createdAt: now$2(),
  nodes: [
    { id: "n1", name: "发起申请", type: "start" },
    { id: "n2", name: "主管审批", type: "approval" },
    { id: "n3", name: "采购执行", type: "task" },
    { id: "n4", name: "结束", type: "end" }
  ],
  transitions: [
    { from: "n1", to: "n2", label: "提交" },
    { from: "n2", to: "n3", label: "通过" },
    { from: "n3", to: "n4", label: "完成" }
  ]
};
const useWorkflowStore = create()(
  persist(
    (set, get) => ({
      definitions: [seedDef],
      instances: [],
      addDefinition: (def) => set((s) => ({
        definitions: [...s.definitions, { ...def, id: uid$2("wf"), createdAt: now$2() }]
      })),
      deleteDefinition: (id) => set((s) => ({ definitions: s.definitions.filter((d) => d.id !== id) })),
      startInstance: (defId, initiator) => {
        const def = get().definitions.find((d) => d.id === defId);
        if (!def) return "";
        const startNode = def.nodes.find((n) => n.type === "start") ?? def.nodes[0];
        const id = uid$2("wfi");
        const instance = {
          id,
          defId,
          defName: def.name,
          currentNodeId: startNode.id,
          status: "running",
          startedAt: now$2(),
          initiator,
          history: [
            { nodeId: startNode.id, nodeName: startNode.name, action: "start", at: now$2() }
          ]
        };
        set((s) => ({ instances: [...s.instances, instance] }));
        return id;
      },
      advanceInstance: (instanceId, operator) => set((s) => ({
        instances: s.instances.map((inst) => {
          if (inst.id !== instanceId || inst.status !== "running") return inst;
          const def = get().definitions.find((d) => d.id === inst.defId);
          if (!def) return inst;
          const current = def.nodes.find((n) => n.id === inst.currentNodeId);
          if (!current || current.type === "end") return inst;
          const trans = def.transitions.find((t) => t.from === current.id);
          if (!trans) return inst;
          const target = def.nodes.find((n) => n.id === trans.to);
          const action = current.type === "approval" ? "approve" : "advance";
          return {
            ...inst,
            currentNodeId: target.id,
            status: target.type === "end" ? "done" : "running",
            history: [
              ...inst.history,
              { nodeId: target.id, nodeName: target.name, action, at: now$2(), operator }
            ]
          };
        })
      })),
      rejectInstance: (instanceId, operator) => set((s) => ({
        instances: s.instances.map((inst) => {
          if (inst.id !== instanceId || inst.status !== "running") return inst;
          const def = get().definitions.find((d) => d.id === inst.defId);
          if (!def) return inst;
          const current = def.nodes.find((n) => n.id === inst.currentNodeId);
          if (!current || current.type !== "approval") return inst;
          return {
            ...inst,
            status: "rejected",
            history: [
              ...inst.history,
              { nodeId: current.id, nodeName: current.name, action: "reject", at: now$2(), operator }
            ]
          };
        })
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-workflow"
    }
  )
);
const uid$1 = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const now$1 = () => (/* @__PURE__ */ new Date()).toISOString();
const API_REGISTRY = [
  { method: "GET", path: "/api/v1/materials", module: "物料", description: "查询物料主数据（支持过滤/分页）" },
  { method: "POST", path: "/api/v1/materials", module: "物料", description: "创建物料主数据" },
  { method: "GET", path: "/api/v1/sales-orders", module: "销售", description: "查询销售订单列表" },
  { method: "POST", path: "/api/v1/sales-orders", module: "销售", description: "创建销售订单" },
  { method: "GET", path: "/api/v1/purchase-orders", module: "采购", description: "查询采购订单列表" },
  { method: "POST", path: "/api/v1/purchase-orders", module: "采购", description: "创建采购订单" },
  { method: "GET", path: "/api/v1/inventory", module: "仓储", description: "查询实时库存" },
  { method: "GET", path: "/api/v1/reports", module: "报表", description: "获取报表数据集" },
  { method: "POST", path: "/api/v1/webhooks", module: "集成", description: "注册事件 Webhook 订阅" }
];
function buildAuthHeaders(w) {
  const headers = { "Content-Type": "application/json" };
  const authType = w.authType ?? "none";
  if (authType === "bearer" && w.authToken) {
    headers["Authorization"] = `Bearer ${w.authToken}`;
  } else if (authType === "basic" && w.authUser) {
    const basic = typeof btoa === "function" ? btoa(`${w.authUser}:${w.authPass ?? ""}`) : Buffer.from(`${w.authUser}:${w.authPass ?? ""}`).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  }
  return headers;
}
async function deliverWebhook(w, event, payload) {
  const headers = buildAuthHeaders(w);
  const body = JSON.stringify({ event, payload });
  const maxRetry = Math.max(0, w.retry ?? 0);
  let lastError = "";
  let resp = null;
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      resp = await fetch(w.url, { method: "POST", headers, body });
      if (resp.ok) break;
      lastError = `HTTP ${resp.status}`;
    } catch (e) {
      lastError = String(e);
    }
  }
  const ok = !!(resp == null ? void 0 : resp.ok);
  return {
    id: uid$1("whl"),
    webhookId: w.id,
    webhookName: w.name,
    event,
    status: ok ? "success" : "failed",
    detail: ok ? `HTTP ${resp.status}` : `重试 ${maxRetry} 次仍失败：${lastError}`,
    at: now$1()
  };
}
const useIntegrationStore = create()(
  persist(
    (set, get) => ({
      webhooks: [
        {
          id: "wh-seed-1",
          name: "示例-销售订单通知",
          url: "https://example.com/hooks/sales",
          events: ["sales.order.created"],
          enabled: true,
          createdAt: now$1(),
          authType: "none",
          retry: 0
        }
      ],
      webhookLogs: [],
      addWebhook: (w) => set((s) => ({ webhooks: [...s.webhooks, { ...w, id: uid$1("wh"), createdAt: now$1() }] })),
      updateWebhook: (id, patch) => set((s) => ({ webhooks: s.webhooks.map((w) => w.id === id ? { ...w, ...patch } : w) })),
      deleteWebhook: (id) => set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),
      triggerWebhook: (event, payload) => {
        const targets = get().webhooks.filter((w) => w.enabled && w.events.includes(event));
        targets.forEach((w) => {
          const logId = uid$1("whl");
          set((s) => ({
            webhookLogs: [
              {
                id: logId,
                webhookId: w.id,
                webhookName: w.name,
                event,
                status: "pending",
                detail: "发送中…",
                at: now$1()
              },
              ...s.webhookLogs
            ]
          }));
          deliverWebhook(w, event, payload).then(
            (log) => set((s) => ({
              webhookLogs: s.webhookLogs.map(
                (l) => l.id === logId ? { ...l, status: log.status, detail: log.detail, at: log.at } : l
              )
            }))
          );
        });
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-integration"
    }
  )
);
const seed = {
  material: [
    { field: "valuationClass", label: "评估类", visible: true, mode: "visible" },
    { field: "standardPrice", label: "标准价", visible: true, mode: "visible" },
    { field: "movingAvgPrice", label: "移动平均价", visible: true, mode: "visible" },
    { field: "batchManaged", label: "批次管理", visible: true, mode: "visible" }
  ],
  purchase: [
    { field: "price", label: "单价", visible: true, mode: "visible" },
    { field: "tax", label: "税额", visible: true, mode: "visible" },
    { field: "supplierName", label: "供应商", visible: true, mode: "visible" }
  ],
  sales: [
    { field: "amount", label: "金额", visible: true, mode: "visible" },
    { field: "customerName", label: "客户", visible: true, mode: "visible" }
  ],
  vendor: [],
  warehouse: [],
  quality: [],
  production: [],
  finance: []
};
const maskValue = (value, mask = "•") => {
  const v = String(value ?? "");
  if (!v) return "";
  if (v.length <= 1) return mask.repeat(3);
  if (v.length === 2) return `${v[0]}${mask.repeat(2)}`;
  return `${v[0]}${mask.repeat(v.length - 2)}${v[v.length - 1]}`;
};
const useFieldPermissionStore = create()(
  persist(
    (set, get) => ({
      moduleFields: seed,
      setFieldVisible: (module, field, visible) => set((s) => {
        const list = s.moduleFields[module] ?? [];
        const exists = list.find((f) => f.field === field);
        const next = exists ? list.map((f) => f.field === field ? { ...f, visible } : f) : [...list, { field, label: field, visible, mode: "visible" }];
        return { moduleFields: { ...s.moduleFields, [module]: next } };
      }),
      getVisibleFields: (module) => get().moduleFields[module] ?? [],
      setFieldMode: (module, field, mode) => set((s) => {
        const list = s.moduleFields[module] ?? [];
        const exists = list.find((f) => f.field === field);
        const next = exists ? list.map((f) => f.field === field ? { ...f, mode } : f) : [...list, { field, label: field, visible: true, mode }];
        return { moduleFields: { ...s.moduleFields, [module]: next } };
      }),
      getFieldMode: (module, field) => {
        var _a;
        const list = get().moduleFields[module] ?? [];
        return ((_a = list.find((f) => f.field === field)) == null ? void 0 : _a.mode) ?? "visible";
      },
      maskValue
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-field-perm"
    }
  )
);
const I18N_DICT = {
  "app.title": { "zh-CN": "SSA ERP 企业资源管理平台", "en-US": "SSA ERP Enterprise Resource Platform" },
  "nav.platform": { "zh-CN": "OA流程定制", "en-US": "OA Process Studio" },
  "page.lowcode": { "zh-CN": "低代码设计器", "en-US": "Low-code Designer" },
  "page.workflow": { "zh-CN": "工作流引擎", "en-US": "Workflow Engine" },
  "page.integration": { "zh-CN": "集成中心", "en-US": "Integration Hub" },
  "page.fieldPerm": { "zh-CN": "字段级权限", "en-US": "Field Permissions" },
  "page.i18n": { "zh-CN": "多语言", "en-US": "Localization" },
  "page.reportPerm": { "zh-CN": "报表权限与订阅", "en-US": "Report Access & Subscription" },
  "common.save": { "zh-CN": "保存", "en-US": "Save" },
  "common.add": { "zh-CN": "新增", "en-US": "Add" },
  "common.delete": { "zh-CN": "删除", "en-US": "Delete" },
  "common.submit": { "zh-CN": "提交", "en-US": "Submit" }
};
const useI18nStore = create()(
  persist(
    (set) => ({
      locale: "zh-CN",
      customTranslations: {},
      setLocale: (locale) => set({ locale }),
      setCustom: (key, value) => set((s) => ({ customTranslations: { ...s.customTranslations, [key]: value } }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-i18n"
    }
  )
);
function translate(key, locale) {
  var _a;
  const state = useI18nStore.getState();
  const loc = locale ?? state.locale;
  if (state.customTranslations[key]) return state.customTranslations[key];
  return ((_a = I18N_DICT[key]) == null ? void 0 : _a[loc]) ?? key;
}
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const now = () => (/* @__PURE__ */ new Date()).toISOString();
const useReportPermissionStore = create()(
  persist(
    (set) => ({
      reportPermissions: [
        { reportId: "rp-1", reportName: "销售汇总报表", allowedRoles: ["admin", "manager", "finance"] },
        { reportId: "rp-2", reportName: "库存周转报表", allowedRoles: ["admin", "warehouse"] },
        { reportId: "rp-3", reportName: "财务报表数据集", allowedRoles: ["admin", "finance"] }
      ],
      subscriptions: [
        {
          id: "sub-seed-1",
          reportId: "rp-1",
          reportName: "销售汇总报表",
          frequency: "weekly",
          recipients: "manager@ssa.com",
          channel: "email",
          enabled: true,
          createdAt: now()
        }
      ],
      setReportRoles: (reportId, reportName, roles) => set((s) => {
        const exists = s.reportPermissions.find((r) => r.reportId === reportId);
        const next = exists ? s.reportPermissions.map((r) => r.reportId === reportId ? { ...r, allowedRoles: roles } : r) : [...s.reportPermissions, { reportId, reportName, allowedRoles: roles }];
        return { reportPermissions: next };
      }),
      addSubscription: (sub) => set((s) => ({
        subscriptions: [...s.subscriptions, { ...sub, id: uid("sub"), createdAt: now() }]
      })),
      updateSubscription: (id, patch) => set((s) => ({ subscriptions: s.subscriptions.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      deleteSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-report-perm"
    }
  )
);
export {
  API_REGISTRY as A,
  I18N_DICT as I,
  useUnitConversionStore as a,
  useLowCodeStore as b,
  convertUnit as c,
  useWorkflowStore as d,
  useIntegrationStore as e,
  useFieldPermissionStore as f,
  useI18nStore as g,
  useReportPermissionStore as h,
  maskValue as m,
  translate as t,
  useOrderTemplateStore as u
};

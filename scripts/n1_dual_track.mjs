// N1 双轨比对：前端轨（现状复刻） vs 服务端轨（独立会计实现）
// 目的：验证「把库存/成本计算从前端 store 下沉到服务端」是否安全——
//       同一批出入库流水，前端算出来的库存/金额/移动均价，与服务端独立算的是否一致。
//
// 前端轨来源（精确复刻，行号对应，便于审计）：
//   src/utils/cost.ts:26  roundAmount    (分精度)
//   src/utils/cost.ts:29  roundPrice     (4位小数)
//   src/utils/cost.ts:36  getUnitCost
//   src/utils/cost.ts:47  getStockValue
//   src/utils/cost.ts:78  rollInMovingAverage
//   src/utils/cost.ts:112 rollOutMovingAverage
//   src/stores/warehouseStore.ts:103 postInboundToInventory (数量聚合部分)
//   src/stores/warehouseStore.ts:190 postOutboundToInventory (数量扣减部分)
//   src/stores/warehouseStore.ts:359 rollInboundCost (调用 rollInMovingAverage)
//   src/stores/warehouseStore.ts:508 出库成本结转 (调用 rollOutMovingAverage)

// ========== 前端轨（复刻现状） ==========
const roundAmount = (n) => Math.round((Number(n) || 0) * 100) / 100;
const roundPrice = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

function getUnitCost(m) {
  if (!m) return 0;
  if (typeof m.movingAvgPrice === 'number' && m.movingAvgPrice > 0) return m.movingAvgPrice;
  if (typeof m.standardPrice === 'number' && m.standardPrice > 0) return m.standardPrice;
  return typeof m.price === 'number' ? m.price : 0;
}
function getStockValue(m) {
  if (!m) return 0;
  if (typeof m.stockValue === 'number') return m.stockValue;
  return roundAmount((m.currentStock || 0) * getUnitCost(m));
}
function feRollIn(prevQty, prevValue, inQty, inUnitPrice) {
  const q0 = Number.isFinite(prevQty) ? Number(prevQty) : 0;
  const v0 = Number.isFinite(prevValue) ? Number(prevValue) : 0;
  const qi = Number.isFinite(inQty) && inQty > 0 ? Number(inQty) : 0;
  const pi = Number.isFinite(inUnitPrice) && inUnitPrice > 0 ? Number(inUnitPrice) : 0;
  const nextQty = q0 + qi;
  const nextValue = v0 + qi * pi;
  const prevPrice = q0 > 0 ? v0 / q0 : pi;
  const nextPrice = nextQty > 0 ? nextValue / nextQty : prevPrice;
  return { quantity: nextQty, stockValue: roundAmount(nextValue), movingAvgPrice: roundPrice(nextPrice) };
}
function feRollOut(prevQty, prevValue, outQty, unitCost) {
  const q0 = Number.isFinite(prevQty) ? Number(prevQty) : 0;
  const v0 = Number.isFinite(prevValue) ? Number(prevValue) : 0;
  const qo = Number.isFinite(outQty) && outQty > 0 ? Number(outQty) : 0;
  const fallback = q0 > 0 ? v0 / q0 : 0;
  const price = roundPrice(Number.isFinite(unitCost) && unitCost > 0 ? unitCost : fallback);
  const costAmount = roundAmount(qo * price);
  return { quantity: q0 - qo, stockValue: roundAmount(v0 - costAmount), movingAvgPrice: price, costAmount, unitCost: price };
}
// 前端入库数量聚合（复刻 postInboundToInventory 非批次部分）
function feAggInbound(records, order) {
  let next = [...records];
  for (const item of order.items) {
    const qty = item.actualQuantity || item.expectedQuantity || 0;
    if (qty <= 0) continue;
    const idx = next.findIndex(r => r.materialId === item.materialId && r.warehouseId === order.warehouseId && (item.locationId ? r.locationId === item.locationId : true));
    if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + qty, availableQuantity: next[idx].availableQuantity + qty };
    else next.push({ materialId: item.materialId, warehouseId: order.warehouseId, locationId: item.locationId || null, orgId: order.orgId, quantity: qty, availableQuantity: qty });
  }
  return next;
}
// 前端出库数量扣减（复刻 postOutboundToInventory 数量部分，注意 Math.min 防负）
function feAggOutbound(records, order) {
  let next = [...records];
  for (const item of order.items) {
    const qty = item.quantity || 0;
    if (qty <= 0) continue;
    const idx = next.findIndex(r => r.materialId === item.materialId && r.warehouseId === order.warehouseId && (item.locationId ? r.locationId === item.locationId : true));
    if (idx >= 0) {
      const dec = Math.min(next[idx].quantity, qty);
      next[idx] = { ...next[idx], quantity: next[idx].quantity - dec, availableQuantity: Math.max(0, next[idx].availableQuantity - dec) };
    }
  }
  return next;
}

// ========== 服务端轨（独立会计实现，不抄前端） ==========
// 设计原则：内部用精确浮点贯穿；每步记录「同口径 round 版」与「精确版」两份，
// 前者验证前端自洽，后者暴露前端累积舍入误差。
function svRollIn(q0, v0, qi, pi) {
  const nq = q0 + qi;
  const nv = v0 + qi * pi;
  const avg = nq > 0 ? nv / nq : (pi || 0);
  return { quantity: nq, stockValueExact: nv, movingAvgPriceExact: avg, stockValueRounded: roundAmount(nv), movingAvgPriceRounded: roundPrice(avg) };
}
function svRollOut(q0, v0, qo, avgAtIssue) {
  const price = avgAtIssue > 0 ? avgAtIssue : (q0 > 0 ? v0 / q0 : 0);
  const cost = qo * price;
  return { quantity: q0 - qo, stockValueExact: v0 - cost, movingAvgPriceExact: price, stockValueRounded: roundAmount(v0 - cost), movingAvgPriceRounded: roundPrice(price), costAmountExact: cost, costAmountRounded: roundAmount(cost) };
}

// ========== 运行器 ==========
// materials: {id, currentStock, stockValue, movingAvgPrice, standardPrice, price}
// inventory: [{materialId, warehouseId, locationId, quantity, availableQuantity}]
// flows: [{seq, type:'in'|'out', date, warehouseId, locationId, items:[{materialId, qty, unitPrice}]}]
function runFrontEnd(materials, inventory, flows) {
  const mats = JSON.parse(JSON.stringify(materials));
  const inv = JSON.parse(JSON.stringify(inventory));
  const cogs = [];
  const seq = [...flows].sort((a, b) => (a.date + a.seq).localeCompare(b.date + b.seq));
  for (const f of seq) {
    if (f.type === 'in') {
      const recs = feAggInbound(inv, { items: f.items.map(i => ({ actualQuantity: i.qty, expectedQuantity: i.qty, materialId: i.materialId, locationId: f.locationId })), warehouseId: f.warehouseId, orgId: 'ORG' });
      // 用 recs 更新 inv
      for (const r of recs) {
        const ex = inv.find(x => x.materialId === r.materialId && x.warehouseId === r.warehouseId && (x.locationId || null) === (r.locationId || null));
        if (ex) Object.assign(ex, r); else inv.push(r);
      }
      for (const it of f.items) {
        const m = mats.find(x => x.id === it.materialId);
        const rolled = feRollIn(m.currentStock, getStockValue(m), it.qty, it.unitPrice);
        m.currentStock = rolled.quantity; m.stockValue = rolled.stockValue; m.movingAvgPrice = rolled.movingAvgPrice;
      }
    } else {
      const recs = feAggOutbound(inv, { items: f.items.map(i => ({ quantity: i.qty, materialId: i.materialId, locationId: f.locationId })), warehouseId: f.warehouseId });
      for (const r of recs) {
        const ex = inv.find(x => x.materialId === r.materialId && x.warehouseId === r.warehouseId && (x.locationId || null) === (r.locationId || null));
        if (ex) Object.assign(ex, r);
      }
      for (const it of f.items) {
        const m = mats.find(x => x.id === it.materialId);
        const rolled = feRollOut(m.currentStock, getStockValue(m), it.qty, m.movingAvgPrice);
        m.currentStock = rolled.quantity; m.stockValue = rolled.stockValue; m.movingAvgPrice = rolled.movingAvgPrice;
        cogs.push({ materialId: it.materialId, qty: it.qty, costAmount: rolled.costAmount });
      }
    }
  }
  return { mats, inv, cogs };
}
function runServer(materials, inventory, flows, exact) {
  const mats = JSON.parse(JSON.stringify(materials));
  const inv = JSON.parse(JSON.stringify(inventory));
  const cogs = [];
  const seq = [...flows].sort((a, b) => (a.date + a.seq).localeCompare(b.date + b.seq));
  for (const f of seq) {
    for (const it of f.items) {
      const m = mats.find(x => x.id === it.materialId);
      const rec = inv.find(x => x.materialId === it.materialId && x.warehouseId === f.warehouseId && (x.locationId || null) === (f.locationId || null));
      if (f.type === 'in') {
        const r = svRollIn(m.currentStock, m.stockValue, it.qty, it.unitPrice);
        m.currentStock = r.quantity;
        m.stockValue = exact ? r.stockValueExact : r.stockValueRounded;
        m.movingAvgPrice = exact ? r.movingAvgPriceExact : r.movingAvgPriceRounded;
        if (rec) { rec.quantity += it.qty; rec.availableQuantity += it.qty; }
        else inv.push({ materialId: it.materialId, warehouseId: f.warehouseId, locationId: f.locationId || null, orgId: 'ORG', quantity: it.qty, availableQuantity: it.qty });
      } else {
        const avg = m.movingAvgPrice;
        const r = svRollOut(m.currentStock, m.stockValue, it.qty, avg);
        m.currentStock = r.quantity;
        m.stockValue = exact ? r.stockValueExact : r.stockValueRounded;
        // 服务端不 min 防负（超发允许负并告警，与 cost.ts 注释一致）
        if (rec) { rec.quantity -= it.qty; rec.availableQuantity = Math.max(0, rec.availableQuantity - it.qty); }
        const ca = exact ? r.costAmountExact : r.costAmountRounded;
        cogs.push({ materialId: it.materialId, qty: it.qty, costAmount: ca });
      }
    }
  }
  return { mats, inv, cogs };
}

// ========== 测试用例 ==========
const cases = [];
function addCase(name, materials, flows, note) { cases.push({ name, materials, inventory: [], flows, note }); }

// 1. 标准：零库存首次入库，再出库一半
addCase('标准-首入后出一半',
  [{ id: 'M1', currentStock: 0, stockValue: 0, movingAvgPrice: 0, standardPrice: 10, price: 10 }],
  [
    { seq: '1', type: 'in', date: '2026-01-01', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M1', qty: 100, unitPrice: 10 }] },
    { seq: '2', type: 'out', date: '2026-01-02', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M1', qty: 40, unitPrice: 0 }] },
  ], '初始0库存，入库100@10，出库40');

// 2. 移动均价变化：两批不同价入库，再出库
addCase('移动均价-两批异价',
  [{ id: 'M2', currentStock: 0, stockValue: 0, movingAvgPrice: 0, standardPrice: 0, price: 0 }],
  [
    { seq: '1', type: 'in', date: '2026-01-01', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M2', qty: 100, unitPrice: 10 }] },
    { seq: '2', type: 'in', date: '2026-01-03', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M2', qty: 100, unitPrice: 20 }] },
    { seq: '3', type: 'out', date: '2026-01-05', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M2', qty: 150, unitPrice: 0 }] },
  ], '100@10 + 100@20 → 均价15，出库150@15');

// 3. 超发：出库数量 > 库存（边界）
addCase('超发-出库大于库存',
  [{ id: 'M3', currentStock: 30, stockValue: 300, movingAvgPrice: 10, standardPrice: 0, price: 0 }],
  [
    { seq: '1', type: 'out', date: '2026-01-02', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M3', qty: 50, unitPrice: 0 }] },
  ], '库存30，出库50（超发20）');

// 4. 零单价入库（兜底）：unitPrice=0 应退化为现行成本
addCase('零单价入库-兜底',
  [{ id: 'M4', currentStock: 0, stockValue: 0, movingAvgPrice: 8, standardPrice: 0, price: 0 }],
  [
    { seq: '1', type: 'in', date: '2026-01-01', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M4', qty: 50, unitPrice: 0 }] },
  ], '移动均价8，入库50@0 应退化为8');

// 5. 多步舍入漂移：反复小额异价入库出库
(function () {
  const flows = [];
  let seq = 0;
  for (let i = 0; i < 10; i++) {
    flows.push({ seq: String(++seq).padStart(3, '0'), type: 'in', date: '2026-02-' + String(1 + i).padStart(2, '0'), warehouseId: 'W1', locationId: null, items: [{ materialId: 'M5', qty: 33, unitPrice: 7.77 }] });
    flows.push({ seq: String(++seq).padStart(3, '0'), type: 'out', date: '2026-02-' + String(1 + i).padStart(2, '0'), warehouseId: 'W1', locationId: null, items: [{ materialId: 'M5', qty: 17, unitPrice: 0 }] });
  }
  addCase('舍入漂移-10轮×33@7.77/出17',
    [{ id: 'M5', currentStock: 0, stockValue: 0, movingAvgPrice: 0, standardPrice: 0, price: 0 }],
    flows, '10 轮 33@7.77 入 / 17 出，测累积舍入');
})();

// 6. 除零：库存0时出库
addCase('除零-0库存出库',
  [{ id: 'M6', currentStock: 0, stockValue: 0, movingAvgPrice: 0, standardPrice: 0, price: 0 }],
  [
    { seq: '1', type: 'out', date: '2026-01-02', warehouseId: 'W1', locationId: null, items: [{ materialId: 'M6', qty: 10, unitPrice: 0 }] },
  ], '库存0出库（fallback 单价=0，成本=0）');

// ========== 对照 ==========
const TOL_AMT = 0.01, TOL_PRICE = 0.0001;
let diffs = [];
const out = [];
out.push('# N1 双轨比对结果（前端轨 vs 服务端轨）\n');
for (const c of cases) {
  const fe = runFrontEnd(c.materials, c.inventory, c.flows);
  const svSame = runServer(c.materials, c.inventory, c.flows, false);
  const svExact = runServer(c.materials, c.inventory, c.flows, true);
  out.push(`\n## 用例：${c.name}\n> ${c.note}\n`);
  for (const m of c.materials) {
    const f = fe.mats.find(x => x.id === m.id);
    const s = svSame.mats.find(x => x.id === m.id);
    const e = svExact.mats.find(x => x.id === m.id);
    const dSame = Math.abs(f.stockValue - s.stockValue) > TOL_AMT || Math.abs(f.movingAvgPrice - s.movingAvgPrice) > TOL_PRICE;
    const dExact = Math.abs(f.stockValue - e.stockValue) > TOL_AMT || Math.abs(f.movingAvgPrice - e.movingAvgPrice) > TOL_PRICE;
    out.push(`- 物料 ${m.id}：前端[数量${f.currentStock} 金额${f.stockValue} 均价${f.movingAvgPrice}] | 服务端同口径[数量${s.currentStock} 金额${s.stockValue} 均价${s.movingAvgPrice}] | 服务端精确[数量${e.currentStock} 金额${e.stockValue.toFixed(4)} 均价${e.movingAvgPrice.toFixed(6)}]`);
    if (dSame) { out.push(`  ❌ 与「同口径服务端」不一致（前端自洽破坏）`); diffs.push(`${c.name}/${m.id}: 与同口径服务端不一致`); }
    if (dExact) { out.push(`  ⚠️ 与「精确服务端」存在舍入漂移（前端每步 round 累积误差）`); diffs.push(`${c.name}/${m.id}: 舍入漂移 金额差=${(f.stockValue - e.stockValue).toFixed(4)}`); }
    if (!dSame && !dExact) out.push(`  ✅ 两轨一致`);
  }
}
out.push(`\n\n# 汇总\n- 用例数：${cases.length}\n- 与同口径服务端不一致：${diffs.filter(d => d.includes('自洽')).length}\n- 舍入漂移（精确 vs 前端）：${diffs.filter(d => d.includes('漂移')).length}\n- 差异明细：\n${diffs.map(d => '  - ' + d).join('\n') || '  （无）'}\n`);

const text = out.join('\n');
console.log(text);
try { require('fs').writeFileSync('tmp/n1-dual-track-result.md', text); console.log('\n[已写入 tmp/n1-dual-track-result.md]'); } catch (e) {}

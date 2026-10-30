# -*- coding: utf-8 -*-
"""离线验证 0120 + 0121 + 0122 + 0123 四条迁移：语法、效果、幂等性。

不依赖 wrangler/D1，用内存 sqlite 复刻最小表结构 + 生产形态数据
（数据取自 2026-10-30 对生产 D1 的实测快照）。
"""
import sqlite3
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIG = ROOT / "migrations"
SQL_0120 = (MIG / "0120_fix_legacy_doc_refs.sql").read_text(encoding="utf-8")
SQL_0121 = (MIG / "0121_backfill_c1_work_order.sql").read_text(encoding="utf-8")
SQL_0122 = (MIG / "0122_fix_wave_003_material_code.sql").read_text(encoding="utf-8")
SQL_0123 = (MIG / "0123_fix_wave_material_codes.sql").read_text(encoding="utf-8")

ORG = "org_d213a257563c40cca55551781cef67f9"

c = sqlite3.connect(":memory:")
c.executescript(
    """
    CREATE TABLE work_orders (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, order_no TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', product_code TEXT NOT NULL, product_name TEXT NOT NULL,
      bom_id TEXT, bom_no TEXT, route_id TEXT, route_no TEXT,
      planned_quantity REAL NOT NULL DEFAULT 0, completed_quantity REAL NOT NULL DEFAULT 0,
      scrap_quantity REAL NOT NULL DEFAULT 0, qualified_quantity REAL DEFAULT 0,
      planned_start_date TEXT, planned_end_date TEXT, actual_start_date TEXT, actual_end_date TEXT,
      priority TEXT DEFAULT 'normal', workshop TEXT, supervisor TEXT,
      note TEXT, cost_center_id TEXT,
      actual_labor_cost REAL DEFAULT 0, actual_material_cost REAL DEFAULT 0,
      actual_machine_cost REAL DEFAULT 0, actual_total_cost REAL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT, updated_by TEXT,
      owner_id TEXT, dept_id TEXT, version INTEGER DEFAULT 1,
      inventory_posted BOOLEAN DEFAULT 0, backflush_outbound_no TEXT,
      depreciation_cost REAL DEFAULT 0, overhead_cost REAL DEFAULT 0,
      created_by_name TEXT, updated_by_name TEXT,
      UNIQUE(org_id, order_no)
    );
    CREATE TABLE sales_orders (id TEXT PRIMARY KEY, org_id TEXT NOT NULL, order_no TEXT NOT NULL);
    CREATE TABLE finished_goods_inbounds (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, inbound_no TEXT, work_order_no TEXT,
      product_code TEXT, actual_qty REAL, inbound_date TEXT);
    CREATE TABLE wave_rfid (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, wave_no TEXT, order_count REAL,
      planned_date TEXT, lines TEXT);
    CREATE TABLE outbound_orders (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, outbound_no TEXT, type TEXT DEFAULT 'sale',
      source_no TEXT, status TEXT);
    CREATE TABLE materials (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT, unit TEXT,
      current_stock REAL DEFAULT 0,
      UNIQUE(org_id, code));
    CREATE TABLE sales_order_items (
      id TEXT PRIMARY KEY, sales_order_id TEXT NOT NULL, material_id TEXT,
      material_code TEXT, material_name TEXT, specification TEXT, unit TEXT,
      quantity REAL DEFAULT 0, unit_price REAL DEFAULT 0, amount REAL DEFAULT 0,
      delivery_date TEXT, remarks TEXT, delivered_quantity REAL DEFAULT 0);
    """
)

# 生产库真实物料主数据（18 条，实测快照）——注意：**没有** MAT-3001 / MAT-3002 / FG-5001
c.executemany(
    "INSERT INTO materials (id, org_id, code, name, unit, current_stock) VALUES (?,?,?,?,?,?)",
    [
        ("m-1", ORG, "MAT202405010001", "钢板 Q235B", "吨", 85),
        ("m-2", ORG, "MAT202405010002", "钢管 碳钢", "根", 120),
        ("m-3", ORG, "MAT202405010003", "H型钢 Q345B", "吨", 45),
        ("m-4", ORG, "MAT202405010004", "螺栓 M10", "套", 8500),
        ("m-5", ORG, "MAT202405010005", "螺栓 M12", "套", 6200),
        ("m-6", ORG, "MAT202405010006", "螺母 M10", "个", 15000),
        ("m-7", ORG, "MAT202405010007", "焊条 E4303", "盒", 280),
        ("m-8", ORG, "MAT202405010008", "砂轮片 Φ100", "片", 650),
        ("m-9", ORG, "MAT202405010009", "交流接触器 CJX2", "个", 35),
        ("m-10", ORG, "MAT202405010010", "断路器 DZ47", "个", 25),
        ("m-11", ORG, "MAT202405010011", "油漆 防锈漆", "桶", 60),
        ("m-12", ORG, "MAT202405010012", "机油 润滑油", "桶", 15),
        ("m-13", ORG, "MAT202405010013", "角钢 Q235", "米", 380),
        ("m-14", ORG, "MAT202405010014", "钢管 不锈钢", "根", 65),
        ("m-15", ORG, "MAT202405010015", "钢丝绳", "米", 180),
        ("m-16", ORG, "PRD-CABINET-001", "标准配电柜箱体 GGD-01", "台", 4),
        ("m-17", ORG, "PRD-FRAME-001", "重型钢结构焊接架 H1200", "件", 3),
        ("m-18", ORG, "MAT-SEMI-001", "焊接框架半成品", "件", 15),
    ],
)

# 生产库真实形态：work_orders 里**没有** WO-2024-0601
c.executemany(
    "INSERT INTO work_orders (id, org_id, order_no, product_code, product_name, created_at, updated_at)"
    " VALUES (?,?,?,?,?,?,?)",
    [
        ("wo-demo", ORG, "WO-DEMO-20261022", "P1", "演示产品", "2026-10-22", "2026-10-22"),
        ("wo-001", ORG, "WO-2024-0501", "PRD-FRAME-001", "重型钢结构焊接架 H1200", "2024-05-10", "2024-05-10"),
        ("wo-002", ORG, "WO-2024-0502", "PRD-CAB-001", "标准配电柜箱体 GGD-01", "2024-05-14", "2024-05-14"),
        ("wo-003", ORG, "WO-2024-0490", "PRD-FRAME-001", "重型钢结构焊接架 H1200", "2024-04-20", "2024-04-20"),
    ],
)
c.executemany(
    "INSERT INTO sales_orders VALUES (?,?,?)",
    [
        ("so-demo", ORG, "SO-DEMO-20261022"),
        ("so-004", ORG, "SO202406004"),
        ("so-003", ORG, "SO202405003"),
        ("so-002", ORG, "SO202406002"),
        ("so-001", ORG, "SO202406001"),
    ],
)
c.executemany(
    "INSERT INTO finished_goods_inbounds VALUES (?,?,?,?,?,?,?)",
    [
        ("fin-002", ORG, "FIN20240620001", "WO20240601001", "FG202405001", 28, "2024-06-20"),
        ("fin-001", ORG, "FIN20240522001", "WO20240515001", "FG202405001", 48, "2024-05-22"),
    ],
)
c.executemany(
    "INSERT INTO wave_rfid VALUES (?,?,?,?,?,?)",
    [
        # wave-003 用 0122 之前的历史形态（FG-5001 / SO-2026-0006），
        # 以便 0122 → 0123 连续生效
        ("wave-003", ORG, "WAVE-2026-0831-09", 4, "2026-08-31",
         '[{"id":"wl-7","orderNo":"SO-2026-0006","materialCode":"FG-5001",'
         '"materialName":"交流接触器","quantity":30,"pickedQty":30,"location":"F-01-01"}]'),
        # ★ wave-001 / wave-002 用**生产 D1 实测形态**（2026-10-30 快照）：
        #   订单号已是真实单号，但物料编码仍是虚构的 MAT-1001/MAT-1002/MAT-2001/
        #   MAT-1003/MAT-3001/MAT-3002 —— 这正是 0123 要修的部分。
        ("wave-002", ORG, "WAVE-2026-0901-02", 2, "2026-09-01",
         '[{"id":"wl-5","orderNo":"SO202406004","materialCode":"MAT-3001",'
         '"materialName":"铝型材","quantity":20,"pickedQty":0,"location":"C-01-01"},'
         '{"id":"wl-6","orderNo":"SO-2026-0005","materialCode":"MAT-3002",'
         '"materialName":"铜排","quantity":6,"pickedQty":0,"location":"C-02-03"}]'),
        ("wave-001", ORG, "WAVE-2026-0901-01", 3, "2026-09-01",
         '[{"id":"wl-1","orderNo":"SO202406001","materialCode":"MAT-1001",'
         '"materialName":"钢板 Q235B","quantity":10,"pickedQty":6,"location":"A-01-02"},'
         '{"id":"wl-2","orderNo":"SO202406001","materialCode":"MAT-1002",'
         '"materialName":"槽钢","quantity":4,"pickedQty":4,"location":"A-01-05"},'
         '{"id":"wl-3","orderNo":"SO202406002","materialCode":"MAT-2001",'
         '"materialName":"不锈钢板 304","quantity":8,"pickedQty":0,"location":"B-02-01"},'
         '{"id":"wl-4","orderNo":"SO202405003","materialCode":"MAT-1003",'
         '"materialName":"角钢","quantity":12,"pickedQty":5,"location":"A-03-04"}]'),
    ],
)
# 生产销售订单明细（2026-10-30 实测快照）——0123 的订单侧佐证全部来自这里
c.executemany(
    "INSERT INTO sales_order_items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
        ("soi-demo", "so-demo", None, "PRD-FRAME-001", "重型钢结构焊接架 H1200", None, "台", 10, 0, 0, None, None, 0),
        ("soi-003", "so-003", None, "MAT202405010003", "钢管 无缝钢管", None, "根", 5, 0, 0, None, None, 0),
        ("soi-001a", "so-001", None, "MAT202405010002", "角钢 50×50×5", None, "米", 60, 0, 0, None, None, 0),
        ("soi-001b", "so-001", None, "MAT202405010004", "H型钢 Q345B", None, "吨", 120, 0, 0, None, None, 0),
        ("soi-002", "so-002", None, "MAT202405010001", "钢板 Q235B", None, "吨", 500, 0, 0, None, None, 0),
        ("soi-004a", "so-004", None, "MAT202405010001", "钢板 Q235B", None, "吨", 200, 0, 0, None, None, 0),
        ("soi-004b", "so-004", None, "MAT202405010004", "H型钢 Q345B", None, "吨", 80, 0, 0, None, None, 0),
    ],
)
# 生产库出库单只有 1 条（OUT-SALE-20261022），另造一条按工单领料的旧号单验证第三条语句
c.executemany(
    "INSERT INTO outbound_orders VALUES (?,?,?,?,?,?)",
    [
        ("out-demo", ORG, "OUT-SALE-20261022", "sale", "SO-DEMO-20261022", "completed"),
        ("out-003", ORG, "OUT20240620001", "pick", "WO20240601001", "completed"),
    ],
)
c.commit()


def snapshot(tag):
    print(f"\n=== {tag} ===")
    for r in c.execute("SELECT id, inbound_no, work_order_no, inbound_date FROM finished_goods_inbounds ORDER BY id"):
        print("  成品入库", r)
    for r in c.execute("SELECT id, outbound_no, type, source_no FROM outbound_orders ORDER BY id"):
        print("  出库单  ", r)
    for r in c.execute("SELECT wave_no, lines FROM wave_rfid ORDER BY wave_no"):
        nos = [l["orderNo"] for l in json.loads(r[1])]
        print("  波次    ", r[0], nos)
    print("  工单数  ", c.execute("SELECT COUNT(*) FROM work_orders").fetchone()[0])


snapshot("BEFORE")

# 两轮 —— 第二轮验证幂等
for i in (1, 2):
    c.executescript(SQL_0120)
    c.executescript(SQL_0121)
    c.executescript(SQL_0122)
    c.executescript(SQL_0123)
    c.commit()
    snapshot(f"AFTER round #{i}")

# ── 断言 ──────────────────────────────────────────────
fgi = {r[0]: r[1] for r in c.execute("SELECT id, work_order_no FROM finished_goods_inbounds")}
assert fgi["fin-001"] == "WO-2024-0501", fgi
assert fgi["fin-002"] == "WO-2024-0601", fgi

waves = {r[0]: [l["orderNo"] for l in json.loads(r[1])] for r in c.execute("SELECT wave_no, lines FROM wave_rfid")}
# 0120 在本夹具里对 wave-001 不生效（生产上早已应用过，订单号已是真实单号）
assert waves["WAVE-2026-0901-01"] == ["SO202406001", "SO202406001", "SO202406002", "SO202406001"], waves
assert waves["WAVE-2026-0901-02"] == ["SO202406004", "SO-2026-0005"], waves
# 0123 之后 wave-003 的订单号应为空（无任何销售订单含「交流接触器」）
assert waves["WAVE-2026-0831-09"] == [""], waves

# ── 0122 专项：波次 2 的物料编码/数量/库位/拣货量 ──────────────
w3 = json.loads(c.execute("SELECT lines FROM wave_rfid WHERE wave_no='WAVE-2026-0831-09'").fetchone()[0])
assert len(w3) == 1, w3
line = w3[0]
assert line["id"] == "wl-7", line
assert line["materialCode"] == "MAT202405010009", line       # FG-5001 → 真实编码
assert line["materialName"] == "交流接触器", line              # 名称本就正确，未改
assert line["orderNo"] == "", line                            # 0123：撤销无佐证的订单映射
assert line["quantity"] == 30 and line["pickedQty"] == 30, line   # 数量是事实，不得改
assert line["location"] == "F-01-01", line                    # 库位是事实，不得改

# 计划日期已迁到 2024 年
pd = c.execute("SELECT planned_date FROM wave_rfid WHERE wave_no='WAVE-2026-0831-09'").fetchone()[0]
assert pd == "2024-06-14", pd

# 库存够不够拣：MAT202405010009 库存 35 >= 30
stock = c.execute("SELECT current_stock FROM materials WHERE code='MAT202405010009'").fetchone()[0]
assert stock >= line["quantity"], (stock, line["quantity"])

# 不得改到别的波次（wave-002 的 MAT-3001/MAT-3002 无主数据对应，刻意不修）
w2 = json.loads(c.execute("SELECT lines FROM wave_rfid WHERE wave_no='WAVE-2026-0901-02'").fetchone()[0])
assert [l["materialCode"] for l in w2] == ["MAT-3001", "MAT-3002"], w2
assert [l["orderNo"] for l in w2] == ["SO202406004", "SO-2026-0005"], w2

# ── 0123 专项：wave-001 的 4 行 ─────────────────────────────
w1 = json.loads(c.execute("SELECT lines FROM wave_rfid WHERE wave_no='WAVE-2026-0901-01'").fetchone()[0])
byid = {l["id"]: l for l in w1}
assert len(w1) == 4, w1

# wl-1 钢板 Q235B：MAT-1001 → MAT202405010001（名称精确匹配）
assert byid["wl-1"]["materialCode"] == "MAT202405010001", byid["wl-1"]
assert byid["wl-1"]["materialName"] == "钢板 Q235B", byid["wl-1"]
assert byid["wl-1"]["orderNo"] == "SO202406001", byid["wl-1"]   # 订单侧有歧义，不改
assert byid["wl-1"]["quantity"] == 10 and byid["wl-1"]["pickedQty"] == 6, byid["wl-1"]
assert byid["wl-1"]["location"] == "A-01-02", byid["wl-1"]

# wl-2 槽钢：主数据无「槽钢」→ 不改编码
assert byid["wl-2"]["materialCode"] == "MAT-1002", byid["wl-2"]
assert byid["wl-2"]["materialName"] == "槽钢", byid["wl-2"]

# wl-3 不锈钢板 304：主数据只有「钢管 不锈钢」，板≠管 → 不改
assert byid["wl-3"]["materialCode"] == "MAT-2001", byid["wl-3"]
assert byid["wl-3"]["materialName"] == "不锈钢板 304", byid["wl-3"]
assert byid["wl-3"]["orderNo"] == "SO202406002", byid["wl-3"]

# wl-4 角钢：MAT-1003 → MAT202405010013；订单 SO202405003 → SO202406001（唯一含角钢）
assert byid["wl-4"]["materialCode"] == "MAT202405010013", byid["wl-4"]
assert byid["wl-4"]["orderNo"] == "SO202406001", byid["wl-4"]
assert byid["wl-4"]["materialName"] == "角钢", byid["wl-4"]
assert byid["wl-4"]["quantity"] == 12 and byid["wl-4"]["pickedQty"] == 5, byid["wl-4"]

# 库存覆盖：钢板 85>=10、角钢 380>=12
for code, need in (("MAT202405010001", 10), ("MAT202405010013", 12)):
    st = c.execute("SELECT current_stock FROM materials WHERE code=?", (code,)).fetchone()[0]
    assert st >= need, (code, st, need)

# 订正后的编码必须真实存在于 materials（不能是编出来的）
for l in w1:
    if l["materialCode"].startswith("MAT2024050100"):
        assert c.execute(
            "SELECT 1 FROM materials WHERE code=?", (l["materialCode"],)
        ).fetchone(), l

# 波次头部统计不动
oc = c.execute("SELECT order_count FROM wave_rfid WHERE wave_no='WAVE-2026-0901-01'").fetchone()
assert oc == (3.0,), oc

# 工单只补了一条，第二轮不得重复
n = c.execute("SELECT COUNT(*) FROM work_orders WHERE order_no='WO-2024-0601'").fetchone()[0]
assert n == 1, f"WO-2024-0601 出现 {n} 条（应为 1）"

# 领料出库单同步
ob = {r[0]: r[1] for r in c.execute("SELECT outbound_no, source_no FROM outbound_orders")}
assert ob["OUT20240620001"] == "WO-2024-0601", ob
assert ob["OUT-SALE-20261022"] == "SO-DEMO-20261022", ob

# 日期未被改动
dates = {r[0]: r[1] for r in c.execute("SELECT id, inbound_date FROM finished_goods_inbounds")}
assert dates["fin-001"] == "2024-05-22" and dates["fin-002"] == "2024-06-20", dates

# 补入工单的关键字段
wo = c.execute(
    "SELECT status, planned_quantity, completed_quantity, qualified_quantity,"
    " planned_start_date, planned_end_date FROM work_orders WHERE order_no='WO-2024-0601'"
).fetchone()
assert wo == ("completed", 30.0, 28.0, 27.0, "2024-06-01", "2024-06-20"), wo

print("\n[OK] 0120 + 0121 + 0122 + 0123 语法正确 / 效果符合预期 / 二次执行幂等 / 日期未改 / 工单未重复")

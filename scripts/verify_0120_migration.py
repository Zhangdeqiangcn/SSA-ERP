# -*- coding: utf-8 -*-
"""离线验证 0120 + 0121 两条迁移：语法、效果、幂等性。

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
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, wave_no TEXT, order_count REAL, lines TEXT);
    CREATE TABLE outbound_orders (
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, outbound_no TEXT, type TEXT DEFAULT 'sale',
      source_no TEXT, status TEXT);
    """
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
    "INSERT INTO wave_rfid VALUES (?,?,?,?,?)",
    [
        ("wave-003", ORG, "WAVE-2026-0831-09", 4,
         '[{"id":"wl-1","orderNo":"SO-2026-0006","materialCode":"MAT1","quantity":10}]'),
        ("wave-002", ORG, "WAVE-2026-0901-02", 2,
         '[{"id":"wl-3","orderNo":"SO-2026-0004","materialCode":"MAT3","quantity":8},'
         '{"id":"wl-4","orderNo":"SO-2026-0005","materialCode":"MAT4","quantity":12}]'),
        ("wave-001", ORG, "WAVE-2026-0901-01", 3,
         '[{"id":"wl-5","orderNo":"SO-2026-0001","materialCode":"MAT5","quantity":30},'
         '{"id":"wl-7","orderNo":"SO-2026-0002","materialCode":"MAT7","quantity":4},'
         '{"id":"wl-8","orderNo":"SO-2026-0003","materialCode":"MAT8","quantity":2}]'),
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
    c.commit()
    snapshot(f"AFTER round #{i}")

# ── 断言 ──────────────────────────────────────────────
fgi = {r[0]: r[1] for r in c.execute("SELECT id, work_order_no FROM finished_goods_inbounds")}
assert fgi["fin-001"] == "WO-2024-0501", fgi
assert fgi["fin-002"] == "WO-2024-0601", fgi

waves = {r[0]: [l["orderNo"] for l in json.loads(r[1])] for r in c.execute("SELECT wave_no, lines FROM wave_rfid")}
assert waves["WAVE-2026-0901-01"] == ["SO202406001", "SO202406002", "SO202405003"], waves
assert waves["WAVE-2026-0901-02"] == ["SO202406004", "SO-2026-0005"], waves
# 0006 无对应订单 → 必须保留（诚实边界）
assert waves["WAVE-2026-0831-09"] == ["SO-2026-0006"], waves

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

print("\n[OK] 0120 + 0121 语法正确 / 效果符合预期 / 二次执行幂等 / 日期未改 / 工单未重复")

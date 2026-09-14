# 评测辅助：读/少量写本地测试库（评测工具，非业务代码）
import sqlite3, sys, glob
files = [f for f in glob.glob('.d1audit_rebuild_20260911/v3/d1/miniflare-D1DatabaseObject/*.sqlite') if not f.endswith('-wal') and not f.endswith('-shm')]
if not files:
    print("NO_DB"); sys.exit(1)
db = files[0]
sql = sys.argv[1]
c = sqlite3.connect(db, timeout=20)
try:
    cur = c.execute(sql)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description] if cur.description else []
    if cols:
        print(" | ".join(cols))
        for r in rows[:60]:
            print(" | ".join(str(x) for x in r))
    else:
        print("OK rows=%d" % cur.rowcount)
    c.commit()
except Exception as e:
    print("ERR:", e)
finally:
    c.close()

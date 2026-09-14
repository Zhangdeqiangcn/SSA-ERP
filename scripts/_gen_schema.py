# 评测/整改辅助：从本地测试库导出表结构，用于生成入参校验规则（非业务代码）
import sqlite3, glob, json, re, sys

f = glob.glob('.d1audit_rebuild_20260911/v3/d1/miniflare-D1DatabaseObject/*.sqlite')
if not f:
    print("NO_DB"); sys.exit(1)
c = sqlite3.connect(f[0], timeout=20)
c.execute("PRAGMA journal_mode=WAL")
tables = [r[0] for r in c.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' "
    "AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' AND name!='schema_migrations' ORDER BY name")]

NUM = re.compile(r'\b(INT|REAL|NUM|DEC|FLOAT|DOUBLE|BOOL)\w*', re.I)
DATE_NAME = re.compile(r'(_at|_date$|^date$|date_|expiry|deadline|period_start|period_end)', re.I)

out = {}
for t in tables:
    cols = {}
    for r in c.execute("PRAGMA table_info(%s)" % t):
        name, ctype = r[1], (r[2] or 'TEXT')
        ctype = ctype.upper()
        if NUM.search(ctype):
            kind = 'number'
        elif DATE_NAME.search(name):
            kind = 'date'
        else:
            kind = 'text'
        cols[name] = {'t': kind, 'sql': ctype}
    out[t] = cols
print(json.dumps(out, ensure_ascii=False))
c.close()

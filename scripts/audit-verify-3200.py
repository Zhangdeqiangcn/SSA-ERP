# -*- coding: utf-8 -*-
"""
V3.2.0 本地实测：凭据生命周期（M-12 / L-02）与组织准入（L-03）

为什么需要本地实测：生产门禁只能发 HTTP，无法构造两类关键场景——
  ① 密钥「已过期」（需要把 expires_at 拨到过去）
  ② 「组织被停用/组织不存在」而账号仍正常（需要运维级改库）
本脚本直接操作本地一次性 D1 库（与生产完全隔离）造出这两类数据，
再用真实 HTTP 请求验证网关与登录接口的行为，最后把库改回可控状态。

用法（先启动本地服务）：
  python scripts/audit-verify-3200.py            # 默认打 http://127.0.0.1:8799
  BASE=http://127.0.0.1:8799 python scripts/audit-verify-3200.py
"""
import datetime as dt
import glob
import hashlib
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get('BASE', 'http://127.0.0.1:8799')
PERSIST = os.environ.get('PERSIST', '.d1v320')

PASS = 0
FAIL = 0
FAILED = []


def check(name, ok, detail=''):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f'  [PASS] {name}' + (f'  ({detail})' if detail else ''))
    else:
        FAIL += 1
        FAILED.append(name)
        print(f'  [FAIL] {name}  -> {detail}')


def http(method, path, token=None, api_key=None, body=None):
    url = BASE + path
    data = None
    headers = {'Content-Type': 'application/json'}
    if body is not None:
        data = json.dumps(body).encode('utf-8')
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if api_key:
        headers['Authorization'] = 'Bearer ' + api_key
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode('utf-8', 'replace')
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, {'_raw': raw[:300]}
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'_raw': raw[:300]}
    except Exception as e:  # 连接失败等
        return 0, {'_err': str(e)}


def find_db():
    """定位 D1 真实数据库文件。
    注意：miniflare 持久化目录下还有 cache / kv / r2 / observability 各自的 sqlite，
    必须限定在 miniflare-D1DatabaseObject 目录内，且排除 metadata.sqlite
    （早期版本直接取「最新的 .sqlite」会误取观测存储，报 no such table: users）。"""
    hits = glob.glob(
        os.path.join(PERSIST, 'v3', 'd1', 'miniflare-D1DatabaseObject', '*.sqlite')
    )
    hits = [p for p in hits if os.path.basename(p) != 'metadata.sqlite']
    if not hits:
        hits = [
            p
            for p in glob.glob(os.path.join(PERSIST, '**', '*.sqlite'), recursive=True)
            if 'D1DatabaseObject' in p.replace('\\', '/') and os.path.basename(p) != 'metadata.sqlite'
        ]
    if not hits:
        return None
    return max(hits, key=os.path.getmtime)


def sha256_hex(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def main():
    db_path = find_db()
    if not db_path:
        print(f'找不到本地数据库文件（{PERSIST}），请先执行迁移')
        return 2
    print(f'本地库：{db_path}')
    print(f'目标地址：{BASE}\n')

    db = sqlite3.connect(db_path)
    db.execute('PRAGMA foreign_keys = OFF')

    org_id = 'org_v320'
    user_id = 'user_v320'
    username = 'audit320'
    password = 'Audit3200'
    salt = uuid.uuid4().hex[:16]
    pwd_hash = sha256_hex(f'{salt}:{password}')
    now = dt.datetime.now().isoformat()

    db.execute('DELETE FROM users WHERE id = ?', (user_id,))
    db.execute('DELETE FROM orgs WHERE id = ?', (org_id,))
    db.execute(
        'INSERT INTO orgs (id, name, company_code, status, created_at) VALUES (?,?,?,?,?)',
        (org_id, 'V3.2 实测公司', 'V320AUDIT', 'active', now),
    )
    db.execute(
        'INSERT INTO users (id, org_id, username, name, password_hash, salt, role, department, status, created_at) '
        "VALUES (?,?,?,?,?,?,'admin','QA','active',?)",
        (user_id, org_id, username, 'V3.2 实测管理员', pwd_hash, salt, now),
    )
    db.commit()
    print('夹具：组织 active + admin 用户已就绪\n')

    # ── A) 登录（组织正常）─────────────────────────────────────────
    print('A. 组织状态闸门（L-03）')
    st, r = http('POST', '/api/auth/login', body={'username': username, 'password': password})
    check('组织正常时登录成功（200）', st == 200 and bool(r.get('token')), f'status={st} body={r}')
    token = r.get('token')

    # ── B) 密钥创建 / 有效期契约 ─────────────────────────────────
    print('\nB. 密钥有效期（M-12）')
    st, k30 = http('POST', '/api/open/keys', token=token,
                   body={'label': 'v320-30天', 'scopes': 'read', 'expiresInDays': 30})
    check('创建 30 天密钥（201）', st == 201, f'status={st} body={k30}')
    exp = k30.get('expiresAt')
    check('返回 expiresAt', bool(exp), f'expiresAt={exp}')
    if exp:
        d = (dt.datetime.fromisoformat(exp.replace('Z', '+00:00')).replace(tzinfo=None) - dt.datetime.now()).days
        check('expiresAt 约为 30 天后', 28 <= d <= 31, f'实测算得 {d} 天')
    key_old = k30.get('plainKey')
    key_id = k30.get('id')

    st, knever = http('POST', '/api/open/keys', token=token,
                      body={'label': 'v320-永久', 'scopes': 'read', 'expiresInDays': None})
    check('创建永久密钥（201）', st == 201, f'status={st} body={knever}')
    check('永久密钥 expiresAt 为 null', knever.get('expiresAt') is None, f'expiresAt={knever.get("expiresAt")}')

    st, kdef = http('POST', '/api/open/keys', token=token, body={'label': 'v320-默认', 'scopes': 'read'})
    check('未指定有效期时采用默认（非永久）', st == 201 and bool(kdef.get('expiresAt')),
          f'status={st} expiresAt={kdef.get("expiresAt")} days={kdef.get("expiresInDays")}')

    # ── C) 使用与拒绝路径 ───────────────────────────────────────
    print('\nC. 网关鉴权路径')
    st, r = http('GET', '/api/open/materials', api_key=key_old)
    check('有效密钥经请求头访问成功（200）', st == 200, f'status={st}')

    st, r = http('GET', '/api/open/materials?api_key=' + key_old)
    check('网址参数传密钥被拒（401）', st == 401, f'status={st}')
    check('拒绝原因码 = query_param', r.get('code') == 'query_param', f'code={r.get("code")} err={r.get("error")}')

    st, r = http('GET', '/api/open/materials', api_key='not_sk_prefix')
    check('格式错误密钥被拒（401/malformed）', st == 401 and r.get('code') == 'malformed',
          f'status={st} code={r.get("code")}')

    st, r = http('GET', '/api/open/materials')
    check('无凭据被拒（401/missing）', st == 401 and r.get('code') == 'missing',
          f'status={st} code={r.get("code")}')

    # ── D) 轮换（L-02）──────────────────────────────────────────
    print('\nD. 密钥轮换（L-02）')
    st, rot = http('POST', f'/api/open/keys/{key_id}', token=token, body={})
    check('轮换返回 200', st == 200, f'status={st} body={rot}')
    key_new = rot.get('plainKey')
    check('返回新明文且不同于旧密钥', bool(key_new) and key_new != key_old, '新旧相同即为失败')
    check('轮换记录 rotated_at', bool(rot.get('rotatedAt')), f'rotatedAt={rot.get("rotatedAt")}')

    st, r = http('GET', '/api/open/materials', api_key=key_old)
    check('轮换后旧密钥立即失效（401/invalid）', st == 401 and r.get('code') == 'invalid',
          f'status={st} code={r.get("code")}')
    st, r = http('GET', '/api/open/materials', api_key=key_new)
    check('轮换后新密钥可用（200）', st == 200, f'status={st}')

    # ── E) 过期（M-12 核心，需造数）─────────────────────────────
    print('\nE. 密钥过期（造数：把 expires_at 拨到过去）')
    past = (dt.datetime.now() - dt.timedelta(days=1)).isoformat()
    db.execute('UPDATE api_keys SET expires_at = ? WHERE id = ?', (past, key_id))
    db.commit()
    st, r = http('GET', '/api/open/materials', api_key=key_new)
    check('过期密钥被拒（401）', st == 401, f'status={st}')
    check('过期原因码 = expired', r.get('code') == 'expired', f'code={r.get("code")} err={r.get("error")}')

    # 恢复为 90 天后验证可再次使用（证明拒绝确实源于过期而非其他原因）
    future = (dt.datetime.now() + dt.timedelta(days=90)).isoformat()
    db.execute('UPDATE api_keys SET expires_at = ? WHERE id = ?', (future, key_id))
    db.commit()
    st, r = http('GET', '/api/open/materials', api_key=key_new)
    check('把到期时间改回未来后恢复可用（200）', st == 200, f'status={st}')

    # ── F) 吊销终态 ─────────────────────────────────────────────
    print('\nF. 吊销与终态语义')
    st, r = http('DELETE', f'/api/open/keys/{key_id}', token=token)
    check('吊销返回 200', st == 200, f'status={st}')
    st, r = http('GET', '/api/open/materials', api_key=key_new)
    check('吊销后失效（401/revoked）', st == 401 and r.get('code') == 'revoked',
          f'status={st} code={r.get("code")}')
    st, r = http('POST', f'/api/open/keys/{key_id}', token=token, body={})
    check('已吊销密钥不允许轮换复活（409/REVOKED）', st == 409 and r.get('code') == 'REVOKED',
          f'status={st} code={r.get("code")}')
    st, r = http('POST', f'/api/open/keys/ak_nope_{uuid.uuid4().hex[:6]}', token=token, body={})
    check('轮换不存在的密钥返回 404（非 200 假成功）', st == 404, f'status={st}')
    st, r = http('DELETE', f'/api/open/keys/ak_nope_{uuid.uuid4().hex[:6]}', token=token)
    check('吊销不存在的密钥返回 404（非 200 假成功）', st == 404, f'status={st}')

    # ── G) 组织闸门拒绝路径（造数）──────────────────────────────
    print('\nG. 组织准入闸门（L-03，造数）')
    db.execute("UPDATE orgs SET status = 'suspended' WHERE id = ?", (org_id,))
    db.commit()
    st, r = http('POST', '/api/auth/login', body={'username': username, 'password': password})
    check('公司被停用后登录被拒（403）', st == 403, f'status={st} body={r}')
    check('停用原因码 = ORG_SUSPENDED', r.get('code') == 'ORG_SUSPENDED', f'code={r.get("code")} err={r.get("error")}')

    if token:
        st, r = http('GET', '/api/users?pageSize=1', token=token)
        check('公司停用后既有会话于下次请求即失效（401）', st == 401, f'status={st}')

    db.execute("UPDATE orgs SET status = 'pending' WHERE id = ?", (org_id,))
    db.commit()
    st, r = http('POST', '/api/auth/login', body={'username': username, 'password': password})
    check('公司待审批时登录被拒（403/ORG_PENDING）', st == 403 and r.get('code') == 'ORG_PENDING',
          f'status={st} code={r.get("code")}')

    # 孤儿：把用户的 org_id 指向一个不存在的组织
    db.execute("UPDATE users SET org_id = 'org_gone_v320' WHERE id = ?", (user_id,))
    db.commit()
    st, r = http('POST', '/api/auth/login', body={'username': username, 'password': password})
    check('孤儿组织账号登录被拒（403/ORG_MISSING）', st == 403 and r.get('code') == 'ORG_MISSING',
          f'status={st} code={r.get("code")} err={r.get("error")}')

    # 复原：保证后续可重复运行
    db.execute("UPDATE users SET org_id = ? WHERE id = ?", (org_id, user_id))
    db.execute("UPDATE orgs SET status = 'active' WHERE id = ?", (org_id,))
    db.commit()
    st, r = http('POST', '/api/auth/login', body={'username': username, 'password': password})
    check('复原组织与归属后登录恢复（200）', st == 200 and bool(r.get('token')), f'status={st}')

    db.close()

    print('\n' + '=' * 60)
    print(f'本地实测结果：PASS {PASS} / FAIL {FAIL}')
    if FAILED:
        print('失败项：')
        for f in FAILED:
            print('  - ' + f)
    return 1 if FAIL else 0


if __name__ == '__main__':
    sys.exit(main())

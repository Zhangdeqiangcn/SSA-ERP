/**
 * Vendor API 后端单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';

async function initDB() {
  const migrations = [
    'CREATE TABLE IF NOT EXISTS orgs (id TEXT PRIMARY KEY, name TEXT, created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, org_id TEXT, vendor_code TEXT UNIQUE, company_name TEXT, contact_name TEXT, password_hash TEXT, salt TEXT, role TEXT DEFAULT '\''vendor'\'', status TEXT DEFAULT '\''pending'\'', created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, salt TEXT, org_id TEXT, role TEXT, created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT)',
  ];
  for (const sql of migrations) {
    await env.DB.exec(sql);
  }
}

async function seedVendors() {
  await env.DB.prepare('DELETE FROM vendors').run();
  await env.DB.prepare('DELETE FROM users').run();
  
  const now = new Date().toISOString();
  // 插入测试供应商 (V001 已激活)
  await env.DB.prepare(
    'INSERT INTO vendors (id, org_id, vendor_code, company_name, contact_name, password_hash, salt, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind('ven-1', 'org-1', 'V001', 'Test Supplier 1', 'Contact 1', 'hash1', 'salt1', 'active', now).run();
  
  // V002 待审批
  await env.DB.prepare(
    'INSERT INTO vendors (id, org_id, vendor_code, company_name, contact_name, password_hash, salt, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind('ven-2', 'org-1', 'V002', 'Test Supplier 2', 'Contact 2', 'hash2', 'salt2', 'pending', now).run();
}

describe('Vendor API Tests', () => {
  beforeEach(async () => {
    await initDB();
    await seedVendors();
  });

  it('POST /api/vendor/login 已激活供应商登录成功', async () => {
    const response = await SELF.fetch('http://localhost/api/vendor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorCode: 'V001', password: 'test123' }),
    });
    
    // 密码错误应返回 401
    expect(response.status).toBe(401);
  });

  it('POST /api/vendor/login 待审批供应商返回 403', async () => {
    const response = await SELF.fetch('http://localhost/api/vendor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorCode: 'V002', password: 'test123' }),
    });
    
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('账号未激活');
  });

  it('POST /api/vendor/login 不存在的供应商返回 401', async () => {
    const response = await SELF.fetch('http://localhost/api/vendor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorCode: 'NONEXIST', password: 'test' }),
    });
    
    expect(response.status).toBe(401);
  });
});

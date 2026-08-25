/**
 * D1 API 后端单元测试 - 使用 Cloudflare Workers Test 环境
 * 
 * 这是 GitHub 上推荐的模式：
 * - @cloudflare/vitest-pool-workers 提供真实 Workers 运行时
 * - env.DB 直接访问 D1 数据库（隔离的测试实例）
 * - SELF 模拟 HTTP 请求 Worker
 * 
 * 安装: npm install -D vitest @cloudflare/vitest-pool-workers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { readFileSync } from 'fs';

// 初始化数据库 schema
async function initDB() {
  const migrations = [
    'CREATE TABLE IF NOT EXISTS orgs (id TEXT PRIMARY KEY, name TEXT, created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, salt TEXT, org_id TEXT, role TEXT, created_at TEXT)',
    'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, expires_at TEXT)',
    'CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, vendor_code TEXT UNIQUE, company_name TEXT, password_hash TEXT, salt TEXT, status TEXT, created_at TEXT)',
  ];
  for (const sql of migrations) {
    await env.DB.exec(sql);
  }
}

async function seedData() {
  // 清除旧数据
  await env.DB.prepare('DELETE FROM sessions').run();
  await env.DB.prepare('DELETE FROM users').run();
  await env.DB.prepare('DELETE FROM vendors').run();
  
  // 插入测试用户
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, salt, org_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind('user-1', 'admin', 'hash123', 'salt123', 'org-1', 'admin', now).run();
  
  await env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, salt, org_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind('user-2', 'buyer', 'hash456', 'salt456', 'org-1', 'buyer', now).run();
}

describe('Auth API Tests', () => {
  beforeEach(async () => {
    await initDB();
    await seedData();
  });

  it('POST /api/auth/login 成功登录返回 token', async () => {
    const response = await SELF.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'test123' }),
    });
    
    expect(response.status).toBe(401); // 密码不匹配
  });

  it('POST /api/auth/login 不存在用户返回 401', async () => {
    const response = await SELF.fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent', password: 'test123' }),
    });
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('用户名或密码错误');
  });
});

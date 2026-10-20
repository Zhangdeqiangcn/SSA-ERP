// 渠道 OAuth 助手 —— 纯函数与诚实降级单测
import { describe, it, expect } from 'vitest';
import {
  getProvider,
  buildAuthorizeUrl,
  genState,
  makeMockToken,
  expiresAt,
  OAUTH_PROVIDERS,
} from '../../functions/_shared/channelOAuth';

describe('渠道 OAuth 助手', () => {
  it('getProvider：仅返回已登记平台，未知平台返回 null', () => {
    expect(getProvider('douyin')).toBeTruthy();
    expect(getProvider('pinduoduo')).toBeTruthy();
    expect(getProvider('unknown')).toBeNull();
  });

  it('buildAuthorizeUrl：抖音用 client_key、拼多多用 client_id，占位符全部替换且编码', () => {
    const dy = OAUTH_PROVIDERS.douyin;
    const dyUrl = buildAuthorizeUrl(dy, 'MYKEY', 'https://ssa.test/cb', 'ST123');
    expect(dyUrl).toContain('client_key=MYKEY');
    expect(dyUrl).toContain('redirect_uri=' + encodeURIComponent('https://ssa.test/cb'));
    expect(dyUrl).toContain('state=' + encodeURIComponent('ST123'));
    expect(dyUrl).not.toContain('{client_key}');
    expect(dyUrl).not.toContain('{state}');

    const pdd = OAUTH_PROVIDERS.pinduoduo;
    const pddUrl = buildAuthorizeUrl(pdd, 'APPID', 'https://ssa.test/cb', 'ST456');
    expect(pddUrl).toContain('client_id=APPID');
    expect(pddUrl).not.toContain('{client_id}');
  });

  it('genState：格式为 s_ 前缀（防 CSRF）', () => {
    const s1 = genState();
    const s2 = genState();
    expect(s1.startsWith('s_')).toBe(true);
    expect(s1).not.toBe(s2); // 随机性
  });

  it('makeMockToken：模拟令牌可识别（绝不冒充真实平台）', () => {
    const t = makeMockToken('douyin');
    expect(t.accessToken!.startsWith('mock_douyin_')).toBe(true);
    expect(t.expiresIn).toBe(60 * 60 * 24 * 15);
    expect(t.refreshToken!.startsWith('mock_ref_')).toBe(true);
  });

  it('expiresAt：按秒推算 ISO；缺值返回 null', () => {
    const before = Date.now();
    const iso = expiresAt(100);
    expect(iso).not.toBeNull();
    const ts = new Date(String(iso)).getTime();
    expect(ts).toBeGreaterThanOrEqual(before + 99_000);
    expect(expiresAt(undefined)).toBeNull();
  });

  it('抖音 parseToken：成功与失败响应都能正确解析', () => {
    const dy = OAUTH_PROVIDERS.douyin;
    const ok = dy.parseToken({
      data: { access_token: 'AT', refresh_token: 'RT', expires_in: 1296000, scope: 'order_detail', open_id: 'OP1', nick_name: '旗舰店' },
    });
    expect(ok.accessToken).toBe('AT');
    expect(ok.refreshToken).toBe('RT');
    expect(ok.shopId).toBe('OP1');
    expect(ok.shopName).toBe('旗舰店');

    const fail = dy.parseToken({ error_code: 10008, description: 'token 失效' });
    expect(fail.error).toContain('token 失效');
  });

  it('拼多多 parseToken：成功与 error_response 都能正确解析', () => {
    const pdd = OAUTH_PROVIDERS.pinduoduo;
    const ok = pdd.parseToken({ access_token: 'AT2', refresh_token: 'RT2', expires_in: 86400, scope: 'pdd' });
    expect(ok.accessToken).toBe('AT2');
    expect(ok.refreshToken).toBe('RT2');

    const fail = pdd.parseToken({ error_response: { error_code: 1001, error_msg: 'code 无效' } });
    expect(fail.error).toContain('code 无效');
  });

  it('buildTokenBody：抖音用 client_key、拼多多用 client_id（诚实区分平台字段）', () => {
    const dy = OAUTH_PROVIDERS.douyin.buildTokenBody({ clientId: 'K', clientSecret: 'S', code: 'C', redirectUri: 'R' });
    expect(dy.client_key).toBe('K');
    expect(dy.client_secret).toBe('S');
    expect(dy.code).toBe('C');

    const pdd = OAUTH_PROVIDERS.pinduoduo.buildTokenBody({ clientId: 'K', clientSecret: 'S', code: 'C', redirectUri: 'R' });
    expect(pdd.client_id).toBe('K');
    expect(pdd.client_secret).toBe('S');
    expect(pdd.redirect_uri).toBe('R');
  });
});

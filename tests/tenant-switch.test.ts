/**
 * 选租户/切租户消费链（REQ-2026-037 L-T1 / M00.F02.I01）。
 *
 * fetch stub（不触真实网络，auth-chain 同构）：断言 switch-tenant 的
 * URL/方法/载荷/鉴权头/会话轮换语义。
 */
import {fnTest} from './fn';

import {createAuthService} from '../src/features/auth/auth-service';
import {createSession} from '../src/session/session';
import type {CurrentUser, LoginResponse, MyTenant} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const USER: CurrentUser = {
  id: 'u-1',
  username: 'alice',
  displayName: 'Alice',
  roleCode: 'admin',
};

const TENANTS: MyTenant[] = [
  {tenantId: 't-acme', code: 'acme', name: 'Acme', roleIds: ['r-admin']},
];

const LOGIN_RESPONSE: LoginResponse = {
  token: 'tok-1',
  refreshToken: 'r-1',
  user: USER,
  tenants: TENANTS,
};

interface StubReply {
  status: number;
  body?: unknown;
}

const calls: Array<{url: string; init?: RequestInit}> = [];

function stubFetch(replies: (url: string) => StubReply): void {
  (global as {fetch: unknown}).fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    calls.push({url, init});
    const {status, body} = replies(url);
    return {
      ok: status < 400,
      status,
      headers: new Headers(),
      json: async () => (body === undefined ? null : body),
    } as Response;
  };
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M00.F02.I01'], '切租户：POST 换发 token 对轮换落 session', async () => {
  stubFetch(() => ({
    status: 200,
    body: {...LOGIN_RESPONSE, token: 'tok-2', refreshToken: 'r-2'},
  }));
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);

  await auth.switchTenant('t-other');

  const snap = session.snapshot();
  expect(snap?.token).toBe('tok-2');
  expect(snap?.refreshToken).toBe('r-2');
  expect(snap?.currentTenantId).toBe('t-other');
  const last = calls.at(-1);
  expect(last?.url).toBe('http://127.0.0.1:5204/api/auth/switch-tenant');
  expect(last?.init?.method).toBe('POST');
  expect(JSON.parse(String(last?.init?.body))).toEqual({tenantId: 't-other'});
  expect((last?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M00.F02.I01'], '切租户：失败保留既有会话不清残留', async () => {
  stubFetch(() => ({
    status: 403,
    body: {code: 'AUTH_TENANT_FORBIDDEN', message: 'not a member'},
  }));
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);
  // lab 契约：LoginResponse 无 currentTenantId，由 /me 回填——预置选中租户再验证保留
  session.applySession({user: USER, tenants: TENANTS, currentTenantId: 't-acme'});

  await expect(auth.switchTenant('t-stranger')).rejects.toThrow(/not a member/);
  const snap = session.snapshot();
  expect(snap?.token).toBe('tok-1');
  expect(snap?.currentTenantId).toBe('t-acme');
});

fnTest(['M00.F02.I01'], '切租户：空租户 fail-fast 不发请求', async () => {
  stubFetch(() => ({status: 500}));
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);

  await expect(auth.switchTenant('')).rejects.toThrow(/tenantId/);
  expect(calls).toHaveLength(0);
});

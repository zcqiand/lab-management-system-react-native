/**
 * 登录链流程（REQ-2026-033 T-2 / M01.F05.I06, M00.F01.I01, M01.F05.I04/I05）。
 *
 * fetch 注入 stub（不触真实网络与原生模块，harmonyos 纪律同构）：
 * 断言四条流程的 URL/方法/鉴权头/会话状态迁移。
 * lab 失败形状是泛型 ErrorResponse——按非 200 统一断言抛错+清残留，不绑具体状态码。
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

const ME_RESPONSE = {
  user: USER,
  tenants: TENANTS,
  currentTenantId: 't-acme',
};

interface StubReply {
  status: number;
  body?: unknown;
}

const calls: Array<{url: string; init?: RequestInit}> = [];

function stubFetch(replies: (url: string, init?: RequestInit) => StubReply): void {
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
    const {status, body} = replies(url, init);
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

afterEach(() => {
  jest.restoreAllMocks();
});

fnTest(['M01.F05.I06'], '登录：200 会话落地（token/用户/租户入 store）', async () => {
  stubFetch(() => ({status: 200, body: LOGIN_RESPONSE}));
  const session = createSession();
  const auth = createAuthService({session});

  const user = await auth.login({username: 'alice', password: 'dev123456'});

  expect(user.username).toBe('alice');
  const snap = session.snapshot();
  expect(snap?.token).toBe('tok-1');
  expect(snap?.refreshToken).toBe('r-1');
  expect(snap?.user?.id).toBe('u-1');
  expect(snap?.tenants).toHaveLength(1);

  const last = calls.at(-1);
  expect(last?.url).toBe('http://127.0.0.1:5204/api/auth/native-login');
  expect(last?.init?.method).toBe('POST');
  // lab 形状：LoginRequest 只有 username/password，clientId 服务端持（REQ-2026-023 方案 A）
  expect(JSON.parse(String(last?.init?.body))).toEqual({
    username: 'alice',
    password: 'dev123456',
  });
});

fnTest(['M01.F05.I06'], '登录：非 200 抛错并清空本地会话残留', async () => {
  stubFetch(() => ({
    status: 401,
    body: {code: 'AUTH_UNAUTHORIZED', message: 'bad credentials'},
  }));
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE); // 预置旧会话，验证失败清残留

  await expect(auth.login({username: 'alice', password: 'bad'})).rejects.toThrow();
  expect(session.snapshot()).toBeNull();
});

fnTest(['M00.F01.I01'], '当前会话：带 token 调 /me 并回填身份与租户', async () => {
  stubFetch(url =>
    url.endsWith('/api/auth/me') ? {status: 200, body: ME_RESPONSE} : {status: 404},
  );
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);

  const me = await auth.me();

  expect(me.user.id).toBe('u-1');
  expect(me.currentTenantId).toBe('t-acme');
  const last = calls.at(-1);
  expect(last?.url).toBe('http://127.0.0.1:5204/api/auth/me');
  expect(last?.init?.method).toBe('GET');
  expect((last?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
  const snap = session.snapshot();
  expect(snap?.currentTenantId).toBe('t-acme');
  expect(snap?.tenants).toHaveLength(1);
});

fnTest(['M00.F01.I01'], '当前会话：无会话发鉴权请求即抛（fail-fast）', async () => {
  stubFetch(() => ({status: 401, body: {code: 'AUTH_UNAUTHORIZED', message: 'no'}}));
  const auth = createAuthService({session: createSession()});

  await expect(auth.me()).rejects.toThrow();
  expect(calls).toHaveLength(0);
});

fnTest(['M01.F05.I04'], '刷新：带 refreshToken 调 /refresh 且 token 对轮换', async () => {
  stubFetch(url =>
    url.endsWith('/api/auth/refresh')
      ? {
          status: 200,
          body: {...LOGIN_RESPONSE, token: 'tok-2', refreshToken: 'r-2'},
        }
      : {status: 404},
  );
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);

  await auth.refresh();

  const snap = session.snapshot();
  expect(snap?.token).toBe('tok-2');
  expect(snap?.refreshToken).toBe('r-2');
  const last = calls.at(-1);
  expect(last?.url).toBe('http://127.0.0.1:5204/api/auth/refresh');
  expect(last?.init?.method).toBe('POST');
  expect(JSON.parse(String(last?.init?.body))).toEqual({refreshToken: 'r-1'});
});

fnTest(
  ['M01.F05.I04'],
  '刷新：失败清会话抛错（refreshToken 失效即会话终止）',
  async () => {
    stubFetch(() => ({
      status: 401,
      body: {code: 'AUTH_UNAUTHORIZED', message: 'expired'},
    }));
    const session = createSession();
    const auth = createAuthService({session});
    session.applyLogin(LOGIN_RESPONSE);

    await expect(auth.refresh()).rejects.toThrow();
    expect(session.snapshot()).toBeNull();
  },
);

fnTest(['M01.F05.I05'], '登出：body 带 token 调 /logout 后本地全清', async () => {
  stubFetch(() => ({status: 204}));
  const session = createSession();
  const auth = createAuthService({session});
  session.applyLogin(LOGIN_RESPONSE);

  await auth.logout();

  expect(session.snapshot()).toBeNull();
  const last = calls.at(-1);
  expect(last?.url).toBe('http://127.0.0.1:5204/api/auth/logout');
  expect(last?.init?.method).toBe('POST');
  expect(JSON.parse(String(last?.init?.body))).toEqual({token: 'tok-1'});
  expect((last?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

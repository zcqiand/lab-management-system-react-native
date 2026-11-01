/**
 * 登录链流程（REQ-2026-033 / 四 ID 消费面）。
 *
 * 只做编排：装配（login-form）→ orval 生成 client → 会话状态迁移（session）。
 * token 注入经 orval client 的 options.headers 通道（生成物不动的接线位），
 * mutator 手写传输层不碰业务——REQ §6 纪律。失败形状按非 200 统一处理
 * （泛型 ErrorResponse，不绑具体状态码）。
 */
import type {CurrentUserSession} from '../../api/endpoints/model';
import {
  authGetCurrentUser,
  authLogout,
  authNativeLogin,
  authRefresh,
} from '../../api/endpoints/auth/auth';
import {assembleLoginRequest, type LoginInput} from './login-form';
import type {Session} from '../../session/session';

export interface AuthService {
  login(input: LoginInput): Promise<{id: string; username: string}>;
  me(): Promise<CurrentUserSession>;
  refresh(): Promise<void>;
  logout(): Promise<void>;
}

export function createAuthService({session}: {session: Session}): AuthService {
  const fail = (status: number, body: unknown, fallback: string): Error => {
    const code =
      typeof body === 'object' && body !== null && 'code' in body
        ? String((body as {code: unknown}).code)
        : '';
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as {message: unknown}).message)
        : '';
    return new Error(message || code || `${fallback}（HTTP ${status}）`);
  };

  return {
    async login(input) {
      const request = assembleLoginRequest(input);
      const response = await authNativeLogin(request);

      if (response.status === 200) {
        session.applyLogin(response.data);
        return {
          id: response.data.user.id,
          username: response.data.user.username,
        };
      }

      session.clear(); // 非 200 清本地会话残留
      throw fail(response.status, response.data, '登录失败');
    },

    async me() {
      const response = await authGetCurrentUser({headers: session.authHeaders()});
      if (response.status !== 200) {
        throw fail(response.status, response.data, '当前会话获取失败');
      }
      session.applySession(response.data);
      return response.data;
    },

    async refresh() {
      const refreshToken = session.snapshot()?.refreshToken;
      if (!refreshToken) {
        throw new Error('无 refreshToken 不得调刷新（fail-fast，suite-hard-rules §1）');
      }
      const response = await authRefresh({refreshToken});
      if (response.status !== 200) {
        session.clear(); // refreshToken 失效即会话终止
        throw fail(response.status, response.data, '刷新失败');
      }
      session.applyRefresh(response.data);
    },

    async logout() {
      const token = session.authHeaders().Authorization.replace('Bearer ', '');
      try {
        await authLogout({token}, {headers: session.authHeaders()});
      } finally {
        session.clear(); // 网络失败也要清本地——本地会话不得残留
      }
    },
  };
}

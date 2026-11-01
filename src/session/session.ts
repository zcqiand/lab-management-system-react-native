/**
 * 会话状态（REQ-2026-033 / M01.F05.I06, M00.F01.I01, M01.F05.I04/I05）。
 *
 * SessionState + 可注入 TokenStore（harmonyos SessionState/MemoryTokenStore 同构）：
 * store 只定契约，内存版是骨架期缺省；持久化（AsyncStorage 等）Phase 1+ 接真机时
 * 另立实现注入，本文件不改契约。lab 形状：token/refreshToken/user/tenants
 * （LoginResponse 无 currentTenantId，由 /me 回填）。
 */
import type {
  CurrentUser,
  CurrentUserSession,
  LoginResponse,
  MyTenant,
} from '../api/endpoints/model';

export interface SessionSnapshot {
  token?: string;
  refreshToken?: string;
  user?: CurrentUser;
  tenants: MyTenant[];
  currentTenantId?: string;
}

export interface TokenStore {
  load(): SessionSnapshot | null;
  save(snapshot: SessionSnapshot): void;
  clear(): void;
}

export class MemoryTokenStore implements TokenStore {
  private snapshot: SessionSnapshot | null = null;

  load(): SessionSnapshot | null {
    return this.snapshot;
  }

  save(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot;
  }

  clear(): void {
    this.snapshot = null;
  }
}

export interface Session {
  snapshot(): SessionSnapshot | null;
  applyLogin(response: LoginResponse): void;
  applySession(session: CurrentUserSession): void;
  applyRefresh(response: LoginResponse): void;
  clear(): void;
  authHeaders(): Record<string, string>;
}

export function createSession(store: TokenStore = new MemoryTokenStore()): Session {
  const persist = (patch: Partial<SessionSnapshot> | null): void => {
    if (patch === null) {
      store.clear();
      return;
    }
    const current = store.load();
    store.save({...current, ...patch} as SessionSnapshot);
  };

  const absorbLogin = (response: LoginResponse): void => {
    persist({
      token: response.token,
      refreshToken: response.refreshToken,
      user: response.user,
      tenants: response.tenants,
    });
  };

  return {
    snapshot: () => store.load(),

    applyLogin(response: LoginResponse): void {
      absorbLogin(response);
    },

    applySession(session: CurrentUserSession): void {
      persist({
        user: session.user,
        tenants: session.tenants,
        currentTenantId: session.currentTenantId,
      });
    },

    applyRefresh(response: LoginResponse): void {
      absorbLogin(response); // token 对轮换；currentTenantId 保留既有值不动
    },

    clear(): void {
      persist(null);
    },

    authHeaders(): Record<string, string> {
      const token = store.load()?.token;
      if (!token) {
        throw new Error(
          '未登录：无 token 不得发鉴权请求（fail-fast，suite-hard-rules §1）',
        );
      }
      return {Authorization: `Bearer ${token}`};
    },
  };
}

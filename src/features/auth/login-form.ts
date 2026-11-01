/**
 * 登录入参装配（REQ-2026-033 / M01.F05.I06）。
 *
 * 纯函数 + fail-fast：要素缺失（或空白）即抛，不发请求。
 * lab 形状：LoginRequest 只有 username/password——clientId 服务端持
 * （REQ-2026-023 方案 A）。装配归装配，网络归 auth-service。
 */
import type {LoginRequest} from '../../api/endpoints/model';

export interface LoginInput {
  username: string;
  password: string;
}

const requireNonEmpty = (value: string, field: string): string => {
  if (value.trim().length === 0) {
    throw new Error(`登录入参缺失：${field} 不能为空（fail-fast，suite-hard-rules §1）`);
  }
  return value;
};

export function assembleLoginRequest(input: LoginInput): LoginRequest {
  return {
    username: requireNonEmpty(input.username, 'username'),
    password: requireNonEmpty(input.password, 'password'),
  };
}

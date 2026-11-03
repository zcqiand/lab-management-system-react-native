/**
 * 消费服务共享 HTTP 归一层（REQ-2026-037 L-T4 抽取，catalog/contracts 同族后续收敛候选）。
 *
 * fail：code/message 归一拼接抛错；expectData/expectNoContent：成功态断言。
 */
import type {ErrorResponse} from '../../api/endpoints/model';

export function fail(status: number, body: unknown, fallback: string): Error {
  const parts: string[] = [];
  if (typeof body === 'object' && body !== null) {
    const code = (body as {code?: unknown}).code;
    const message = (body as {message?: unknown}).message;
    if (code) parts.push(String(code));
    if (message) parts.push(String(message));
  }
  return new Error(parts.join('：') || fallback);
}

export async function expectData<T>(
  response: {data: T | ErrorResponse; status: number},
  ok: number,
  fallback: string,
): Promise<T> {
  if (response.status !== ok) {
    throw fail(
      response.status,
      response.data as ErrorResponse,
      `${fallback}（HTTP ${response.status}）`,
    );
  }
  return response.data as T;
}

export async function expectNoContent(
  response: {data: void | ErrorResponse; status: number},
  fallback: string,
): Promise<void> {
  if (response.status !== 204) {
    throw fail(
      response.status,
      response.data as ErrorResponse,
      `${fallback}（HTTP ${response.status}）`,
    );
  }
}

/** 信封过滤未定义字段后判空——PUT PATCH 语义禁发空载荷。 */
export function dropUndefined(
  input: Record<string, unknown>,
  emptyMessage: string,
): Record<string, unknown> {
  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(body).length === 0) {
    throw new Error(emptyMessage);
  }
  return body;
}

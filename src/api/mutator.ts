import {apiBaseUrl} from '../config/app-config';

/**
 * orval fetch client mutator（custom instance，orval 官方形状）：泛型 <T> + 解包成
 * {data, status, headers}，业务代码只见生成物类型。API 面只认 shared 生成物
 * （suite-hard-rules §4）——本文件是生成物之外唯一的手写传输层，禁在此处扩散业务
 * 逻辑。token 注入 Phase 1 接线时补（SSO 形态 Phase 1+，家族档案同节奏）。
 */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export const customFetch = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const base = apiBaseUrl();
  const absolute = url.startsWith('http') ? url : `${base}${url}`;

  const response = await fetch(absolute, {
    ...init,
    headers: {'Content-Type': 'application/json', ...init?.headers},
  });

  // 204/205/304 无响应体（miniprogram taro-fetch 桥同款守卫）；其余按 JSON 解，
  // 非 JSON 容错为 null——错误形状交由调用方按 status 分流。
  const data = NULL_BODY_STATUSES.has(response.status)
    ? null
    : ((await response.json().catch(() => null)) as unknown);

  return {data, status: response.status, headers: response.headers} as T;
};

/**
 * 后端 API 基址（env 键 RN_API_BASE_URL）。
 * 缺失即抛错——禁止默认值兜底（suite-hard-rules §1，ADR-0044 同源纪律）。
 * dev 值见 .env.example；Phase 1 接线时按 multi-repo-family.md §6 URL 表核对。
 *
 * 注入方式注记：metro 不内联 process.env——骨架期零网络消费；Phase 1 真接线时
 * 走 babel transform-inline-environment-variables（或 metro env 注入）编译期烘焙，
 * 届时本函数实现随接线批一并调整，fail-fast 语义不变。
 */
export function apiBaseUrl(): string {
  const url = process.env.RN_API_BASE_URL;

  if (!url) {
    throw new Error(
      'RN_API_BASE_URL 未设置。禁止默认值兜底（suite-hard-rules §1）；dev 值见 .env.example。',
    );
  }

  return url;
}

/**
 * jest 适配器：fnTest(ids, name, body)。
 *
 * 与 vitest 版（react-ts / miniprogram）的契约差异：jest 没有 per-test meta，
 * fn 标识走标题尾锚 `[fn:ID1,ID2]`，由 fnReporter 按测试状态门控提取。
 * 契约不变式不放松：inert（skip/todo/pending）测试的 fns 恒为空 —— 锚即便写在
 * 标题里，reporter 也只对真正执行过的测试提取；suite 复核（inert ⇒ fns 空）等价满足。
 *
 *   fnTest(["M01.F01.I03"], "超出宽限判定为迟到", () => { ... });
 *
 * 纪律部分（机器管不了的，与 vitest 版同文）：
 *   - 只在测试直接验证该子项可观察行为时才挂 ID
 *   - 间接受益不挂
 *   - 工程设施的测试不挂任何业务 ID
 *   - 一个测试挂 3 个以上 ID，通常说明它测得太宽
 */
import {it as globalsIt} from '@jest/globals';

const FN_SUFFIX = /\s*\[fn:([^\]]*)\]$/u;

export function fnTest(
  ids: string[],
  name: string,
  body: () => void | Promise<void>,
): void {
  if (FN_SUFFIX.test(name)) {
    throw new Error(
      `fnTest: 测试名不得自带 [fn:...] 尾锚（锚由 fnTest 统一落）: ${name}`,
    );
  }
  const clean = [...new Set(ids)].sort();
  const suffix = clean.length ? ` [fn:${clean.join(',')}]` : '';
  // 显式 @jest/globals 的 it（其 TestCallback 接纳 () => Promise<void>；
  // 全局 @types/jest 的 ProvidesCallback 形状反而拒——TS 严格 union 不收）。
  globalsIt(`${name}${suffix}`, async () => {
    await body();
  });
}

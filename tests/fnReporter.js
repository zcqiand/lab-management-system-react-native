'use strict';

/**
 * jest 适配器：把 fnTest 的标题尾锚落成 suite 契约的 .state/trace.json。
 *
 * 契约：inert=true 的测试，fns 必须为空数组。jest 没有 per-test meta（vitest 版
 * 的物理保证是「skip 的测试 meta 写不进去」），这里等价落法 = 锚在标题里、
 * 提取按状态门控：只有 passed/failed（真正执行过）的测试才从尾锚提取 fns，
 * skip/todo/pending/disabled 一律 fns=[]。TRACE_MAP=1 才写盘，普通跑测试不落盘
 * （gate 的 trace_cmd 走 trace_env 注入，vitest 版同语义）。
 *
 * CJS 而非 TS：jest 的 reporters 数组不经 babel 转换直接 require（适配器不能
 * 豁免于它所服务的规则，但也不能被工具链限制反噬——vitest 版 TS 是因为 vitest
 * config 原生吃 TS，jest reporter 无此待遇）。
 */

const {mkdirSync, writeFileSync} = require('node:fs');
const {dirname} = require('node:path');

const FN_SUFFIX = /\s*\[fn:([^\]]*)\]$/u;
const INERT_STATUSES = new Set(['skipped', 'todo', 'pending', 'disabled']);

function emit(tests) {
  const out = '.state/trace.json';
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify({schema: 1, tests}, null, 2) + '\n');
}

function clean(anchor, status) {
  if (INERT_STATUSES.has(status) || !anchor) return [];
  return [
    ...new Set(
      anchor
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    ),
  ].sort();
}

class FnReporter {
  onRunComplete(_contexts, results) {
    if (process.env.TRACE_MAP !== '1') return;
    const tests = [];
    for (const suite of results.testResults ?? []) {
      for (const a of suite.testResults ?? []) {
        const fullName = a.fullName || a.title || '';
        const match = FN_SUFFIX.exec(fullName);
        tests.push({
          test: `${suite.testFilePath}::${fullName.replace(FN_SUFFIX, '').trim()}`,
          fns: clean(match ? match[1] : '', a.status),
          inert: INERT_STATUSES.has(a.status),
        });
      }
    }
    emit(tests);
  }
}

module.exports = FnReporter;

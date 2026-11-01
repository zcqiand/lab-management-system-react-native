/**
 * 登录入参装配（REQ-2026-033 T-2 / M01.F05.I06）。
 *
 * lab 形状：LoginRequest 只有 username/password——clientId 服务端持
 * （REQ-2026-023 方案 A，LAB_SAAS_CLIENT_ID 后端 env）。纯函数 fail-fast。
 */
import {fnTest} from './fn';

import {assembleLoginRequest} from '../src/features/auth/login-form';

fnTest(['M01.F05.I06'], '登录入参装配：账密齐全产出契约形状 LoginRequest', () => {
  const req = assembleLoginRequest({username: 'alice', password: 'dev123456'});

  expect(req).toEqual({username: 'alice', password: 'dev123456'});
});

fnTest(
  ['M01.F05.I06'],
  '登录入参装配：username/password 缺失或空白即抛（fail-fast）',
  () => {
    expect(() => assembleLoginRequest({username: '', password: 'dev123456'})).toThrow();
    expect(() => assembleLoginRequest({username: 'alice', password: ''})).toThrow();
    expect(() =>
      assembleLoginRequest({username: '   ', password: 'dev123456'}),
    ).toThrow();
  },
);

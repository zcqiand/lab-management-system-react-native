/**
 * 计算方法+技术要求消费面（REQ-2026-037 L-T7 / M06.F05-F06 八 op）。
 *
 * fetch stub（catalog.test.ts 同构）：复合 code 主键（计算方法=对象/参数二元，
 * 技术要求=对象/参数/标准三元）；update PUT PATCH 语义；delete 204/404。
 */
import {fnTest} from './fn';

import {
  createCalculationMethodService,
  createTechnicalRequirementService,
} from '../src/features/inspection/methods-service';
import {createSession} from '../src/session/session';
import type {CalculationMethod, TechnicalRequirement} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const STAMPS = {createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z'};

const CM: CalculationMethod = {
  inspectionObjectCode: 'OBJ-1',
  inspectionParameterCode: 'P-1',
  algorithmType: 'compressive_strength',
  specimenCount: 3,
  formula: 'F = P/A',
  sortOrder: 1,
  ...STAMPS,
};
const TR: TechnicalRequirement = {
  tenantId: 't-acme',
  inspectionObjectCode: 'OBJ-1',
  inspectionParameterCode: 'P-1',
  judgmentStandardCode: 'STD-1',
  valueType: 'numeric',
  comparison: '=',
  judgmentMode: 'automatic',
  verificationStatus: 'draft',
  sortOrder: 1,
  ...STAMPS,
};

interface StubReply {
  status: number;
  body?: unknown;
}

const calls: Array<{url: string; init?: RequestInit}> = [];

function stubFetch(replies: (url: string) => StubReply): void {
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
    const {status, body} = replies(url);
    return {
      ok: status < 400,
      status,
      headers: new Headers(),
      json: async () => (body === undefined ? null : body),
    } as Response;
  };
}

const lastBody = (): unknown => JSON.parse(String(calls.at(-1)?.init?.body));

const LOGIN = {
  token: 'tok-1',
  user: {id: 'u-1', username: 'alice', displayName: 'Alice', roleCode: 'admin'},
  tenants: [{tenantId: 't-acme', code: 'acme', name: 'Acme', roleIds: ['r-admin']}],
};

function booted() {
  const session = createSession();
  session.applyLogin(LOGIN);
  return {
    session,
    methods: createCalculationMethodService({session}),
    techreq: createTechnicalRequirementService({session}),
  };
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M06.F05.I01'], '计算方法列表：对象/参数过滤+鉴权头，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/calculation-methods?') ? {status: 200, body: [CM]} : {status: 404},
  );
  const {methods} = booted();

  const result = await methods.list({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
  });
  expect(result).toHaveLength(1);
  expect(result[0]?.formula).toBe('F = P/A');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/calculation-methods?inspectionObjectCode=OBJ-1&inspectionParameterCode=P-1',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F05.I02'], '计算方法详情：复合主键（对象/参数）取单条', async () => {
  stubFetch(url =>
    url.endsWith('/api/calculation-methods/OBJ-1/P-1')
      ? {status: 200, body: CM}
      : {status: 404},
  );
  const {methods} = booted();

  const result = await methods.get('OBJ-1', 'P-1');
  expect(result.inspectionObjectCode).toBe('OBJ-1');
  expect(result.inspectionParameterCode).toBe('P-1');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/calculation-methods/OBJ-1/P-1',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(
  ['M06.F05.I03'],
  '创建计算方法：对象/参数必填 + algorithmType 默认语义',
  async () => {
    stubFetch(() => ({status: 200, body: CM}));
    const {methods} = booted();

    await methods.create({
      inspectionObjectCode: 'OBJ-1',
      inspectionParameterCode: 'P-1',
      algorithmType: 'compressive_strength',
      formula: 'F = P/A',
    });
    expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/calculation-methods');
    expect(lastBody()).toEqual({
      inspectionObjectCode: 'OBJ-1',
      inspectionParameterCode: 'P-1',
      algorithmType: 'compressive_strength',
      formula: 'F = P/A',
    });
    await expect(
      methods.create({inspectionObjectCode: '', inspectionParameterCode: ''}),
    ).rejects.toThrow(/缺失.*ADR-0019/);
  },
);

fnTest(['M06.F06.I01'], '技术要求列表：四维过滤+鉴权头，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/technical-requirements?')
      ? {status: 200, body: [TR]}
      : {status: 404},
  );
  const {techreq} = booted();

  const result = await techreq.list({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
    judgmentStandardCode: 'STD-1',
    verificationStatus: 'draft',
  });
  expect(result).toHaveLength(1);
  expect(result[0]?.valueType).toBe('numeric');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/technical-requirements?inspectionObjectCode=OBJ-1&inspectionParameterCode=P-1&judgmentStandardCode=STD-1&verificationStatus=draft',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F06.I02'], '新建/编辑技术要求按钮：编辑走三元复合主键 PUT', async () => {
  stubFetch(url =>
    url.endsWith('/api/technical-requirements/OBJ-1/P-1/STD-1')
      ? {status: 200, body: TR}
      : {status: 404},
  );
  const {techreq} = booted();

  await techreq.update('OBJ-1', 'P-1', 'STD-1', {conditions: '标养 28d'});
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/technical-requirements/OBJ-1/P-1/STD-1',
  );
  expect(lastBody()).toEqual({conditions: '标养 28d'});
});

fnTest(['M06.F06.I03'], '创建技术要求：对象/参数/标准必填 + 载荷', async () => {
  stubFetch(() => ({status: 200, body: TR}));
  const {techreq} = booted();

  await techreq.create({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
    judgmentStandardCode: 'STD-1',
    valueType: 'numeric',
    minValue: 30,
  });
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/technical-requirements');
  expect(lastBody()).toEqual({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
    judgmentStandardCode: 'STD-1',
    valueType: 'numeric',
    minValue: 30,
  });
  await expect(
    techreq.create({
      inspectionObjectCode: '',
      inspectionParameterCode: '',
      judgmentStandardCode: '',
    }),
  ).rejects.toThrow(/缺失.*ADR-0019/);
});

fnTest(
  ['M06.F06.I04'],
  '更新技术要求：PUT PATCH 语义未传字段保留 + 空载荷禁发',
  async () => {
    stubFetch(url =>
      url.endsWith('/api/technical-requirements/OBJ-1/P-1/STD-1')
        ? {status: 200, body: TR}
        : {status: 404},
    );
    const {techreq} = booted();

    await techreq.update('OBJ-1', 'P-1', 'STD-1', {maxValue: 60});
    expect(lastBody()).toEqual({maxValue: 60});
    await expect(techreq.update('OBJ-1', 'P-1', 'STD-1', {})).rejects.toThrow(/空/);
  },
);

fnTest(
  ['M06.F06.I05'],
  '删除技术要求（引用保护）：204，不存在 404 归一抛错',
  async () => {
    stubFetch(url =>
      url.endsWith('/api/technical-requirements/OBJ-1/P-1/STD-1')
        ? {status: 204}
        : {status: 404, body: {code: 'NOT_FOUND', message: '无此技术要求'}},
    );
    const {techreq} = booted();

    await techreq.remove('OBJ-1', 'P-1', 'STD-1');
    expect(calls.at(-1)?.url).toBe(
      'http://127.0.0.1:5204/api/technical-requirements/OBJ-1/P-1/STD-1',
    );
    await expect(techreq.remove('OBJ-X', 'P-X', 'STD-X')).rejects.toThrow(/无此|404/);
  },
);

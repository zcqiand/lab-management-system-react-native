/**
 * 检测能力字典消费面（REQ-2026-037 L-T7 / M06.F01-F04 十七 op）。
 *
 * fetch stub（catalog.test.ts 同构）：专项/项目/参数/标准 CRUD + 关联 link。
 * update 是 PUT（PATCH 语义，未传字段保留，空载荷禁发）；link/unlink 204；
 * delete 204/404；list 回显全量信封。
 */
import {fnTest} from './fn';

import {createInspectionDictionaryService} from '../src/features/inspection/dictionary-service';
import {createSession} from '../src/session/session';
import type {
  InspectionObject,
  InspectionParameter,
  InspectionSpecialty,
  InspectionStandard,
} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const STAMPS = {createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z'};

const SPEC: InspectionSpecialty = {
  code: 'SP-1',
  officialNo: 'OFF-1',
  name: '混凝土专项',
  isOfficial: true,
  enabled: true,
  sortOrder: 1,
  ...STAMPS,
};
const OBJ: InspectionObject = {
  code: 'OBJ-1',
  inspectionSpecialtyCode: 'SP-1',
  sourceProjectNo: 'PJ-1',
  sourceProjectName: '项目一',
  name: '抗压检测',
  isOptionalForQualification: false,
  isOfficial: true,
  enabled: true,
  sortOrder: 1,
  ...STAMPS,
};
const PARAM: InspectionParameter = {
  code: 'P-1',
  name: '抗压强度',
  rawName: 'raw-p1',
  canonicalName: 'canonical-p1',
  aliases: ['alias-p1'],
  sourceType: 'official',
  sortOrder: 1,
  ...STAMPS,
};
const STD: InspectionStandard = {
  code: 'STD-1',
  name: '标准一',
  status: 'active',
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

function envelope<T>(items: T[]): {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
} {
  return {items, page: 0, pageSize: 20, total: items.length};
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
  return {session, service: createInspectionDictionaryService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M06.F01.I01'], '专项列表：keyword 过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/inspection/specialties')
      ? {status: 200, body: envelope([SPEC])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.specialties.list({page: 1, pageSize: 10, keyword: '混凝'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.code).toBe('SP-1');
  expect(result.total).toBe(1);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/specialties?page=1&pageSize=10&keyword=%E6%B7%B7%E5%87%9D',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(
  ['M06.F01.I02'],
  '创建专项：code/officialNo/name 必填 fail-fast + POST 载荷',
  async () => {
    stubFetch(() => ({status: 200, body: SPEC}));
    const {service} = booted();

    const result = await service.specialties.create({
      code: 'SP-2',
      officialNo: 'OFF-2',
      name: '钢筋专项',
    });
    expect(result.code).toBe('SP-1');
    expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/inspection/specialties');
    expect(lastBody()).toEqual({code: 'SP-2', officialNo: 'OFF-2', name: '钢筋专项'});

    await expect(
      service.specialties.create({code: 'SP-3', officialNo: '', name: ''}),
    ).rejects.toThrow(/缺失.*ADR-0019/);
    expect(calls).toHaveLength(1);
  },
);

fnTest(['M06.F01.I03'], '更新专项：PUT PATCH 语义未传字段保留 + 空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/inspection/specialties/SP-1')
      ? {status: 200, body: SPEC}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.specialties.update('SP-1', {name: '改名'});
  expect(result.code).toBe('SP-1');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/inspection/specialties/SP-1');
  expect(lastBody()).toEqual({name: '改名'});

  await expect(service.specialties.update('SP-1', {})).rejects.toThrow(/空/);
});

fnTest(['M06.F02.I01'], '项目列表：专项过滤+keyword，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/inspection/objects?')
      ? {status: 200, body: envelope([OBJ])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.objects.list({
    inspectionSpecialtyCode: 'SP-1',
    keyword: '抗压',
  });
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.code).toBe('OBJ-1');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/objects?inspectionSpecialtyCode=SP-1&keyword=%E6%8A%97%E5%8E%8B',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F02.I02'], '项目↔专项/参数关联按钮：两向 link 依次 204', async () => {
  stubFetch(() => ({status: 204}));
  const {service} = booted();

  await service.objects.linkSpecialtyObject({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
  });
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/links/specialty-object',
  );
  expect(lastBody()).toEqual({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
  });

  await service.objects.linkObjectParameter({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
    qualificationLevel: 'QUALIFIED',
  });
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/links/object-parameter',
  );
  expect(lastBody()).toEqual({
    inspectionObjectCode: 'OBJ-1',
    inspectionParameterCode: 'P-1',
    qualificationLevel: 'QUALIFIED',
  });
});

fnTest(['M06.F02.I03'], '更新项目：PUT PATCH 语义 + 空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/inspection/objects/OBJ-1')
      ? {status: 200, body: OBJ}
      : {status: 404},
  );
  const {service} = booted();

  await service.objects.update('OBJ-1', {name: '改名项目'});
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/inspection/objects/OBJ-1');
  expect(lastBody()).toEqual({name: '改名项目'});
  await expect(service.objects.update('OBJ-1', {})).rejects.toThrow(/空/);
});

fnTest(['M06.F02.I04'], '删除项目：204，不存在 404 归一抛错', async () => {
  stubFetch(url =>
    url.endsWith('/api/inspection/objects/OBJ-1')
      ? {status: 204}
      : {status: 404, body: {code: 'NOT_FOUND', message: '无此项目'}},
  );
  const {service} = booted();

  await service.objects.remove('OBJ-1');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/inspection/objects/OBJ-1');
  await expect(service.objects.remove('OBJ-X')).rejects.toThrow(/无此|404/);
});

fnTest(['M06.F02.I05'], '专项↔项目 link：POST 204', async () => {
  stubFetch(() => ({status: 204}));
  const {service} = booted();

  await service.objects.linkSpecialtyObject({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
    remark: '关联一',
  });
  expect(lastBody()).toEqual({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
    remark: '关联一',
  });
});

fnTest(['M06.F02.I06'], '专项↔项目 unlink：DELETE body 204', async () => {
  stubFetch(() => ({status: 204}));
  const {service} = booted();

  await service.objects.unlinkSpecialtyObject({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
  });
  expect(lastBody()).toEqual({
    inspectionSpecialtyCode: 'SP-1',
    inspectionObjectCode: 'OBJ-1',
  });
});

fnTest(
  ['M06.F02.I07'],
  '项目↔参数 link：qualificationLevel 必填默认 QUALIFIED 语义',
  async () => {
    stubFetch(() => ({status: 204}));
    const {service} = booted();

    await service.objects.linkObjectParameter({
      inspectionObjectCode: 'OBJ-1',
      inspectionParameterCode: 'P-1',
      qualificationLevel: 'QUALIFIED',
      sourcePage: 3,
    });
    expect(lastBody()).toEqual({
      inspectionObjectCode: 'OBJ-1',
      inspectionParameterCode: 'P-1',
      qualificationLevel: 'QUALIFIED',
      sourcePage: 3,
    });
  },
);

fnTest(['M06.F03.I01'], '参数列表：keyword+sourceType 过滤，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/inspection/parameters?')
      ? {status: 200, body: envelope([PARAM])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.parameters.list({keyword: '抗压', sourceType: 'official'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.code).toBe('P-1');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/parameters?keyword=%E6%8A%97%E5%8E%8B&sourceType=official',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F03.I02'], '参数↔标准关联按钮：linkStandardParameter 204', async () => {
  stubFetch(() => ({status: 204}));
  const {service} = booted();

  await service.parameters.linkStandardParameter({
    inspectionStandardCode: 'STD-1',
    inspectionParameterCode: 'P-1',
  });
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/links/standard-parameter',
  );
  expect(lastBody()).toEqual({
    inspectionStandardCode: 'STD-1',
    inspectionParameterCode: 'P-1',
  });
});

fnTest(
  ['M06.F03.I03'],
  '更新参数：PATCH 语义 + aliases 传则整体替换 + 空载荷禁发',
  async () => {
    stubFetch(url =>
      url.endsWith('/api/inspection/parameters/P-1')
        ? {status: 200, body: PARAM}
        : {status: 404},
    );
    const {service} = booted();

    await service.parameters.update('P-1', {aliases: ['a1', 'a2'], unit: 'MPa'});
    expect(lastBody()).toEqual({aliases: ['a1', 'a2'], unit: 'MPa'});
    await expect(service.parameters.update('P-1', {})).rejects.toThrow(/空/);
  },
);

fnTest(['M06.F04.I01'], '标准列表：keyword+status 过滤，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/inspection/standards?')
      ? {status: 200, body: envelope([STD])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.standards.list({keyword: '标准', status: 'active'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.status).toBe('active');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/inspection/standards?keyword=%E6%A0%87%E5%87%86&status=active',
  );
});

fnTest(['M06.F04.I02'], '标准 CRUD 按钮：create code/name 必填 + 载荷', async () => {
  stubFetch(() => ({status: 200, body: STD}));
  const {service} = booted();

  const result = await service.standards.create({code: 'STD-2', name: '标准二'});
  expect(result.code).toBe('STD-1');
  expect(lastBody()).toEqual({code: 'STD-2', name: '标准二'});
  await expect(service.standards.create({code: ' ', name: ''})).rejects.toThrow(
    /缺失.*ADR-0019/,
  );
  expect(calls).toHaveLength(1);
});

fnTest(['M06.F04.I03'], '更新标准：PUT PATCH 语义 + 空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/inspection/standards/STD-1')
      ? {status: 200, body: STD}
      : {status: 404},
  );
  const {service} = booted();

  await service.standards.update('STD-1', {status: 'superseded'});
  expect(lastBody()).toEqual({status: 'superseded'});
  await expect(service.standards.update('STD-1', {})).rejects.toThrow(/空/);
});

fnTest(['M06.F04.I04'], '删除标准：204，不存在 404 归一抛错', async () => {
  stubFetch(url =>
    url.endsWith('/api/inspection/standards/STD-1')
      ? {status: 204}
      : {status: 404, body: {code: 'NOT_FOUND', message: '无此标准'}},
  );
  const {service} = booted();

  await service.standards.remove('STD-1');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/inspection/standards/STD-1');
  await expect(service.standards.remove('STD-X')).rejects.toThrow(/无此|404/);
});

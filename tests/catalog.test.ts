/**
 * 码表四页消费面（REQ-2026-037 L-T3 / M04.F06-F09 十六 op）。
 *
 * fetch stub（contract.test.ts 同构）：断言四域 list/create/update/remove 的
 * URL/方法/载荷/鉴权头。update 是 PUT（body 全可选）；delete 204；list 按
 * op 级 @doc 回显全量不切片（{items,page,pageSize,total}）。
 */
import {fnTest} from './fn';

import {createCatalogService} from '../src/features/catalog/catalog-service';
import {
  assembleEntryCreateBody,
  buildEntryRows,
} from '../src/features/catalog/catalog-view';
import {createSession} from '../src/session/session';
import type {
  InspectionBrand,
  InspectionGrade,
  InspectionModel,
  InspectionSpec,
} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const STAMPS = {createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z'};

const MODEL: InspectionModel = {
  code: 'M-1',
  tenantId: 't-acme',
  inspectionObjectCode: 'OBJ-1',
  name: '型号一',
  remark: '备注一',
  sortOrder: 1,
  ...STAMPS,
};
const SPEC: InspectionSpec = {
  code: 'S-1',
  tenantId: 't-acme',
  inspectionObjectCode: 'OBJ-1',
  name: '规格一',
  sortOrder: 2,
  ...STAMPS,
};
const GRADE: InspectionGrade = {
  code: 'G-1',
  tenantId: 't-acme',
  inspectionObjectCode: 'OBJ-1',
  name: '等级一',
  sortOrder: 3,
  ...STAMPS,
};
const BRAND: InspectionBrand = {
  code: 'B-1',
  tenantId: 't-acme',
  inspectionObjectCode: 'OBJ-1',
  name: '牌号一',
  sortOrder: 4,
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
  return {session, service: createCatalogService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M04.F06.I01'], '型号列表：按检测专项过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/catalog/models')
      ? {status: 200, body: envelope([MODEL])}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  const result = await service.models.list({
    inspectionObjectCode: 'OBJ-1',
    keyword: 'M1',
  });

  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(1);
  expect(buildEntryRows(result.items)).toEqual([
    {
      code: 'M-1',
      name: '型号一',
      inspectionObjectCode: 'OBJ-1',
      remark: '备注一',
      sortOrder: 1,
    },
  ]);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/catalog/models?inspectionObjectCode=OBJ-1&keyword=M1',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M04.F06.I02'], '创建型号：code/name 必填 fail-fast + POST 200', async () => {
  expect(() => assembleEntryCreateBody({code: 'M-2', name: ''})).toThrow(/name/);

  stubFetch(() => ({status: 200, body: MODEL}));
  const {service} = booted();

  const created = await service.models.create({
    code: 'M-1',
    name: '型号一',
    inspectionObjectCode: 'OBJ-1',
    sortOrder: 1,
  });
  expect(created.code).toBe('M-1');
  const last = calls.at(-1);
  expect(last?.init?.method).toBe('POST');
  expect(JSON.parse(String(last?.init?.body))).toEqual({
    code: 'M-1',
    name: '型号一',
    inspectionObjectCode: 'OBJ-1',
    sortOrder: 1,
  });
});
fnTest(['M04.F06.I03'], '更新型号：PUT 语义按路径 code，空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/models/M-1')
      ? {status: 200, body: {...MODEL, name: '型号一改'}}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  await expect(service.models.update('M-1', {})).rejects.toThrow(/载荷/);

  const updated = await service.models.update('M-1', {name: '型号一改'});
  expect(updated.name).toBe('型号一改');
  const last = calls.at(-1);
  expect(last?.init?.method).toBe('PUT');
  expect(last?.url).toBe('http://127.0.0.1:5204/api/catalog/models/M-1');
  expect(JSON.parse(String(last?.init?.body))).toEqual({name: '型号一改'});
  await expect(service.models.update('M-X', {name: 'x'})).rejects.toThrow(/无此条目/);
});

fnTest(['M04.F06.I04'], '删除型号：204→undefined，非 204 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/models/M-1')
      ? {status: 204}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  expect(await service.models.remove('M-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.models.remove('M-X')).rejects.toThrow(/无此条目/);
});
fnTest(['M04.F07.I01'], '规格列表：过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/catalog/specs')
      ? {status: 200, body: envelope([SPEC])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.specs.list({inspectionObjectCode: 'OBJ-1'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0].name).toBe('规格一');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/catalog/specs?inspectionObjectCode=OBJ-1',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M04.F07.I02'], '创建规格：必填 fail-fast + POST 200', async () => {
  expect(() => assembleEntryCreateBody({code: '', name: '规格二'})).toThrow(/code/);

  stubFetch(() => ({status: 200, body: SPEC}));
  const {service} = booted();

  const created = await service.specs.create({code: 'S-1', name: '规格一', sortOrder: 2});
  expect(created.code).toBe('S-1');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/catalog/specs');
});

fnTest(['M04.F07.I03'], '更新规格：PUT 按路径 code', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/specs/S-1')
      ? {status: 200, body: {...SPEC, name: '规格一改'}}
      : {status: 404},
  );
  const {service} = booted();

  const updated = await service.specs.update('S-1', {name: '规格一改', remark: '改注'});
  expect(updated.name).toBe('规格一改');
  expect(calls.at(-1)?.init?.method).toBe('PUT');
  expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({
    name: '规格一改',
    remark: '改注',
  });
});

fnTest(['M04.F07.I04'], '删除规格：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/specs/S-1')
      ? {status: 204}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  expect(await service.specs.remove('S-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.specs.remove('S-X')).rejects.toThrow(/无此条目/);
});

/* __GRADES__ */
fnTest(['M04.F08.I01'], '等级列表：过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/catalog/grades')
      ? {status: 200, body: envelope([GRADE])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.grades.list({keyword: 'G1'});
  expect(result.items).toHaveLength(1);
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/catalog/grades?keyword=G1');
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M04.F08.I02'], '创建等级：POST 200，载荷逐字段', async () => {
  stubFetch(() => ({status: 200, body: GRADE}));
  const {service} = booted();

  const created = await service.grades.create({
    code: 'G-1',
    name: '等级一',
    inspectionObjectCode: 'OBJ-1',
    remark: '备注一',
  });
  expect(created.code).toBe('G-1');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(JSON.parse(String(calls.at(-1)?.init?.body)).inspectionObjectCode).toBe('OBJ-1');
});

fnTest(['M04.F08.I03'], '更新等级：PUT 按路径 code，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/grades/G-1')
      ? {status: 200, body: {...GRADE, sortOrder: 9}}
      : {status: 404},
  );
  const {service} = booted();

  const updated = await service.grades.update('G-1', {sortOrder: 9});
  expect(updated.sortOrder).toBe(9);
  expect(calls.at(-1)?.init?.method).toBe('PUT');
  await expect(service.grades.update('G-X', {sortOrder: 1})).rejects.toThrow(/HTTP 404/);
});

fnTest(['M04.F08.I04'], '删除等级：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/grades/G-1')
      ? {status: 204}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  expect(await service.grades.remove('G-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.grades.remove('G-X')).rejects.toThrow(/无此条目/);
});

fnTest(['M04.F09.I01'], '牌号列表：过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/catalog/brands')
      ? {status: 200, body: envelope([BRAND])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.brands.list({inspectionObjectCode: 'OBJ-1'});
  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(1);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/catalog/brands?inspectionObjectCode=OBJ-1',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M04.F09.I02'], '创建牌号：必填 fail-fast + POST 200', async () => {
  expect(() =>
    assembleEntryCreateBody({code: 'B-2', name: '  ', inspectionObjectCode: 'OBJ-1'}),
  ).toThrow(/name/);

  stubFetch(() => ({status: 200, body: BRAND}));
  const {service} = booted();

  const created = await service.brands.create({
    code: 'B-1',
    name: '牌号一',
    sortOrder: 4,
  });
  expect(created.code).toBe('B-1');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/catalog/brands');
});

fnTest(['M04.F09.I03'], '更新牌号：PUT 按路径 code，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/brands/B-1')
      ? {status: 200, body: {...BRAND, name: '牌号一改'}}
      : {status: 404},
  );
  const {service} = booted();

  const updated = await service.brands.update('B-1', {name: '牌号一改'});
  expect(updated.name).toBe('牌号一改');
  expect(calls.at(-1)?.init?.method).toBe('PUT');
  expect(lastBody()).toEqual({name: '牌号一改'});
  await expect(service.brands.update('B-X', {name: 'x'})).rejects.toThrow(/HTTP 404/);
});

fnTest(['M04.F09.I04'], '删除牌号：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/catalog/brands/B-1')
      ? {status: 204}
      : {status: 404, body: {code: 'CATALOG_ENTRY_NOT_FOUND', message: '无此条目'}},
  );
  const {service} = booted();

  expect(await service.brands.remove('B-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.brands.remove('B-X')).rejects.toThrow(/无此条目/);
});

/**
 * 数据录入·样品消费面（REQ-2026-037 L-T4 / M03.F03.I01-I05 + M03.F01.I07 ext 补录）。
 *
 * fetch stub 同构：样品五 op（list/get/create/update/remove）+ ext 补录
 * （PUT /api/samples/{id}/ext，按类别 extFields 补录持久化）。
 */
import {fnTest} from './fn';

import {createSampleService} from '../src/features/samples/sample-service';
import {assembleCreateSampleBody} from '../src/features/samples/sample-view';
import {createSession} from '../src/session/session';
import type {Sample} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const SAMPLE: Sample = {
  id: 's-1',
  tenantId: 't-acme',
  receiptId: 'r-1',
  sampleCode: 'S-2026-001',
  sampleName: 'C30 混凝土试块',
  ext: {},
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
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
  return {session, service: createSampleService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M03.F03.I01'], '样品列表：receiptId/keyword 过滤，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/samples?')
      ? {status: 200, body: envelope([SAMPLE])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.listSamples({receiptId: 'r-1', keyword: 'S-2026'});
  expect(result.items).toHaveLength(1);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/samples?receiptId=r-1&keyword=S-2026',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M03.F03.I02'], '样品详情：按 id 调取，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/samples/s-1')
      ? {status: 200, body: SAMPLE}
      : {status: 404, body: {code: 'SAMPLE_NOT_FOUND', message: '无此样品'}},
  );
  const {service} = booted();

  const detail = await service.getSample('s-1');
  expect(detail.sampleCode).toBe('S-2026-001');
  await expect(service.getSample('s-x')).rejects.toThrow(/无此样品/);
});

fnTest(
  ['M03.F03.I03'],
  '创建样品：receiptId/sampleCode 必填 fail-fast + POST',
  async () => {
    expect(() => assembleCreateSampleBody({receiptId: 'r-1', sampleCode: '  '})).toThrow(
      /sampleCode/,
    );

    stubFetch(() => ({status: 200, body: SAMPLE}));
    const {service} = booted();

    const created = await service.createSample({
      receiptId: 'r-1',
      sampleCode: 'S-2026-001',
      sampleName: 'C30 混凝土试块',
    });
    expect(created.id).toBe('s-1');
    expect(calls.at(-1)?.init?.method).toBe('POST');
    expect(lastBody()).toMatchObject({receiptId: 'r-1', sampleCode: 'S-2026-001'});
  },
);

fnTest(['M03.F03.I04'], '更新样品：PUT PATCH 语义，空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/samples/s-1')
      ? {status: 200, body: {...SAMPLE, manufacturer: '建材厂'}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.updateSample('s-1', {})).rejects.toThrow(/载荷/);

  const updated = await service.updateSample('s-1', {manufacturer: '建材厂'});
  expect(updated.manufacturer).toBe('建材厂');
  expect(lastBody()).toEqual({manufacturer: '建材厂'});
});

fnTest(['M03.F03.I05'], '删除样品：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/samples/s-1')
      ? {status: 204}
      : {status: 404, body: {code: 'SAMPLE_NOT_FOUND', message: '无此样品'}},
  );
  const {service} = booted();

  expect(await service.removeSample('s-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.removeSample('s-x')).rejects.toThrow(/无此样品/);
});

fnTest(['M03.F01.I07'], 'ext 字段补录：PUT /samples/{id}/ext，空 ext 禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/samples/s-1/ext')
      ? {status: 200, body: {...SAMPLE, ext: {designStrength: 'C30'}}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.updateSampleExt('s-1', {})).rejects.toThrow(/ext/);

  const updated = await service.updateSampleExt('s-1', {designStrength: 'C30'});
  expect(updated.ext.designStrength).toBe('C30');
  expect(calls.at(-1)?.init?.method).toBe('PUT');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/samples/s-1/ext');
  expect(lastBody()).toEqual({ext: {designStrength: 'C30'}});
});

/**
 * 数据录入·检测记录消费面（REQ-2026-037 L-T4 / M03.F03.I06-I12 + I15 三态过滤）。
 *
 * fetch stub 同构：检测记录六 op（list/get/create/update/remove/setVerdict
 * PATCH 改判）+ data-entry act（operator 会话注入）+ 三态过滤器纯函数。
 */
import {fnTest} from './fn';

import {createTestRecordService} from '../src/features/test-records/test-record-service';
import {
  assembleCreateTestRecordBody,
  flowStatusForFilter,
} from '../src/features/test-records/test-record-view';
import {createSession} from '../src/session/session';
import type {TestRecord} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const RECORD: TestRecord = {
  id: 'tr-1',
  tenantId: 't-acme',
  sampleId: 's-1',
  parameterCode: 'P-001',
  requirement: '≥30MPa',
  result: '32.5MPa',
  verdict: 'pass',
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
  return {session, service: createTestRecordService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M03.F03.I06'], '检测记录列表：sampleId 过滤，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/test-records?')
      ? {status: 200, body: envelope([RECORD])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.listTestRecords({sampleId: 's-1'});
  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(1);
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/test-records?sampleId=s-1');
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M03.F03.I07'], '检测记录详情：按 id 调取，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/test-records/tr-1')
      ? {status: 200, body: RECORD}
      : {status: 404, body: {code: 'TEST_RECORD_NOT_FOUND', message: '无此检测记录'}},
  );
  const {service} = booted();

  const detail = await service.getTestRecord('tr-1');
  expect(detail.result).toBe('32.5MPa');
  await expect(service.getTestRecord('tr-x')).rejects.toThrow(/无此检测记录/);
});

fnTest(['M03.F03.I08'], '创建检测记录：四必填 fail-fast + POST 200', async () => {
  expect(() =>
    assembleCreateTestRecordBody({
      sampleId: 's-1',
      parameterCode: 'P-001',
      requirement: '≥30MPa',
      result: '',
    }),
  ).toThrow(/result/);

  stubFetch(() => ({status: 200, body: RECORD}));
  const {service} = booted();

  const created = await service.createTestRecord({
    sampleId: 's-1',
    parameterCode: 'P-001',
    requirement: '≥30MPa',
    result: '32.5MPa',
  });
  expect(created.id).toBe('tr-1');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(lastBody()).toMatchObject({sampleId: 's-1', parameterCode: 'P-001'});
});

fnTest(['M03.F03.I09'], '更新检测记录：PUT PATCH 语义，空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/test-records/tr-1')
      ? {status: 200, body: {...RECORD, result: '33.1MPa'}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.updateTestRecord('tr-1', {})).rejects.toThrow(/载荷/);

  const updated = await service.updateTestRecord('tr-1', {result: '33.1MPa'});
  expect(updated.result).toBe('33.1MPa');
  expect(lastBody()).toEqual({result: '33.1MPa'});
});

fnTest(['M03.F03.I10'], '删除检测记录：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/test-records/tr-1')
      ? {status: 204}
      : {status: 404, body: {code: 'TEST_RECORD_NOT_FOUND', message: '无此检测记录'}},
  );
  const {service} = booted();

  expect(await service.removeTestRecord('tr-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.removeTestRecord('tr-x')).rejects.toThrow(/无此检测记录/);
});

fnTest(['M03.F03.I11'], '检测记录改判：PATCH verdict，空判值禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/test-records/tr-1/verdict')
      ? {status: 200, body: {...RECORD, verdict: 'fail'}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.setVerdict('tr-1', '')).rejects.toThrow(/verdict/);

  const changed = await service.setVerdict('tr-1', 'fail');
  expect(changed.verdict).toBe('fail');
  expect(calls.at(-1)?.init?.method).toBe('PATCH');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/test-records/tr-1/verdict');
  expect(lastBody()).toEqual({verdict: 'fail'});
});

fnTest(['M03.F03.I12'], '数据录入-提交：data-entry act，operator 会话注入', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/data-entry/act')
      ? {status: 200, body: [{id: 'r-1', ok: true, flowStatus: 'review'}]}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.actDataEntry({ids: ['r-1'], action: 'submit'});
  expect(result[0].flowStatus).toBe('review');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/data-entry/act');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
});

fnTest(['M03.F03.I15'], '数据录入三态过滤器：当前阶段/已提交/全部', () => {
  expect(flowStatusForFilter('data_entry', 'pending')).toBe('data_entry');
  expect(flowStatusForFilter('data_entry', 'submitted')).toBe('review');
  expect(flowStatusForFilter('data_entry', 'all')).toBeUndefined();
});

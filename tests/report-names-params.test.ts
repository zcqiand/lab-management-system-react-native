/**
 * 报告名称+参数界面消费面（REQ-2026-037 L-T7 / M06.F07-F08 十四 op）。
 *
 * fetch stub（catalog.test.ts 同构）：报告名称 CRUD + 三向 link（object/
 * standard/parameter）+ 参数界面 CRUD + 参数↔界面 link。link 204；delete 204/404。
 */
import {fnTest} from './fn';

import {
  createParamInterfaceService,
  createReportNameService,
} from '../src/features/inspection/admin-service';
import {createSession} from '../src/session/session';
import type {InspectionReportName, ParamInterface} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const STAMPS = {createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z'};

const RN: InspectionReportName = {
  code: 'RN-1',
  name: '抗压报告',
  sortOrder: 1,
  ...STAMPS,
};
const PI: ParamInterface = {
  code: 'PI-1',
  componentPath: 'params/PiDetail',
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
  return {
    session,
    reportNames: createReportNameService({session}),
    paramInterfaces: createParamInterfaceService({session}),
  };
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M06.F07.I01'], '报告名称列表：keyword 过滤+鉴权头，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/report-names?')
      ? {status: 200, body: envelope([RN])}
      : {status: 404},
  );
  const {reportNames} = booted();

  const result = await reportNames.list({keyword: '抗压'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.code).toBe('RN-1');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/report-names?keyword=%E6%8A%97%E5%8E%8B',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F07.I02'], '报告名称↔标准/参数关联按钮：role 必填语义', async () => {
  stubFetch(() => ({status: 204}));
  const {reportNames} = booted();

  await reportNames.linkStandard({
    reportNameCode: 'RN-1',
    inspectionStandardCode: 'STD-1',
    role: 'TESTING',
  });
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/report-names/links/standard');
  expect(lastBody()).toEqual({
    reportNameCode: 'RN-1',
    inspectionStandardCode: 'STD-1',
    role: 'TESTING',
  });
});

fnTest(['M06.F07.I03'], '创建报告名称：code/name 必填 + extFields 模板载荷', async () => {
  stubFetch(() => ({status: 200, body: RN}));
  const {reportNames} = booted();

  await reportNames.create({
    code: 'RN-2',
    name: '钢筋报告',
    extFields: [{key: 'grade', label: '牌号', type: 'text'}],
  });
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/report-names');
  expect(lastBody()).toEqual({
    code: 'RN-2',
    name: '钢筋报告',
    extFields: [{key: 'grade', label: '牌号', type: 'text'}],
  });
  await expect(reportNames.create({code: '', name: ''})).rejects.toThrow(
    /缺失.*ADR-0019/,
  );
});

fnTest(['M06.F07.I04'], '更新报告名称：PUT PATCH 语义 + 空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/report-names/RN-1') ? {status: 200, body: RN} : {status: 404},
  );
  const {reportNames} = booted();

  await reportNames.update('RN-1', {summaryName: '抗压汇总'});
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/report-names/RN-1');
  expect(lastBody()).toEqual({summaryName: '抗压汇总'});
  await expect(reportNames.update('RN-1', {})).rejects.toThrow(/空/);
});

fnTest(['M06.F07.I05'], '删除报告名称：204，不存在 404 归一抛错', async () => {
  stubFetch(url =>
    url.endsWith('/api/report-names/RN-1')
      ? {status: 204}
      : {status: 404, body: {code: 'NOT_FOUND', message: '无此报告名称'}},
  );
  const {reportNames} = booted();

  await reportNames.remove('RN-1');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/report-names/RN-1');
  await expect(reportNames.remove('RN-X')).rejects.toThrow(/无此|404/);
});

fnTest(['M06.F07.I06'], '项目↔报告名称 link：POST 204', async () => {
  stubFetch(() => ({status: 204}));
  const {reportNames} = booted();

  await reportNames.linkObject({inspectionObjectCode: 'OBJ-1', reportNameCode: 'RN-1'});
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/report-names/links/object');
  expect(lastBody()).toEqual({inspectionObjectCode: 'OBJ-1', reportNameCode: 'RN-1'});
});

fnTest(['M06.F07.I07'], '报告名称↔标准 link：role 必填载荷', async () => {
  stubFetch(() => ({status: 204}));
  const {reportNames} = booted();

  await reportNames.linkStandard({
    reportNameCode: 'RN-1',
    inspectionStandardCode: 'STD-1',
    role: 'JUDGMENT',
  });
  expect(lastBody()).toEqual({
    reportNameCode: 'RN-1',
    inspectionStandardCode: 'STD-1',
    role: 'JUDGMENT',
  });
});

fnTest(['M06.F07.I08'], '报告名称↔参数 link：POST 204', async () => {
  stubFetch(() => ({status: 204}));
  const {reportNames} = booted();

  await reportNames.linkParameter({
    reportNameCode: 'RN-1',
    inspectionParameterCode: 'P-1',
  });
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/report-names/links/parameter',
  );
  expect(lastBody()).toEqual({reportNameCode: 'RN-1', inspectionParameterCode: 'P-1'});
});

fnTest(['M06.F08.I01'], '参数界面列表：keyword 过滤+鉴权头，回显全量', async () => {
  stubFetch(url =>
    url.includes('/api/param-interfaces?')
      ? {status: 200, body: envelope([PI])}
      : {status: 404},
  );
  const {paramInterfaces} = booted();

  const result = await paramInterfaces.list({keyword: '界面'});
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.code).toBe('PI-1');
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/param-interfaces?keyword=%E7%95%8C%E9%9D%A2',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M06.F08.I02'], '参数界面详情：code 取单条（config 反序列化）', async () => {
  stubFetch(url =>
    url.endsWith('/api/param-interfaces/PI-1') ? {status: 200, body: PI} : {status: 404},
  );
  const {paramInterfaces} = booted();

  const result = await paramInterfaces.get('PI-1');
  expect(result.componentPath).toBe('params/PiDetail');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/param-interfaces/PI-1');
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(
  ['M06.F08.I03'],
  '创建参数界面：code/componentPath 必填 + config 默认 {} 语义',
  async () => {
    stubFetch(() => ({status: 200, body: PI}));
    const {paramInterfaces} = booted();

    await paramInterfaces.create({code: 'PI-2', componentPath: 'params/PiForm'});
    expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/param-interfaces');
    expect(lastBody()).toEqual({code: 'PI-2', componentPath: 'params/PiForm'});
    await expect(paramInterfaces.create({code: '', componentPath: ''})).rejects.toThrow(
      /缺失.*ADR-0019/,
    );
  },
);

fnTest(['M06.F08.I04'], '更新参数界面：PUT PATCH 语义 + 空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/param-interfaces/PI-1') ? {status: 200, body: PI} : {status: 404},
  );
  const {paramInterfaces} = booted();

  await paramInterfaces.update('PI-1', {componentPath: 'params/PiEdit'});
  expect(lastBody()).toEqual({componentPath: 'params/PiEdit'});
  await expect(paramInterfaces.update('PI-1', {})).rejects.toThrow(/空/);
});

fnTest(['M06.F08.I05'], '删除参数界面：204，不存在 404 归一抛错', async () => {
  stubFetch(url =>
    url.endsWith('/api/param-interfaces/PI-1')
      ? {status: 204}
      : {status: 404, body: {code: 'NOT_FOUND', message: '无此参数界面'}},
  );
  const {paramInterfaces} = booted();

  await paramInterfaces.remove('PI-1');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/param-interfaces/PI-1');
  await expect(paramInterfaces.remove('PI-X')).rejects.toThrow(/无此|404/);
});

fnTest(['M06.F08.I06'], '参数↔界面 link：POST 204（config 走 jsonb 直传）', async () => {
  stubFetch(() => ({status: 204}));
  const {paramInterfaces} = booted();

  await paramInterfaces.link({
    inspectionParameterCode: 'P-1',
    paramInterfaceCode: 'PI-1',
  });
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/param-interfaces/links');
  expect(lastBody()).toEqual({
    inspectionParameterCode: 'P-1',
    paramInterfaceCode: 'PI-1',
  });
});

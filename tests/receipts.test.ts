/**
 * 接样流消费面（REQ-2026-037 L-T4 / M03.F01 接样管理 + M03.F02 任务分配）。
 *
 * fetch stub（contract.test.ts 同构）：断言 receipts 六 op + receiving/assigning
 * act（body.action 三动作，operator 由 session 注入）+ task 分配 + 三态过滤器。
 * list 按 op 级 @doc 回显全量不切片；update PUT PATCH 语义；delete 204。
 */
import {fnTest} from './fn';

import {createReceiptService} from '../src/features/receipts/receipt-service';
import {
  assembleCreateReceiptBody,
  flowStatusForFilter,
} from '../src/features/receipts/receipt-view';
import {createSession} from '../src/session/session';
import type {
  FlowActionResult,
  FlowHistoryEntry,
  SampleReceipt,
} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const RECEIPT: SampleReceipt = {
  id: 'r-1',
  tenantId: 't-acme',
  contractId: 'c-1',
  commissionCode: 'WT-2026-001',
  commissionDate: '2026-11-01',
  categoryCode: 'CAT-1',
  receivedBy: 'alice',
  sampleSource: '施工现场',
  testCategory: '常规检测',
  flowStatus: 'receiving',
  flowHistory: [],
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

const HISTORY: FlowHistoryEntry[] = [
  {
    action: 'submit',
    from: 'receiving',
    to: 'task_assignment',
    operator: 'alice',
    at: '2026-11-01T01:00:00Z',
  },
];

const ACTIONS: FlowActionResult[] = [
  {id: 'r-1', ok: true, message: '已提交', flowStatus: 'task_assignment'},
];

interface StubReply {
  status: number;
  body?: unknown;
}

const calls: Array<{url: string; init?: RequestInit}> = [];

function stubFetch(replies: (url: string, init?: RequestInit) => StubReply): void {
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
    const {status, body} = replies(url, init);
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
  return {session, service: createReceiptService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M03.F01.I01'], '接样单列表：过滤+鉴权头，回显全量信封', async () => {
  stubFetch(url =>
    url.includes('/api/receipts?')
      ? {status: 200, body: envelope([RECEIPT])}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.listReceipts({
    contractId: 'c-1',
    flowStatus: 'receiving',
    keyword: 'WT',
  });
  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(1);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/receipts?contractId=c-1&flowStatus=receiving&keyword=WT',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M03.F01.I02'], '接样单详情：按 id 调取，含 flow 历史', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/r-1')
      ? {status: 200, body: {...RECEIPT, flowHistory: HISTORY}}
      : {status: 404, body: {code: 'RECEIPT_NOT_FOUND', message: '无此接样单'}},
  );
  const {service} = booted();

  const detail = await service.getReceipt('r-1');
  expect(detail.commissionCode).toBe('WT-2026-001');
  expect(detail.flowHistory).toHaveLength(1);
  await expect(service.getReceipt('r-x')).rejects.toThrow(/无此接样单/);
});

fnTest(['M03.F01.I03'], '创建接样单：七必填 fail-fast + POST 200', async () => {
  expect(() =>
    assembleCreateReceiptBody({
      contractId: 'c-1',
      commissionCode: 'WT-2',
      commissionDate: '2026-11-01',
      categoryCode: 'CAT-1',
      receivedBy: 'alice',
      sampleSource: '',
      testCategory: '常规检测',
    }),
  ).toThrow(/sampleSource/);

  stubFetch(() => ({status: 200, body: RECEIPT}));
  const {service} = booted();

  const created = await service.createReceipt({
    contractId: 'c-1',
    commissionCode: 'WT-2026-001',
    commissionDate: '2026-11-01',
    categoryCode: 'CAT-1',
    receivedBy: 'alice',
    sampleSource: '施工现场',
    testCategory: '常规检测',
  });
  expect(created.id).toBe('r-1');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(lastBody()).toMatchObject({contractId: 'c-1', commissionCode: 'WT-2026-001'});
});
fnTest(['M03.F01.I04'], '更新接样单：PUT PATCH 语义部分载荷，空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/r-1')
      ? {status: 200, body: {...RECEIPT, projectName: '一号楼'}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.updateReceipt('r-1', {})).rejects.toThrow(/载荷/);

  const updated = await service.updateReceipt('r-1', {projectName: '一号楼'});
  expect(updated.projectName).toBe('一号楼');
  expect(lastBody()).toEqual({projectName: '一号楼'});
});

fnTest(['M03.F01.I05'], '删除接样单：204→undefined，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/r-1')
      ? {status: 204}
      : {status: 404, body: {code: 'RECEIPT_NOT_FOUND', message: '无此接样单'}},
  );
  const {service} = booted();

  expect(await service.removeReceipt('r-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.removeReceipt('r-x')).rejects.toThrow(/无此接样单/);
});

fnTest(['M03.F01.I06'], '流程历史：GET history 返回 FlowHistoryEntry[]', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/r-1/history')
      ? {status: 200, body: HISTORY}
      : {status: 404},
  );
  const {service} = booted();

  const history = await service.getReceiptHistory('r-1');
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    action: 'submit',
    from: 'receiving',
    to: 'task_assignment',
  });
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/r-1/history');
});

fnTest(
  ['M03.F01.I08'],
  '接样-提交：receiving act 三动作，operator 会话注入',
  async () => {
    stubFetch((url, init) => {
      const action = init?.body
        ? (JSON.parse(String(init.body)) as {action: string}).action
        : '';
      return url.endsWith('/api/receipts/receiving/act')
        ? action === 'return'
          ? {
              status: 422,
              body: {code: 'FLOW_ACTION_INVALID', message: '无前置阶段可退回'},
            }
          : {status: 200, body: ACTIONS}
        : {status: 404};
    });
    const {service} = booted();

    const result = await service.actReceiving({
      ids: ['r-1'],
      action: 'submit',
    });
    expect(result).toHaveLength(1);
    expect(result[0].flowStatus).toBe('task_assignment');
    expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});

    await expect(service.actReceiving({ids: ['r-1'], action: 'return'})).rejects.toThrow(
      /无前置阶段/,
    );
    await expect(service.actReceiving({ids: [], action: 'submit'})).rejects.toThrow(
      /ids/,
    );
  },
);

fnTest(['M03.F02.I01'], '任务分配：PUT task 设人/计划日期', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/r-1/task')
      ? {
          status: 200,
          body: {
            ...RECEIPT,
            assigneeId: 'u-2',
            assigneeName: 'Bob',
            plannedTestDate: '2026-11-05',
          },
        }
      : {status: 404},
  );
  const {service} = booted();

  const assigned = await service.assignTask('r-1', {
    assigneeId: 'u-2',
    assigneeName: 'Bob',
    plannedTestDate: '2026-11-05',
  });
  expect(assigned.assigneeName).toBe('Bob');
  expect(calls.at(-1)?.init?.method).toBe('PUT');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/r-1/task');
  expect(lastBody()).toEqual({
    assigneeId: 'u-2',
    assigneeName: 'Bob',
    plannedTestDate: '2026-11-05',
  });
});

fnTest(['M03.F02.I04'], '任务分配三态过滤器：当前阶段/已提交/全部', () => {
  expect(flowStatusForFilter('task_assignment', 'pending')).toBe('task_assignment');
  expect(flowStatusForFilter('task_assignment', 'submitted')).toBe('data_entry');
  expect(flowStatusForFilter('task_assignment', 'all')).toBeUndefined();
});

fnTest(['M03.F02.I05'], '任务分配-提交：assigning act，退回回到 receiving', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/assigning/act')
      ? {status: 200, body: [{id: 'r-1', ok: true, flowStatus: 'data_entry'}]}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.actAssigning({ids: ['r-1'], action: 'submit'});
  expect(result[0].flowStatus).toBe('data_entry');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/assigning/act');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
});

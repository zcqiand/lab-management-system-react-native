/**
 * 报告流消费面（REQ-2026-037 L-T5 / M03.F05-F09）。
 *
 * fetch stub（receipts.test.ts 同构）：四阶段 act（review/approve/issuance/archived，
 * body.action 三动作 + operator 会话注入）+ 各阶段查看详情共端点 + 三态过滤器
 * 全七段 + 详情聚合 + 报告预览派生。
 */
import {fnTest} from './fn';

import {createReportFlowService} from '../src/features/report-flow/report-flow-service';
import {
  buildReportPreview,
  flowStatusForFilter,
} from '../src/features/report-flow/report-flow-view';
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
  flowStatus: 'review',
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
  {id: 'r-1', ok: true, message: '已提交', flowStatus: 'approval'},
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

const lastBody = (): unknown => JSON.parse(String(calls.at(-1)?.init?.body));

const LOGIN = {
  token: 'tok-1',
  user: {id: 'u-1', username: 'alice', displayName: 'Alice', roleCode: 'admin'},
  tenants: [{tenantId: 't-acme', code: 'acme', name: 'Acme', roleIds: ['r-admin']}],
};

function booted() {
  const session = createSession();
  session.applyLogin(LOGIN);
  return {session, service: createReportFlowService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

function stageDetailTest(
  fnId: string,
  label: string,
  stage: SampleReceipt['flowStatus'],
): void {
  fnTest([fnId], label + '：查看详情共端点 GET /api/receipts/{id}', async () => {
    stubFetch(url =>
      url.endsWith('/api/receipts/r-1')
        ? {status: 200, body: {...RECEIPT, flowStatus: stage}}
        : {status: 404},
    );
    const {service} = booted();

    const detail = await service.getDetail('r-1');
    expect(detail.flowStatus).toBe(stage);
    await expect(service.getDetail('r-x')).rejects.toThrow(/详情失败/);
  });
}

stageDetailTest('M03.F05.I02', '报告审核', 'review');
stageDetailTest('M03.F06.I02', '报告批准', 'approval');
stageDetailTest('M03.F07.I02', '报告发放', 'issuance');
stageDetailTest('M03.F08.I02', '报告归档', 'archived');

fnTest(['M03.F05.I04'], '报告审核三态过滤器', () => {
  expect(flowStatusForFilter('review', 'pending')).toBe('review');
  expect(flowStatusForFilter('review', 'submitted')).toBe('approval');
  expect(flowStatusForFilter('review', 'all')).toBeUndefined();
});

fnTest(['M03.F06.I04'], '报告批准三态过滤器', () => {
  expect(flowStatusForFilter('approval', 'pending')).toBe('approval');
  expect(flowStatusForFilter('approval', 'submitted')).toBe('issuance');
  expect(flowStatusForFilter('approval', 'all')).toBeUndefined();
});

fnTest(['M03.F07.I04'], '报告发放三态过滤器', () => {
  expect(flowStatusForFilter('issuance', 'pending')).toBe('issuance');
  expect(flowStatusForFilter('issuance', 'submitted')).toBe('archived');
  expect(flowStatusForFilter('issuance', 'all')).toBeUndefined();
});

fnTest(['M03.F08.I04'], '报告归档三态过滤器', () => {
  expect(flowStatusForFilter('archived', 'pending')).toBe('archived');
  expect(flowStatusForFilter('archived', 'submitted')).toBe('completed');
  expect(flowStatusForFilter('archived', 'all')).toBeUndefined();
});

fnTest(['M03.F05.I07'], '报告审核-提交：review act，operator 会话注入', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/review/act')
      ? {status: 200, body: ACTIONS}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.actReview({ids: ['r-1'], action: 'submit'});
  expect(result).toHaveLength(1);
  expect(result[0].flowStatus).toBe('approval');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
  await expect(service.actReview({ids: [], action: 'submit'})).rejects.toThrow(/ids/);
});

fnTest(['M03.F06.I05'], '报告批准-提交：approve act，operator 会话注入', async () => {
  stubFetch((url, init) => {
    const action = init?.body
      ? (JSON.parse(String(init.body)) as {action: string}).action
      : '';
    return url.endsWith('/api/receipts/approve/act')
      ? action === 'return'
        ? {
            status: 422,
            body: {code: 'FLOW_ACTION_INVALID', message: '批准阶段退回被拒'},
          }
        : {status: 200, body: ACTIONS}
      : {status: 404};
  });
  const {service} = booted();

  const result = await service.actApprove({ids: ['r-1'], action: 'submit'});
  expect(result).toHaveLength(1);
  expect(result[0].flowStatus).toBe('approval');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
  await expect(
    service.actApprove({ids: ['r-1'], action: 'return', reason: '数据待补正'}),
  ).rejects.toThrow(/批准阶段退回被拒/);
});

fnTest(['M03.F07.I05'], '报告发放-提交：issuance act 生成报告编号', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/issuance/act')
      ? {status: 200, body: [{id: 'r-1', ok: true, flowStatus: 'archived'}]}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.actIssuance({ids: ['r-1'], action: 'submit'});
  expect(result[0].flowStatus).toBe('archived');
  expect(calls.at(-1)?.init?.method).toBe('POST');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/issuance/act');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
});

fnTest(['M03.F08.I05'], '报告归档-提交：archived act 收链', async () => {
  stubFetch(url =>
    url.endsWith('/api/receipts/archived/act')
      ? {status: 200, body: [{id: 'r-1', ok: true, flowStatus: 'completed'}]}
      : {status: 404},
  );
  const {service} = booted();

  const result = await service.actArchived({ids: ['r-1'], action: 'submit'});
  expect(result[0].flowStatus).toBe('completed');
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/receipts/archived/act');
  expect(lastBody()).toEqual({ids: ['r-1'], action: 'submit', operator: 'Alice'});
});

fnTest(['M03.F09.I01'], '接样单详情聚合：详情+流程历史', async () => {
  stubFetch(url => {
    if (url.endsWith('/api/receipts/r-1/history')) {
      return {status: 200, body: HISTORY};
    }
    return url.endsWith('/api/receipts/r-1')
      ? {status: 200, body: RECEIPT}
      : {status: 404};
  });
  const {service} = booted();

  const agg = await service.getDetailAggregate('r-1');
  expect(agg.receipt.commissionCode).toBe('WT-2026-001');
  expect(agg.history).toHaveLength(1);
  expect(agg.history[0]).toMatchObject({action: 'submit'});
});

fnTest(['M03.F09.I03'], '报告预览：categoryCode 定位模板，reportCode 可空', () => {
  expect(buildReportPreview(RECEIPT)).toEqual({
    templateCode: 'CAT-1',
    reportCode: undefined,
  });
  expect(buildReportPreview({...RECEIPT, reportCode: 'BG-2026-001'})).toEqual({
    templateCode: 'CAT-1',
    reportCode: 'BG-2026-001',
  });
  expect(() => buildReportPreview({...RECEIPT, categoryCode: ''})).toThrow(
    /categoryCode/,
  );
});

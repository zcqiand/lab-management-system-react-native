/**
 * 汇总消费面（REQ-2026-037 L-T6 / M05.F01）。
 *
 * fetch stub（report-flow.test.ts 同构）：汇总表查询参数直传 + 仪表盘统计
 * 消费 + 四基数卡/核心指标卡/任务漏斗/汇总表派生。
 */
import {fnTest} from './fn';

import {createSummaryService} from '../src/features/summary/summary-service';
import {
  buildDashboardCards,
  buildCoreCards,
  buildFunnel,
} from '../src/features/summary/summary-view';
import {createSession} from '../src/session/session';
import type {DashboardStats, SummaryData} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

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

const LOGIN = {
  token: 'tok-1',
  user: {id: 'u-1', username: 'alice', displayName: 'Alice', roleCode: 'admin'},
  tenants: [{tenantId: 't-acme', code: 'acme', name: 'Acme', roleIds: ['r-admin']}],
};

function booted() {
  const session = createSession();
  session.applyLogin(LOGIN);
  return {session, service: createSummaryService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

const STATS: DashboardStats = {
  contractCount: 12,
  receiptCount: 128,
  sampleCount: 356,
  reportCountByStatus: {draft: 5, reviewing: 3, issued: 42},
  pendingTaskCount: 7,
  todayTestCount: 23,
  qualifiedRateByMaterial: {
    concrete: {total: 100, pass: 95, rate: 95},
    rebar: {total: 80, pass: 76, rate: 95},
    sand: {total: 60, pass: 51, rate: 85},
  },
  reportOutputByStatus: {generated: 40, pending: 8, issued: 42},
  funnelByStage: {
    pending_collect: 2,
    received: 5,
    testing: 9,
    reporting: 4,
    reviewing: 3,
    issued: 30,
  },
};

const SUMMARY: SummaryData = {
  summaryName: '报告汇总',
  columns: [
    {key: 'reportName', label: '报告名称'},
    {key: 'count', label: '数量'},
  ],
  rows: [
    {reportName: '混凝土抗压', count: '12'},
    {reportName: '钢筋原材', count: '8'},
  ],
};

fnTest(['M05.F01.I01'], '汇总表查询：参数直传 + ALL 不过滤 + 鉴权头', async () => {
  stubFetch(url =>
    url.includes('/api/summary') ? {status: 200, body: SUMMARY} : {status: 404},
  );
  const {service} = booted();

  const result = await service.getReportSummary({
    categoryCode: 'CAT-1',
    dateFrom: '2026-11-01',
    dateTo: '2026-11-30',
  });
  expect(result.summaryName).toBe('报告汇总');
  expect(result.rows).toHaveLength(2);
  expect(calls.at(-1)?.url).toBe(
    'http://127.0.0.1:5204/api/summary?categoryCode=CAT-1&dateFrom=2026-11-01&dateTo=2026-11-30',
  );
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );

  await service.getReportSummary({categoryCode: 'ALL'});
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/summary');

  await service.getReportSummary();
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/summary');
});

fnTest(['M05.F01.I02'], '四基数卡：合同/委托/样品/报告计数派生', async () => {
  const cards = buildDashboardCards(STATS);
  expect(cards).toHaveLength(4);
  expect(cards.map(c => c.value)).toEqual([12, 128, 356, 50]);
});

fnTest(['M05.F01.I03'], '核心指标卡：今日检测 + 分料合格率 + 报告产出', async () => {
  const core = buildCoreCards(STATS);
  expect(core.todayTestCount).toBe(23);
  expect(core.qualifiedRateByMaterial.concrete.rate).toBe(95);
  expect(core.qualifiedRateByMaterial.rebar.rate).toBe(95);
  expect(core.qualifiedRateByMaterial.sand.rate).toBe(85);
  expect(core.reportOutputByStatus).toEqual({generated: 40, pending: 8, issued: 42});
});

fnTest(['M05.F01.I04'], '任务漏斗：六段顺序派生', async () => {
  const funnel = buildFunnel(STATS);
  expect(funnel.map(f => f.stage)).toEqual([
    'pending_collect',
    'received',
    'testing',
    'reporting',
    'reviewing',
    'issued',
  ]);
  expect(funnel.map(f => f.count)).toEqual([2, 5, 9, 4, 3, 30]);
});

fnTest(['M05.F01.I06'], '仪表盘统计：鉴权头 + 全字段回显（三桶报告计数）', async () => {
  stubFetch(url =>
    url.endsWith('/api/summary/stats') ? {status: 200, body: STATS} : {status: 404},
  );
  const {service} = booted();

  const result = await service.getDashboardStats();
  expect(calls.at(-1)?.url).toBe('http://127.0.0.1:5204/api/summary/stats');
  expect((calls.at(-1)?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
  expect(result.contractCount).toBe(12);
  expect(result.receiptCount).toBe(128);
  expect(result.sampleCount).toBe(356);
  expect(result.pendingTaskCount).toBe(7);
  expect(result.reportCountByStatus).toEqual({draft: 5, reviewing: 3, issued: 42});
});

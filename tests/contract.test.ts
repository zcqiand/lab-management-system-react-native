/**
 * 合同消费面（REQ-2026-037 L-T2 / M02.F01.I01-I05）。
 *
 * fetch stub（tenant-switch 同构）：断言五 op 的 URL/方法/载荷/鉴权头。
 * 分页按 op 级 @doc 定稿：list 回显全量不切片（{items,page,pageSize,total}）。
 */
import {fnTest} from './fn';

import {createContractService} from '../src/features/contracts/contract-service';
import {
  assembleCreateContractBody,
  buildContractDetail,
  buildContractRows,
  contractStatusLabel,
} from '../src/features/contracts/contract-view';
import {createSession} from '../src/session/session';
import type {Contract} from '../src/api/endpoints/model';

if (!process.env.RN_API_BASE_URL) {
  process.env.RN_API_BASE_URL = 'http://127.0.0.1:5204';
}

const CONTRACTS: Contract[] = [
  {
    id: 'c-1',
    tenantId: 't-acme',
    contractCode: 'HT-2026-001',
    clientUnit: '甲方一',
    projectName: '一号楼检测',
    constructionUnit: '施工方一',
    witnessUnit: '见证方一',
    witness: '见证人一',
    status: 'active',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
];

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

const LOGIN = {
  token: 'tok-1',
  user: {id: 'u-1', username: 'alice', displayName: 'Alice', roleCode: 'admin'},
  tenants: [{tenantId: 't-acme', code: 'acme', name: 'Acme', roleIds: ['r-admin']}],
};

function booted() {
  const session = createSession();
  session.applyLogin(LOGIN);
  return {session, service: createContractService({session})};
}

beforeEach(() => {
  calls.length = 0;
});

fnTest(['M02.F01.I01'], '合同列表：带过滤与鉴权头调列表，回显全量信封', async () => {
  stubFetch(() => ({
    status: 200,
    body: {items: CONTRACTS, page: 0, pageSize: 20, total: 1},
  }));
  const {service} = booted();

  const result = await service.listContracts({keyword: '一号', status: 'active'});

  expect(result.items).toHaveLength(1);
  expect(result.total).toBe(1);
  const rows = buildContractRows(result.items);
  expect(rows[0]).toEqual({
    id: 'c-1',
    contractCode: 'HT-2026-001',
    clientUnit: '甲方一',
    projectName: '一号楼检测',
    statusLabel: '生效中',
  });
  const last = calls.at(-1);
  expect(last?.url).toBe(
    'http://127.0.0.1:5204/api/contracts?keyword=%E4%B8%80%E5%8F%B7&status=active',
  );
  expect((last?.init?.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok-1',
  );
});

fnTest(['M02.F01.I02'], '合同详情：按 id 调详情，404 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/contracts/c-1')
      ? {status: 200, body: CONTRACTS[0]}
      : {status: 404, body: {code: 'CONTRACT_NOT_FOUND', message: '无此合同'}},
  );
  const {service} = booted();

  const detail = await service.getContract('c-1');
  expect(detail.contractCode).toBe('HT-2026-001');
  const view = buildContractDetail(detail);
  expect(view.witnessUnit).toBe('见证方一');
  expect(view.statusLabel).toBe('生效中');

  await expect(service.getContract('c-x')).rejects.toThrow(/无此合同/);
});

fnTest(['M02.F01.I03'], '创建合同：六必填装配 fail-fast + POST 200', async () => {
  expect(() =>
    assembleCreateContractBody({
      contractCode: 'HT-1',
      clientUnit: '甲',
      projectName: '项',
      constructionUnit: '',
      witnessUnit: '见',
      witness: '人',
    }),
  ).toThrow(/constructionUnit/);

  stubFetch(() => ({status: 200, body: CONTRACTS[0]}));
  const {service} = booted();

  const created = await service.createContract({
    contractCode: 'HT-2026-001',
    clientUnit: '甲方一',
    projectName: '一号楼检测',
    constructionUnit: '施工方一',
    witnessUnit: '见证方一',
    witness: '见证人一',
  });
  expect(created.id).toBe('c-1');
  const last = calls.at(-1);
  expect(last?.init?.method).toBe('POST');
  const body = JSON.parse(String(last?.init?.body));
  expect(body.contractCode).toBe('HT-2026-001');
  expect(body.status).toBeUndefined(); // status 由服务端默认 ACTIVE，装配不带
});

fnTest(['M02.F01.I04'], '更新合同：PATCH 语义部分载荷，空载荷禁发', async () => {
  stubFetch(url =>
    url.endsWith('/api/contracts/c-1')
      ? {status: 200, body: {...CONTRACTS[0], projectName: '二号楼检测'}}
      : {status: 404},
  );
  const {service} = booted();

  await expect(service.updateContract('c-1', {})).rejects.toThrow(/载荷/);

  const updated = await service.updateContract('c-1', {projectName: '二号楼检测'});
  expect(updated.projectName).toBe('二号楼检测');
  const body = JSON.parse(String(calls.at(-1)?.init?.body));
  expect(body).toEqual({projectName: '二号楼检测'}); // PATCH：只传变更字段
});

fnTest(['M02.F01.I05'], '删除合同：204→undefined，非 204 分流', async () => {
  stubFetch(url =>
    url.endsWith('/api/contracts/c-1')
      ? {status: 204}
      : {status: 404, body: {code: 'CONTRACT_NOT_FOUND', message: '无此合同'}},
  );
  const {service} = booted();

  expect(await service.removeContract('c-1')).toBeUndefined();
  expect(calls.at(-1)?.init?.method).toBe('DELETE');
  await expect(service.removeContract('c-x')).rejects.toThrow(/无此合同/);
});

fnTest(['M02.F01.I01'], '合同状态文案：二态映射', () => {
  expect(contractStatusLabel('active')).toBe('生效中');
  expect(contractStatusLabel('archived')).toBe('已归档');
});

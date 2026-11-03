/**
 * 检测记录消费编排（REQ-2026-037 L-T4 / M03.F03.I06-I12 + I15）。
 *
 * 只做编排：装配（test-record-view）→ orval 生成 client → 失败归一抛错。
 * data-entry act 复用 receipts 端点 receiptsActFlowDataEntry，operator 从会话
 * 注入（缺失 fail-fast，ADR-0019）。list 回显全量；update PUT PATCH 语义；
 * delete 204；改判 PATCH 200 TestRecord。
 */
import type {
  CreateTestRecordRequest,
  FlowActionResult,
  TestRecord,
  UpdateTestRecordRequest,
} from '../../api/endpoints/model';
import {
  testRecordsCreateTestRecord,
  testRecordsDeleteTestRecord,
  testRecordsGetTestRecord,
  testRecordsListTestRecords,
  testRecordsSetVerdict,
  testRecordsUpdateTestRecord,
} from '../../api/endpoints/test-records/test-records';
import {receiptsActFlowDataEntry} from '../../api/endpoints/receipts/receipts';
import type {Session} from '../../session/session';
import type {FlowActionInput} from '../receipts/receipt-view';
import {assembleFlowAction} from '../receipts/receipt-view';
import {
  assembleCreateTestRecordBody,
  assembleUpdateTestRecordBody,
  assembleVerdictBody,
} from './test-record-view';
import {expectData, expectNoContent} from '../shared/http';

export interface TestRecordListEnvelope {
  items: TestRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TestRecordListParams {
  page?: number;
  pageSize?: number;
  sampleId?: string;
  parameterCode?: string;
}

export interface TestRecordService {
  listTestRecords(params?: TestRecordListParams): Promise<TestRecordListEnvelope>;
  getTestRecord(id: string): Promise<TestRecord>;
  createTestRecord(input: CreateTestRecordRequest): Promise<TestRecord>;
  updateTestRecord(id: string, input: UpdateTestRecordRequest): Promise<TestRecord>;
  removeTestRecord(id: string): Promise<void>;
  setVerdict(id: string, verdict: string): Promise<TestRecord>;
  actDataEntry(input: FlowActionInput): Promise<FlowActionResult[]>;
}

export function createTestRecordService({
  session,
}: {
  session: Session;
}): TestRecordService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  const operator = (): string => {
    const user = session.snapshot()?.user;
    const name = user?.displayName || user?.username;
    if (!name || !name.trim()) {
      throw new Error('operator 缺失——流程动作必须来自登录会话（ADR-0019）');
    }
    return name;
  };

  return {
    async listTestRecords(params) {
      return expectData<TestRecordListEnvelope>(
        await testRecordsListTestRecords(params, headers()),
        200,
        '检测记录列表失败',
      );
    },

    async getTestRecord(id) {
      return expectData<TestRecord>(
        await testRecordsGetTestRecord(id, headers()),
        200,
        '检测记录详情失败',
      );
    },

    async createTestRecord(input) {
      return expectData<TestRecord>(
        await testRecordsCreateTestRecord(assembleCreateTestRecordBody(input), headers()),
        200,
        '创建检测记录失败',
      );
    },

    async updateTestRecord(id, input) {
      return expectData<TestRecord>(
        await testRecordsUpdateTestRecord(
          id,
          assembleUpdateTestRecordBody(input),
          headers(),
        ),
        200,
        '更新检测记录失败',
      );
    },

    async removeTestRecord(id) {
      await expectNoContent(
        await testRecordsDeleteTestRecord(id, headers()),
        '删除检测记录失败',
      );
    },

    async setVerdict(id, verdict) {
      return expectData<TestRecord>(
        await testRecordsSetVerdict(id, assembleVerdictBody(verdict), headers()),
        200,
        '检测记录改判失败',
      );
    },

    async actDataEntry(input) {
      return expectData<FlowActionResult[]>(
        await receiptsActFlowDataEntry(assembleFlowAction(input, operator()), headers()),
        200,
        '数据录入提交流程动作失败',
      );
    },
  };
}

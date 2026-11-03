/**
 * 接样流消费编排（REQ-2026-037 L-T4 / M03.F01 接样管理 + M03.F02 任务分配）。
 *
 * 只做编排：装配（receipt-view）→ orval 生成 client → 失败归一抛错。
 * flow act 三端点（receiving/assigning）共用 assembleFlowAction，operator 从
 * 会话注入（缺失 fail-fast，ADR-0019）。list 回显全量；update PUT PATCH 语义；
 * delete 204；act 200 FlowActionResult[]。
 */
import type {
  CreateSampleReceiptRequest,
  FlowActionResult,
  FlowHistoryEntry,
  FlowStatus,
  SampleReceipt,
  UpdateSampleReceiptRequest,
} from '../../api/endpoints/model';
import {
  receiptsActFlowAssigning,
  receiptsActFlowReceiving,
  receiptsAssignTask,
  receiptsCreateReceipt,
  receiptsDeleteReceipt,
  receiptsGetReceipt,
  receiptsGetReceiptHistory,
  receiptsListReceipts,
  receiptsUpdateReceipt,
} from '../../api/endpoints/receipts/receipts';
import type {Session} from '../../session/session';
import type {FlowActionInput} from './receipt-view';
import {
  assembleCreateReceiptBody,
  assembleFlowAction,
  assembleUpdateReceiptBody,
} from './receipt-view';
import {expectData, expectNoContent} from '../shared/http';

export interface ReceiptListEnvelope {
  items: SampleReceipt[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReceiptService {
  listReceipts(params?: ReceiptListParams): Promise<ReceiptListEnvelope>;
  getReceipt(id: string): Promise<SampleReceipt>;
  createReceipt(input: CreateSampleReceiptRequest): Promise<SampleReceipt>;
  updateReceipt(id: string, input: UpdateSampleReceiptRequest): Promise<SampleReceipt>;
  removeReceipt(id: string): Promise<void>;
  getReceiptHistory(id: string): Promise<FlowHistoryEntry[]>;
  actReceiving(input: FlowActionInput): Promise<FlowActionResult[]>;
  assignTask(
    id: string,
    input: {assigneeId?: string; assigneeName?: string; plannedTestDate?: string},
  ): Promise<SampleReceipt>;
  actAssigning(input: FlowActionInput): Promise<FlowActionResult[]>;
}

export interface ReceiptListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contractId?: string;
  flowStatus?: FlowStatus;
}

export function createReceiptService({session}: {session: Session}): ReceiptService {
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
    async listReceipts(params) {
      return expectData<ReceiptListEnvelope>(
        await receiptsListReceipts(params, headers()),
        200,
        '接样单列表失败',
      );
    },

    async getReceipt(id) {
      return expectData<SampleReceipt>(
        await receiptsGetReceipt(id, headers()),
        200,
        '接样单详情失败',
      );
    },

    async createReceipt(input) {
      return expectData<SampleReceipt>(
        await receiptsCreateReceipt(assembleCreateReceiptBody(input), headers()),
        200,
        '创建接样单失败',
      );
    },

    async updateReceipt(id, input) {
      return expectData<SampleReceipt>(
        await receiptsUpdateReceipt(id, assembleUpdateReceiptBody(input), headers()),
        200,
        '更新接样单失败',
      );
    },

    async removeReceipt(id) {
      await expectNoContent(await receiptsDeleteReceipt(id, headers()), '删除接样单失败');
    },

    async getReceiptHistory(id) {
      return expectData<FlowHistoryEntry[]>(
        await receiptsGetReceiptHistory(id, headers()),
        200,
        '接样单流程历史失败',
      );
    },

    async actReceiving(input) {
      return expectData<FlowActionResult[]>(
        await receiptsActFlowReceiving(assembleFlowAction(input, operator()), headers()),
        200,
        '接样提交流程动作失败',
      );
    },

    async assignTask(id, input) {
      return expectData<SampleReceipt>(
        await receiptsAssignTask(id, input, headers()),
        200,
        '任务分配失败',
      );
    },

    async actAssigning(input) {
      return expectData<FlowActionResult[]>(
        await receiptsActFlowAssigning(assembleFlowAction(input, operator()), headers()),
        200,
        '任务分配提交流程动作失败',
      );
    },
  };
}

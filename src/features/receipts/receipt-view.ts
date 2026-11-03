/**
 * 接样流视图装配（REQ-2026-037 L-T4 / M03.F01-F02）。
 *
 * 接样单：创建七必填 fail-fast（ADR-0019）；更新 PUT PATCH 语义空载荷禁发。
 * flow act：body.action 三动作（submit/return/withdraw），ids/operator 必填，
 * operator 由服务层从会话注入。三态过滤器：全部/未提交（当前阶段）/已提交
 * （下一阶段），镜像 react 仓 ReceiptsList 惯例。
 */
import type {
  CreateSampleReceiptRequest,
  FlowAction,
  FlowActionRequest,
  FlowStatus,
  UpdateSampleReceiptRequest,
} from '../../api/endpoints/model';
import {dropUndefined} from '../shared/http';

export interface ReceiptRow {
  id: string;
  commissionCode: string;
  projectName?: string;
  clientUnit?: string;
  flowStatus: FlowStatus;
}

export function buildReceiptRows(receipts: SampleReceiptLike[]): ReceiptRow[] {
  return receipts.map(receipt => ({
    id: receipt.id,
    commissionCode: receipt.commissionCode,
    projectName: receipt.projectName,
    clientUnit: receipt.clientUnit,
    flowStatus: receipt.flowStatus,
  }));
}

interface SampleReceiptLike {
  id: string;
  commissionCode: string;
  projectName?: string;
  clientUnit?: string;
  flowStatus: FlowStatus;
}

const REQUIRED_CREATE: Array<keyof CreateSampleReceiptRequest> = [
  'contractId',
  'commissionCode',
  'commissionDate',
  'categoryCode',
  'receivedBy',
  'sampleSource',
  'testCategory',
];

export function assembleCreateReceiptBody(
  input: CreateSampleReceiptRequest,
): CreateSampleReceiptRequest {
  for (const field of REQUIRED_CREATE) {
    if (!String(input[field] ?? '').trim()) {
      throw new Error(`${field} 缺失——创建接样单必填项不得为空（ADR-0019）`);
    }
  }
  return input;
}

export function assembleUpdateReceiptBody(
  input: UpdateSampleReceiptRequest,
): UpdateSampleReceiptRequest {
  return dropUndefined(
    input as Record<string, unknown>,
    '更新载荷为空——PATCH 语义禁发空载荷',
  ) as UpdateSampleReceiptRequest;
}

export type FlowActionInput = {
  ids: string[];
  action: FlowAction;
  reason?: string;
};

export function assembleFlowAction(
  input: FlowActionInput,
  operator: string,
): FlowActionRequest {
  if (input.ids.length === 0) {
    throw new Error('ids 缺失——流程动作必须显式指定接样单（ADR-0019）');
  }
  return {
    ids: input.ids,
    action: input.action,
    operator,
    reason: input.reason,
  };
}

/** 本片三阶段（接样/任务分配/数据录入）→ 下一阶段映射（已提交语义）。 */
const NEXT_STAGE: Record<'receiving' | 'task_assignment' | 'data_entry', FlowStatus> = {
  receiving: 'task_assignment',
  task_assignment: 'data_entry',
  data_entry: 'review',
};

export type FlowStage = keyof typeof NEXT_STAGE;

export type FlowFilter = 'all' | 'pending' | 'submitted';

export function flowStatusForFilter(
  stage: FlowStage,
  filter: FlowFilter,
): FlowStatus | undefined {
  if (filter === 'pending') {
    return stage;
  }
  if (filter === 'submitted') {
    return NEXT_STAGE[stage];
  }
  return undefined;
}

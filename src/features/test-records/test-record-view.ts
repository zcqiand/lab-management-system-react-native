/**
 * 检测记录视图装配（REQ-2026-037 L-T4 / M03.F03.I06-I12 + I15 三态过滤）。
 *
 * 创建 sampleId/parameterCode/requirement/result 四必填 fail-fast（ADR-0019）；
 * 更新 PUT PATCH 语义空载荷禁发；改判 verdict 空值禁发（PATCH body{verdict}）；
 * 三态过滤器镜像 react 仓惯例（当前阶段/下一阶段）。
 */
import type {
  CreateTestRecordRequest,
  UpdateTestRecordRequest,
} from '../../api/endpoints/model';
import {dropUndefined} from '../shared/http';

export {flowStatusForFilter} from '../receipts/receipt-view';

export interface TestRecordRow {
  id: string;
  sampleId: string;
  parameterCode: string;
  requirement: string;
  result: string;
  verdict?: string;
}

export function buildTestRecordRows(records: TestRecordLike[]): TestRecordRow[] {
  return records.map(record => ({
    id: record.id,
    sampleId: record.sampleId,
    parameterCode: record.parameterCode,
    requirement: record.requirement,
    result: record.result,
    verdict: record.verdict,
  }));
}

interface TestRecordLike {
  id: string;
  sampleId: string;
  parameterCode: string;
  requirement: string;
  result: string;
  verdict?: string;
}

const REQUIRED_CREATE: Array<keyof CreateTestRecordRequest> = [
  'sampleId',
  'parameterCode',
  'requirement',
  'result',
];

export function assembleCreateTestRecordBody(
  input: CreateTestRecordRequest,
): CreateTestRecordRequest {
  for (const field of REQUIRED_CREATE) {
    if (!String(input[field] ?? '').trim()) {
      throw new Error(`${field} 缺失——创建检测记录必填项不得为空（ADR-0019）`);
    }
  }
  return input;
}

export function assembleUpdateTestRecordBody(
  input: UpdateTestRecordRequest,
): UpdateTestRecordRequest {
  return dropUndefined(
    input as Record<string, unknown>,
    '更新载荷为空——PATCH 语义禁发空载荷',
  ) as UpdateTestRecordRequest;
}

export function assembleVerdictBody(verdict: string): {verdict: string} {
  if (!verdict.trim()) {
    throw new Error('verdict 缺失——改判必须显式给出判值（ADR-0019）');
  }
  return {verdict};
}

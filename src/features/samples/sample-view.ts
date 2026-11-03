/**
 * 样品视图装配（REQ-2026-037 L-T4 / M03.F03.I01-I05 + M03.F01.I07 ext 补录）。
 *
 * 创建 receiptId/sampleCode 必填 fail-fast（ADR-0019）；更新 PUT PATCH 语义
 * 空载荷禁发；ext 补录空载荷禁发（UpdateSampleExtRequest{ext} 包一层）。
 */
import type {CreateSampleRequest, UpdateSampleRequest} from '../../api/endpoints/model';
import {dropUndefined} from '../shared/http';

export interface SampleRow {
  id: string;
  receiptId: string;
  sampleCode: string;
  sampleName?: string;
}

export function buildSampleRows(samples: SampleLike[]): SampleRow[] {
  return samples.map(sample => ({
    id: sample.id,
    receiptId: sample.receiptId,
    sampleCode: sample.sampleCode,
    sampleName: sample.sampleName,
  }));
}

interface SampleLike {
  id: string;
  receiptId: string;
  sampleCode: string;
  sampleName?: string;
}

const REQUIRED_CREATE: Array<keyof CreateSampleRequest> = ['receiptId', 'sampleCode'];

export function assembleCreateSampleBody(
  input: CreateSampleRequest,
): CreateSampleRequest {
  for (const field of REQUIRED_CREATE) {
    if (!String(input[field] ?? '').trim()) {
      throw new Error(`${field} 缺失——创建样品必填项不得为空（ADR-0019）`);
    }
  }
  return input;
}

export function assembleUpdateSampleBody(
  input: UpdateSampleRequest,
): UpdateSampleRequest {
  return dropUndefined(
    input as Record<string, unknown>,
    '更新载荷为空——PATCH 语义禁发空载荷',
  ) as UpdateSampleRequest;
}

export function assembleSampleExtBody(ext: {[key: string]: string}): {
  ext: {[key: string]: string};
} {
  if (Object.keys(ext).length === 0) {
    throw new Error('ext 载荷为空——ext 补录禁发空载荷');
  }
  return {ext};
}

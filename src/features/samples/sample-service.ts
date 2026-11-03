/**
 * 样品消费编排（REQ-2026-037 L-T4 / M03.F03.I01-I05 + M03.F01.I07 ext 补录）。
 *
 * 只做编排：装配（sample-view）→ orval 生成 client → 失败归一抛错。
 * list 回显全量；update PUT PATCH 语义；delete 204；ext 补录 PUT 200 Sample。
 */
import type {
  CreateSampleRequest,
  Sample,
  UpdateSampleRequest,
} from '../../api/endpoints/model';
import {
  samplesCreateSample,
  samplesDeleteSample,
  samplesGetSample,
  samplesListSamples,
  samplesUpdateSample,
  samplesUpdateSampleExt,
} from '../../api/endpoints/samples/samples';
import type {Session} from '../../session/session';
import {
  assembleCreateSampleBody,
  assembleSampleExtBody,
  assembleUpdateSampleBody,
} from './sample-view';
import {expectData, expectNoContent} from '../shared/http';

export interface SampleListEnvelope {
  items: Sample[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SampleListParams {
  page?: number;
  pageSize?: number;
  receiptId?: string;
  keyword?: string;
}

export interface SampleService {
  listSamples(params?: SampleListParams): Promise<SampleListEnvelope>;
  getSample(id: string): Promise<Sample>;
  createSample(input: CreateSampleRequest): Promise<Sample>;
  updateSample(id: string, input: UpdateSampleRequest): Promise<Sample>;
  removeSample(id: string): Promise<void>;
  updateSampleExt(id: string, ext: {[key: string]: string}): Promise<Sample>;
}

export function createSampleService({session}: {session: Session}): SampleService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async listSamples(params) {
      return expectData<SampleListEnvelope>(
        await samplesListSamples(params, headers()),
        200,
        '样品列表失败',
      );
    },

    async getSample(id) {
      return expectData<Sample>(
        await samplesGetSample(id, headers()),
        200,
        '样品详情失败',
      );
    },

    async createSample(input) {
      return expectData<Sample>(
        await samplesCreateSample(assembleCreateSampleBody(input), headers()),
        200,
        '创建样品失败',
      );
    },

    async updateSample(id, input) {
      return expectData<Sample>(
        await samplesUpdateSample(id, assembleUpdateSampleBody(input), headers()),
        200,
        '更新样品失败',
      );
    },

    async removeSample(id) {
      await expectNoContent(await samplesDeleteSample(id, headers()), '删除样品失败');
    },

    async updateSampleExt(id, ext) {
      return expectData<Sample>(
        await samplesUpdateSampleExt(id, assembleSampleExtBody(ext), headers()),
        200,
        'ext 补录失败',
      );
    },
  };
}

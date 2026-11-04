/**
 * 检测能力字典消费编排（REQ-2026-037 L-T7 / M06.F01-F04）。
 *
 * 专项/项目/参数/标准四域 CRUD + 关联 link（specialty-object /
 * object-parameter / standard-parameter）。update 是 PUT PATCH 语义
 * （未传字段保留，空载荷禁发）；link/unlink 204；delete 204/404 归一抛错；
 * list 回显全量信封。创建必填项缺失 fail-fast（ADR-0019）。
 */
import type {
  CreateInspectionObjectRequest,
  CreateInspectionParameterRequest,
  CreateInspectionSpecialtyRequest,
  CreateInspectionStandardRequest,
  InspectionObject,
  InspectionParameter,
  InspectionParameterSourceType,
  InspectionSpecialty,
  InspectionStandard,
  InspectionStandardStatus,
  ObjectParameterLink,
  SpecialtyObjectLink,
  StandardParameterLink,
  UpdateInspectionObjectRequest,
  UpdateInspectionParameterRequest,
  UpdateInspectionSpecialtyRequest,
  UpdateInspectionStandardRequest,
} from '../../api/endpoints/model';
import {
  inspectionDictionaryCreateObject,
  inspectionDictionaryCreateParameter,
  inspectionDictionaryCreateSpecialty,
  inspectionDictionaryCreateStandard,
  inspectionDictionaryDeleteObject,
  inspectionDictionaryDeleteStandard,
  inspectionDictionaryLinkObjectParameter,
  inspectionDictionaryLinkSpecialtyObject,
  inspectionDictionaryLinkStandardParameter,
  inspectionDictionaryListObjects,
  inspectionDictionaryListParameters,
  inspectionDictionaryListSpecialties,
  inspectionDictionaryListStandards,
  inspectionDictionaryUnlinkSpecialtyObject,
  inspectionDictionaryUpdateSpecialty,
  inspectionDictionaryUpdateObject,
  inspectionDictionaryUpdateParameter,
  inspectionDictionaryUpdateStandard,
} from '../../api/endpoints/inspection-dictionary/inspection-dictionary';
import type {Session} from '../../session/session';
import {dropUndefined, expectData, expectNoContent} from '../shared/http';

export interface DictionaryListEnvelope<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface InspectionDictionaryService {
  specialties: {
    list(params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
    }): Promise<DictionaryListEnvelope<InspectionSpecialty>>;
    create(input: CreateInspectionSpecialtyRequest): Promise<InspectionSpecialty>;
    update(
      code: string,
      input: UpdateInspectionSpecialtyRequest,
    ): Promise<InspectionSpecialty>;
  };
  objects: {
    list(params?: {
      page?: number;
      pageSize?: number;
      inspectionSpecialtyCode?: string;
      keyword?: string;
    }): Promise<DictionaryListEnvelope<InspectionObject>>;
    create(input: CreateInspectionObjectRequest): Promise<InspectionObject>;
    update(code: string, input: UpdateInspectionObjectRequest): Promise<InspectionObject>;
    remove(code: string): Promise<void>;
    linkSpecialtyObject(link: SpecialtyObjectLink): Promise<void>;
    unlinkSpecialtyObject(link: SpecialtyObjectLink): Promise<void>;
    linkObjectParameter(link: ObjectParameterLink): Promise<void>;
  };
  parameters: {
    list(params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      sourceType?: InspectionParameterSourceType;
    }): Promise<DictionaryListEnvelope<InspectionParameter>>;
    create(input: CreateInspectionParameterRequest): Promise<InspectionParameter>;
    update(
      code: string,
      input: UpdateInspectionParameterRequest,
    ): Promise<InspectionParameter>;
    linkStandardParameter(link: StandardParameterLink): Promise<void>;
  };
  standards: {
    list(params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      status?: InspectionStandardStatus;
    }): Promise<DictionaryListEnvelope<InspectionStandard>>;
    create(input: CreateInspectionStandardRequest): Promise<InspectionStandard>;
    update(
      code: string,
      input: UpdateInspectionStandardRequest,
    ): Promise<InspectionStandard>;
    remove(code: string): Promise<void>;
  };
}

const REQUIRED_SPECIALTY: Array<[keyof CreateInspectionSpecialtyRequest, string]> = [
  ['code', 'code'],
  ['officialNo', 'officialNo'],
  ['name', 'name'],
];
const REQUIRED_OBJECT: Array<[keyof CreateInspectionObjectRequest, string]> = [
  ['code', 'code'],
  ['inspectionSpecialtyCode', 'inspectionSpecialtyCode'],
  ['sourceProjectNo', 'sourceProjectNo'],
  ['sourceProjectName', 'sourceProjectName'],
  ['name', 'name'],
];
const REQUIRED_PARAMETER: Array<[keyof CreateInspectionParameterRequest, string]> = [
  ['code', 'code'],
  ['name', 'name'],
  ['rawName', 'rawName'],
  ['canonicalName', 'canonicalName'],
];
const REQUIRED_STANDARD: Array<[keyof CreateInspectionStandardRequest, string]> = [
  ['code', 'code'],
  ['name', 'name'],
];

export function createInspectionDictionaryService({
  session,
}: {
  session: Session;
}): InspectionDictionaryService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  const required = (
    input: Record<string, unknown>,
    spec: Array<[string, string]>,
  ): void => {
    for (const [field] of spec) {
      if (!String(input[field] ?? '').trim()) {
        throw new Error(`${field} 缺失——创建检测能力条目必填项不得为空（ADR-0019）`);
      }
    }
  };

  return {
    specialties: {
      async list(params) {
        return expectData<DictionaryListEnvelope<InspectionSpecialty>>(
          await inspectionDictionaryListSpecialties(params, headers()),
          200,
          '专项列表失败',
        );
      },
      async create(input) {
        required(input as unknown as Record<string, unknown>, REQUIRED_SPECIALTY);
        return expectData<InspectionSpecialty>(
          await inspectionDictionaryCreateSpecialty(input, headers()),
          200,
          '创建专项失败',
        );
      },
      async update(code, input) {
        const body = dropUndefined(
          input as unknown as Record<string, unknown>,
          '更新载荷为空——PUT 无变更不发',
        );
        return expectData<InspectionSpecialty>(
          await inspectionDictionaryUpdateSpecialty(
            code,
            body as UpdateInspectionSpecialtyRequest,
            headers(),
          ),
          200,
          '更新专项失败',
        );
      },
    },

    objects: {
      async list(params) {
        return expectData<DictionaryListEnvelope<InspectionObject>>(
          await inspectionDictionaryListObjects(params, headers()),
          200,
          '项目列表失败',
        );
      },
      async create(input) {
        required(input as unknown as Record<string, unknown>, REQUIRED_OBJECT);
        return expectData<InspectionObject>(
          await inspectionDictionaryCreateObject(input, headers()),
          200,
          '创建项目失败',
        );
      },
      async update(code, input) {
        const body = dropUndefined(
          input as unknown as Record<string, unknown>,
          '更新载荷为空——PUT 无变更不发',
        );
        return expectData<InspectionObject>(
          await inspectionDictionaryUpdateObject(
            code,
            body as UpdateInspectionObjectRequest,
            headers(),
          ),
          200,
          '更新项目失败',
        );
      },
      async remove(code) {
        await expectNoContent(
          await inspectionDictionaryDeleteObject(code, headers()),
          '删除项目失败',
        );
      },
      async linkSpecialtyObject(link) {
        await expectNoContent(
          await inspectionDictionaryLinkSpecialtyObject(link, headers()),
          '专项↔项目关联失败',
        );
      },
      async unlinkSpecialtyObject(link) {
        await expectNoContent(
          await inspectionDictionaryUnlinkSpecialtyObject(link, headers()),
          '专项↔项目解除关联失败',
        );
      },
      async linkObjectParameter(link) {
        await expectNoContent(
          await inspectionDictionaryLinkObjectParameter(link, headers()),
          '项目↔参数关联失败',
        );
      },
    },

    parameters: {
      async list(params) {
        return expectData<DictionaryListEnvelope<InspectionParameter>>(
          await inspectionDictionaryListParameters(params, headers()),
          200,
          '参数列表失败',
        );
      },
      async create(input) {
        required(input as unknown as Record<string, unknown>, REQUIRED_PARAMETER);
        return expectData<InspectionParameter>(
          await inspectionDictionaryCreateParameter(input, headers()),
          200,
          '创建参数失败',
        );
      },
      async update(code, input) {
        const body = dropUndefined(
          input as unknown as Record<string, unknown>,
          '更新载荷为空——PUT 无变更不发',
        );
        return expectData<InspectionParameter>(
          await inspectionDictionaryUpdateParameter(
            code,
            body as UpdateInspectionParameterRequest,
            headers(),
          ),
          200,
          '更新参数失败',
        );
      },
      async linkStandardParameter(link) {
        await expectNoContent(
          await inspectionDictionaryLinkStandardParameter(link, headers()),
          '标准↔参数关联失败',
        );
      },
    },

    standards: {
      async list(params) {
        return expectData<DictionaryListEnvelope<InspectionStandard>>(
          await inspectionDictionaryListStandards(params, headers()),
          200,
          '标准列表失败',
        );
      },
      async create(input) {
        required(input as unknown as Record<string, unknown>, REQUIRED_STANDARD);
        return expectData<InspectionStandard>(
          await inspectionDictionaryCreateStandard(input, headers()),
          200,
          '创建标准失败',
        );
      },
      async update(code, input) {
        const body = dropUndefined(
          input as unknown as Record<string, unknown>,
          '更新载荷为空——PUT 无变更不发',
        );
        return expectData<InspectionStandard>(
          await inspectionDictionaryUpdateStandard(
            code,
            body as UpdateInspectionStandardRequest,
            headers(),
          ),
          200,
          '更新标准失败',
        );
      },
      async remove(code) {
        await expectNoContent(
          await inspectionDictionaryDeleteStandard(code, headers()),
          '删除标准失败',
        );
      },
    },
  };
}

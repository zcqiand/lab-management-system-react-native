/**
 * 计算方法 + 技术要求消费编排（REQ-2026-037 L-T7 / M06.F05-F06）。
 *
 * 复合 code 主键：计算方法 = 对象/参数二元；技术要求 = 对象/参数/标准三元。
 * update PUT PATCH 语义（空载荷禁发）；delete 204/404；list 回显全量信封。
 * 创建必填项缺失 fail-fast（ADR-0019）。计算方法 39 行集只含 list/get/create。
 */
import type {
  CalculationMethod,
  CreateCalculationMethodRequest,
  CreateTechnicalRequirementRequest,
  TechnicalRequirement,
  UpdateTechnicalRequirementRequest,
  RequirementVerificationStatus,
} from '../../api/endpoints/model';
import {
  calculationMethodsCreateCalculationMethod,
  calculationMethodsGetCalculationMethod,
  calculationMethodsListCalculationMethods,
} from '../../api/endpoints/calculation-methods/calculation-methods';
import {
  technicalRequirementsCreateTechnicalRequirement,
  technicalRequirementsDeleteTechnicalRequirement,
  technicalRequirementsGetTechnicalRequirement,
  technicalRequirementsListTechnicalRequirements,
  technicalRequirementsUpdateTechnicalRequirement,
} from '../../api/endpoints/technical-requirements/technical-requirements';
import type {Session} from '../../session/session';
import {dropUndefined, expectData, expectNoContent} from '../shared/http';

export interface MethodListEnvelope<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CalculationMethodService {
  list(params?: {
    inspectionObjectCode?: string;
    inspectionParameterCode?: string;
  }): Promise<CalculationMethod[]>;
  get(
    inspectionObjectCode: string,
    inspectionParameterCode: string,
  ): Promise<CalculationMethod>;
  create(input: CreateCalculationMethodRequest): Promise<CalculationMethod>;
}

export interface TechnicalRequirementService {
  list(params?: {
    inspectionObjectCode?: string;
    inspectionParameterCode?: string;
    judgmentStandardCode?: string;
    verificationStatus?: RequirementVerificationStatus;
  }): Promise<TechnicalRequirement[]>;
  get(
    inspectionObjectCode: string,
    inspectionParameterCode: string,
    judgmentStandardCode: string,
  ): Promise<TechnicalRequirement>;
  create(input: CreateTechnicalRequirementRequest): Promise<TechnicalRequirement>;
  update(
    inspectionObjectCode: string,
    inspectionParameterCode: string,
    judgmentStandardCode: string,
    input: UpdateTechnicalRequirementRequest,
  ): Promise<TechnicalRequirement>;
  remove(
    inspectionObjectCode: string,
    inspectionParameterCode: string,
    judgmentStandardCode: string,
  ): Promise<void>;
}

const REQUIRED_METHOD: Array<[keyof CreateCalculationMethodRequest, string]> = [
  ['inspectionObjectCode', 'inspectionObjectCode'],
  ['inspectionParameterCode', 'inspectionParameterCode'],
];
const REQUIRED_TECHREQ: Array<[keyof CreateTechnicalRequirementRequest, string]> = [
  ['inspectionObjectCode', 'inspectionObjectCode'],
  ['inspectionParameterCode', 'inspectionParameterCode'],
  ['judgmentStandardCode', 'judgmentStandardCode'],
];

export function createCalculationMethodService({
  session,
}: {
  session: Session;
}): CalculationMethodService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async list(params) {
      return expectData<CalculationMethod[]>(
        await calculationMethodsListCalculationMethods(params, headers()),
        200,
        '计算方法列表失败',
      );
    },
    async get(inspectionObjectCode, inspectionParameterCode) {
      return expectData<CalculationMethod>(
        await calculationMethodsGetCalculationMethod(
          inspectionObjectCode,
          inspectionParameterCode,
          headers(),
        ),
        200,
        '计算方法详情失败',
      );
    },
    async create(input) {
      for (const [field] of REQUIRED_METHOD) {
        if (!String((input as unknown as Record<string, unknown>)[field] ?? '').trim()) {
          throw new Error(`${field} 缺失——创建计算方法必填项不得为空（ADR-0019）`);
        }
      }
      return expectData<CalculationMethod>(
        await calculationMethodsCreateCalculationMethod(input, headers()),
        200,
        '创建计算方法失败',
      );
    },
  };
}

export function createTechnicalRequirementService({
  session,
}: {
  session: Session;
}): TechnicalRequirementService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async list(params) {
      return expectData<TechnicalRequirement[]>(
        await technicalRequirementsListTechnicalRequirements(params, headers()),
        200,
        '技术要求列表失败',
      );
    },
    async get(inspectionObjectCode, inspectionParameterCode, judgmentStandardCode) {
      return expectData<TechnicalRequirement>(
        await technicalRequirementsGetTechnicalRequirement(
          inspectionObjectCode,
          inspectionParameterCode,
          judgmentStandardCode,
          headers(),
        ),
        200,
        '技术要求详情失败',
      );
    },
    async create(input) {
      for (const [field] of REQUIRED_TECHREQ) {
        if (!String((input as unknown as Record<string, unknown>)[field] ?? '').trim()) {
          throw new Error(`${field} 缺失——创建技术要求必填项不得为空（ADR-0019）`);
        }
      }
      return expectData<TechnicalRequirement>(
        await technicalRequirementsCreateTechnicalRequirement(input, headers()),
        200,
        '创建技术要求失败',
      );
    },
    async update(
      inspectionObjectCode,
      inspectionParameterCode,
      judgmentStandardCode,
      input,
    ) {
      const body = dropUndefined(
        input as unknown as Record<string, unknown>,
        '更新载荷为空——PUT 无变更不发',
      );
      return expectData<TechnicalRequirement>(
        await technicalRequirementsUpdateTechnicalRequirement(
          inspectionObjectCode,
          inspectionParameterCode,
          judgmentStandardCode,
          body as UpdateTechnicalRequirementRequest,
          headers(),
        ),
        200,
        '更新技术要求失败',
      );
    },
    async remove(inspectionObjectCode, inspectionParameterCode, judgmentStandardCode) {
      await expectNoContent(
        await technicalRequirementsDeleteTechnicalRequirement(
          inspectionObjectCode,
          inspectionParameterCode,
          judgmentStandardCode,
          headers(),
        ),
        '删除技术要求失败',
      );
    },
  };
}

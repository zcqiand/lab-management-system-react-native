/**
 * 报告名称 + 参数界面消费编排（REQ-2026-037 L-T7 / M06.F07-F08）。
 *
 * 报告名称 CRUD + 三向 link（object/standard/parameter，standard role 必填）
 * + 参数界面 CRUD + 参数↔界面 link。link 204；delete 204/404 归一抛错；
 * update PUT PATCH 语义（空载荷禁发）；list 回显全量信封。创建必填项
 * 缺失 fail-fast（ADR-0019）。
 */
import type {
  CreateInspectionReportNameRequest,
  CreateParamInterfaceRequest,
  InspectionReportName,
  ObjectReportNameLink,
  ParamInterface,
  ParamInterfaceLink,
  ReportNameParameterLink,
  ReportNameStandardLink,
  UpdateInspectionReportNameRequest,
  UpdateParamInterfaceRequest,
} from '../../api/endpoints/model';
import {
  reportNamesCreateReportName,
  reportNamesDeleteReportName,
  reportNamesGetReportName,
  reportNamesLinkObjectReportName,
  reportNamesLinkReportNameParameter,
  reportNamesLinkReportNameStandard,
  reportNamesListReportNames,
  reportNamesUpdateReportName,
} from '../../api/endpoints/report-names/report-names';
import {
  paramInterfacesCreateParamInterface,
  paramInterfacesDeleteParamInterface,
  paramInterfacesGetParamInterface,
  paramInterfacesLinkParamInterface,
  paramInterfacesListParamInterfaces,
  paramInterfacesUpdateParamInterface,
} from '../../api/endpoints/param-interfaces/param-interfaces';
import type {Session} from '../../session/session';
import {dropUndefined, expectData, expectNoContent} from '../shared/http';

export interface AdminListEnvelope<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReportNameService {
  list(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<AdminListEnvelope<InspectionReportName>>;
  get(code: string): Promise<InspectionReportName>;
  create(input: CreateInspectionReportNameRequest): Promise<InspectionReportName>;
  update(
    code: string,
    input: UpdateInspectionReportNameRequest,
  ): Promise<InspectionReportName>;
  remove(code: string): Promise<void>;
  linkObject(link: ObjectReportNameLink): Promise<void>;
  linkStandard(link: ReportNameStandardLink): Promise<void>;
  linkParameter(link: ReportNameParameterLink): Promise<void>;
}

export interface ParamInterfaceService {
  list(params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<AdminListEnvelope<ParamInterface>>;
  get(code: string): Promise<ParamInterface>;
  create(input: CreateParamInterfaceRequest): Promise<ParamInterface>;
  update(code: string, input: UpdateParamInterfaceRequest): Promise<ParamInterface>;
  remove(code: string): Promise<void>;
  link(link: ParamInterfaceLink): Promise<void>;
}

const REQUIRED_REPORT_NAME: Array<[keyof CreateInspectionReportNameRequest, string]> = [
  ['code', 'code'],
  ['name', 'name'],
];
const REQUIRED_PARAM_INTERFACE: Array<[keyof CreateParamInterfaceRequest, string]> = [
  ['code', 'code'],
  ['componentPath', 'componentPath'],
];

export function createReportNameService({
  session,
}: {
  session: Session;
}): ReportNameService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async list(params) {
      return expectData<AdminListEnvelope<InspectionReportName>>(
        await reportNamesListReportNames(params, headers()),
        200,
        '报告名称列表失败',
      );
    },
    async get(code) {
      return expectData<InspectionReportName>(
        await reportNamesGetReportName(code, headers()),
        200,
        '报告名称详情失败',
      );
    },
    async create(input) {
      for (const [field] of REQUIRED_REPORT_NAME) {
        if (!String((input as unknown as Record<string, unknown>)[field] ?? '').trim()) {
          throw new Error(`${field} 缺失——创建报告名称必填项不得为空（ADR-0019）`);
        }
      }
      return expectData<InspectionReportName>(
        await reportNamesCreateReportName(input, headers()),
        200,
        '创建报告名称失败',
      );
    },
    async update(code, input) {
      const body = dropUndefined(
        input as unknown as Record<string, unknown>,
        '更新载荷为空——PUT 无变更不发',
      );
      return expectData<InspectionReportName>(
        await reportNamesUpdateReportName(
          code,
          body as UpdateInspectionReportNameRequest,
          headers(),
        ),
        200,
        '更新报告名称失败',
      );
    },
    async remove(code) {
      await expectNoContent(
        await reportNamesDeleteReportName(code, headers()),
        '删除报告名称失败',
      );
    },
    async linkObject(link) {
      await expectNoContent(
        await reportNamesLinkObjectReportName(link, headers()),
        '项目↔报告名称关联失败',
      );
    },
    async linkStandard(link) {
      await expectNoContent(
        await reportNamesLinkReportNameStandard(link, headers()),
        '报告名称↔标准关联失败',
      );
    },
    async linkParameter(link) {
      await expectNoContent(
        await reportNamesLinkReportNameParameter(link, headers()),
        '报告名称↔参数关联失败',
      );
    },
  };
}

export function createParamInterfaceService({
  session,
}: {
  session: Session;
}): ParamInterfaceService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async list(params) {
      return expectData<AdminListEnvelope<ParamInterface>>(
        await paramInterfacesListParamInterfaces(params, headers()),
        200,
        '参数界面列表失败',
      );
    },
    async get(code) {
      return expectData<ParamInterface>(
        await paramInterfacesGetParamInterface(code, headers()),
        200,
        '参数界面详情失败',
      );
    },
    async create(input) {
      for (const [field] of REQUIRED_PARAM_INTERFACE) {
        if (!String((input as unknown as Record<string, unknown>)[field] ?? '').trim()) {
          throw new Error(`${field} 缺失——创建参数界面必填项不得为空（ADR-0019）`);
        }
      }
      return expectData<ParamInterface>(
        await paramInterfacesCreateParamInterface(input, headers()),
        200,
        '创建参数界面失败',
      );
    },
    async update(code, input) {
      const body = dropUndefined(
        input as unknown as Record<string, unknown>,
        '更新载荷为空——PUT 无变更不发',
      );
      return expectData<ParamInterface>(
        await paramInterfacesUpdateParamInterface(
          code,
          body as UpdateParamInterfaceRequest,
          headers(),
        ),
        200,
        '更新参数界面失败',
      );
    },
    async remove(code) {
      await expectNoContent(
        await paramInterfacesDeleteParamInterface(code, headers()),
        '删除参数界面失败',
      );
    },
    async link(link) {
      await expectNoContent(
        await paramInterfacesLinkParamInterface(link, headers()),
        '参数↔界面关联失败',
      );
    },
  };
}

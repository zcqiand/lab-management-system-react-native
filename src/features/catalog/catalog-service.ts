/**
 * 码表四页消费编排（REQ-2026-037 L-T3 / M04.F06-F09 十六 op）。
 *
 * 只做编排：装配（catalog-view）→ orval 生成 client → 失败归一抛错。
 * 四域结构同形共用 CatalogEntryOps 门面；list 按 op 级 @doc 回显全量
 * （{items,page,pageSize,total}）；create 成功态 200；update 是 PUT
 * （body 全可选，code 为路径主键不可变）；delete 204。鉴权走
 * options.headers 通道（生成物不动）。
 */
import type {
  ErrorResponse,
  InspectionBrand,
  InspectionGrade,
  InspectionModel,
  InspectionSpec,
} from '../../api/endpoints/model';
import {
  catalogCreateBrand,
  catalogCreateGrade,
  catalogCreateModel,
  catalogCreateSpec,
  catalogDeleteBrand,
  catalogDeleteGrade,
  catalogDeleteModel,
  catalogDeleteSpec,
  catalogListBrands,
  catalogListGrades,
  catalogListModels,
  catalogListSpecs,
  catalogUpdateBrand,
  catalogUpdateGrade,
  catalogUpdateModel,
  catalogUpdateSpec,
} from '../../api/endpoints/inspection-catalog/inspection-catalog';
import type {Session} from '../../session/session';
import type {CatalogEntryCreateInput, CatalogEntryUpdateInput} from './catalog-view';
import {assembleEntryCreateBody, assembleEntryUpdateBody} from './catalog-view';

export interface CatalogListParams {
  page?: number;
  pageSize?: number;
  inspectionObjectCode?: string;
  keyword?: string;
}

export interface CatalogListEnvelope<E> {
  items: E[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CatalogEntryOps<E> {
  list(params?: CatalogListParams): Promise<CatalogListEnvelope<E>>;
  create(input: CatalogEntryCreateInput): Promise<E>;
  update(code: string, input: CatalogEntryUpdateInput): Promise<E>;
  remove(code: string): Promise<void>;
}

export interface CatalogAdminService {
  models: CatalogEntryOps<InspectionModel>;
  specs: CatalogEntryOps<InspectionSpec>;
  grades: CatalogEntryOps<InspectionGrade>;
  brands: CatalogEntryOps<InspectionBrand>;
}

function fail(status: number, body: unknown, fallback: string): Error {
  const parts: string[] = [];
  if (typeof body === 'object' && body !== null) {
    const code = (body as {code?: unknown}).code;
    const message = (body as {message?: unknown}).message;
    if (code) parts.push(String(code));
    if (message) parts.push(String(message));
  }
  return new Error(parts.join('：') || fallback);
}

async function expectData<T>(
  response: {data: T | ErrorResponse; status: number},
  ok: number,
  fallback: string,
): Promise<T> {
  if (response.status !== ok) {
    throw fail(
      response.status,
      response.data as ErrorResponse,
      `${fallback}（HTTP ${response.status}）`,
    );
  }
  return response.data as T;
}

async function expectNoContent(
  response: {data: void | ErrorResponse; status: number},
  fallback: string,
): Promise<void> {
  if (response.status !== 204) {
    throw fail(
      response.status,
      response.data as ErrorResponse,
      `${fallback}（HTTP ${response.status}）`,
    );
  }
}

export function createCatalogService({session}: {session: Session}): CatalogAdminService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    models: {
      list: async params =>
        expectData<CatalogListEnvelope<InspectionModel>>(
          await catalogListModels(params, headers()),
          200,
          '型号列表失败',
        ),
      create: async input =>
        expectData<InspectionModel>(
          await catalogCreateModel(assembleEntryCreateBody(input), headers()),
          200,
          '创建型号失败',
        ),
      update: async (code, input) =>
        expectData<InspectionModel>(
          await catalogUpdateModel(code, assembleEntryUpdateBody(input), headers()),
          200,
          '更新型号失败',
        ),
      remove: async code => {
        await expectNoContent(await catalogDeleteModel(code, headers()), '删除型号失败');
      },
    },
    specs: {
      list: async params =>
        expectData<CatalogListEnvelope<InspectionSpec>>(
          await catalogListSpecs(params, headers()),
          200,
          '规格列表失败',
        ),
      create: async input =>
        expectData<InspectionSpec>(
          await catalogCreateSpec(assembleEntryCreateBody(input), headers()),
          200,
          '创建规格失败',
        ),
      update: async (code, input) =>
        expectData<InspectionSpec>(
          await catalogUpdateSpec(code, assembleEntryUpdateBody(input), headers()),
          200,
          '更新规格失败',
        ),
      remove: async code => {
        await expectNoContent(await catalogDeleteSpec(code, headers()), '删除规格失败');
      },
    },
    grades: {
      list: async params =>
        expectData<CatalogListEnvelope<InspectionGrade>>(
          await catalogListGrades(params, headers()),
          200,
          '等级列表失败',
        ),
      create: async input =>
        expectData<InspectionGrade>(
          await catalogCreateGrade(assembleEntryCreateBody(input), headers()),
          200,
          '创建等级失败',
        ),
      update: async (code, input) =>
        expectData<InspectionGrade>(
          await catalogUpdateGrade(code, assembleEntryUpdateBody(input), headers()),
          200,
          '更新等级失败',
        ),
      remove: async code => {
        await expectNoContent(await catalogDeleteGrade(code, headers()), '删除等级失败');
      },
    },
    brands: {
      list: async params =>
        expectData<CatalogListEnvelope<InspectionBrand>>(
          await catalogListBrands(params, headers()),
          200,
          '牌号列表失败',
        ),
      create: async input =>
        expectData<InspectionBrand>(
          await catalogCreateBrand(assembleEntryCreateBody(input), headers()),
          200,
          '创建牌号失败',
        ),
      update: async (code, input) =>
        expectData<InspectionBrand>(
          await catalogUpdateBrand(code, assembleEntryUpdateBody(input), headers()),
          200,
          '更新牌号失败',
        ),
      remove: async code => {
        await expectNoContent(await catalogDeleteBrand(code, headers()), '删除牌号失败');
      },
    },
  };
}

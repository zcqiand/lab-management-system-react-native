/**
 * 码表四页视图装配（REQ-2026-037 L-T3 / M04.F06-F09）。
 *
 * 四域（型号/规格/等级/牌号）结构同形（code 主键 + 检测专项过滤），共用一套
 * 行派生与装配：create 必填 code/name fail-fast（ADR-0019）；update 是 PUT
 * （body 全可选），空载荷禁发。
 */
import type {
  CreateCatalogEntryRequest,
  UpdateCatalogEntryRequest,
} from '../../api/endpoints/model';

export interface CatalogEntryLike {
  code: string;
  inspectionObjectCode?: string;
  name: string;
  remark?: string;
  sortOrder: number;
}

export interface CatalogRow {
  code: string;
  name: string;
  inspectionObjectCode?: string;
  remark?: string;
  sortOrder: number;
}

export interface CatalogEntryCreateInput {
  code: string;
  name: string;
  inspectionObjectCode?: string;
  remark?: string;
  sortOrder?: number;
}

export interface CatalogEntryUpdateInput {
  inspectionObjectCode?: string;
  name?: string;
  remark?: string;
  sortOrder?: number;
}

export function buildEntryRows<E extends CatalogEntryLike>(entries: E[]): CatalogRow[] {
  return entries.map(entry => ({
    code: entry.code,
    name: entry.name,
    inspectionObjectCode: entry.inspectionObjectCode,
    remark: entry.remark,
    sortOrder: entry.sortOrder,
  }));
}

const REQUIRED_CREATE: Array<keyof CatalogEntryCreateInput> = ['code', 'name'];

export function assembleEntryCreateBody(
  input: CatalogEntryCreateInput,
): CreateCatalogEntryRequest {
  for (const field of REQUIRED_CREATE) {
    if (!String(input[field] ?? '').trim()) {
      throw new Error(`${field} 缺失——创建码表条目必填项不得为空（ADR-0019）`);
    }
  }
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    inspectionObjectCode: input.inspectionObjectCode,
    remark: input.remark,
    sortOrder: input.sortOrder,
  };
}

export function assembleEntryUpdateBody(
  input: CatalogEntryUpdateInput,
): UpdateCatalogEntryRequest {
  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(body).length === 0) {
    throw new Error('更新载荷为空——PUT 无变更不发');
  }
  return body as UpdateCatalogEntryRequest;
}

/**
 * 合同消费面视图派生与装配（REQ-2026-037 L-T2 / M02.F01）。
 *
 * 纯函数：行/详情视图 + create/update 装配 fail-fast（必填缺失 throw，ADR-0019）
 * + 状态二态文案。list 信封按 op 级 @doc：回显全量不切片。
 */
import type {
  Contract,
  CreateContractRequest,
  UpdateContractRequest,
} from '../../api/endpoints/model';

export interface ContractCreateInput {
  contractCode: string;
  clientUnit: string;
  projectName: string;
  projectLocation?: string;
  constructionUnit: string;
  inspectionSpecialtyCode?: string;
  buildingUnit?: string;
  supervisorUnit?: string;
  inspectionPerson?: string;
  inspectionPhone?: string;
  witnessUnit: string;
  witness: string;
  witnessPhone?: string;
  contactPerson?: string;
  contactPhone?: string;
  entrustedDate?: string;
}

export interface ContractRow {
  id: string;
  contractCode: string;
  clientUnit: string;
  projectName: string;
  statusLabel: string;
}

export interface ContractDetail extends ContractRow {
  tenantId: string;
  constructionUnit: string;
  witnessUnit: string;
  witness: string;
  statusLabel: string;
}

const REQUIRED: Array<{field: keyof ContractCreateInput; label: string}> = [
  {field: 'contractCode', label: 'contractCode'},
  {field: 'clientUnit', label: 'clientUnit'},
  {field: 'projectName', label: 'projectName'},
  {field: 'constructionUnit', label: 'constructionUnit'},
  {field: 'witnessUnit', label: 'witnessUnit'},
  {field: 'witness', label: 'witness'},
];

export function contractStatusLabel(status: Contract['status']): string {
  return status === 'archived' ? '已归档' : '生效中';
}

export function buildContractRows(items: Contract[]): ContractRow[] {
  return items.map(item => ({
    id: item.id,
    contractCode: item.contractCode,
    clientUnit: item.clientUnit,
    projectName: item.projectName,
    statusLabel: contractStatusLabel(item.status),
  }));
}

export function buildContractDetail(item: Contract): ContractDetail {
  return {
    id: item.id,
    tenantId: item.tenantId,
    contractCode: item.contractCode,
    clientUnit: item.clientUnit,
    projectName: item.projectName,
    constructionUnit: item.constructionUnit,
    witnessUnit: item.witnessUnit,
    witness: item.witness,
    statusLabel: contractStatusLabel(item.status),
  };
}

export function assembleCreateContractBody(
  input: ContractCreateInput,
): CreateContractRequest {
  for (const {field, label} of REQUIRED) {
    if (!String(input[field] ?? '').trim()) {
      throw new Error(`${label} 缺失——创建合同必填项不得为空（ADR-0019）`);
    }
  }
  // status 不带：BASE 契约服务端默认 ACTIVE
  return {
    contractCode: input.contractCode,
    clientUnit: input.clientUnit,
    projectName: input.projectName,
    projectLocation: input.projectLocation,
    constructionUnit: input.constructionUnit,
    inspectionSpecialtyCode: input.inspectionSpecialtyCode,
    buildingUnit: input.buildingUnit,
    supervisorUnit: input.supervisorUnit,
    inspectionPerson: input.inspectionPerson,
    inspectionPhone: input.inspectionPhone,
    witnessUnit: input.witnessUnit,
    witness: input.witness,
    witnessPhone: input.witnessPhone,
    contactPerson: input.contactPerson,
    contactPhone: input.contactPhone,
    entrustedDate: input.entrustedDate,
  };
}

export function assembleUpdateContractBody(
  input: UpdateContractRequest,
): UpdateContractRequest {
  const body = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(body).length === 0) {
    throw new Error('更新载荷为空——PATCH 语义禁发空载荷');
  }
  return body as UpdateContractRequest;
}

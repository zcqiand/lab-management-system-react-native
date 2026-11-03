/**
 * 合同消费编排（REQ-2026-037 L-T2 / M02.F01.I01-I05）。
 *
 * 只做编排：装配（contract-view）→ orval 生成 client → 失败归一抛错。
 * 鉴权走 options.headers 通道（生成物不动）；list 信封按 op 级 @doc
 * 回显全量（{items,page,pageSize,total}），create 成功态 200。
 */
import type {
  Contract,
  ContractsListContracts200,
  ContractsListContractsParams,
  UpdateContractRequest,
} from '../../api/endpoints/model';
import {
  contractsCreateContract,
  contractsDeleteContract,
  contractsGetContract,
  contractsListContracts,
  contractsUpdateContract,
} from '../../api/endpoints/contracts/contracts';
import type {Session} from '../../session/session';
import type {ContractCreateInput} from './contract-view';
import {assembleCreateContractBody, assembleUpdateContractBody} from './contract-view';

export interface ContractService {
  listContracts(
    params?: ContractsListContractsParams,
  ): Promise<ContractsListContracts200>;
  getContract(id: string): Promise<Contract>;
  createContract(input: ContractCreateInput): Promise<Contract>;
  updateContract(id: string, input: UpdateContractRequest): Promise<Contract>;
  removeContract(id: string): Promise<void>;
}

export function createContractService({session}: {session: Session}): ContractService {
  const fail = (status: number, body: unknown, fallback: string): Error => {
    const parts: string[] = [];
    if (typeof body === 'object' && body !== null) {
      const code = (body as {code?: unknown}).code;
      const message = (body as {message?: unknown}).message;
      if (code) parts.push(String(code));
      if (message) parts.push(String(message));
    }
    return new Error(parts.join('：') || fallback);
  };

  const headers = (): RequestInit => ({headers: session.authHeaders()});

  return {
    async listContracts(params) {
      const response = await contractsListContracts(params, headers());
      if (response.status !== 200) {
        throw fail(
          response.status,
          response.data,
          `合同列表失败（HTTP ${response.status}）`,
        );
      }
      return response.data;
    },

    async getContract(id) {
      const response = await contractsGetContract(id, headers());
      if (response.status !== 200) {
        throw fail(
          response.status,
          response.data,
          `合同详情失败（HTTP ${response.status}）`,
        );
      }
      return response.data;
    },

    async createContract(input) {
      const response = await contractsCreateContract(
        assembleCreateContractBody(input),
        headers(),
      );
      if (response.status !== 200) {
        throw fail(
          response.status,
          response.data,
          `创建合同失败（HTTP ${response.status}）`,
        );
      }
      return response.data;
    },

    async updateContract(id, input) {
      const response = await contractsUpdateContract(
        id,
        assembleUpdateContractBody(input),
        headers(),
      );
      if (response.status !== 200) {
        throw fail(
          response.status,
          response.data,
          `更新合同失败（HTTP ${response.status}）`,
        );
      }
      return response.data;
    },

    async removeContract(id) {
      const response = await contractsDeleteContract(id, headers());
      if (response.status !== 204) {
        throw fail(
          response.status,
          response.data,
          `删除合同失败（HTTP ${response.status}）`,
        );
      }
    },
  };
}

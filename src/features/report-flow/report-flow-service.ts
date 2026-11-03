/**
 * 报告流消费编排（REQ-2026-037 L-T5 / M03.F05-F09）。
 *
 * 只做编排：装配（receipt-view 的 assembleFlowAction）→ orval 生成 client →
 * 失败归一抛错。四阶段 act（review/approve/issuance/archived）共用一个 act 工厂，
 * operator 从会话注入（缺失 fail-fast，ADR-0019）；各阶段查看详情与 F01.I02 共
 * 端点 GET /{id}；详情聚合 = 详情 + 流程历史并发取。
 */
import type {
  FlowActionResult,
  FlowHistoryEntry,
  SampleReceipt,
} from '../../api/endpoints/model';
import {
  receiptsActFlowApprove,
  receiptsActFlowArchived,
  receiptsActFlowIssuance,
  receiptsActFlowReview,
  receiptsGetReceipt,
  receiptsGetReceiptHistory,
} from '../../api/endpoints/receipts/receipts';
import type {Session} from '../../session/session';
import type {FlowActionInput} from '../receipts/receipt-view';
import {assembleFlowAction} from '../receipts/receipt-view';
import {expectData} from '../shared/http';

export interface ReportDetailAggregate {
  receipt: SampleReceipt;
  history: FlowHistoryEntry[];
}

export interface ReportFlowService {
  getDetail(id: string): Promise<SampleReceipt>;
  getDetailAggregate(id: string): Promise<ReportDetailAggregate>;
  actReview(input: FlowActionInput): Promise<FlowActionResult[]>;
  actApprove(input: FlowActionInput): Promise<FlowActionResult[]>;
  actIssuance(input: FlowActionInput): Promise<FlowActionResult[]>;
  actArchived(input: FlowActionInput): Promise<FlowActionResult[]>;
}

export function createReportFlowService({
  session,
}: {
  session: Session;
}): ReportFlowService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  const operator = (): string => {
    const user = session.snapshot()?.user;
    const name = user?.displayName || user?.username;
    if (!name || !name.trim()) {
      throw new Error('operator 缺失——流程动作必须来自登录会话（ADR-0019）');
    }
    return name;
  };

  const getDetail = async (id: string): Promise<SampleReceipt> =>
    expectData<SampleReceipt>(
      await receiptsGetReceipt(id, headers()),
      200,
      '查看详情失败',
    );

  const act =
    (op: typeof receiptsActFlowReview, label: string) =>
    async (input: FlowActionInput): Promise<FlowActionResult[]> =>
      expectData<FlowActionResult[]>(
        await op(assembleFlowAction(input, operator()), headers()),
        200,
        label,
      );

  return {
    getDetail,

    async getDetailAggregate(id) {
      const [receipt, history] = await Promise.all([
        getDetail(id),
        expectData<FlowHistoryEntry[]>(
          await receiptsGetReceiptHistory(id, headers()),
          200,
          '流程历史失败',
        ),
      ]);
      return {receipt, history};
    },

    actReview: act(receiptsActFlowReview, '报告审核提交失败'),
    actApprove: act(receiptsActFlowApprove, '报告批准提交失败'),
    actIssuance: act(receiptsActFlowIssuance, '报告发放提交失败'),
    actArchived: act(receiptsActFlowArchived, '报告归档提交失败'),
  };
}

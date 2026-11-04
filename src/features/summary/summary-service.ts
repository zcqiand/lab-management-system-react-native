/**
 * 汇总消费编排（REQ-2026-037 L-T6 / M05.F01）。
 *
 * 只做编排：orval 生成 client → 失败归一抛错。汇总表查询参数直传；
 * categoryCode=ALL 语义为不过滤（置 undefined，生成端 URL builder 略过空参）。
 */
import type {
  DashboardStats,
  SummaryData,
  SummaryGetReportSummaryParams,
} from '../../api/endpoints/model';
import {
  summaryGetDashboardStats,
  summaryGetReportSummary,
} from '../../api/endpoints/summary/summary';
import type {Session} from '../../session/session';
import {expectData} from '../shared/http';

export interface SummaryQueryInput {
  categoryCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SummaryService {
  getReportSummary(params?: SummaryQueryInput): Promise<SummaryData>;
  getDashboardStats(): Promise<DashboardStats>;
}

export function createSummaryService({session}: {session: Session}): SummaryService {
  const headers = (): RequestInit => ({headers: session.authHeaders()});

  const toQuery = (
    params?: SummaryQueryInput,
  ): SummaryGetReportSummaryParams | undefined => {
    if (!params) {
      return undefined;
    }
    return {
      ...params,
      categoryCode:
        params.categoryCode && params.categoryCode !== 'ALL'
          ? params.categoryCode
          : undefined,
    };
  };

  return {
    async getReportSummary(params) {
      return expectData<SummaryData>(
        await summaryGetReportSummary(toQuery(params), headers()),
        200,
        '获取汇总失败',
      );
    },

    async getDashboardStats() {
      return expectData<DashboardStats>(
        await summaryGetDashboardStats(headers()),
        200,
        '获取统计失败',
      );
    },
  };
}

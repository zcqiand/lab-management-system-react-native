/**
 * 汇总派生视图（REQ-2026-037 L-T6 / M05.F01）。
 *
 * 纯函数派生：四基数卡 / 核心指标卡 / 任务漏斗。不碰 fetch，不碰 React。
 */
import type {DashboardStats} from '../../api/endpoints/model';

export interface Card {
  label: string;
  value: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface CoreCards {
  todayTestCount: number;
  qualifiedRateByMaterial: DashboardStats['qualifiedRateByMaterial'];
  reportOutputByStatus: DashboardStats['reportOutputByStatus'];
}

const FUNNEL_STAGES = [
  'pending_collect',
  'received',
  'testing',
  'reporting',
  'reviewing',
  'issued',
] as const;

export function buildDashboardCards(stats: DashboardStats): Card[] {
  const reportCount =
    stats.reportCountByStatus.draft +
    stats.reportCountByStatus.reviewing +
    stats.reportCountByStatus.issued;
  return [
    {label: '合同', value: stats.contractCount},
    {label: '委托', value: stats.receiptCount},
    {label: '样品', value: stats.sampleCount},
    {label: '报告', value: reportCount},
  ];
}

export function buildCoreCards(stats: DashboardStats): CoreCards {
  return {
    todayTestCount: stats.todayTestCount,
    qualifiedRateByMaterial: stats.qualifiedRateByMaterial,
    reportOutputByStatus: stats.reportOutputByStatus,
  };
}

export function buildFunnel(stats: DashboardStats): FunnelStage[] {
  return FUNNEL_STAGES.map(stage => ({
    stage,
    count: stats.funnelByStage[stage],
  }));
}

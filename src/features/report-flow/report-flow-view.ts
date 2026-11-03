/**
 * 报告流视图装配（REQ-2026-037 L-T5 / M03.F05-F09）。
 *
 * 三态过滤器 re-export 自 receipts（NEXT_STAGE 已扩全七段：review→approval→
 * issuance→archived→completed）；报告预览为纯视图派生：categoryCode 定位报告
 * 模板，reportCode 发放后才生成（可空），categoryCode 缺失 fail-fast（ADR-0019）。
 */
import type {SampleReceipt} from '../../api/endpoints/model';

export {flowStatusForFilter} from '../receipts/receipt-view';
export type {FlowStage, FlowFilter} from '../receipts/receipt-view';

export interface ReportPreview {
  templateCode: string;
  reportCode?: string;
}

export function buildReportPreview(receipt: SampleReceipt): ReportPreview {
  const templateCode = receipt.categoryCode;
  if (!templateCode || !templateCode.trim()) {
    throw new Error('categoryCode 缺失——报告预览必须能定位模板（ADR-0019）');
  }
  return {templateCode, reportCode: receipt.reportCode};
}

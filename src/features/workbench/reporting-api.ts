import {
  buildWorkbenchUrl,
  fetchWorkbenchMutation,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";
import { buildReportBatchCallerHeaders } from "@/features/workbench/reporting-api-headers";
import type {
  ArchivedDocumentMetadataResponse,
  ReportBatchHandleResponse,
  ReportBatchStatusResponse,
  ReportBatchWorkerRunResponse,
} from "@/features/workbench/types";

export async function createPortfolioReportBatch(params: {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
  sections?: string[];
  benchmarkCode?: string;
}): Promise<ReportBatchHandleResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  const correlationId = `corr-workbench-report-batch-${params.portfolioId}-${params.asOfDate}`;
  const idempotencyKey = [
    "workbench-report-batch",
    params.portfolioId,
    params.asOfDate,
    params.reportingCurrency,
  ].join("-");

  return await observeWorkbenchMutation(
    "reporting.report-batch.create",
    async () =>
      await fetchWorkbenchMutation<ReportBatchHandleResponse>(
        buildWorkbenchUrl("client", "/report-batches"),
        "create report batch",
        {
          method: "POST",
          headers: {
            ...buildReportBatchCallerHeaders({
              actorId,
              tenantId,
              region,
              bookingCenterCode: params.bookingCenterCode,
              correlationId,
            }),
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            selector_mode: "explicit_portfolio_list",
            portfolio_ids: [params.portfolioId],
            source_candidates: [
              {
                portfolio_id: params.portfolioId,
                tenant_id: tenantId,
                region,
                active: true,
                selected: true,
                source_system: "lotus-core",
                source_object: "PortfolioScope",
              },
            ],
            as_of_date: params.asOfDate,
            requested_output_formats: ["pdf"],
            reporting_currency: params.reportingCurrency,
            options: {
              sections: params.sections ?? ["OVERVIEW", "PERFORMANCE", "RISK_ANALYTICS"],
              ...(params.benchmarkCode ? { benchmark_code: params.benchmarkCode } : {}),
              source_surface: "lotus-workbench",
            },
            max_batch_size: 1,
          }),
        }
      )
  );
}

export async function getReportBatchStatus(
  batchId: string,
  params: {
    tenantId?: string;
    region?: string;
    bookingCenterCode?: string | null;
    actorId?: string;
  } = {}
): Promise<ReportBatchStatusResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  return await observeWorkbenchResource(
    "reporting.report-batch.status",
    async () =>
      await fetchWorkbenchMutation<ReportBatchStatusResponse>(
        buildWorkbenchUrl("client", `/report-batches/${encodeURIComponent(batchId)}`),
        "report batch status",
        {
          method: "GET",
          headers: buildReportBatchCallerHeaders({
            actorId,
            tenantId,
            region,
            bookingCenterCode: params.bookingCenterCode,
            correlationId: `corr-workbench-report-batch-status-${batchId}`,
          }),
        }
      )
  );
}

export async function runReportBatchOnce(params: {
  batchId: string;
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
}): Promise<ReportBatchWorkerRunResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  return await observeWorkbenchMutation(
    "reporting.report-batch.run-once",
    async () =>
      await fetchWorkbenchMutation<ReportBatchWorkerRunResponse>(
        buildWorkbenchUrl(
          "client",
          `/report-batches/${encodeURIComponent(params.batchId)}:run-once`
        ),
        "run report batch",
        {
          method: "POST",
          headers: buildReportBatchCallerHeaders({
            actorId,
            tenantId,
            region,
            bookingCenterCode: params.bookingCenterCode,
            correlationId: `corr-workbench-report-batch-run-${params.batchId}`,
          }),
          body: JSON.stringify({
            worker_id: "lotus-workbench-report-batch-operator",
            recover_expired_leases: true,
            dispatch_policy: {
              max_active_batches: 100,
              max_active_items: 100,
              max_active_upstream_jobs: 100,
              max_active_render_jobs: 100,
              max_active_archive_jobs: 100,
              lease_seconds: 300,
            },
            runtime_load: {
              active_batches: 0,
              active_items: 0,
              active_upstream_jobs: 0,
              active_render_jobs: 0,
              active_archive_jobs: 0,
            },
          }),
        }
      )
  );
}

export async function getArchivedDocumentMetadata(
  documentId: string,
  params: {
    current?: boolean;
    tenantId?: string;
    region?: string;
    bookingCenterCode?: string | null;
    actorId?: string;
  } = {}
): Promise<ArchivedDocumentMetadataResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-report-operator";
  const query = new URLSearchParams();
  if (params.current) {
    query.set("current", "true");
  }

  return await observeWorkbenchResource(
    "reporting.archive-document.metadata",
    async () =>
      await fetchWorkbenchMutation<ArchivedDocumentMetadataResponse>(
        buildWorkbenchUrl("client", `/documents/${encodeURIComponent(documentId)}`, query),
        "load archived document metadata",
        {
          method: "GET",
          headers: buildReportBatchCallerHeaders({
            actorId,
            tenantId,
            region,
            bookingCenterCode: params.bookingCenterCode,
            correlationId: "corr-workbench-archive-document-metadata",
          }),
        }
      )
  );
}

export function buildArchivedDocumentDownloadUrl(documentId: string): string {
  return buildWorkbenchUrl("client", `/documents/${encodeURIComponent(documentId)}/download`);
}

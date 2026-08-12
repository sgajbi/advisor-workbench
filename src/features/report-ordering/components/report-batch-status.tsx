"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";

import type { ReportBatchStatus } from "../contracts";
import styles from "../report-ordering-workspace.module.css";

export function ReportBatchStatusPanel({
  status,
  error,
  onRefresh,
}: {
  status: ReportBatchStatus | null;
  error: string | null;
  onRefresh: () => void;
}) {
  const summary = status ? buildBatchSummary(status) : null;
  const lifecycle = status ? batchLifecycle(status.status) : null;
  const supportPosture = status ? batchSupportPosture(status) : null;
  return (
    <SectionBlock
      title="Portfolio bundle progress"
      subtitle="Each portfolio produces a separate report outcome. Archive and client delivery remain separate controls."
      className={styles.section}
      actions={
        <ActionButton priority="quiet" onClick={onRefresh}>Refresh outcomes</ActionButton>
      }
    >
      {error ? (
        <ScreenStatePanel
          kind="error"
          title="Current outcomes unavailable"
          body={error}
          action={<ActionButton onClick={onRefresh}>Try Again</ActionButton>}
        />
      ) : (
        <>
        {summary ? (
          <div className={styles.batchSummary} aria-label="Portfolio bundle summary">
            <div>
              <span>Batch status</span>
              <strong><SemanticBadge tone={lifecycle?.tone}>{lifecycle?.label}</SemanticBadge></strong>
            </div>
            <div><span>Portfolio reports</span><strong>{status?.item_count}</strong></div>
            <div><span>Complete</span><strong>{summary.complete}</strong></div>
            <div><span>In progress</span><strong>{summary.inProgress}</strong></div>
            <div><span>Needs attention</span><strong>{summary.attention}</strong></div>
            <div><span>Cancelled</span><strong>{summary.cancelled}</strong></div>
            <div className={styles.batchProgress}>
              <span>Completion</span>
              <div
                className={styles.batchProgressTrack}
                role="progressbar"
                aria-label="Portfolio bundle completion"
                aria-valuemin={0}
                aria-valuemax={status?.item_count ?? 0}
                aria-valuenow={summary.settled}
              >
                <span style={{ width: `${summary.completionPercent}%` }} />
              </div>
              <strong>{summary.completionPercent}%</strong>
            </div>
          </div>
        ) : null}
        {supportPosture ? (
          <div aria-label="Portfolio bundle support posture">
            <ScreenStatePanel
              kind={supportPosture.kind}
              title={supportPosture.title}
              body={supportPosture.body}
            />
          </div>
        ) : null}
        <AnalyticsTable
          ariaLabel="Portfolio report bundle outcomes"
          density="compact"
          variant="portfolio"
          loadingState={!status ? {
            title: "Loading portfolio outcomes",
            body: "Reading the source-owned report bundle lifecycle.",
          } : undefined}
          emptyState={{
            title: "No portfolio outcomes available",
            body: "The accepted bundle has not published portfolio outcomes yet.",
          }}
          columns={[
            { key: "portfolio", label: "Portfolio" },
            { key: "status", label: "Outcome" },
            { key: "attempts", label: "Attempts" },
            { key: "support", label: "Support" },
          ]}
          rows={(status?.items ?? []).map((item) => {
            const outcome = batchItemOutcome(item.status, item.retry_eligible);
            return {
              key: item.batch_item_id,
              cells: [
                item.portfolio_id,
                <div key={`${item.batch_item_id}-outcome`} className={styles.historyStatus}>
                  <SemanticBadge tone={outcome.tone}>{outcome.label}</SemanticBadge>
                  <small>{item.last_error_summary ?? outcome.detail}</small>
                </div>,
                String(item.attempt_count),
                <details key={`${item.batch_item_id}-support`} className={styles.supportDisclosure}>
                  <summary>View</summary>
                  <code>{item.report_job_id ?? item.batch_item_id}</code>
                </details>,
              ],
            };
          })}
        />
        </>
      )}
    </SectionBlock>
  );
}

function batchSupportPosture(status: ReportBatchStatus) {
  const renderState = status.render_supportability?.state.toLocaleLowerCase();
  const requestedOutputUnsupported = Boolean(
    status.render_supportability &&
    status.requested_output_formats.some(
      (outputFormat) => !status.render_supportability?.supported_output_formats.includes(outputFormat),
    ),
  );
  const governedDocumentRequested = status.requested_output_formats.some(
    (outputFormat) => outputFormat.toLocaleLowerCase() !== "json",
  );
  if (
    requestedOutputUnsupported ||
    (governedDocumentRequested &&
      (renderState === "unavailable" ||
        status.render_supportability?.deterministic_output_supported === false))
  ) {
    return {
      kind: "unavailable" as const,
      title: "Requested output unavailable",
      body: "Portfolio report data may be complete, but Reporting cannot currently create the requested governed output. Refresh after output services recover; nothing has been archived or delivered.",
    };
  }
  if (governedDocumentRequested && renderState === "degraded") {
    return {
      kind: "partial" as const,
      title: "Requested output has limitations",
      body: "Portfolio report data may be complete, but the source reports limitations in governed output creation. Review the requested format and refresh before relying on a document.",
    };
  }

  const reportingState = status.supportability?.state.toLocaleLowerCase();
  if (reportingState === "unavailable") {
    return {
      kind: "unavailable" as const,
      title: "Reporting support unavailable",
      body: "The source cannot currently confirm full reporting support for this bundle. Keep the portfolio outcomes for review and refresh before taking any document action.",
    };
  }
  if (reportingState === "degraded") {
    return {
      kind: "partial" as const,
      title: "Reporting support has limitations",
      body: "The source reports limited support for this bundle. Review portfolio outcomes and refresh before relying on the report pack as complete.",
    };
  }
  return null;
}

function batchLifecycle(status: ReportBatchStatus["status"]) {
  if (status === "completed") return { label: "Complete", tone: "success" as const };
  if (status === "completed_with_failures") return { label: "Complete with attention", tone: "warn" as const };
  if (status === "failed") return { label: "Failed", tone: "danger" as const };
  if (status === "cancelled") return { label: "Cancelled", tone: "default" as const };
  if (status === "paused") return { label: "Paused", tone: "warn" as const };
  if (status === "running") return { label: "In progress", tone: "default" as const };
  return { label: "Queued", tone: "default" as const };
}

function buildBatchSummary(status: ReportBatchStatus) {
  const complete = status.items.filter((item) => item.status === "succeeded").length;
  const attention = status.items.filter((item) =>
    item.status === "failed_retryable" || item.status === "failed_terminal",
  ).length;
  const cancelled = status.items.filter((item) => item.status === "cancelled").length;
  const inProgress = status.items.filter((item) =>
    item.status === "materialized" ||
    item.status === "leased" ||
    item.status === "waiting_on_report_job" ||
    item.status === "recovery_pending"
  ).length;
  const settled = complete + attention + cancelled;
  return {
    complete,
    attention,
    cancelled,
    inProgress,
    settled,
    completionPercent: status.item_count === 0 ? 0 : Math.round((settled / status.item_count) * 100),
  };
}

function batchItemOutcome(status: ReportBatchStatus["items"][number]["status"], retryEligible: boolean) {
  if (status === "succeeded") {
    return { label: "Report data complete", detail: "Report data is complete for this portfolio.", tone: "success" as const };
  }
  if (status === "failed_retryable") {
    return { label: "Needs retry", detail: retryEligible ? "Reporting allows a controlled retry." : "Retry is not currently available.", tone: "warn" as const };
  }
  if (status === "failed_terminal") {
    return { label: "Not completed", detail: "This portfolio report did not complete.", tone: "danger" as const };
  }
  if (status === "cancelled") {
    return { label: "Cancelled", detail: "This portfolio report was cancelled.", tone: "default" as const };
  }
  if (status === "waiting_on_report_job" || status === "leased") {
    return { label: "In progress", detail: "Report creation is in progress.", tone: "default" as const };
  }
  if (status === "recovery_pending") {
    return { label: "Recovery pending", detail: "Reporting is recovering this portfolio item.", tone: "warn" as const };
  }
  return { label: "Queued", detail: "This portfolio is queued for report creation.", tone: "default" as const };
}

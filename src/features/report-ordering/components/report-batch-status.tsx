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
            { key: "position", label: "Order" },
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
                String(item.item_position),
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
      )}
    </SectionBlock>
  );
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

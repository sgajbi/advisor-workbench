"use client";

import { ActionButton, AnalyticsTable, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";

import type { ReportRequestRow } from "../view-model";
import styles from "../report-ordering-workspace.module.css";

export function ReportRequestHistory({
  rows,
  state,
  error,
  onRefresh,
}: {
  rows: ReportRequestRow[];
  state: "loading" | "ready" | "permission_blocked" | "error";
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <SectionBlock
      title="Recent report requests"
      subtitle="Current lifecycle state for this portfolio. Archive and delivery are separate controls."
      className={styles.section}
      actions={
        <ActionButton priority="quiet" onClick={onRefresh} disabled={state === "loading"}>
          Refresh
        </ActionButton>
      }
    >
      {state === "permission_blocked" || state === "error" ? (
        <ScreenStatePanel
          kind={state === "permission_blocked" ? "permission_blocked" : "error"}
          surface="portfolio"
          title={state === "permission_blocked" ? "Recent requests are restricted" : "Recent requests unavailable"}
          body={error ?? "Recent report request history could not be loaded."}
          action={<ActionButton onClick={onRefresh}>Try Again</ActionButton>}
        />
      ) : (
        <AnalyticsTable
          ariaLabel="Recent portfolio report requests"
          density="compact"
          variant="portfolio"
          loadingState={
            state === "loading"
              ? { title: "Loading recent requests", body: "Checking the current reporting lifecycle." }
              : undefined
          }
          emptyState={{
            title: "No report requests yet",
            body: "Submit the first approved report request for this portfolio.",
          }}
          columns={[
            { key: "report", label: "Report" },
            { key: "date", label: "Report date" },
            { key: "requested", label: "Requested" },
            { key: "status", label: "Lifecycle" },
            { key: "support", label: "Support" },
          ]}
          rows={rows.map((row) => ({
            key: row.key,
            cells: [
              row.reportLabel,
              row.reportDate,
              row.requestedAt,
              <div key={`${row.key}-status`} className={styles.historyStatus}>
                <SemanticBadge tone={row.tone}>{row.statusLabel}</SemanticBadge>
                <small>{row.statusDetail}</small>
              </div>,
              <details key={`${row.key}-support`} className={styles.supportDisclosure}>
                <summary>View</summary>
                <code>{row.supportReference}</code>
              </details>,
            ],
          }))}
        />
      )}
    </SectionBlock>
  );
}

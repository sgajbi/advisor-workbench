"use client";

import {
  ActionButton,
  AnalyticsTable,
  OperationalRecordList,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
} from "@/design-system";

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
        <>
          <div className={styles.historyDesktop}>
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
                  <ReportSupportReference key={`${row.key}-support`} reference={row.supportReference} />,
                ],
              }))}
            />
          </div>
          <div className={styles.historyCompact}>
            {state === "loading" ? (
              <ScreenStatePanel
                kind="loading"
                surface="portfolio"
                title="Loading recent requests"
                body="Checking the current reporting lifecycle."
                rows={2}
              />
            ) : rows.length === 0 ? (
              <ScreenStatePanel
                kind="empty"
                surface="portfolio"
                title="No report requests yet"
                body="Submit the first approved report request for this portfolio."
              />
            ) : (
              <OperationalRecordList
                ariaLabel="Recent portfolio report request details"
                items={rows.map((row) => ({
                  key: row.key,
                  title: row.reportLabel,
                  description: row.statusDetail,
                  status: <SemanticBadge tone={row.tone}>{row.statusLabel}</SemanticBadge>,
                  facts: [
                    { label: "Report date", value: row.reportDate },
                    { label: "Requested", value: row.requestedAt },
                  ],
                  detail: <ReportSupportReference reference={row.supportReference} />,
                }))}
              />
            )}
          </div>
        </>
      )}
    </SectionBlock>
  );
}

function ReportSupportReference({ reference }: { reference: string }) {
  return (
    <details className={styles.supportDisclosure}>
      <summary>Support reference</summary>
      <code>{reference}</code>
    </details>
  );
}

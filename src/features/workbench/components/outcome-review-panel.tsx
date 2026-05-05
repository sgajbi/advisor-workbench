"use client";

import {
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import type { DpmOutcomeReviewGatewayResponse } from "@/features/workbench/types";
import {
  buildOutcomeReviewPanelModel,
  type OutcomeReviewPanelState,
} from "@/features/workbench/outcome-review-view-model";

type Props = {
  portfolioId: string;
  response: DpmOutcomeReviewGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (normalized === "SUPPORTED" || normalized === "READY" || normalized === "WITHIN_TOLERANCE") {
    return "success";
  }
  if (normalized === "DEGRADED" || normalized === "PARTIAL" || normalized.includes("REVIEW")) {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized.includes("BREACH")) {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: OutcomeReviewPanelState, portfolioId: string) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No outcome reviews for this portfolio",
      body: `No RFC-0042 outcome review has been materialized for ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Outcome review handoff is blocked",
      body: "Manage has blocked one or more downstream handoff actions for this review set.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Outcome review is not supported",
      body: "The authoritative manage supportability state says this outcome-review path is unsupported.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Outcome review data is unavailable",
    body: "Gateway did not return a usable manage outcome-review payload for this portfolio.",
  };
}

function handoffLabel(blocked: boolean | undefined): string {
  if (blocked === undefined) {
    return "N/A";
  }
  return blocked ? "Blocked" : "Available";
}

function handoffTone(blocked: boolean | undefined): "default" | "success" | "danger" {
  if (blocked === undefined) {
    return "default";
  }
  return blocked ? "danger" : "success";
}

export default function OutcomeReviewPanel({ portfolioId, response, errorMessage }: Props) {
  const model = buildOutcomeReviewPanelModel(response);
  const primaryReview = model.items[0] ?? null;
  const hasItems = model.items.length > 0;
  const shouldShowStatePanel =
    Boolean(errorMessage) || model.state === "empty" || model.state === "blocked" || model.state === "unsupported" || model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state, portfolioId);

  return (
    <SectionBlock
      title="Post-Trade Outcome Review"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="outcome-review-panel"
      actions={
        <div className="outcome-review-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {model.supportabilityState}
          </SemanticBadge>
          <SemanticBadge>{model.sourceService}</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Outcome review endpoint is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="outcome-review-status-strip">
        <MetricRow label="Reviews" value={model.items.length.toString()} />
        <MetricRow
          label="Report Input"
          value={
            <SemanticBadge tone={handoffTone(primaryReview?.reportInputBlocked)}>
              {handoffLabel(primaryReview?.reportInputBlocked)}
            </SemanticBadge>
          }
        />
        <MetricRow
          label="AI Evidence"
          value={
            <SemanticBadge tone={handoffTone(primaryReview?.aiEvidenceBlocked)}>
              {handoffLabel(primaryReview?.aiEvidenceBlocked)}
            </SemanticBadge>
          }
        />
        <MetricRow label="Remediation Owner" value={model.remediationOwner} />
      </div>

      {model.supportabilityReasons.length > 0 || model.blockedActions.length > 0 ? (
        <div className="outcome-review-reason-row">
          {[...model.supportabilityReasons, ...model.blockedActions].map((reason) => (
            <SemanticBadge key={reason} tone={reason.startsWith("CREATE") || reason.startsWith("REQUEST") ? "danger" : "warn"}>
              {reason}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="Post-trade outcome reviews"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "review", label: "Review" },
          { key: "state", label: "State" },
          { key: "run", label: "Run" },
          { key: "proof-pack", label: "Proof Pack" },
          { key: "updated", label: "Updated" },
        ]}
        rows={model.items.map((item) => ({
          key: item.outcomeReviewId,
          cells: [
            item.outcomeReviewId,
            <SemanticBadge key={`${item.outcomeReviewId}-state`} tone={badgeTone(item.state)}>
              {item.state}
            </SemanticBadge>,
            item.rebalanceRunId,
            item.proofPackId,
            item.updatedAt,
          ],
        }))}
        emptyState={{
          title: "No outcome reviews returned",
          body: "The Gateway BFF returned no manage outcome-review records for this portfolio.",
        }}
      />

      {primaryReview && hasItems ? (
        <>
          <div className="outcome-review-hash-strip">
            <span>Expected {primaryReview.expectedSnapshotHash}</span>
            <span>Realized {primaryReview.realizedSnapshotHash}</span>
            <span>Retention {primaryReview.retentionUntil}</span>
          </div>

          <AnalyticsTable
            ariaLabel="Outcome review dimensions"
            variant="analysis"
            density="compact"
            columns={[
              { key: "dimension", label: "Dimension" },
              { key: "expected", label: "Expected", align: "right" },
              { key: "realized", label: "Realized", align: "right" },
              { key: "variance", label: "Variance", align: "right" },
              { key: "state", label: "State" },
            ]}
            rows={primaryReview.dimensions.map((row) => ({
              key: row.key,
              cells: [
                row.dimension,
                row.expected,
                row.realized,
                row.variance,
                <SemanticBadge key={`${row.key}-state`} tone={badgeTone(row.state)}>
                  {row.state}
                </SemanticBadge>,
              ],
            }))}
            emptyState={{
              title: "No dimension results returned",
              body: "The review exists, but manage did not return expected-versus-realized dimension rows.",
            }}
          />

          <AnalyticsTable
            ariaLabel="Outcome review source lineage"
            variant="observation"
            density="compact"
            columns={[
              { key: "source", label: "Source" },
              { key: "reference", label: "Reference" },
              { key: "freshness", label: "Freshness" },
              { key: "hash", label: "Hash" },
            ]}
            rows={primaryReview.lineage.map((row) => ({
              key: row.key,
              cells: [row.source, row.reference, row.freshness, row.hash],
            }))}
            emptyState={{
              title: "No source lineage returned",
              body: "Manage returned the review without lineage rows in the list payload.",
            }}
          />
        </>
      ) : null}

      <Text variant="secondary" className="muted">
        Report and AI handoff availability is derived from manage-published blocked actions and
        the Gateway outcome-review contract.
      </Text>
    </SectionBlock>
  );
}

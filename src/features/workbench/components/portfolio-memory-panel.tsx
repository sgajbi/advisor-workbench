"use client";

import {
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import type { DpmPortfolioMemoryGatewayResponse } from "@/features/workbench/types";
import {
  buildPortfolioMemoryPanelModel,
  type PortfolioMemoryPanelState,
} from "@/features/workbench/portfolio-memory-view-model";

type Props = {
  response: DpmPortfolioMemoryGatewayResponse | null;
  errorMessage?: string | null;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (normalized === "READY" || normalized === "COMPLETE" || normalized === "SUPPORTED") {
    return "success";
  }
  if (normalized === "PARTIAL" || normalized === "DEGRADED" || normalized === "EMPTY" || normalized === "UNKNOWN") {
    return "warn";
  }
  if (normalized === "BLOCKED" || normalized === "UNSUPPORTED" || normalized === "UNAVAILABLE") {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: PortfolioMemoryPanelState) {
  if (state === "empty") {
    return {
      kind: "empty" as const,
      title: "No portfolio-memory events returned",
      body: "Manage returned an empty portfolio-memory timeline for this portfolio.",
    };
  }
  if (state === "partial") {
    return {
      kind: "partial" as const,
      title: "Portfolio memory is partial",
      body: "Gateway preserved a non-ready manage supportability state. Some proof-pack, wave, handoff, or outcome-review lineage may still be unavailable.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Portfolio memory is not supported",
      body: "Manage reported that this portfolio-memory path is not available for the selected portfolio.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Portfolio memory is unavailable",
    body: "Gateway did not return a usable manage portfolio-memory payload.",
  };
}

export default function PortfolioMemoryPanel({ response, errorMessage = null }: Props) {
  const model = buildPortfolioMemoryPanelModel(response);
  const shouldShowStatePanel =
    Boolean(errorMessage) ||
    model.state === "empty" ||
    model.state === "partial" ||
    model.state === "unsupported" ||
    model.state === "unavailable";
  const stateCopy = statePanelCopy(model.state);

  return (
    <SectionBlock
      title="Portfolio Memory"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="portfolio-memory-panel"
      actions={
        <div className="portfolio-memory-badge-row">
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
          title={errorMessage ? "Portfolio-memory endpoint is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <div className="portfolio-memory-status-strip">
        <MetricRow label="Portfolio" value={model.portfolioId} />
        <MetricRow label="Events" value={model.eventCount} />
        <MetricRow label="Source Systems" value={model.sourceSystems} />
        <MetricRow label="Content Hash" value={model.contentHash} />
      </div>

      {model.reasonCodes.length > 0 ? (
        <div className="portfolio-memory-reason-row">
          {model.reasonCodes.map((reason) => (
            <SemanticBadge key={reason} tone={badgeTone(reason)}>
              {reason}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <div className="portfolio-memory-summary-grid">
        <div className="portfolio-memory-subsection">
          <Text as="h3" variant="subsectionTitle">
            Event Mix
          </Text>
          <AnalyticsTable
            ariaLabel="DPM portfolio-memory event type counts"
            variant="portfolio"
            density="compact"
            columns={[
              { key: "event-type", label: "Event Type" },
              { key: "count", label: "Count", align: "right" },
            ]}
            rows={model.eventTypeRows.map((row) => ({
              key: row.key,
              cells: [row.eventType, row.count],
            }))}
            emptyState={{
              title: "No event counts returned",
              body: "Manage did not publish portfolio-memory event type counts for this portfolio.",
            }}
          />
        </div>
      </div>

      <AnalyticsTable
        ariaLabel="DPM portfolio-memory event timeline"
        variant="analysis"
        density="compact"
        columns={[
          { key: "time", label: "Event Time" },
          { key: "type", label: "Event Type" },
          { key: "source-systems", label: "Sources" },
          { key: "source-refs", label: "Source Refs" },
          { key: "artifact-refs", label: "Artifact Refs" },
          { key: "reasons", label: "Reasons" },
        ]}
        rows={model.events.map((row) => ({
          key: row.key,
          cells: [
            row.eventTime,
            row.eventType,
            row.sourceSystems,
            row.sourceRefs,
            row.artifactRefs,
            row.reasonCodes,
          ],
        }))}
        emptyState={{
          title: "No memory events returned",
          body: "Workbench does not reconstruct portfolio-memory timeline rows locally.",
        }}
      />

      <Text variant="secondary" className="muted">
        Event order, event types, source refs, artifact refs, reason codes, source systems, and
        content hash are Gateway-preserved manage truth.
      </Text>
    </SectionBlock>
  );
}

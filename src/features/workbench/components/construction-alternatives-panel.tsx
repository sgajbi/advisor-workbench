"use client";

import { useState } from "react";
import {
  ActionButton,
  AnalyticsTable,
  MetricRow,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import {
  generateDpmConstructionAlternatives,
  selectDpmConstructionAlternative,
} from "@/features/workbench/api";
import type {
  DpmConstructionGatewayResponse,
  WorkbenchPortfolio360,
} from "@/features/workbench/types";
import {
  buildConstructionPanelModel,
  type ConstructionPanelState,
} from "@/features/workbench/construction-alternatives-view-model";

type Props = {
  portfolio: WorkbenchPortfolio360;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (
    normalized === "READY" ||
    normalized === "SUPPORTED" ||
    normalized === "SELECTED"
  ) {
    return "success";
  }
  if (
    normalized === "DEGRADED" ||
    normalized === "PENDING_REVIEW" ||
    normalized.includes("REVIEW")
  ) {
    return "warn";
  }
  if (
    normalized === "BLOCKED" ||
    normalized === "UNSUPPORTED" ||
    normalized === "INFEASIBLE"
  ) {
    return "danger";
  }
  return "default";
}

function statePanelCopy(state: ConstructionPanelState, portfolioId: string) {
  if (state === "idle") {
    return {
      kind: "empty" as const,
      title: "Construction alternatives have not been generated",
      body: `Request manage-owned alternatives for ${portfolioId} when source readiness is sufficient for comparison.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Construction alternatives are blocked",
      body: "Manage returned a blocked construction posture. Selection remains disabled until the source issue is remediated.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Construction alternatives are unsupported",
      body: "The authoritative manage supportability state says this construction path is unsupported.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Construction alternatives are unavailable",
    body: "Gateway did not return a usable manage construction alternative set.",
  };
}

export default function ConstructionAlternativesPanel({ portfolio }: Props) {
  const [response, setResponse] =
    useState<DpmConstructionGatewayResponse | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [selectionPendingId, setSelectionPendingId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const model = buildConstructionPanelModel(response);
  const portfolioId = portfolio.portfolio.portfolio_id;
  const stateCopy = statePanelCopy(model.state, portfolioId);
  const shouldShowStatePanel =
    model.state === "idle" ||
    model.state === "blocked" ||
    model.state === "unsupported" ||
    model.state === "unavailable" ||
    Boolean(actionError);

  async function generateAlternatives() {
    if (generatePending) {
      return;
    }
    setGeneratePending(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const generated = await generateDpmConstructionAlternatives({
        portfolio,
      });
      setResponse(generated);
      setActionMessage(
        `Generated ${generated.data.alternative_set_id ?? "alternative set"}`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Construction alternative generation failed",
      );
    } finally {
      setGeneratePending(false);
    }
  }

  async function selectAlternative(alternativeId: string) {
    if (
      selectionPendingId ||
      model.alternativeSetId === "N/A" ||
      model.state === "blocked" ||
      model.state === "unsupported"
    ) {
      return;
    }
    setSelectionPendingId(alternativeId);
    setActionError(null);
    setActionMessage(null);
    try {
      const selected = await selectDpmConstructionAlternative({
        alternativeSetId: model.alternativeSetId,
        alternativeId,
      });
      setResponse(selected);
      setActionMessage(`Selected ${alternativeId}`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Construction selection failed",
      );
    } finally {
      setSelectionPendingId(null);
    }
  }

  return (
    <SectionBlock
      title="Construction Alternatives"
      subtitle={`Manage authority: ${model.authority}. Correlation: ${model.correlationId}`}
      className="construction-alternatives-panel"
      actions={
        <div className="construction-alternatives-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {model.supportabilityState}
          </SemanticBadge>
          <SemanticBadge>{model.sourceService}</SemanticBadge>
        </div>
      }
    >
      {shouldShowStatePanel ? (
        <ScreenStatePanel
          kind={actionError ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={
            actionError
              ? "Construction endpoint is unavailable"
              : stateCopy.title
          }
          body={actionError ?? stateCopy.body}
        />
      ) : null}

      <div className="construction-alternatives-status-strip">
        <MetricRow label="Alternative Set" value={model.alternativeSetId} />
        <MetricRow
          label="Alternatives"
          value={model.alternatives.length.toString()}
        />
        <MetricRow
          label="Selected"
          value={
            model.selectedAlternativeId ? (
              <SemanticBadge tone="success">
                {model.selectedAlternativeId}
              </SemanticBadge>
            ) : (
              "N/A"
            )
          }
        />
      </div>

      <div className="construction-alternatives-action-row">
        <ActionButton
          priority="secondary"
          onClick={generateAlternatives}
          disabled={generatePending}
        >
          {generatePending
            ? "Generating alternatives"
            : "Generate alternatives"}
        </ActionButton>
        <div>
          {actionMessage ? (
            <Text variant="secondary" className="muted">
              {actionMessage}
            </Text>
          ) : null}
          <Text variant="secondary" className="muted">
            LOTUS-GATEWAY forwards this request to manage and preserves the
            returned construction truth.
          </Text>
        </div>
      </div>

      {model.supportabilityReasons.length > 0 ? (
        <div className="construction-alternatives-reason-row">
          {model.supportabilityReasons.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {reason}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <AnalyticsTable
        ariaLabel="Construction alternatives"
        variant="analysis"
        density="compact"
        columns={[
          { key: "method", label: "Method" },
          { key: "status", label: "Status" },
          { key: "metrics", label: "Metrics" },
          { key: "evidence", label: "Evidence" },
          { key: "action", label: "Action" },
        ]}
        rows={model.alternatives.map((alternative) => {
          const selected =
            model.selectedAlternativeId === alternative.alternativeId;
          const selectable =
            !selected &&
            model.state !== "blocked" &&
            model.state !== "unsupported";
          return {
            key: alternative.alternativeId,
            cells: [
              `${alternative.method} / ${alternative.alternativeId}`,
              <SemanticBadge
                key={`${alternative.alternativeId}-status`}
                tone={badgeTone(alternative.status)}
              >
                {alternative.status}
              </SemanticBadge>,
              alternative.metrics.length > 0
                ? alternative.metrics
                    .slice(0, 3)
                    .map((metric) => `${metric.label}: ${metric.value}`)
                    .join(" | ")
                : "N/A",
              `${alternative.objectiveTraceCount} objective / ${alternative.constraintTraceCount} constraint`,
              <ActionButton
                key={`${alternative.alternativeId}-select`}
                priority="secondary"
                onClick={() => selectAlternative(alternative.alternativeId)}
                disabled={!selectable || Boolean(selectionPendingId)}
              >
                {selected
                  ? "Selected"
                  : selectionPendingId === alternative.alternativeId
                    ? "Selecting"
                    : "Select"}
              </ActionButton>,
            ],
          };
        })}
        emptyState={{
          title: "No construction alternatives returned",
          body: "Generate a manage-owned alternative set to compare construction choices.",
        }}
      />
    </SectionBlock>
  );
}

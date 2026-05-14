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
import {
  businessStateLabel,
  formatBusinessReason,
  formatBusinessSource,
} from "@/features/workbench/manage-workspace-view-model";

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
      body: `Request alternatives for ${portfolioId} when data readiness is sufficient for comparison.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked" as const,
      title: "Construction alternatives are blocked",
      body: "Selection remains disabled until the blocking data issue is resolved.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable" as const,
      title: "Construction alternatives are unsupported",
      body: "Construction alternatives are not available for the current mandate state.",
    };
  }
  return {
    kind: "partial" as const,
    title: "Construction alternatives are unavailable",
    body: "Construction alternatives are temporarily unavailable for this portfolio.",
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
      subtitle="Compare mandate-fit alternatives before selecting a rebalance construction."
      className="construction-alternatives-panel"
      actions={
        <div className="construction-alternatives-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge>Decision evidence available</SemanticBadge>
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

      <div className="construction-alternatives-summary">
        <MetricRow label="Alternative Set ID" value={model.alternativeSetId} />
        <MetricRow label="Objective" value={model.objective} />
        <MetricRow
          label="State"
          value={
            <SemanticBadge tone={badgeTone(model.alternativeSetState)}>
              {model.alternativeSetState}
            </SemanticBadge>
          }
        />
      </div>

      <div className="construction-alternatives-action-row" aria-label="Construction actions">
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

      <div className="construction-alternatives-grid">
        <div className="construction-alternatives-primary">
          <AnalyticsTable
            ariaLabel="Ranked construction alternatives"
            variant="analysis"
            density="compact"
            columns={[
              { key: "id", label: "ID" },
              { key: "turnover", label: "Turnover %", align: "right" },
              { key: "cash", label: "Cash After %", align: "right" },
              { key: "risk", label: "Risk Delta", align: "right" },
              { key: "te", label: "TE Delta (bps)", align: "right" },
              { key: "status", label: "Status" },
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
                  <span className="construction-alternative-id" key={`${alternative.alternativeId}-id`}>
                    {alternative.alternativeId}
                    {selected ? <SemanticBadge tone="success">Selected</SemanticBadge> : null}
                  </span>,
                  alternative.turnoverPct,
                  alternative.cashAfterPct,
                  alternative.riskDelta,
                  alternative.trackingErrorDeltaBps,
                  <span className="construction-alternative-status-cell" key={`${alternative.alternativeId}-status`}>
                    <SemanticBadge tone={badgeTone(alternative.status)}>
                      {alternative.status}
                    </SemanticBadge>
                    <ActionButton
                      priority="secondary"
                      onClick={() => selectAlternative(alternative.alternativeId)}
                      disabled={!selectable || Boolean(selectionPendingId)}
                    >
                      {selected
                        ? "Selected"
                        : selectionPendingId === alternative.alternativeId
                          ? "Selecting"
                          : "Select"}
                    </ActionButton>
                  </span>,
                ],
              };
            })}
            emptyState={{
              title: "No construction alternatives returned",
              body: "Generate an alternative set to compare construction choices.",
            }}
          />

          <div className="construction-alternatives-detail-grid">
            <div className="construction-alternatives-detail-card">
              <Text as="h3" variant="subsectionTitle">
                Detail: {model.selectedAlternative?.alternativeId ?? "N/A"}
              </Text>
              <dl>
                <div>
                  <dt>Rationale</dt>
                  <dd>{model.selectedAlternative?.rationale ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Trade Count</dt>
                  <dd>{model.selectedAlternative?.tradeCount ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    {model.selectedAlternative
                      ? `${model.selectedAlternative.objectiveTraceCount} objective / ${model.selectedAlternative.constraintTraceCount} constraint`
                      : "N/A"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="construction-alternatives-detail-card">
              <Text as="h3" variant="subsectionTitle">
                Constraint Fit
              </Text>
              {model.constraints.length > 0 ? (
                <div className="construction-constraint-list">
                  {model.constraints.map((constraint) => (
                    <div key={constraint.key}>
                      <strong>{constraint.name}</strong>
                      <span>{constraint.current}</span>
                      <span>{constraint.after}</span>
                      <SemanticBadge tone={badgeTone(constraint.state)}>
                        {constraint.state}
                      </SemanticBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <ScreenStatePanel
                  kind="empty"
                  surface="portfolio"
                  title="No constraint matrix returned"
                  body="Constraint rows are not available for the selected alternative."
                />
              )}
            </div>
          </div>
        </div>

        <div className="construction-source-readiness-card">
          <Text as="h3" variant="subsectionTitle">
            Data Readiness
          </Text>
          {model.sourceReadiness.length > 0 ? (
            <div className="construction-source-readiness-list">
              {model.sourceReadiness.map((source) => (
                <div key={source.key}>
                  <div>
                    <strong>{formatBusinessSource(source.source)}</strong>
                    <span>
                      {source.reasonCode !== "-"
                        ? formatBusinessReason(source.reasonCode)
                        : source.lastUpdated}
                    </span>
                  </div>
                  <SemanticBadge tone={badgeTone(source.state)}>{source.state}</SemanticBadge>
                </div>
              ))}
            </div>
          ) : (
            <ScreenStatePanel
              kind="empty"
              surface="portfolio"
              title="No data readiness returned"
              body="Generate alternatives to retrieve data readiness for this mandate."
            />
          )}
        </div>
      </div>
    </SectionBlock>
  );
}

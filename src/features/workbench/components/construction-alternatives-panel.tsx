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
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolio: WorkbenchPortfolio360;
};

function badgeTone(state: string): "default" | "success" | "warn" | "danger" {
  const normalized = state.toUpperCase();
  if (
    normalized === "READY" ||
    normalized === "SUPPORTED" ||
    normalized === "SELECTED" ||
    normalized === "PASS" ||
    normalized.includes("WITHIN")
  ) {
    return "success";
  }
  if (
    normalized === "DEGRADED" ||
    normalized === "PENDING_REVIEW" ||
    normalized.includes("REVIEW") ||
    normalized.includes("PENDING") ||
    normalized.includes("ACCEPTABLE")
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
      setActionMessage("Construction alternatives generated.");
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
    const selectedLabel =
      model.alternatives.find((alternative) => alternative.alternativeId === alternativeId)?.label ??
      "construction path";
    try {
      const selected = await selectDpmConstructionAlternative({
        alternativeSetId: model.alternativeSetId,
        alternativeId,
      });
      setResponse(selected);
      setActionMessage(`Selected ${selectedLabel}.`);
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
      subtitle="Compare suitable implementation paths before advisor approval."
      className="construction-alternatives-panel"
      actions={
        <div className="construction-alternatives-badge-row">
          <SemanticBadge tone={badgeTone(model.supportabilityState)}>
            {businessStateLabel(model.supportabilityState)}
          </SemanticBadge>
          <SemanticBadge tone="success">Evidence Available</SemanticBadge>
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
        <MetricRow label="Recommended Path" value={model.recommendedPathLabel} />
        <MetricRow label="Mandate Fit" value={model.mandateFitLabel} />
        <MetricRow label="Drift Improvement" value={model.driftImprovementLabel} />
        <MetricRow label="Approval Readiness" value={model.approvalReadinessLabel} />
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
            Alternatives are generated from the supported mandate and portfolio data available for this account.
          </Text>
        </div>
      </div>

      {model.supportabilityReasons.length > 0 ? (
        <div className="construction-alternatives-reason-row">
          {model.supportabilityReasons.map((reason) => (
            <SemanticBadge key={reason} tone="warn">
              {formatBusinessReason(reason)}
            </SemanticBadge>
          ))}
        </div>
      ) : null}

      <div className="construction-alternatives-grid">
        <div className="construction-alternatives-primary">
          <div className="construction-alternatives-card">
            <div className="construction-alternatives-card-header">
              <Text as="h3" variant="subsectionTitle">Alternatives Comparison</Text>
              <span>{model.alternatives.length} paths</span>
            </div>
            <AnalyticsTable
              ariaLabel="Alternatives comparison"
              variant="analysis"
              density="compact"
              columns={[
                { key: "alternative", label: "Alternative" },
                { key: "objective", label: "Objective" },
                { key: "turnover", label: "Turnover", align: "right" },
                { key: "cash", label: "Cash After", align: "right" },
                { key: "drift", label: "Drift Improvement", align: "right" },
                { key: "fit", label: "Mandate Fit" },
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
                    <span className="construction-alternative-label" key={`${alternative.alternativeId}-label`}>
                      {alternative.label}
                      {alternative.isRecommended ? <SemanticBadge tone="success">Recommended</SemanticBadge> : null}
                      {selected ? <SemanticBadge tone="success">Selected</SemanticBadge> : null}
                    </span>,
                    alternative.objective,
                    alternative.turnoverPct,
                    alternative.cashAfterPct,
                    alternative.driftImprovementPct,
                    <SemanticBadge key={`${alternative.alternativeId}-fit`} tone={badgeTone(alternative.mandateFit)}>
                      {alternative.mandateFit}
                    </SemanticBadge>,
                    <ActionButton
                      key={`${alternative.alternativeId}-action`}
                      priority={alternative.isRecommended ? "primary" : "secondary"}
                      onClick={() => selectAlternative(alternative.alternativeId)}
                      disabled={!selectable || Boolean(selectionPendingId)}
                    >
                      {selected
                        ? "Selected"
                        : selectionPendingId === alternative.alternativeId
                          ? "Selecting"
                          : alternative.actionLabel}
                    </ActionButton>,
                  ],
                };
              })}
              emptyState={{
                title: "No construction alternatives returned",
                body: "Generate an alternative set to compare construction choices.",
              }}
            />
          </div>

          <div className="construction-alternatives-detail-grid">
            <div className="construction-alternatives-detail-card">
              <Text as="h3" variant="subsectionTitle">
                Selected Alternative Detail: {model.selectedAlternative?.label ?? "N/A"}
              </Text>
              <p className="construction-alternatives-rationale">
                {model.selectedBusinessRationale}
              </p>
              <dl>
                <div>
                  <dt>Turnover</dt>
                  <dd>{model.selectedAlternative?.turnoverPct ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Cash After</dt>
                  <dd>{model.selectedAlternative?.cashAfterPct ?? "N/A"}</dd>
                </div>
                <div>
                  <dt>Drift Improvement</dt>
                  <dd>{model.selectedAlternative?.driftImprovementPct ?? "N/A"}</dd>
                </div>
              </dl>
              <div className="construction-allocation-list" aria-label="Allocation comparison">
                {model.allocationRows.map((row) => (
                  <div key={row.key}>
                    <div>
                      <strong>{row.label}</strong>
                      <span>{row.before} to {row.after}</span>
                    </div>
                    <div aria-hidden="true">
                      <i style={{ width: row.beforeWidth }} />
                      <b style={{ width: row.afterWidth }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="construction-alternatives-detail-card">
              <Text as="h3" variant="subsectionTitle">
                Mandate Integrity Checks
              </Text>
              {model.constraints.length > 0 ? (
                <div className="construction-constraint-list">
                  {model.constraints.map((constraint) => (
                    <div key={constraint.key}>
                      <strong>{businessStateLabel(constraint.name)}</strong>
                      <SemanticBadge tone={badgeTone(constraint.state)}>
                        {businessStateLabel(constraint.state)}
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
              <div className="construction-trade-impact">
                <strong>Trade Impact Summary</strong>
                <div>
                  <span>Estimated Trades</span>
                  <b>{model.tradeImpact.tradeCount}</b>
                </div>
                <div>
                  <span>Buys</span>
                  <b>{model.tradeImpact.buyCount}</b>
                </div>
                <div>
                  <span>Trims</span>
                  <b>{model.tradeImpact.trimCount}</b>
                </div>
                <div>
                  <span>Cash Reduction</span>
                  <b>{model.tradeImpact.cashReductionCount}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="construction-source-readiness-card">
          <Text as="h3" variant="subsectionTitle">
            Recommended Actions
          </Text>
          <div className="construction-source-readiness-list">
            <button
              type="button"
              onClick={() => model.selectedAlternative ? void selectAlternative(model.selectedAlternative.alternativeId) : undefined}
              disabled={!model.selectedAlternative || model.state === "blocked" || Boolean(selectionPendingId)}
            >
              <strong>Select recommended path</strong>
              <span>{model.recommendedPathLabel}</span>
            </button>
            <a href={`/workbench/${encodeURIComponent(portfolioId)}?mode=waves`}>Review trade impact</a>
            <a href={`/workbench/${encodeURIComponent(portfolioId)}?mode=mandate`}>Resolve mandate attention item</a>
            <a href={`/workbench/${encodeURIComponent(portfolioId)}?mode=proof`}>Open evidence pack</a>
          </div>
        </div>
      </div>
    </SectionBlock>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  getExternalOrderExecutionAcknowledgement,
  generateDpmConstructionAlternatives,
  selectDpmConstructionAlternative,
} from "@/features/workbench/api";
import type {
  DpmConstructionGatewayResponse,
  ExternalOrderExecutionAcknowledgementResponse,
  WorkbenchPortfolio360,
} from "@/features/workbench/types";
import ConstructionAuthorityEvidenceCard from "@/features/workbench/components/construction-authority-evidence-card";
import ExecutionAcknowledgementSupportabilityPanel from "@/features/workbench/components/execution-acknowledgement-supportability-panel";
import {
  buildConstructionPanelModel,
} from "@/features/workbench/construction-alternatives-view-model";
import {
  buildConstructionStatePanelCopy,
  canSelectConstructionAlternative,
  constructionBadgeTone,
  resolveConstructionAlternativeLabel,
  shouldShowConstructionStatePanel,
} from "@/features/workbench/construction-alternatives-panel-helpers";
import {
  businessStateLabel,
  formatBusinessReason,
} from "@/features/workbench/manage-workspace-view-model";

type Props = {
  portfolio: WorkbenchPortfolio360;
};

export default function ConstructionAlternativesPanel({ portfolio }: Props) {
  const [response, setResponse] =
    useState<DpmConstructionGatewayResponse | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [selectionPendingId, setSelectionPendingId] = useState<string | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [
    executionAcknowledgementResponse,
    setExecutionAcknowledgementResponse,
  ] = useState<ExternalOrderExecutionAcknowledgementResponse | null>(null);
  const [executionAcknowledgementLoading, setExecutionAcknowledgementLoading] =
    useState(false);
  const [executionAcknowledgementError, setExecutionAcknowledgementError] =
    useState<string | null>(null);
  const model = buildConstructionPanelModel(response);
  const portfolioId = portfolio.portfolio.portfolio_id;
  const stateCopy = buildConstructionStatePanelCopy(model.state, portfolioId);
  const selectedAlternative = model.selectedAlternative;
  const canSelectSelectedAlternative = canSelectConstructionAlternative({
    selectedAlternative,
    alternativeSetId: model.alternativeSetId,
    state: model.state,
    selectedAlternativeId: model.selectedAlternativeId,
    selectionPendingId,
  });
  const shouldShowStatePanel = shouldShowConstructionStatePanel(
    model.state,
    actionError,
  );

  useEffect(() => {
    let cancelled = false;
    setExecutionAcknowledgementLoading(true);
    setExecutionAcknowledgementError(null);
    void getExternalOrderExecutionAcknowledgement({ portfolio })
      .then((nextResponse) => {
        if (!cancelled) {
          setExecutionAcknowledgementResponse(nextResponse);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setExecutionAcknowledgementResponse(null);
          setExecutionAcknowledgementError(
            error instanceof Error
              ? error.message
              : "External OMS acknowledgement supportability could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setExecutionAcknowledgementLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portfolio]);

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
    const selectedLabel = resolveConstructionAlternativeLabel(
      model.alternatives,
      alternativeId,
    );
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
          <SemanticBadge tone={constructionBadgeTone(model.supportabilityState)}>
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

      <ExecutionAcknowledgementSupportabilityPanel
        response={executionAcknowledgementResponse}
        loading={executionAcknowledgementLoading}
        error={executionAcknowledgementError}
      />

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
                    <SemanticBadge key={`${alternative.alternativeId}-fit`} tone={constructionBadgeTone(alternative.mandateFit)}>
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

          <div className="construction-alternatives-detail-card">
            <div className="construction-alternatives-detail-header">
              <Text as="h3" variant="subsectionTitle">
                Selected: {selectedAlternative?.label ?? "N/A"}
              </Text>
              <ActionButton
                priority="primary"
                onClick={() =>
                  selectedAlternative
                    ? void selectAlternative(selectedAlternative.alternativeId)
                    : undefined
                }
                disabled={!canSelectSelectedAlternative}
              >
                {selectionPendingId === selectedAlternative?.alternativeId
                  ? "Applying selection"
                  : model.selectedAlternativeId === selectedAlternative?.alternativeId
                    ? "Selection Applied"
                    : "Apply Selection"}
              </ActionButton>
            </div>

            <div className="construction-alternatives-detail-grid">
              <div className="construction-alternatives-detail-main">
                <section>
                  <h4>Business Rationale</h4>
                  <p className="construction-alternatives-rationale">
                    {model.selectedBusinessRationale}
                  </p>
                </section>

                <section>
                  <h4>Trade Impact Summary</h4>
                  <div className="construction-trade-impact-strip">
                    <div>
                      <strong>{model.tradeImpact.tradeCount}</strong>
                      <span>Total Trades</span>
                    </div>
                    <div>
                      <strong>{model.tradeImpact.buyCount}</strong>
                      <span>Buys</span>
                    </div>
                    <div>
                      <strong>{model.tradeImpact.trimCount}</strong>
                      <span>Trims</span>
                    </div>
                    <div>
                      <strong>{model.tradeImpact.cashReductionCount}</strong>
                      <span>Cash Red.</span>
                    </div>
                  </div>
                </section>

                {model.allocationRows.length > 0 ? (
                  <section>
                    <h4>Allocation Comparison</h4>
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
                  </section>
                ) : null}
              </div>

              <div className="construction-alternatives-detail-side">
                <Text as="h3" variant="subsectionTitle">
                  Mandate Integrity Checks
                </Text>
                {model.constraints.length > 0 ? (
                  <div className="construction-constraint-list">
                    {model.constraints.map((constraint) => (
                      <div key={constraint.key}>
                        <strong>{businessStateLabel(constraint.name)}</strong>
                        <SemanticBadge tone={constructionBadgeTone(constraint.state)}>
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
                <ConstructionAuthorityEvidenceCard model={model} />
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

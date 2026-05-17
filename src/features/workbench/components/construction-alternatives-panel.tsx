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
  const selectedAlternative = model.selectedAlternative;
  const eligibleInstrumentEvidence =
    model.currencyOverlayEvidence?.eligibleInstrumentEvidence;
  const executionAcknowledgementEvidence =
    model.executionAcknowledgementEvidence;
  const authorityMissingDataFamilies = Array.from(
    new Set([
      ...(model.currencyOverlayEvidence?.missingDataFamilies ?? []),
      ...(executionAcknowledgementEvidence?.missingDataFamilies ?? []),
    ]),
  );
  const authorityBlockedCapabilities = Array.from(
    new Set([
      ...(model.currencyOverlayEvidence?.blockedCapabilities ?? []),
      ...(executionAcknowledgementEvidence?.blockedCapabilities ?? []),
    ]),
  );
  const authorityReasonCodes = Array.from(
    new Set([
      ...(model.currencyOverlayEvidence?.reasonCodes ?? []),
      ...(executionAcknowledgementEvidence?.reasonCodes ?? []),
    ]),
  );
  const canSelectSelectedAlternative = Boolean(
    selectedAlternative &&
      model.alternativeSetId !== "N/A" &&
      model.state !== "blocked" &&
      model.state !== "unsupported" &&
      model.selectedAlternativeId !== selectedAlternative.alternativeId &&
      !selectionPendingId,
  );
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
                {model.currencyOverlayEvidence || executionAcknowledgementEvidence ? (
                  <section className="construction-currency-overlay-evidence">
                    <div className="construction-currency-overlay-header">
                      <Text as="h3" variant="subsectionTitle">
                        Construction Authority Evidence
                      </Text>
                      {model.currencyOverlayEvidence ? (
                        <SemanticBadge tone={badgeTone(model.currencyOverlayEvidence.state)}>
                          {businessStateLabel(model.currencyOverlayEvidence.state)}
                        </SemanticBadge>
                      ) : null}
                    </div>
                    {model.currencyOverlayEvidence ? (
                      <dl>
                        <div>
                          <dt>Hedge policy source</dt>
                          <dd>
                            {model.currencyOverlayEvidence.sourceProductName}{" "}
                            {model.currencyOverlayEvidence.sourceProductVersion}
                          </dd>
                        </div>
                        <div>
                          <dt>Source id</dt>
                          <dd>{model.currencyOverlayEvidence.sourceId}</dd>
                        </div>
                        <div>
                          <dt>Evidence hash</dt>
                          <dd>{model.currencyOverlayEvidence.contentHash}</dd>
                        </div>
                        <div>
                          <dt>Policy rules</dt>
                          <dd>{model.currencyOverlayEvidence.ruleCount}</dd>
                        </div>
                      </dl>
                    ) : null}
                    {model.currencyOverlayEvidence?.rules.length ? (
                      <div className="construction-currency-overlay-list">
                        <strong>Returned rules</strong>
                        {model.currencyOverlayEvidence.rules.map((rule, index) => (
                          <span key={`${rule}-${index}`}>{rule}</span>
                        ))}
                      </div>
                    ) : null}
                    {eligibleInstrumentEvidence ? (
                      <div className="construction-currency-overlay-list">
                        <strong>Eligible instrument evidence</strong>
                        <span>
                          {eligibleInstrumentEvidence.sourceProductName}{" "}
                          {eligibleInstrumentEvidence.sourceProductVersion}
                        </span>
                        <span>
                          Source id: {eligibleInstrumentEvidence.sourceId}
                        </span>
                        <span>
                          Evidence hash:{" "}
                          {eligibleInstrumentEvidence.contentHash}
                        </span>
                        <span>
                          Instrument rows:{" "}
                          {eligibleInstrumentEvidence.instrumentCount}
                        </span>
                        {eligibleInstrumentEvidence.instruments.length > 0
                          ? eligibleInstrumentEvidence.instruments.map((instrument, index) => (
                              <span key={`${instrument}-${index}`}>
                                {instrument}
                              </span>
                            ))
                          : null}
                      </div>
                    ) : null}
                    {executionAcknowledgementEvidence ? (
                      <div className="construction-currency-overlay-list">
                        <strong>OMS acknowledgement posture</strong>
                        <SemanticBadge tone={badgeTone(executionAcknowledgementEvidence.state)}>
                          {businessStateLabel(executionAcknowledgementEvidence.state)}
                        </SemanticBadge>
                        <span>
                          {executionAcknowledgementEvidence.sourceProductName}{" "}
                          {executionAcknowledgementEvidence.sourceProductVersion}
                        </span>
                        <span>
                          Source id: {executionAcknowledgementEvidence.sourceId}
                        </span>
                        <span>
                          Evidence hash:{" "}
                          {executionAcknowledgementEvidence.contentHash}
                        </span>
                        <span>
                          Acknowledgement rows:{" "}
                          {executionAcknowledgementEvidence.acknowledgementCount}
                        </span>
                        {executionAcknowledgementEvidence.acknowledgements.length > 0
                          ? executionAcknowledgementEvidence.acknowledgements.map((acknowledgement, index) => (
                              <span key={`${acknowledgement}-${index}`}>
                                {acknowledgement}
                              </span>
                            ))
                          : null}
                      </div>
                    ) : null}
                    <div className="construction-currency-overlay-list">
                      <strong>Missing data</strong>
                      {authorityMissingDataFamilies.length > 0 ? (
                        authorityMissingDataFamilies.map((family) => (
                          <SemanticBadge key={family} tone="warn">
                            {formatBusinessReason(family)}
                          </SemanticBadge>
                        ))
                      ) : (
                        <span>None reported</span>
                      )}
                    </div>
                    <div className="construction-currency-overlay-list">
                      <strong>Blocked capabilities</strong>
                      {authorityBlockedCapabilities.length > 0 ? (
                        authorityBlockedCapabilities.map((capability) => (
                          <SemanticBadge key={capability} tone="danger">
                            {formatBusinessReason(capability)}
                          </SemanticBadge>
                        ))
                      ) : (
                        <span>None reported</span>
                      )}
                    </div>
                    {authorityReasonCodes.length > 0 ? (
                      <div className="construction-currency-overlay-list">
                        <strong>Reason codes</strong>
                        {authorityReasonCodes.map((reason) => (
                          <SemanticBadge key={reason} tone="warn">
                            {formatBusinessReason(reason)}
                          </SemanticBadge>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
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

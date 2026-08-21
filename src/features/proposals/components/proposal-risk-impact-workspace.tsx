"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ScreenStatePanel,
  SemanticBadge,
  SourceRefreshAction,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { projectQuerySourcePosture } from "@/features/platform-runtime/query-source-posture";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import { getProposalRiskImpact } from "../api";
import type { ProposalLifecycleRow } from "../proposal-lifecycle-workspace-view-model";
import {
  buildProposalRiskImpactModel,
  type ProposalRiskImpactModel,
} from "../proposal-risk-impact-view-model";
import ProposalLifecycleWorklist from "./proposal-lifecycle-worklist";
import styles from "./proposal-risk-impact-workspace.module.css";

export default function ProposalRiskImpactWorkspace({
  portfolioId,
  rows,
}: {
  portfolioId: string;
  rows: ProposalLifecycleRow[];
}) {
  const [preferredProposalId, setPreferredProposalId] = useState<string | null>(
    rows[0]?.proposalId ?? null,
  );
  const selectedProposal =
    rows.find(({ proposalId }) => proposalId === preferredProposalId) ??
    rows[0] ??
    null;
  const riskImpactQuery = useQuery({
    queryKey: [
      "proposal-risk-impact",
      portfolioId,
      selectedProposal?.proposalId,
    ],
    queryFn: async () =>
      await getProposalRiskImpact(
        selectedProposal?.proposalId ?? "",
        portfolioId,
      ),
    enabled: Boolean(selectedProposal),
    ...workbenchStrictQueryDefaults,
  });
  const sourcePosture = projectQuerySourcePosture({
    hasData: Boolean(riskImpactQuery.data),
    isLoading: riskImpactQuery.isLoading,
    isFetching: riskImpactQuery.isFetching,
    hasError: Boolean(riskImpactQuery.error),
    isPermissionBlocked: isWorkbenchPermissionBlockedError(
      riskImpactQuery.error,
    ),
  });
  const model = useMemo(
    () =>
      riskImpactQuery.data
        ? buildProposalRiskImpactModel(riskImpactQuery.data)
        : null,
    [riskImpactQuery.data],
  );
  const refreshActionRef = useRef<HTMLButtonElement>(null);
  const selectedProposalIdRef = useRef(selectedProposal?.proposalId ?? null);
  useEffect(() => {
    selectedProposalIdRef.current = selectedProposal?.proposalId ?? null;
  }, [selectedProposal?.proposalId]);

  async function refreshEvidence() {
    const initiatingElement = refreshActionRef.current;
    const initiatingProposalId = selectedProposal?.proposalId ?? null;
    const shouldRestoreFocus = document.activeElement === initiatingElement;
    const result = await riskImpactQuery.refetch();
    if (shouldRestoreFocus) {
      window.setTimeout(() => {
        const focusDidNotMove =
          document.activeElement === initiatingElement ||
          document.activeElement === document.body;
        if (
          selectedProposalIdRef.current === initiatingProposalId &&
          focusDidNotMove
        ) {
          refreshActionRef.current?.focus();
        }
      }, 0);
    }
    return result;
  }

  if (!selectedProposal) return null;

  return (
    <div
      className={styles.workspace}
      data-testid="proposal-risk-impact-workspace"
    >
      <div className={styles.workspaceGrid}>
        <ProposalLifecycleWorklist
          ariaLabel="Risk and Impact proposals"
          rows={rows}
          selectedProposalId={selectedProposal.proposalId}
          onSelectProposal={setPreferredProposalId}
        />

        <section
          className={styles.decisionPane}
          aria-label="Selected proposal risk and impact"
        >
          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            Selected proposal: {selectedProposal.title}.
          </p>

          {sourcePosture.isInitialLoading ? (
            <ScreenStatePanel
              kind="loading"
              title="Loading proposal evidence"
              body="Confirming current and proposed allocation, risk, and decision evidence through Gateway."
              rows={5}
            />
          ) : sourcePosture.isPermissionBlocked ? (
            <ScreenStatePanel
              kind="permission_blocked"
              title="Risk and impact access is not available"
              body="Your current role cannot view the selected proposal's decision evidence. No fallback evidence is shown."
            />
          ) : sourcePosture.isUnavailable || !model ? (
            <ScreenStatePanel
              kind="error"
              title="Risk and impact evidence is unavailable"
              body="The selected proposal could not be confirmed through Gateway. Do not progress the proposal using previously seen evidence."
              action={
                <SourceRefreshAction
                  ref={refreshActionRef}
                  refreshScope={`${portfolioId}:${selectedProposal.proposalId}`}
                  idleLabel="Retry source evidence"
                  busyLabel="Retrying source evidence"
                  isRefreshing={riskImpactQuery.isFetching}
                  onRefresh={refreshEvidence}
                />
              }
            />
          ) : (
            <RiskImpactEvidence
              key={model.identity.proposalId}
              model={model}
              proposalHref={selectedProposal.href}
              refreshing={sourcePosture.isRefreshing}
              refreshFailed={sourcePosture.hasRefreshFailure}
              onRefresh={refreshEvidence}
              refreshActionRef={refreshActionRef}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function RiskImpactEvidence({
  model,
  proposalHref,
  refreshing,
  refreshFailed,
  onRefresh,
  refreshActionRef,
}: {
  model: ProposalRiskImpactModel;
  proposalHref: string;
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => Promise<unknown>;
  refreshActionRef: Ref<HTMLButtonElement>;
}) {
  const [selectedDimension, setSelectedDimension] = useState(
    model.allocation.views[0]?.dimension ?? "",
  );
  const allocationView =
    model.allocation.views.find(
      ({ dimension }) => dimension === selectedDimension,
    ) ??
    model.allocation.views[0] ??
    null;

  return (
    <div className={styles.evidence}>
      <header className={styles.recordHeader}>
        <div>
          <Text variant="microLabel">Selected proposal · source-confirmed</Text>
          <Text variant="subsectionTitle" as="h3">
            {model.identity.title}
          </Text>
          <Text variant="metadata">
            {model.identity.proposalId} · {model.identity.version} ·{" "}
            {model.identity.recorded}
          </Text>
        </div>
        <div className={styles.headerStatus}>
          <SemanticBadge tone={model.supportability.tone} emphasis="strong">
            {model.supportability.label}
          </SemanticBadge>
          <SemanticBadge tone="default">{model.identity.stage}</SemanticBadge>
          <SourceRefreshAction
            ref={refreshActionRef}
            refreshScope={model.identity.proposalId}
            idleLabel="Refresh source evidence"
            busyLabel="Refreshing source evidence"
            isRefreshing={refreshing}
            onRefresh={onRefresh}
          />
        </div>
      </header>

      {refreshFailed ? (
        <div className={styles.refreshFailure} role="alert">
          <div>
            <strong>Source refresh failed</strong>
            <span>
              Previously retrieved evidence remains visible and is not
              re-confirmed.
            </span>
          </div>
        </div>
      ) : refreshing ? (
        <p className={styles.refreshing} role="status" aria-live="polite">
          Reconfirming source evidence…
        </p>
      ) : null}

      <section
        className={styles.decisionBrief}
        aria-labelledby="risk-decision-heading"
      >
        <div className={styles.decisionMarker} aria-hidden="true" />
        <div className={styles.decisionLead}>
          <Text variant="microLabel">Decision posture</Text>
          <Text variant="subsectionTitle" as="h4" id="risk-decision-heading">
            {model.decision.status}
          </Text>
          <p>{model.decision.summary}</p>
          <p className={styles.supportabilityNote}>
            {model.supportability.explanation}
          </p>
        </div>
        <dl className={styles.decisionFacts}>
          <div>
            <dt>Next business action</dt>
            <dd>{model.decision.nextAction}</dd>
          </div>
          <div>
            <dt>Blocking items</dt>
            <dd>{model.decision.blockingCount}</dd>
          </div>
          <div>
            <dt>Evidence confidence</dt>
            <dd>{model.decision.confidence}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.analysisSection}
        aria-labelledby="allocation-comparison-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">Portfolio impact</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="allocation-comparison-heading"
            >
              Current and proposed allocation
            </Text>
          </div>
          <SemanticBadge tone={model.allocation.state.tone}>
            {model.allocation.state.label}
          </SemanticBadge>
        </div>

        {model.allocation.views.length > 0 && allocationView ? (
          <>
            <div className={styles.dimensionControl}>
              <label htmlFor="risk-impact-dimension">Allocation view</label>
              <select
                id="risk-impact-dimension"
                value={allocationView.dimension}
                onChange={(event) => {
                  const nextView = model.allocation.views.find(
                    ({ dimension }) => dimension === event.target.value,
                  );
                  if (nextView) setSelectedDimension(nextView.dimension);
                }}
              >
                {model.allocation.views.map((view) => (
                  <option key={view.dimension} value={view.dimension}>
                    {view.label}
                  </option>
                ))}
              </select>
              <span>{model.allocation.source}</span>
            </div>

            <div className={styles.comparisonLegend} aria-hidden="true">
              <span>Current</span>
              <span>Proposed</span>
            </div>
            <ul
              className={styles.allocationLedger}
              aria-label={`${allocationView.label} allocation comparison`}
            >
              {allocationView.rows.map((row) => (
                <li key={row.key}>
                  <strong>{row.label}</strong>
                  <div className={styles.allocationSide}>
                    <span className={styles.allocationSideLabel}>Current</span>
                    <span className={styles.allocationValue}>
                      {row.currentWeight}
                    </span>
                    <span className={styles.track} aria-hidden="true">
                      <span style={{ width: `${row.currentBarWidth}%` }} />
                    </span>
                    <small>
                      {row.currentValue} · {row.currentPositions}
                    </small>
                  </div>
                  <div
                    className={`${styles.allocationSide} ${styles.proposed}`}
                  >
                    <span className={styles.allocationSideLabel}>Proposed</span>
                    <span className={styles.allocationValue}>
                      {row.proposedWeight}
                    </span>
                    <span className={styles.track} aria-hidden="true">
                      <span style={{ width: `${row.proposedBarWidth}%` }} />
                    </span>
                    <small>
                      {row.proposedValue} · {row.proposedPositions}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.allocationTotals}>
              <span>
                Current portfolio value{" "}
                <strong>{allocationView.currentTotal}</strong>
              </span>
              <span>
                Proposed portfolio value{" "}
                <strong>{allocationView.proposedTotal}</strong>
              </span>
            </div>
          </>
        ) : (
          <ScreenStatePanel
            kind="partial"
            title="Allocation comparison is not available"
            body="The proposal source did not provide a current and proposed allocation view. No comparison is inferred."
          />
        )}
      </section>

      <div className={styles.evidenceGrid}>
        <section
          className={styles.analysisSection}
          aria-labelledby="risk-evidence-heading"
        >
          <div className={styles.sectionHeading}>
            <Text variant="subsectionTitle" as="h4" id="risk-evidence-heading">
              Risk evidence
            </Text>
            <SemanticBadge tone={model.risk.state.tone}>
              {model.risk.state.label}
            </SemanticBadge>
          </div>
          <p className={styles.businessSummary}>{model.risk.summary}</p>
          {model.risk.highlights.length > 0 ? (
            <ul className={styles.evidenceList}>
              {model.risk.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>
              No risk highlights were supplied by the source.
            </p>
          )}
          <p className={styles.sourceLine}>
            Risk authority: {model.risk.source}
          </p>
        </section>

        <section
          className={styles.analysisSection}
          aria-labelledby="workflow-gate-heading"
        >
          <div className={styles.sectionHeading}>
            <Text variant="subsectionTitle" as="h4" id="workflow-gate-heading">
              Workflow gate
            </Text>
            <SemanticBadge tone={model.workflowGate.state.tone}>
              {model.workflowGate.state.label}
            </SemanticBadge>
          </div>
          <dl className={styles.gateFacts}>
            <div>
              <dt>Current gate</dt>
              <dd>{model.workflowGate.gate}</dd>
            </div>
            <div>
              <dt>Required next step</dt>
              <dd>{model.workflowGate.nextStep}</dd>
            </div>
          </dl>
          {model.workflowGate.reasons.length > 0 ? (
            <ul
              className={styles.evidenceList}
              aria-label="Workflow gate reasons"
            >
              {model.workflowGate.reasons.map((reason) => (
                <li
                  key={`${reason.source}:${reason.reason}:${reason.severity}`}
                >
                  <strong>{reason.reason}</strong> · {reason.source} ·{" "}
                  {reason.severity}
                </li>
              ))}
            </ul>
          ) : null}
          <p className={styles.muted}>{model.workflowGate.disclaimer}</p>
        </section>
      </div>

      <section
        className={styles.analysisSection}
        aria-labelledby="decision-register-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <Text variant="microLabel">Exception register</Text>
            <Text
              variant="subsectionTitle"
              as="h4"
              id="decision-register-heading"
            >
              Requirements, changes, and evidence gaps
            </Text>
          </div>
          <span className={styles.blockingCount}>
            {model.decision.blockingCount} blocking
          </span>
        </div>
        <div className={styles.registerColumns}>
          <DecisionRegisterList
            title="Approval requirements"
            empty="No active approval requirement is reported."
            items={model.decision.activeRequirements.map((requirement) => ({
              key: `${requirement.type}:${requirement.policyVersion}`,
              label: requirement.type,
              summary: requirement.summary,
              badge: requirement.blocking ? "Blocking" : requirement.severity,
              tone: requirement.tone,
            }))}
          />
          <DecisionRegisterList
            title="Material changes"
            empty="No material change is reported."
            items={model.decision.materialChanges.map((change) => ({
              key: change.id,
              label: change.family,
              summary: change.summary,
              badge: change.severity,
              tone: change.tone,
            }))}
          />
          <DecisionRegisterList
            title="Missing evidence"
            empty="No missing evidence is reported."
            items={model.decision.missingEvidence.map((evidence) => ({
              key: `${evidence.type}:${evidence.summary}`,
              label: evidence.type,
              summary: evidence.summary,
              badge: evidence.blocking ? "Blocking" : "Follow-up",
              tone: evidence.blocking ? "danger" : "warn",
            }))}
          />
        </div>
      </section>

      <details className={styles.provenance}>
        <summary>Evidence scope and lineage</summary>
        <div className={styles.provenanceBody}>
          <div>
            <Text variant="microLabel">Capability boundary</Text>
            <ul className={styles.capabilityList}>
              {model.capabilities.map((capability) => (
                <li key={capability.key}>
                  <span>{capability.name}</span>
                  <SemanticBadge tone={capability.tone}>
                    {capability.status}
                  </SemanticBadge>
                </li>
              ))}
            </ul>
          </div>
          <dl className={styles.lineageList}>
            <div>
              <dt>Support reference</dt>
              <dd>{model.lineage.correlationId}</dd>
            </div>
            <div>
              <dt>Proposal version</dt>
              <dd>{model.lineage.proposalVersionId}</dd>
            </div>
            <div>
              <dt>Request hash</dt>
              <dd>{model.lineage.requestHash}</dd>
            </div>
            <div>
              <dt>Artifact hash</dt>
              <dd>{model.lineage.artifactHash}</dd>
            </div>
            <div>
              <dt>Simulation hash</dt>
              <dd>{model.lineage.simulationHash}</dd>
            </div>
          </dl>
        </div>
      </details>

      <footer className={styles.actionBar}>
        <div>
          <strong>{model.decision.nextAction}</strong>
          <span>
            Continue in the governed proposal record to review or record
            workflow actions.
          </span>
        </div>
        <Link className={styles.primaryAction} href={proposalHref}>
          Open proposal review
        </Link>
      </footer>
    </div>
  );
}

function DecisionRegisterList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{
    key: string;
    label: string;
    summary: string;
    badge: string;
    tone: "default" | "success" | "warn" | "danger";
  }>;
}) {
  return (
    <div className={styles.registerGroup}>
      <h5>{title}</h5>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <div>
                <strong>{item.label}</strong>
                <p>{item.summary}</p>
              </div>
              <SemanticBadge tone={item.tone}>{item.badge}</SemanticBadge>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>{empty}</p>
      )}
    </div>
  );
}

"use client";

import {
  ActionButton,
  ScreenStatePanel,
  Text,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import { ProofPackStateBadge } from "@/features/workbench/components/proof-pack-badges";
import type { ProofPackPanelModel, ProofPackPanelState } from "@/features/workbench/proof-pack-view-model";
import {
  proofPackStatePanelCopy,
  proofPackSupportabilityLabel,
  shouldShowProofPackStatePanel,
} from "@/features/workbench/proof-pack-panel-helpers";
import styles from "./proof-pack.module.css";

type ProofPackSummaryProps = {
  model: ProofPackPanelModel;
  portfolioId: string;
  proofPackId: string | null;
  rebalanceRunId: string | null;
  pendingAction: string | null;
  actionError: string | null;
  handoffStatus: string | null;
  errorMessage?: string | null;
  onGenerateProofPack: () => void;
  onLoadProofPack: () => void;
};

export default function ProofPackSummary({
  model,
  portfolioId,
  proofPackId,
  rebalanceRunId,
  pendingAction,
  actionError,
  handoffStatus,
  errorMessage,
  onGenerateProofPack,
  onLoadProofPack,
}: ProofPackSummaryProps) {
  const stateCopy = proofPackStatePanelCopy(model.state as ProofPackPanelState, portfolioId);
  const showStatePanel = shouldShowProofPackStatePanel(model.state, errorMessage);
  const actionPending = Boolean(pendingAction);

  return (
    <>
      {showStatePanel ? (
        <ScreenStatePanel
          kind={errorMessage ? "partial" : stateCopy.kind}
          surface="portfolio"
          title={errorMessage ? "Evidence pack is unavailable" : stateCopy.title}
          body={errorMessage ?? stateCopy.body}
        />
      ) : null}

      <WorkbenchSummaryMetricStrip
        ariaLabel="Evidence pack decision summary"
        className={styles.decisionSummary}
        itemClassName={styles.decisionItem}
        layout="custom"
        items={[
          {
            key: "evidence-status",
            label: "Evidence status",
            value: proofPackSupportabilityLabel(model.supportabilityState),
            unavailable: model.state === "unavailable",
          },
          {
            key: "approval-readiness",
            label: "Approval readiness",
            value: model.approvalReadinessLabel,
            unavailable: model.state === "unavailable",
          },
          {
            key: "mandate-coverage",
            label: "Mandate coverage",
            value: model.mandateCoverageLabel,
            unavailable: model.state === "unavailable",
          },
          {
            key: "report-readiness",
            label: "Report readiness",
            value: model.reportReadinessLabel,
            unavailable: model.state === "unavailable",
          },
        ]}
      />

      <div className={styles.lifecycleActions} aria-label="Evidence pack lifecycle actions">
        <ActionButton priority="secondary" onClick={onGenerateProofPack} disabled={!rebalanceRunId || actionPending}>
          {pendingAction === "Generate proof pack" ? "Preparing" : "Prepare evidence"}
        </ActionButton>
        <ActionButton priority="secondary" onClick={onLoadProofPack} disabled={!proofPackId || actionPending}>
          {pendingAction === "Load proof pack" ? "Loading" : "Load evidence"}
        </ActionButton>
      </div>

      {actionError || handoffStatus ? (
        <Text variant="secondary" className="muted">
          {actionError ?? handoffStatus}
        </Text>
      ) : (
        <Text variant="secondary" className="muted">
          Review the current evidence before continuing to reporting or advisor commentary.
        </Text>
      )}

      {model.supportabilityReasons.length > 0 ? (
        <div className={styles.reasonRow}>
          {model.supportabilityReasons.map((reason) => (
            <ProofPackStateBadge key={reason} state={reason} reason />
          ))}
        </div>
      ) : null}
    </>
  );
}

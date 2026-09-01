"use client";

import type { ReactNode } from "react";

import { SemanticBadge, Text, WorkbenchRecordSelector } from "@/design-system";
import PmOperatingQualityStateBadge from "@/features/workbench/components/pm-operating-quality-state-badge";
import type {
  PmOperatingQualityPanelModel,
  PmOperatingQualitySelection,
} from "@/features/workbench/pm-operating-quality-view-model";

import styles from "./pm-operating-quality-record-context.module.css";

type Props = {
  model: PmOperatingQualityPanelModel;
  selection: PmOperatingQualitySelection;
  pendingFairnessDetail: boolean;
  pendingReviewActionDetail: boolean;
  selectionLocked: boolean;
  onScoreRunSelection: (scoreRunId: string) => void;
  onFairnessAnalysisSelection: (fairnessAnalysisId: string) => void;
  onReviewActionSelection: (reviewActionId: string) => void;
};

export default function PmOperatingQualityRecordContext({
  model,
  selection,
  pendingFairnessDetail,
  pendingReviewActionDetail,
  selectionLocked,
  onScoreRunSelection,
  onFairnessAnalysisSelection,
  onReviewActionSelection,
}: Props) {
  return (
    <section className={styles.context} aria-labelledby="pm-quality-record-context-title">
      <div className={styles.heading}>
        <div>
          <Text variant="eyebrow">Supervisory record context</Text>
          <Text as="h3" variant="subsectionTitle" id="pm-quality-record-context-title">
            Select evidence before you act
          </Text>
        </div>
        <SemanticBadge>Manage-backed records</SemanticBadge>
      </div>
      <Text variant="secondary" className={styles.intro}>
        The selected quality run, fairness review, and supervisory action stay attached to the
        detail and command evidence below.
      </Text>
      {selectionLocked ? (
        <p className={styles.pending} role="status">
          Record selection is held while Manage records the current control action.
        </p>
      ) : null}

      <div className={styles.grid}>
        <RecordGroup
          className={styles.scoreRunGroup}
          title="Quality runs"
          count={model.scoreRunRows.length}
          emptyCopy="No portfolio-manager quality runs were returned by Gateway."
        >
          <WorkbenchRecordSelector
            className={styles.scoreRunSelector}
            ariaLabel="PM operating quality score-run selection"
            selectedKey={selection.scoreRunId}
            onSelectionChange={onScoreRunSelection}
            items={model.scoreRunRows.map((row) => ({
              key: row.scoreRunId,
              title: `${row.pmId} / ${row.bookId}`,
              subtitle: `Quality run ${row.scoreRunId}`,
              status: <PmOperatingQualityStateBadge state={row.state} />,
              facts: [
                { label: "As of", value: row.asOfDate },
                { label: "Score", value: row.score },
                { label: "Policy", value: row.policy },
              ],
              nextAction: "Support summary and invocation use this quality run.",
              disabled: selectionLocked,
              sourceEvidence: {
                source: row.sourceService,
                identity: row.scoreRunId,
                state: row.state,
              },
            }))}
          />
        </RecordGroup>

        <RecordGroup
          title="Fairness reviews"
          count={model.fairnessAnalysisRows.length}
          emptyCopy="No persisted fairness reviews were returned by Gateway."
          pendingCopy={pendingFairnessDetail ? "Loading the selected fairness evidence." : null}
        >
          <WorkbenchRecordSelector
            ariaLabel="PM operating quality fairness-analysis selection"
            selectedKey={selection.fairnessAnalysisId}
            onSelectionChange={onFairnessAnalysisSelection}
            items={model.fairnessAnalysisRows.map((row) => ({
              key: row.fairnessAnalysisId,
              title: `Fairness review ${row.fairnessAnalysisId}`,
              subtitle: row.policy,
              status: <PmOperatingQualityStateBadge state={row.state} />,
              facts: [
                { label: "As of", value: row.asOfDate },
                { label: "Observed spread", value: row.observedSpread },
                { label: "Segments", value: row.segmentCount },
              ],
              nextAction: "Detail and supervisory target use this fairness review.",
              disabled: selectionLocked,
            }))}
          />
        </RecordGroup>

        <RecordGroup
          title="Supervisory actions"
          count={model.reviewActionRows.length}
          emptyCopy="No recorded supervisory actions were returned by Gateway."
          pendingCopy={
            pendingReviewActionDetail ? "Loading the selected supervisory action." : null
          }
        >
          <WorkbenchRecordSelector
            ariaLabel="PM operating quality review-action selection"
            selectedKey={selection.reviewActionId}
            onSelectionChange={onReviewActionSelection}
            items={model.reviewActionRows.map((row) => ({
              key: row.reviewActionId,
              title: row.reviewActionRef,
              subtitle: `Supervisory action ${row.reviewActionId}`,
              status: <PmOperatingQualityStateBadge state={row.actionState} />,
              facts: [
                { label: "Target", value: row.target },
                { label: "As of", value: row.asOfDate },
                { label: "Action", value: row.actionType },
              ],
              nextAction: "Summary invocation uses this recorded action.",
              disabled: selectionLocked,
            }))}
          />
        </RecordGroup>
      </div>
    </section>
  );
}

function RecordGroup({
  className,
  title,
  count,
  emptyCopy,
  pendingCopy = null,
  children,
}: {
  className?: string;
  title: string;
  count: number;
  emptyCopy: string;
  pendingCopy?: string | null;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.group} ${className ?? ""}`.trim()} aria-label={title}>
      <div className={styles.groupHeading}>
        <h4>{title}</h4>
        <span>{count}</span>
      </div>
      {count > 0 ? children : <p className={styles.empty}>{emptyCopy}</p>}
      {pendingCopy ? (
        <p className={styles.pending} role="status">
          {pendingCopy}
        </p>
      ) : null}
    </section>
  );
}

import { Text } from "@/design-system";
import { cx } from "@/design-system/utils/cx";

import type { PerformanceAdvisorBriefEvidenceRef } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../../performance-workspace-modes";
import styles from "./performance-advisor-brief.module.css";

export default function LotusEvidenceChip({
  evidenceRef,
  onSelectMode,
}: {
  evidenceRef: PerformanceAdvisorBriefEvidenceRef;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        "lotus-evidence-chip",
        styles.evidenceChip
      )}
      onClick={() => onSelectMode(evidenceRef.targetMode)}
      title={evidenceRef.sourceSurface}
    >
      <Text
        as="span"
        variant="microLabel"
        className={cx(
          "lotus-evidence-chip-label",
          styles.evidenceChipLabel
        )}
      >
        {evidenceRef.metricLabel}
      </Text>
      <Text
        as="strong"
        variant="tableCell"
        className={cx(
          "lotus-evidence-chip-value",
          styles.evidenceChipValue
        )}
      >
        {evidenceRef.metricValue}
      </Text>
    </button>
  );
}

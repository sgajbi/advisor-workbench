import { SemanticBadge, Text } from "@/design-system";
import { cx } from "@/design-system/utils/cx";
import type { PerformanceAdvisorBriefItem } from "../../advisor-brief-view-model";
import type { PerformanceWorkspaceMode } from "../../performance-workspace-modes";

import LotusEvidenceChip from "./lotus-evidence-chip";
import styles from "./performance-advisor-brief.module.css";

const ITEM_TONE_CLASS = {
  neutral: styles.itemNeutral,
  positive: styles.itemPositive,
  warning: styles.itemWarning,
} satisfies Record<PerformanceAdvisorBriefItem["tone"], string>;

function toToneLabel(tone: PerformanceAdvisorBriefItem["tone"]) {
  if (tone === "warning") {
    return "Review";
  }
  if (tone === "positive") {
    return "Supported";
  }
  return "Source-grounded";
}

export default function LotusTalkingPointCard({
  item,
  onSelectMode,
  variant = "brief",
}: {
  item: PerformanceAdvisorBriefItem;
  onSelectMode: (mode: PerformanceWorkspaceMode) => void;
  variant?: "brief" | "risk";
}) {
  return (
    <article
      className={cx(
        "lotus-talking-point-card",
        `lotus-talking-point-card-${variant}`,
        styles.item,
        ITEM_TONE_CLASS[item.tone]
      )}
    >
      <header
        className={cx(
          "lotus-talking-point-card-header",
          styles.itemHeader
        )}
      >
        <div
          className={cx(
            "lotus-talking-point-card-copy",
            styles.itemCopy
          )}
        >
          <Text as="h4" variant="subsectionTitle">
            {item.headline}
          </Text>
          <Text as="p" variant="bodySmall">
            {item.detail}
          </Text>
        </div>
        <SemanticBadge
          tone={item.tone === "warning" ? "warn" : item.tone === "positive" ? "success" : "default"}
          className={styles.itemTone}
        >
          {toToneLabel(item.tone)}
        </SemanticBadge>
      </header>
      {item.evidenceRefs.length ? (
        <div
          className={styles.evidenceRow}
          aria-label="Supporting metrics"
        >
          <Text
            as="span"
            variant="microLabel"
            className={styles.itemSupportLabel}
          >
            Supporting metrics
          </Text>
          {item.evidenceRefs.map((evidenceRef) => (
            <LotusEvidenceChip
              key={`${item.headline}-${evidenceRef.metricLabel}-${evidenceRef.sourceSurface}`}
              evidenceRef={evidenceRef}
              onSelectMode={onSelectMode}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

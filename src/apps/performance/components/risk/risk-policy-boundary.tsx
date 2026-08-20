import { Text } from "@/design-system";

import styles from "./risk-policy-boundary.module.css";

export default function RiskPolicyBoundary() {
  return (
    <section
      className={styles.boundary}
      role="note"
      aria-label="Risk mandate comparison boundary"
    >
      <div className={styles.heading}>
        <Text variant="label">Mandate comparison</Text>
        <Text variant="metadata">Not supplied by source</Text>
      </div>
      <Text variant="body" className={styles.detail}>
        Use these source measures as review evidence. No approved client mandate or house risk
        limit is available in this workspace, so Workbench does not infer a breach or an all-clear.
      </Text>
    </section>
  );
}

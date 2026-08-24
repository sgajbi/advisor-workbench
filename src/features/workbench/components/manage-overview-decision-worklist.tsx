"use client";

import {
  ActionLink,
  SemanticBadge,
  Text,
  useAdmittedSourceSelection,
  WorkbenchWorklist,
} from "@/design-system";
import type { ManageOverviewDecision } from "@/features/workbench/manage-overview-model";

import styles from "./manage-overview.module.css";

export default function ManageOverviewDecisionWorklist({
  selectionScopeKey,
  decisions,
}: {
  selectionScopeKey: string;
  decisions: ManageOverviewDecision[];
}) {
  const [selectedKey, setSelectedKey] = useAdmittedSourceSelection({
    scopeKey: selectionScopeKey,
    admittedKeys: decisions.map((decision) => decision.key),
    sourceResolved: true,
  });
  const selectedDecision =
    decisions.find((decision) => decision.key === selectedKey) ?? decisions[0];

  if (!selectedDecision) {
    return null;
  }

  return (
    <WorkbenchWorklist
      ariaLabel="Portfolio-management decision worklist"
      relationshipIdBase="manage-overview-decision-worklist"
      eyebrow="Decision worklist"
      title="What needs review now"
      description="Select an item to review its evidence and continue in the source-owned workflow."
      items={decisions.map((decision) => ({
        key: decision.key,
        title: decision.title,
        subtitle: decision.subtitle,
        status: (
          <SemanticBadge tone={decision.tone}>{decision.status}</SemanticBadge>
        ),
        facts: decision.facts,
      }))}
      selectedKey={selectedDecision.key}
      onSelectionChange={setSelectedKey}
      decisionLabel="Selected portfolio-management decision"
      decision={<SelectedManageDecision decision={selectedDecision} />}
      className={styles.decisionWorkspace}
    />
  );
}

function SelectedManageDecision({
  decision,
}: {
  decision: ManageOverviewDecision;
}) {
  return (
    <article
      className={styles.decisionPanel}
      data-decision-kind={decision.kind}
      data-testid="manage-overview-selected-decision"
    >
      <header className={styles.decisionHeader}>
        <Text variant="microLabel">Next business action</Text>
        <Text variant="subsectionTitle" as="h4">
          {decision.nextAction}
        </Text>
      </header>

      <dl className={styles.evidenceGrid} aria-label="Decision evidence">
        {decision.evidence.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <footer className={styles.decisionFooter}>
        <Text variant="bodySmall">
          Continue in the source-owned work area to review the complete record.
        </Text>
        <ActionLink href={decision.actionHref} className={styles.actionLink}>
          {decision.actionLabel}
        </ActionLink>
      </footer>
    </article>
  );
}

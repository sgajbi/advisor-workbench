import { SemanticBadge, SupportDetails, Text } from "@/design-system";

import type {
  RiskMandateComparisonSourceViewModel,
  RiskMandateComparisonViewModel,
  RiskMandateConstraintViewModel,
} from "../../risk-mandate-comparison-view-model";

import styles from "./risk-mandate-comparison.module.css";

export default function RiskMandateComparison({
  comparison,
}: {
  comparison: RiskMandateComparisonViewModel;
}) {
  return (
    <section
      className={styles.surface}
      aria-label="Mandate comparison"
      data-testid="risk-mandate-comparison"
      data-mandate-availability={comparison.availability}
      data-mandate-context-posture={
        comparison.contextPosture ?? "not_comparable"
      }
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <Text variant="eyebrow">Mandate control</Text>
          <Text variant="sectionTitle" as="h2">
            Mandate comparison
          </Text>
          <Text variant="bodySmall" className={styles.summary}>
            {comparison.summary}
          </Text>
        </div>
        <SemanticBadge tone={comparison.availabilityTone}>
          {comparison.availabilityLabel}
        </SemanticBadge>
      </header>

      {comparison.contextNotice ? (
        <p className={styles.contextNotice} role="status">
          {comparison.contextNotice}
        </p>
      ) : null}

      {comparison.sources.length ? (
        <div className={styles.sourceList}>
          {comparison.sources.map((source) => (
            <MandateComparisonSource key={source.key} source={source} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MandateComparisonSource({
  source,
}: {
  source: RiskMandateComparisonSourceViewModel;
}) {
  return (
    <section
      className={styles.source}
      aria-labelledby={`mandate-comparison-${source.key}`}
      data-mandate-source={source.key}
      data-mandate-source-availability={source.availability}
      data-mandate-supportability={source.supportability}
      data-date-alignment={source.dateAlignment}
    >
      <div className={styles.sourceHeader}>
        <div>
          <Text
            variant="panelTitle"
            as="h3"
            id={`mandate-comparison-${source.key}`}
          >
            {source.label}
          </Text>
          {source.supportabilityReason ? (
            <Text variant="bodySmall" className={styles.sourceReason}>
              {source.supportabilityReason}
            </Text>
          ) : null}
        </div>
        <div className={styles.badges} aria-label="Mandate evidence status">
          <SemanticBadge tone={source.supportabilityTone}>
            {source.supportabilityLabel}
          </SemanticBadge>
          <SemanticBadge tone={source.dateAlignmentTone}>
            {source.dateAlignmentLabel}
          </SemanticBadge>
        </div>
      </div>

      {source.availability === "not_supplied" ? (
        <p className={styles.empty} role="status">
          Mandate comparison was not supplied for this view. Confirm the
          approved mandate before deciding whether a limit applies. No breach or
          within-mandate conclusion is shown.
        </p>
      ) : (
        <>
          <div className={styles.contextStrip}>
            <ContextFact label="Mandate" value={source.mandateReference} />
            <ContextFact label="Version" value={source.mandateVersion} />
            <ContextFact label="Risk profile" value={source.riskProfile} />
            <ContextFact
              label="Comparison date"
              value={source.comparisonAsOf}
            />
            {source.reviewPolicy ? (
              <div className={styles.reviewPolicy}>
                <span className={styles.factLabel}>Review policy</span>
                <span className={styles.reviewPolicyValue}>
                  <SemanticBadge tone={source.reviewPolicy.tone}>
                    <span data-review-policy-state={source.reviewPolicy.state}>
                      {source.reviewPolicy.stateLabel}
                    </span>
                  </SemanticBadge>
                  <span>
                    {source.reviewPolicy.frequency} · next{" "}
                    {source.reviewPolicy.nextReviewDueDate}
                  </span>
                </span>
              </div>
            ) : (
              <ContextFact label="Review policy" value="Not supplied" />
            )}
          </div>

          {source.constraints.length ? (
            <ConstraintTable source={source} />
          ) : (
            <p className={styles.empty} role="status">
              No source constraint comparisons were supplied for this view.
            </p>
          )}

          <SourceEvidence source={source} />
        </>
      )}
    </section>
  );
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.contextFact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  );
}

function ConstraintTable({
  source,
}: {
  source: RiskMandateComparisonSourceViewModel;
}) {
  return (
    <div
      className={styles.table}
      role="table"
      aria-labelledby={`mandate-comparison-${source.key}`}
      aria-rowcount={source.constraints.length + 1}
      aria-colcount={6}
    >
      <div className={styles.tableHeader} role="row">
        {[
          "Constraint",
          "Source state",
          "Measure",
          "Mandate limit",
          "Source headroom",
          "Basis and date",
        ].map((label) => (
          <span key={label} role="columnheader">
            {label}
          </span>
        ))}
      </div>
      <div role="rowgroup">
        {source.constraints.map((constraint, index) => (
          <ConstraintRow
            key={constraint.key}
            sourceKey={source.key}
            constraint={constraint}
            rowIndex={index + 2}
          />
        ))}
      </div>
    </div>
  );
}

function ConstraintRow({
  sourceKey,
  constraint,
  rowIndex,
}: {
  sourceKey: RiskMandateComparisonSourceViewModel["key"];
  constraint: RiskMandateConstraintViewModel;
  rowIndex: number;
}) {
  return (
    <div
      className={styles.tableRow}
      role="row"
      aria-rowindex={rowIndex}
      data-testid={`risk-mandate-constraint-${sourceKey}-${constraint.key}`}
      data-mandate-constraint-source={sourceKey}
      data-mandate-constraint={constraint.key}
      data-mandate-state={constraint.state}
    >
      <div className={styles.constraintCell} role="cell">
        <span className={styles.mobileLabel}>Constraint</span>
        <strong>{constraint.name}</strong>
        <span className={styles.reason}>{constraint.reason}</span>
      </div>
      <div className={styles.cell} role="cell">
        <span className={styles.mobileLabel}>Source state</span>
        <SemanticBadge tone={constraint.tone}>
          {constraint.stateLabel}
        </SemanticBadge>
      </div>
      <DataCell label="Measure" value={constraint.measure} />
      <DataCell label="Mandate limit" value={constraint.limit} />
      <DataCell label="Source headroom" value={constraint.headroom} />
      <div className={styles.cell} role="cell">
        <span className={styles.mobileLabel}>Basis and date</span>
        <span>{constraint.basis}</span>
        <span className={styles.secondary}>{constraint.asOf}</span>
      </div>
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${styles.cell} ${styles.numeric}`} role="cell">
      <span className={styles.mobileLabel}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SourceEvidence({
  source,
}: {
  source: RiskMandateComparisonSourceViewModel;
}) {
  return (
    <SupportDetails
      className={styles.supportDetails}
      summary="Source evidence and lineage"
      context={`${source.lineage.length} lineage ${source.lineage.length === 1 ? "record" : "records"}`}
    >
      <dl className={styles.evidenceGrid}>
        <EvidenceFact label="Mandate date" value={source.mandateAsOf} />
        <EvidenceFact
          label="Mandate health date"
          value={source.mandateHealthAsOf}
        />
        <EvidenceFact
          label="Last mandate review"
          value={source.reviewPolicy?.lastReviewDate ?? "Not supplied"}
        />
        <EvidenceFact
          label="Next mandate review"
          value={source.reviewPolicy?.nextReviewDueDate ?? "Not supplied"}
        />
      </dl>

      {source.constraints.map((constraint) => (
        <section
          key={constraint.key}
          className={styles.evidenceSection}
          aria-labelledby={`mandate-comparison-${source.key}-${constraint.key}-evidence`}
        >
          <Text
            variant="subsectionTitle"
            as="h4"
            id={`mandate-comparison-${source.key}-${constraint.key}-evidence`}
          >
            {constraint.name} evidence
          </Text>
          <dl className={styles.evidenceGrid}>
            {constraint.evidence.map((item) => (
              <EvidenceFact
                key={item.label}
                term={item.label}
                value={item.value}
              />
            ))}
          </dl>
        </section>
      ))}

      {source.lineage.length ? (
        <section className={styles.evidenceSection}>
          <Text variant="subsectionTitle" as="h4">
            Lineage
          </Text>
          {source.lineage.map((lineage) => (
            <dl key={lineage.key} className={styles.evidenceGrid}>
              <EvidenceFact label="Product" value={lineage.product} />
              <EvidenceFact
                label="Source system"
                value={lineage.sourceSystem}
              />
              <EvidenceFact
                label="Source record"
                value={lineage.sourceRecord}
              />
              <EvidenceFact label="Data quality" value={lineage.dataQuality} />
              <EvidenceFact
                label="Latest evidence"
                value={lineage.latestEvidence}
              />
            </dl>
          ))}
        </section>
      ) : (
        <p className={styles.empty}>No source lineage records were supplied.</p>
      )}
    </SupportDetails>
  );
}

function EvidenceFact({
  label,
  term,
  value,
}: {
  label?: string;
  term?: string;
  value: string;
}) {
  return (
    <div className={styles.evidenceFact}>
      <dt>{term ?? label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

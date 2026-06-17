"use client";

import { useMemo } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  Text,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  getBankDemoScenarioContract,
  getBankDemoSupportedClaimRegister,
} from "../api";
import { buildBankDemoProofModel } from "../bank-demo-proof-view-model";
import styles from "./bank-demo-proof-workspace.module.css";

export default function BankDemoProofWorkspace({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const scenarioQuery = useQuery({
    queryKey: ["bank-demo-proof-scenario-contract", portfolioId],
    queryFn: getBankDemoScenarioContract,
    ...workbenchStrictQueryDefaults,
  });
  const claimRegisterQuery = useQuery({
    queryKey: ["bank-demo-proof-supported-claim-register", portfolioId],
    queryFn: getBankDemoSupportedClaimRegister,
    ...workbenchStrictQueryDefaults,
  });
  const isLoading = scenarioQuery.isLoading || claimRegisterQuery.isLoading;
  const hasError = Boolean(scenarioQuery.error || claimRegisterQuery.error);
  const model = useMemo(
    () =>
      buildBankDemoProofModel({
        scenario: scenarioQuery.data,
        claimRegister: claimRegisterQuery.data,
        portfolioId,
      }),
    [scenarioQuery.data, claimRegisterQuery.data, portfolioId],
  );

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading bank demo proof...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Bank Demo Proof"
      subtitle="Gateway-backed scenario, supported claims, and publication boundaries for the private-banking advisory journey."
    >
      {hasError ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Bank demo proof is unavailable. No local proof claims are shown.
        </Alert>
      ) : null}
      {hasError ? (
        <ScreenStatePanel
          kind="error"
          title="Proof contract unavailable"
          body="The RFC-0028 scenario contract or supported-claim register could not be loaded through Gateway."
          surface="default"
        />
      ) : (
        <div className={styles.contentGrid}>
          <div className={styles.decisionPanel}>
            <div>
              <Text variant="microLabel">Advisor Decision</Text>
              <Text variant="subsectionTitle" as="h2">
                {model.primaryDecision}
              </Text>
              <Text variant="secondary">{model.recommendedAction}</Text>
            </div>
            <SemanticBadge tone="warn" emphasis="strong">
              Advisor use only
            </SemanticBadge>
          </div>

          <div className={styles.metricGrid} aria-label="Bank demo proof summary">
            {model.metrics.map((metric) => (
              <article className={styles.metricTile} key={metric.label}>
                <Text variant="microLabel">{metric.label}</Text>
                <strong>{metric.value}</strong>
                <span>{metric.detail}</span>
              </article>
            ))}
          </div>

          <div className={styles.twoColumnGrid}>
            <section className={styles.stepPanel} aria-label="Bank demo scenario steps">
              <div className={styles.panelHeader}>
                <Text variant="subsectionTitle">Scenario Steps</Text>
                <SemanticBadge tone="success">{model.portfolioId}</SemanticBadge>
              </div>
              <div className={styles.stepList}>
                {model.steps.map((step) => (
                  <article className={styles.stepItem} key={step.stepId}>
                    <Text variant="microLabel">{step.owner}</Text>
                    <strong>{step.title}</strong>
                    <div className={styles.stepMeta}>
                      <span>Evidence: {step.evidenceRefs}</span>
                      <span>Workbench: {step.workbenchPanels}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.claimPanel} aria-label="Supported claim register">
              <div className={styles.panelHeader}>
                <Text variant="subsectionTitle">Supported Claims</Text>
                <SemanticBadge tone="default">{model.proofMarker}</SemanticBadge>
              </div>
              <div className={styles.claimList}>
                {model.claims.map((claim) => (
                  <article className={styles.claimItem} key={claim.claimId}>
                    <div>
                      <h3>{claim.title}</h3>
                      <p>{claim.claimText}</p>
                      {claim.wordingRules.length > 0 ? (
                        <ul className={styles.wordingRules}>
                          {claim.wordingRules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className={styles.claimMeta}>
                      <SemanticBadge tone={claim.classificationTone}>
                        {claim.classification}
                      </SemanticBadge>
                      <span>Audience: {claim.audience}</span>
                      <span>Material: {claim.materials}</span>
                      <span>Proof: {claim.proofRequirements}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.twoColumnGrid}>
            <section className={styles.boundaryPanel}>
              <Text variant="subsectionTitle">Publication Boundaries</Text>
              <ul className={styles.boundaryList}>
                {model.unsupportedBoundaries.map((boundary) => (
                  <li key={boundary}>{boundary}</li>
                ))}
              </ul>
            </section>
            <section className={styles.policyPanel}>
              <Text variant="subsectionTitle">Proof Handling</Text>
              <ul className={styles.ruleList}>
                {model.artifactPolicyRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <Text variant="microLabel">Source Products</Text>
              <ul className={styles.sourceList}>
                {model.sourceProducts.map((sourceProduct) => (
                  <li key={sourceProduct}>{sourceProduct}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </SectionBlock>
  );
}

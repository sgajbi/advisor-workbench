"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { ScreenStatePanel, SectionBlock, SemanticBadge, Text } from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import { getAdvisoryPolicyReviewQueue, listProposals } from "../api";
import {
  buildProposalLifecycleWorkspaceModel,
  type ProposalLifecycleMode,
} from "../proposal-lifecycle-workspace-view-model";
import { buildPolicyReviewQueueModel } from "../proposal-policy-review-view-model";
import styles from "./proposal-lifecycle-workspace.module.css";

export default function ProposalLifecycleWorkspace({
  portfolioId,
  mode,
}: {
  portfolioId: string;
  mode: ProposalLifecycleMode;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal-lifecycle-workspace", portfolioId, mode],
    queryFn: async () => await listProposals({ portfolioId }),
    ...workbenchStrictQueryDefaults,
  });
  const policyQueueQuery = useQuery({
    queryKey: ["advisory-policy-review-queue", portfolioId],
    queryFn: async () => await getAdvisoryPolicyReviewQueue("PENDING_REVIEW"),
    enabled: mode === "suitability",
    ...workbenchStrictQueryDefaults,
  });

  const proposals = useMemo(() => data?.items ?? [], [data?.items]);
  const model = useMemo(
    () => buildProposalLifecycleWorkspaceModel({ mode, proposals }),
    [mode, proposals]
  );
  const policyReviewModel = useMemo(
    () => buildPolicyReviewQueueModel({ records: policyQueueQuery.data?.items ?? [] }),
    [policyQueueQuery.data?.items]
  );

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading proposal lifecycle...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title={model.title}
      subtitle={model.subtitle}
      actions={
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Build Proposal
        </Link>
      }
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Proposal lifecycle is unavailable. No fallback proposal queue is shown.
        </Alert>
      ) : null}
      {mode === "suitability" && policyQueueQuery.error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Policy review queue is unavailable. No fallback suitability policy queue is shown.
        </Alert>
      ) : null}

      <div className={styles.decisionPanel}>
        <div>
          <Text variant="microLabel">Advisor Decision</Text>
          <Text variant="subsectionTitle" as="h2">
            {model.primaryDecision}
          </Text>
          <Text variant="secondary">{model.recommendedAction}</Text>
        </div>
        <div className={styles.countStrip} aria-label="Proposal lifecycle counts">
          <div>
            <span>{model.totalCount}</span>
            <strong>In view</strong>
          </div>
          <div>
            <span>{model.attentionCount}</span>
            <strong>Need action</strong>
          </div>
        </div>
      </div>

      {mode === "suitability" ? (
        <PolicyReviewQueueSection
          portfolioId={portfolioId}
          isLoading={policyQueueQuery.isLoading}
          hasError={Boolean(policyQueueQuery.error)}
          model={policyReviewModel}
        />
      ) : null}

      {error ? (
        <ScreenStatePanel
          kind="error"
          title="Proposal lifecycle unavailable"
          body="The proposal queue could not be loaded from the approved advisory workflow."
          surface="default"
        />
      ) : model.rows.length === 0 ? (
        <ScreenStatePanel
          kind="empty"
          title={model.emptyTitle}
          body={model.emptyBody}
          action={
            <Link
              className="nav-link"
              href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
            >
              Build advisor-use draft
            </Link>
          }
          surface="default"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.lifecycleTable}>
            <thead>
              <tr>
                <th>Proposal</th>
                <th>Portfolio</th>
                <th>Stage</th>
                <th>Readiness</th>
                <th>Posture</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.proposalId}>
                  <td>
                    <Link href={row.href}>{row.title}</Link>
                    <span>ID: {row.proposalId}</span>
                  </td>
                  <td>{row.portfolio}</td>
                  <td>
                    <SemanticBadge tone={row.stageTone}>{row.stage}</SemanticBadge>
                  </td>
                  <td>
                    <SemanticBadge tone={row.readinessTone}>{row.readiness}</SemanticBadge>
                  </td>
                  <td>{row.posture}</td>
                  <td>{row.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionBlock>
  );
}

function PolicyReviewQueueSection({
  portfolioId,
  isLoading,
  hasError,
  model,
}: {
  portfolioId: string;
  isLoading: boolean;
  hasError: boolean;
  model: ReturnType<typeof buildPolicyReviewQueueModel>;
}) {
  if (isLoading) {
    return (
      <div className={styles.policyReviewPanel}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading policy review queue...</Text>
        </Stack>
      </div>
    );
  }

  if (hasError) {
    return (
      <ScreenStatePanel
        kind="error"
        title="Policy review queue unavailable"
        body="Suitability policy evaluations could not be loaded from the approved advisory workflow."
        surface="default"
      />
    );
  }

  if (model.rows.length === 0) {
    return (
      <ScreenStatePanel
        kind="empty"
        title="No policy evaluations need review"
        body={`No suitability policy evaluations are waiting for ${portfolioId}.`}
        surface="default"
      />
    );
  }

  return (
    <div className={styles.policyReviewPanel}>
      <div className={styles.policyReviewHeader}>
        <div>
          <Text variant="microLabel">Suitability Policy Queue</Text>
          <Text variant="subsectionTitle" as="h3">
            Policy evaluations needing review
          </Text>
        </div>
        <div className={styles.policyReviewCounts} aria-label="Policy review counts">
          <span>{model.totalCount}</span>
          <strong>{model.actionCount} need action</strong>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.lifecycleTable}>
          <thead>
            <tr>
              <th>Proposal</th>
              <th>Policy Review</th>
              <th>Sign-Off</th>
              <th>Open Requirements</th>
              <th>Evidence</th>
              <th>Next Action</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.evaluationId}>
                <td>
                  <Link href={row.href}>{row.proposalId}</Link>
                  <span>{row.proposalVersion}</span>
                </td>
                <td>
                  <SemanticBadge tone={row.policyStatusTone}>{row.policyStatus}</SemanticBadge>
                  <span>{row.policyPack}</span>
                </td>
                <td>
                  <SemanticBadge tone={row.signOffTone}>{row.signOffStatus}</SemanticBadge>
                </td>
                <td>{row.openRequirements}</td>
                <td>{row.evidencePosture}</td>
                <td>{row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

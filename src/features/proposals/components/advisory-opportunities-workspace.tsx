"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { ScreenStatePanel, SectionBlock, Text } from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import { getAdvisorIdeaReviewQueue } from "../api";
import { buildAdvisoryOpportunitiesModel } from "../advisory-opportunities-view-model";
import styles from "./advisory-opportunities-workspace.module.css";

export default function AdvisoryOpportunitiesWorkspace({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["advisory-opportunities", portfolioId],
    queryFn: async () => await getAdvisorIdeaReviewQueue({ portfolioId }),
    ...workbenchStrictQueryDefaults,
  });

  const model = useMemo(
    () => buildAdvisoryOpportunitiesModel({ portfolioId, queue: data }),
    [portfolioId, data]
  );

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading Idea review queue...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Opportunities And Ideas"
      subtitle="Advisor-use triage of Lotus Idea candidates through the governed Gateway contract."
      actions={
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Open Proposal Builder
        </Link>
      }
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Idea candidates are unavailable. No fallback opportunity list is shown.
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
        <div className={styles.ideaCount} aria-label="Idea candidates">
          <span>{model.candidateCount}</span>
          <strong>Idea candidates</strong>
        </div>
      </div>

      <div className={styles.proofStrip} aria-label="Idea queue proof posture">
        <span>Policy: {model.policyVersion}</span>
        <span>Evaluated: {model.evaluatedAtUtc}</span>
        <span>Durable storage: {model.durableStorageBacked ? "Backed" : "Not backed"}</span>
        <span>Supported feature: {model.supportedFeaturePromoted ? "Promoted" : "Not promoted"}</span>
        <span>Excluded: {model.excludedCount}</span>
      </div>

      {error ? (
        <ScreenStatePanel
          kind="error"
          title="Idea queue unavailable"
          body="The Lotus Idea review queue could not be loaded through Gateway. No local fallback queue is shown."
          surface="default"
        />
      ) : model.rows.length === 0 ? (
        <ScreenStatePanel
          kind="empty"
          title="No Idea candidates ready for review"
          body="Lotus Idea did not return reviewable candidates for this portfolio scope."
          action={
            <Link
              className="nav-link"
              href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
            >
              Open proposal builder
            </Link>
          }
          surface="default"
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.ideaTable}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Rank</th>
                <th>Score</th>
                <th>Priority</th>
                <th>Review Posture</th>
                <th>Source Evidence</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.candidateId}>
                  <td>
                    <Link href={row.href}>{row.title}</Link>
                    <span>ID: {row.candidateId}</span>
                  </td>
                  <td>{row.rank}</td>
                  <td>{row.score}</td>
                  <td>{row.priority}</td>
                  <td>{row.reviewPosture}</td>
                  <td>
                    <span>{row.sourceSignals}</span>
                    <span>{row.reasonCodes}</span>
                  </td>
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

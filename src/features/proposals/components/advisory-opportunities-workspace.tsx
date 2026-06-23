"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { ScreenStatePanel, SectionBlock, Text } from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  getAdvisorIdeaCandidateDetail,
  getAdvisorIdeaReviewQueue,
} from "../api";
import { buildAdvisoryOpportunitiesModel } from "../advisory-opportunities-view-model";
import type { AdvisorIdeaCandidateDetailData } from "../types";
import styles from "./advisory-opportunities-workspace.module.css";

export default function AdvisoryOpportunitiesWorkspace({
  portfolioId,
  selectedCandidateId,
}: {
  portfolioId: string;
  selectedCandidateId?: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["advisory-opportunities", portfolioId],
    queryFn: async () => await getAdvisorIdeaReviewQueue({ portfolioId }),
    ...workbenchStrictQueryDefaults,
  });
  const selectedCandidate = selectedCandidateId?.trim();
  const {
    data: candidateDetail,
    isLoading: isCandidateDetailLoading,
    error: candidateDetailError,
  } = useQuery({
    queryKey: ["advisory-opportunity-detail", portfolioId, selectedCandidate],
    queryFn: async () =>
      await getAdvisorIdeaCandidateDetail({
        candidateId: selectedCandidate ?? "",
        portfolioId,
      }),
    enabled: Boolean(selectedCandidate),
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

      {selectedCandidate ? (
        <IdeaCandidateDetailPanel
          detail={candidateDetail}
          error={candidateDetailError}
          isLoading={isCandidateDetailLoading}
          portfolioId={portfolioId}
          selectedCandidateId={selectedCandidate}
        />
      ) : null}

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
          <table className={styles.ideaTable} aria-label="Idea candidate review queue">
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

function IdeaCandidateDetailPanel({
  detail,
  error,
  isLoading,
  portfolioId,
  selectedCandidateId,
}: {
  detail?: AdvisorIdeaCandidateDetailData;
  error: Error | null;
  isLoading: boolean;
  portfolioId: string;
  selectedCandidateId: string;
}) {
  const candidate = detail?.candidate;
  const evidence = detail?.evidence;
  const audit = detail?.auditSummary;
  const sourceRefs = evidence?.sourceRefs ?? [];
  return (
    <div className={styles.detailPanel} aria-label="Idea candidate source-safe detail">
      <div className={styles.detailHeader}>
        <div>
          <Text variant="microLabel">Source-Safe Candidate Detail</Text>
          <Text variant="subsectionTitle" as="h3">
            {candidate?.candidateId ?? selectedCandidateId}
          </Text>
          <Text variant="secondary">
            Detail is fetched through Gateway with portfolio-scoped Idea caller headers.
          </Text>
        </div>
        <Link
          className="nav-link"
          href={`/recommendations?mode=opportunities&portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Close detail
        </Link>
      </div>
      {isLoading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading source-safe candidate detail...</Text>
        </Stack>
      ) : error ? (
        <Alert severity="warning">
          Candidate detail is unavailable through Gateway. No raw API response is shown.
        </Alert>
      ) : (
        <div className={styles.detailGrid}>
          <span>Family: {formatDetailCode(candidate?.family)}</span>
          <span>Lifecycle: {formatDetailCode(candidate?.lifecycleStatus)}</span>
          <span>Review: {formatDetailCode(candidate?.reviewPosture)}</span>
          <span>Evidence: {evidence?.supportability ?? "Evidence pending"}</span>
          <span>Sources: {sourceRefs.length}</span>
          <span>Audit events: {audit?.eventCount ?? 0}</span>
          <span>Durable storage: {detail?.durableStorageBacked ? "Backed" : "Not backed"}</span>
          <span>
            Supported feature: {detail?.supportedFeaturePromoted ? "Promoted" : "Not promoted"}
          </span>
        </div>
      )}
    </div>
  );
}

function formatDetailCode(value: string | undefined): string {
  if (!value) {
    return "Pending";
  }
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

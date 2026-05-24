"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { ScreenStatePanel, SectionBlock, Text } from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import { listProposals } from "../api";
import { buildAdvisoryOpportunitiesModel } from "../advisory-opportunities-view-model";
import styles from "./advisory-opportunities-workspace.module.css";

export default function AdvisoryOpportunitiesWorkspace({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["advisory-opportunities", portfolioId],
    queryFn: async () => await listProposals({ portfolioId, state: "DRAFT" }),
    ...workbenchStrictQueryDefaults,
  });

  const proposals = useMemo(() => data?.items ?? [], [data?.items]);
  const model = useMemo(
    () => buildAdvisoryOpportunitiesModel({ portfolioId, proposals }),
    [portfolioId, proposals]
  );

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading advisory ideas...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Opportunities And Ideas"
      subtitle="Advisor-use idea triage from draft proposal work already recorded in the advisory workflow."
      actions={
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(portfolioId)}`}
        >
          Start New Idea
        </Link>
      }
    >
      {error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Advisory ideas are unavailable. No fallback opportunity list is shown.
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
        <div className={styles.ideaCount} aria-label="Draft advisory ideas">
          <span>{model.draftCount}</span>
          <strong>Draft ideas</strong>
        </div>
      </div>

      {error ? (
        <ScreenStatePanel
          kind="error"
          title="Idea queue unavailable"
          body="The draft proposal queue could not be loaded from the approved advisory workflow."
          surface="default"
        />
      ) : model.rows.length === 0 ? (
        <ScreenStatePanel
          kind="empty"
          title="No draft ideas in this portfolio"
          body="Use the proposal builder to model a client objective against the live portfolio book."
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
          <table className={styles.ideaTable}>
            <thead>
              <tr>
                <th>Idea</th>
                <th>Portfolio</th>
                <th>Advisor</th>
                <th>Created</th>
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
                  <td>{row.advisor}</td>
                  <td>{row.createdAt}</td>
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

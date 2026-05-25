"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, CircularProgress, Stack } from "@mui/material";

import { ScreenStatePanel, SectionBlock, SemanticBadge, Text } from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import { listProposals } from "../api";
import { buildAdvisoryOverviewModel } from "../advisory-overview-view-model";
import styles from "./advisory-overview-workspace.module.css";

export default function AdvisoryOverviewWorkspace({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["advisory-overview", portfolioId],
    queryFn: async () => await listProposals({ portfolioId }),
    ...workbenchStrictQueryDefaults,
  });

  const proposals = useMemo(() => data?.items ?? [], [data?.items]);
  const model = useMemo(
    () => buildAdvisoryOverviewModel({ portfolioId, proposals }),
    [portfolioId, proposals]
  );

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading advisory posture...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <>
      <h1 className="sr-only">Advisory Overview</h1>
      <SectionBlock
        title="Advisory Overview"
        subtitle="Portfolio-scoped proposal posture, advisor decisions, and next actions."
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
            Advisory proposal posture is unavailable. No fallback proposals are shown.
          </Alert>
        ) : null}

        <div className={styles.summaryGrid} aria-label="Advisory overview summary">
          {model.metrics.map((metric) => (
            <article key={metric.label} className={`${styles.metricTile} ${styles[metric.tone]}`}>
              <Text variant="microLabel">{metric.label}</Text>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </div>

        <div className={styles.decisionPanel}>
          <div>
            <Text variant="microLabel">Advisor Decision</Text>
            <Text variant="subsectionTitle" as="h2">
              {model.primaryDecision}
            </Text>
            <Text variant="secondary">{model.recommendedAction}</Text>
          </div>
          <SemanticBadge tone={model.proposalRows.length ? "warn" : "success"} emphasis="strong">
            {model.proposalRows.length ? "Action Required" : "Clear"}
          </SemanticBadge>
        </div>

        <div className={styles.workspaceGrid}>
          <section className={styles.journeyPanel} aria-label="Advisory journey screens">
            <div className={styles.panelHeader}>
              <Text variant="subsectionTitle">Advisory Journey</Text>
              <Text variant="metadata">{model.portfolioId}</Text>
            </div>
            <div className={styles.journeyGrid}>
              {model.journeyCards.map((card) => (
                <Link key={card.key} href={card.href} className={styles.journeyCard}>
                  <div>
                    <Text variant="microLabel">{card.detail}</Text>
                    <strong>{card.label}</strong>
                    <span>{card.decision}</span>
                  </div>
                  <div className={styles.journeyAction}>
                    <SemanticBadge tone={card.countLabel === "0" ? "default" : "warn"}>
                      {card.countLabel}
                    </SemanticBadge>
                    <span>{card.nextAction}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.priorityPanel} aria-label="Priority advisory actions">
            <div className={styles.panelHeader}>
              <Text variant="subsectionTitle">Priority Advisory Actions</Text>
              <Link href={`/proposals?portfolioId=${encodeURIComponent(portfolioId)}`}>
                Open Approval Queue
              </Link>
            </div>

            {error ? (
              <ScreenStatePanel
                kind="error"
                title="Advisory queue unavailable"
                body="The proposal list could not be loaded from the approved advisory workflow."
                surface="default"
              />
            ) : model.proposalRows.length === 0 ? (
              <ScreenStatePanel
                kind="empty"
                title="No open advisory proposals"
                body="Create a proposal from the live portfolio book when an advisory idea is ready."
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
              <div className={styles.priorityTableWrap}>
                <table className={styles.priorityTable}>
                  <thead>
                    <tr>
                      <th>Proposal</th>
                      <th>Portfolio</th>
                      <th>Stage</th>
                      <th>Readiness</th>
                      <th>Next Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.proposalRows.map((row) => (
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
                        <td>{row.nextAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </SectionBlock>
    </>
  );
}

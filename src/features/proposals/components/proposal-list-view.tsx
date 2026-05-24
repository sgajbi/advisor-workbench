"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { listProposals } from "../api";
import { ProposalSummary } from "../types";
import {
  PROPOSAL_STAGES,
  proposalNextAction,
  proposalStageLabel,
  proposalStageTone,
  type ProposalStage,
} from "../proposal-workflow-copy";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { ScreenStatePanel, SectionBlock, SemanticBadge, Text } from "@/design-system";
import styles from "./proposal-list-view.module.css";

function groupedByStage(items: ProposalSummary[]): Record<ProposalStage, ProposalSummary[]> {
  return PROPOSAL_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = items.filter((item) => item.current_state === stage);
      return acc;
    },
    {
      DRAFT: [],
      RISK_REVIEW: [],
      COMPLIANCE_REVIEW: [],
      AWAITING_CLIENT_CONSENT: [],
      EXECUTION_READY: [],
    } as Record<ProposalStage, ProposalSummary[]>
  );
}

export default function ProposalListView({
  initialPortfolioId,
  title = "Proposal Workspace",
  subtitle = "Prioritize advisor tasks by workflow stage and jump directly to the next action.",
  createDraftHref,
}: {
  initialPortfolioId?: string;
  title?: string;
  subtitle?: string;
  createDraftHref?: string;
}) {
  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState(initialPortfolioId ?? "");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals", stateFilter, portfolioFilter, createdByFilter],
    queryFn: async () =>
      await listProposals({
        state: stateFilter || undefined,
        portfolioId: portfolioFilter || undefined,
        createdBy: createdByFilter || undefined,
      }),
    ...workbenchStrictQueryDefaults,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const visibleItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item) => {
      const title = (item.title ?? "").toLowerCase();
      const portfolio = (item.portfolio_id ?? "").toLowerCase();
      return (
        item.proposal_id.toLowerCase().includes(query) ||
        title.includes(query) ||
        portfolio.includes(query) ||
        item.current_state.toLowerCase().includes(query)
      );
    });
  }, [items, searchText]);
  const grouped = useMemo(() => groupedByStage(visibleItems), [visibleItems]);
  const primaryQueue = visibleItems.slice(0, 50);

  if (isLoading) {
    return (
      <SectionBlock>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Text variant="body">Loading proposals...</Text>
        </Stack>
      </SectionBlock>
    );
  }

  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <SectionBlock
        title={title}
        subtitle={subtitle}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <SemanticBadge tone={error ? "warn" : "success"}>Live Queue Mode</SemanticBadge>
            <Link href={createDraftHref ?? "/proposals/simulate"} className="nav-link">
              Create Draft
            </Link>
          </Stack>
        }
      >
        {error ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Live proposal queue is unavailable. No fallback proposals are shown.
          </Alert>
        ) : null}

        <div className={styles.queueSummary} aria-label="Advisory queue summary">
          {PROPOSAL_STAGES.map((stage) => (
            <div key={stage} className={styles.summaryMetric}>
              <span>{proposalStageLabel(stage)}</span>
              <strong>{grouped[stage].length}</strong>
            </div>
          ))}
        </div>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 1 }}
        >
          <TextField
            select
            size="small"
            label="State"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
            }}
            sx={{ flex: "1 1 160px", minWidth: 0 }}
          >
            <MenuItem value="">All</MenuItem>
            {PROPOSAL_STAGES.map((stage) => (
              <MenuItem key={stage} value={stage}>
                {stage}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Portfolio"
            value={portfolioFilter}
            onChange={(event) => {
              setPortfolioFilter(event.target.value);
            }}
            placeholder="portfolio id"
            sx={{ flex: "1 1 190px", minWidth: 0 }}
          />
          <TextField
            size="small"
            label="Advisor"
            value={createdByFilter}
            onChange={(event) => {
              setCreatedByFilter(event.target.value);
            }}
            placeholder="advisor"
            sx={{ flex: "1 1 170px", minWidth: 0 }}
          />
          <TextField
            size="small"
            label="Search In Results"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="proposal id, portfolio, title, state"
            sx={{ flex: "2 1 240px", minWidth: 0 }}
          />
        </Stack>

        {visibleItems.length === 0 ? (
          <ScreenStatePanel
            kind="empty"
            title="No proposals found"
            body="No proposals match the current queue filters."
            surface="default"
          />
        ) : null}

        {visibleItems.length ? (
          <div className={styles.queueGrid}>
            <section className={styles.queueTablePanel} aria-label="Advisory proposal queue">
              <table className={styles.queueTable}>
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Portfolio</th>
                    <th>Stage</th>
                    <th>Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {primaryQueue.map((item) => (
                    <tr key={item.proposal_id}>
                      <td>
                        <Link href={`/proposals/${item.proposal_id}`} className={styles.proposalLink}>
                          {item.title || item.proposal_id}
                        </Link>
                        <span>ID: {item.proposal_id}</span>
                      </td>
                      <td>{item.portfolio_id ?? "N/A"}</td>
                      <td>
                        <SemanticBadge tone={proposalStageTone(item.current_state)}>
                          {proposalStageLabel(item.current_state)}
                        </SemanticBadge>
                      </td>
                      <td>{proposalNextAction(item.current_state)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleItems.length > primaryQueue.length ? (
                <Text variant="metadata">
                  Showing first {primaryQueue.length} proposals. Narrow the filters to review the full queue.
                </Text>
              ) : null}
            </section>

            <aside className={styles.stageRail} aria-label="Workflow readiness by stage">
              {PROPOSAL_STAGES.map((stage) => {
                const stageItems = grouped[stage].slice(0, 3);
                return (
                  <section key={stage} className={styles.stagePanel}>
                    <div className={styles.stagePanelHeader}>
                      <Text variant="subsectionTitle">{proposalStageLabel(stage)}</Text>
                      <SemanticBadge tone={proposalStageTone(stage)}>{grouped[stage].length}</SemanticBadge>
                    </div>
                    {stageItems.length ? (
                      <ul>
                        {stageItems.map((item) => (
                          <li key={`${stage}-${item.proposal_id}`}>
                            <Link href={`/proposals/${item.proposal_id}`}>
                              {item.title || item.proposal_id}
                            </Link>
                            <span>{proposalNextAction(item.current_state)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Text variant="secondary">No proposals in this stage.</Text>
                    )}
                  </section>
                );
              })}
            </aside>
          </div>
        ) : null}
      </SectionBlock>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
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

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            select
            size="small"
            label="State"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value);
            }}
            sx={{ minWidth: { md: 180 } }}
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
            sx={{ minWidth: { md: 220 } }}
          />
          <TextField
            size="small"
            label="Created By"
            value={createdByFilter}
            onChange={(event) => {
              setCreatedByFilter(event.target.value);
            }}
            placeholder="advisor id"
            sx={{ minWidth: { md: 200 } }}
          />
          <TextField
            size="small"
            label="Search In Results"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="proposal id, portfolio, title, state"
            sx={{ minWidth: { md: 360 } }}
          />
          <Stack direction="row" spacing={0.7} flexWrap="wrap">
            {PROPOSAL_STAGES.map((stage) => (
              <SemanticBadge key={stage} tone={proposalStageTone(stage)}>
                {proposalStageLabel(stage)}: {grouped[stage].length}
              </SemanticBadge>
            ))}
          </Stack>
        </Stack>

        {visibleItems.length === 0 ? (
          <ScreenStatePanel
            kind="empty"
            title="No proposals found"
            body="No proposals match the current queue filters."
            surface="default"
          />
        ) : null}

        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          {PROPOSAL_STAGES.map((stage) => (
            <SectionBlock key={stage} className="proposal-stage-block">
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
                <Text variant="subsectionTitle">{proposalStageLabel(stage)}</Text>
                <SemanticBadge tone={proposalStageTone(stage)}>{grouped[stage].length}</SemanticBadge>
              </Stack>
              <Divider sx={{ mb: 0.8 }} />
              {grouped[stage].length === 0 ? (
                <Text variant="secondary">No proposals in this stage.</Text>
              ) : (
                <Stack spacing={0.8}>
                  {grouped[stage].map((item) => (
                    <SectionBlock key={item.proposal_id} className="proposal-stage-card">
                      <Text variant="cardTitle">
                        <Link href={`/proposals/${item.proposal_id}`}>
                          {item.title || item.proposal_id}
                        </Link>
                      </Text>
                      <Text variant="metadata">ID: {item.proposal_id}</Text>
                      <Text variant="metadata">Portfolio: {item.portfolio_id ?? "N/A"}</Text>
                      <Text variant="body">Next: {proposalNextAction(item.current_state)}</Text>
                    </SectionBlock>
                  ))}
                </Stack>
              )}
            </SectionBlock>
          ))}
        </Box>
      </SectionBlock>
    </>
  );
}

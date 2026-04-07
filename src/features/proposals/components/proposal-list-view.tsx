"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { listProposals } from "../api";
import { ProposalSummary } from "../types";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { ScreenStatePanel, SectionBlock, SemanticBadge, Text } from "@/design-system";

const STAGES = ["DRAFT", "RISK_REVIEW", "COMPLIANCE_REVIEW", "AWAITING_CLIENT_CONSENT", "EXECUTION_READY"] as const;
type Stage = (typeof STAGES)[number];
const DEMO_PROPOSALS: ProposalSummary[] = [
  {
    proposal_id: "PP-7716",
    portfolio_id: "PF_1005",
    current_state: "RISK_REVIEW",
    title: "Tactical Equity Tilt",
    created_by: "advisor_1",
  },
  {
    proposal_id: "PP-7717",
    portfolio_id: "PF_1700",
    current_state: "COMPLIANCE_REVIEW",
    title: "Duration Extension",
    created_by: "advisor_2",
  },
  {
    proposal_id: "PP-7718",
    portfolio_id: "PF_9015",
    current_state: "AWAITING_CLIENT_CONSENT",
    title: "Income Overlay",
    created_by: "advisor_1",
  },
  {
    proposal_id: "PP-7720",
    portfolio_id: "PF_1002",
    current_state: "DRAFT",
    title: "Cash Deployment Plan",
    created_by: "advisor_3",
  },
  {
    proposal_id: "PP-7721",
    portfolio_id: "PF_1001",
    current_state: "EXECUTION_READY",
    title: "Core Rebalance",
    created_by: "advisor_1",
  },
];

function stageLabel(state: string): string {
  return state.replaceAll("_", " ");
}

function nextAction(state: string): string {
  if (state === "DRAFT") {
    return "Submit for risk or compliance review";
  }
  if (state === "RISK_REVIEW") {
    return "Risk officer approval needed";
  }
  if (state === "COMPLIANCE_REVIEW") {
    return "Compliance approval needed";
  }
  if (state === "AWAITING_CLIENT_CONSENT") {
    return "Record client consent";
  }
  if (state === "EXECUTION_READY") {
    return "Ready for execution handoff";
  }
  return "Pending workflow action";
}

function stageTone(state: string): "default" | "warn" | "success" {
  if (state === "EXECUTION_READY") {
    return "success";
  }
  if (state === "DRAFT") {
    return "default";
  }
  return "warn";
}

function groupedByStage(items: ProposalSummary[]): Record<Stage, ProposalSummary[]> {
  return STAGES.reduce(
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
    } as Record<Stage, ProposalSummary[]>
  );
}

export default function ProposalListView() {
  const [liveMode, setLiveMode] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals", stateFilter, portfolioFilter, createdByFilter],
    queryFn: async () =>
      await listProposals({
        state: stateFilter || undefined,
        portfolioId: portfolioFilter || undefined,
        createdBy: createdByFilter || undefined,
      }),
    enabled: liveMode,
    ...workbenchStrictQueryDefaults,
  });

  const items = useMemo(() => (liveMode ? data?.items ?? [] : DEMO_PROPOSALS), [data?.items, liveMode]);
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

  if (liveMode && isLoading) {
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
    <SectionBlock
      title="Proposal Workspace"
      subtitle="Prioritize advisor tasks by workflow stage and jump directly to the next action."
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <SemanticBadge tone={liveMode ? "success" : "default"}>
            {liveMode ? "Live Queue Mode" : "Storyboard Mode"}
          </SemanticBadge>
          <Button variant="outlined" size="small" onClick={() => setLiveMode((prev) => !prev)}>
            {liveMode ? "Switch To Storyboard Mode" : "Load Live Queue"}
          </Button>
        </Stack>
      }
    >
      {liveMode && error ? (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Live queue is unavailable. Showing no live proposals.
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
          {STAGES.map((stage) => (
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
          {STAGES.map((stage) => (
            <SemanticBadge key={stage} tone={stageTone(stage)}>
              {stageLabel(stage)}: {grouped[stage].length}
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
        {STAGES.map((stage) => (
          <SectionBlock key={stage} className="proposal-stage-block">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
              <Text variant="subsectionTitle">{stageLabel(stage)}</Text>
              <SemanticBadge tone={stageTone(stage)}>{grouped[stage].length}</SemanticBadge>
            </Stack>
            <Divider sx={{ mb: 0.8 }} />
            {grouped[stage].length === 0 ? (
              <Text variant="secondary">No proposals in this stage.</Text>
            ) : (
              <Stack spacing={0.8}>
                {grouped[stage].map((item) => (
                  <SectionBlock key={item.proposal_id} className="proposal-stage-card">
                    <Text variant="cardTitle">
                      <Link href={liveMode ? `/proposals/${item.proposal_id}` : "/proposals/simulate"}>
                        {item.title || item.proposal_id}
                      </Link>
                    </Text>
                    <Text variant="metadata">ID: {item.proposal_id}</Text>
                    <Text variant="metadata">Portfolio: {item.portfolio_id ?? "N/A"}</Text>
                    <Text variant="body">Next: {nextAction(item.current_state)}</Text>
                  </SectionBlock>
                ))}
              </Stack>
            )}
          </SectionBlock>
        ))}
      </Box>
    </SectionBlock>
  );
}

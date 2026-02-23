"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { listProposals } from "../api";
import { ProposalSummary } from "../types";

const STAGES = ["DRAFT", "RISK_REVIEW", "COMPLIANCE_REVIEW", "AWAITING_CLIENT_CONSENT", "EXECUTION_READY"] as const;
type Stage = (typeof STAGES)[number];

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
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => await listProposals(),
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
      <Paper className="section-card">
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography>Loading proposals...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error: {error instanceof Error ? error.message : "Unknown error"}
      </Alert>
    );
  }

  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Proposal Workspace
      </Typography>
      <Typography className="muted" sx={{ mb: 1 }}>
        Prioritize advisor tasks by workflow stage and jump directly to the next action.
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          label="Search proposals"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="proposal id, portfolio, title, state"
          sx={{ minWidth: { md: 360 } }}
        />
        <Stack direction="row" spacing={0.7} flexWrap="wrap">
          {STAGES.map((stage) => (
            <Chip key={stage} label={`${stageLabel(stage)}: ${grouped[stage].length}`} size="small" />
          ))}
        </Stack>
      </Stack>

      {visibleItems.length === 0 ? <Typography className="muted">No proposals found.</Typography> : null}

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
        }}
      >
        {STAGES.map((stage) => (
          <Paper key={stage} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
              <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>
                {stageLabel(stage)}
              </Typography>
              <Chip size="small" label={grouped[stage].length} />
            </Stack>
            <Divider sx={{ mb: 0.8 }} />
            {grouped[stage].length === 0 ? (
              <Typography className="muted" sx={{ fontSize: 13 }}>
                No proposals in this stage.
              </Typography>
            ) : (
              <Stack spacing={0.8}>
                {grouped[stage].map((item) => (
                  <Paper key={item.proposal_id} variant="outlined" sx={{ p: 0.8, borderRadius: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      <Link href={`/proposals/${item.proposal_id}`}>{item.title || item.proposal_id}</Link>
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      ID: {item.proposal_id}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      Portfolio: {item.portfolio_id ?? "N/A"}
                    </Typography>
                    <Typography sx={{ mt: 0.6, fontSize: 13 }}>
                      Next: {nextAction(item.current_state)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        ))}
      </Box>
    </Paper>
  );
}

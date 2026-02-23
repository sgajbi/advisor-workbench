"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, Chip, CircularProgress, List, ListItem, Paper, Stack, Typography } from "@mui/material";

import { listProposals } from "../api";

export default function ProposalListView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => await listProposals(),
  });

  const items = data?.items ?? [];

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
      {items.length === 0 ? <Typography className="muted">No proposals found.</Typography> : null}
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item.proposal_id} sx={{ px: 0, py: 0.6 }}>
            <Link href={`/proposals/${item.proposal_id}`}>{item.proposal_id}</Link>
            <Typography sx={{ mx: 1.1, color: "text.secondary" }}>
              - state: {item.current_state}
            </Typography>
            <Chip size="small" label={item.current_state} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

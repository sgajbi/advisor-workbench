"use client";

import { Paper, Typography } from "@mui/material";

type Props = {
  status: string;
  lastRunId: string | null;
};

export default function RebalanceStatus(props: Props) {
  const tone =
    props.status === "READY" ? "success" : props.status.includes("REVIEW") ? "warn" : "danger";

  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Rebalance Status
      </Typography>
      <Typography sx={{ mb: 0.6 }}>
        Status:{" "}
        <span className={`status-chip ${tone}`}>
          <span>●</span>
          {props.status}
        </span>
      </Typography>
      <Typography className="muted">Last Run: {props.lastRunId ?? "N/A"}</Typography>
    </Paper>
  );
}

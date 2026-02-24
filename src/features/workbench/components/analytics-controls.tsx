"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";

type Props = {
  sessionId: string | null;
  period: string;
  groupBy: string;
  benchmark: string;
  preset: string;
};

function updateQuery(
  query: URLSearchParams,
  key: string,
  value: string
): string {
  const next = new URLSearchParams(query.toString());
  next.set(key, value);
  return `?${next.toString()}`;
}

export default function AnalyticsControls(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <section className="section-card analytics-controls">
      <Typography variant="h6">Analytics Controls</Typography>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1} sx={{ mt: 1 }}>
        <TextField
          label="Period"
          size="small"
          select
          value={props.period}
          onChange={(event) => router.push(updateQuery(new URLSearchParams(searchParams.toString()), "period", event.target.value))}
        >
          <MenuItem value="MTD">MTD</MenuItem>
          <MenuItem value="QTD">QTD</MenuItem>
          <MenuItem value="YTD">YTD</MenuItem>
          <MenuItem value="1Y">1Y</MenuItem>
        </TextField>
        <TextField
          label="Group By"
          size="small"
          select
          value={props.groupBy}
          onChange={(event) => router.push(updateQuery(new URLSearchParams(searchParams.toString()), "groupBy", event.target.value))}
        >
          <MenuItem value="ASSET_CLASS">Asset Class</MenuItem>
          <MenuItem value="SECURITY">Security</MenuItem>
        </TextField>
        <TextField
          label="Benchmark"
          size="small"
          select
          value={props.benchmark}
          onChange={(event) => router.push(updateQuery(new URLSearchParams(searchParams.toString()), "benchmark", event.target.value))}
        >
          <MenuItem value="MODEL_60_40">Model 60/40</MenuItem>
          <MenuItem value="MSCI_ACWI">MSCI ACWI</MenuItem>
          <MenuItem value="CUSTOM">Custom House</MenuItem>
        </TextField>
        <TextField
          label="Preset"
          size="small"
          select
          value={props.preset}
          onChange={(event) => router.push(updateQuery(new URLSearchParams(searchParams.toString()), "preset", event.target.value))}
        >
          <MenuItem value="EXEC_SUMMARY">Executive Summary</MenuItem>
          <MenuItem value="RISK_FOCUS">Risk Focus</MenuItem>
          <MenuItem value="ATTRIBUTION">Attribution</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={() => window.print()}>
          Export Print View
        </Button>
      </Stack>
      <Typography className="muted" sx={{ mt: 1 }}>
        Active sandbox session: {props.sessionId ?? "none"}.
      </Typography>
    </section>
  );
}

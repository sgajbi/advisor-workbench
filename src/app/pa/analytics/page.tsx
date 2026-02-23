"use client";

import { Chip, Paper, Stack, Typography } from "@mui/material";

import { analyticsHighlights } from "@/features/suite/mock-data";

export default function PaAnalyticsPage() {
  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Analytics Studio
      </Typography>
      <Typography className="page-subtitle">
        Evaluate performance, attribution, and risk with executive-ready insight panels.
      </Typography>

      <Paper className="section-card" elevation={0}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" component="h2">
            Portfolio Intelligence Snapshot
          </Typography>
          <Chip size="small" label="Storyboard" />
        </Stack>
        <div className="kpi-grid">
          {analyticsHighlights.map((item) => (
            <div key={item.label} className="kpi-box">
              <p className="kpi-label">{item.label}</p>
              <p className="kpi-value">{item.value}</p>
            </div>
          ))}
        </div>
      </Paper>

      <section className="suite-grid">
        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Attribution Breakdown
          </Typography>
          <div className="suite-row">
            <span>Allocation Effect</span>
            <strong>+64 bps</strong>
          </div>
          <div className="suite-row">
            <span>Selection Effect</span>
            <strong>+41 bps</strong>
          </div>
          <div className="suite-row">
            <span>FX Effect</span>
            <strong>+16 bps</strong>
          </div>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Risk Signals
          </Typography>
          <div className="suite-row">
            <span>Volatility (1Y)</span>
            <strong>11.8%</strong>
          </div>
          <div className="suite-row">
            <span>Max Drawdown</span>
            <strong>-7.2%</strong>
          </div>
          <div className="suite-row">
            <span>Beta vs Benchmark</span>
            <strong>0.92</strong>
          </div>
        </Paper>
      </section>
    </main>
  );
}

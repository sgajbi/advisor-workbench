"use client";

import Link from "next/link";
import { Chip, Paper, Stack, Typography } from "@mui/material";

import { advisoryQueue, analyticsHighlights, intakeBatches } from "@/features/suite/mock-data";

export default function SuitePage() {
  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Command Center
      </Typography>
      <Typography className="page-subtitle">
        Run the full advisor workflow from intake to analytics to proposal decisioning in one workspace.
      </Typography>

      <Paper className="section-card" elevation={0}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" component="h2">
            Integration Status
          </Typography>
          <Chip size="small" color="success" label="Decision Flow Live" />
        </Stack>
        <div className="kpi-grid">
          <div className="kpi-box">
            <p className="kpi-label">Portfolio Data Hub</p>
            <p className="kpi-value">Storyboard</p>
          </div>
          <div className="kpi-box">
            <p className="kpi-label">Analytics Intelligence</p>
            <p className="kpi-value">Storyboard</p>
          </div>
          <div className="kpi-box">
            <p className="kpi-label">Decision Workflow</p>
            <p className="kpi-value">Live via BFF</p>
          </div>
        </div>
      </Paper>

      <section className="suite-grid">
        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Intake Control Tower
          </Typography>
          {intakeBatches.map((batch) => (
            <div key={batch.batchId} className="suite-row">
              <div>
                <strong>{batch.batchId}</strong>
                <p className="muted">
                  {batch.portfolioId} • {batch.source}
                </p>
              </div>
              <div>
                <p>{batch.status}</p>
                <p className="muted">{batch.records} records</p>
              </div>
            </div>
          ))}
          <Link href="/pas/intake" className="nav-link">
            Open Intake Workspace
          </Link>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Analytics Intelligence Desk
          </Typography>
          {analyticsHighlights.map((item) => (
            <div key={item.label} className="suite-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <Link href="/pa/analytics" className="nav-link">
            Open Analytics Workspace
          </Link>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Advisory Decision Queue
          </Typography>
          {advisoryQueue.map((item) => (
            <div key={item.proposalId} className="suite-row">
              <div>
                <strong>{item.proposalId}</strong>
                <p className="muted">{item.portfolioId}</p>
              </div>
              <div>
                <p>{item.state}</p>
                <p className="muted">{item.owner}</p>
              </div>
            </div>
          ))}
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Open Proposal Pipeline
            </Link>
            <Link href="/workbench/PF_1001" className="nav-link">
              Open Decision Console
            </Link>
          </div>
        </Paper>
      </section>
    </main>
  );
}

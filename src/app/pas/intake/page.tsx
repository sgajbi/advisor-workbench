"use client";

import { Chip, Paper, Stack, Typography } from "@mui/material";

import { intakeBatches } from "@/features/suite/mock-data";

export default function PasIntakePage() {
  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Portfolio Intake Workspace
      </Typography>
      <Typography className="page-subtitle">
        Capture portfolio data through guided intake, file onboarding, validation, and controlled commit steps.
      </Typography>

      <Paper className="section-card" elevation={0}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" component="h2">
            Intake Channels
          </Typography>
          <Chip size="small" label="Storyboard" />
        </Stack>
        <div className="toolbar">
          <button type="button" className="btn">
            Start Manual Intake
          </button>
          <button type="button" className="btn btn-secondary">
            Upload CSV Package
          </button>
          <button type="button" className="btn btn-secondary">
            Upload Excel Package
          </button>
        </div>
      </Paper>

      <section className="suite-grid">
        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Manual Intake Draft
          </Typography>
          <div className="suite-form-grid">
            <label>
              <span className="field-label">Portfolio ID</span>
              <input className="input" defaultValue="PF_1001" />
            </label>
            <label>
              <span className="field-label">Instrument</span>
              <input className="input" defaultValue="US0378331005" />
            </label>
            <label>
              <span className="field-label">Position Quantity</span>
              <input className="input" defaultValue="3500" />
            </label>
            <label>
              <span className="field-label">Market Value</span>
              <input className="input" defaultValue="708400.00" />
            </label>
          </div>
          <div className="toolbar">
            <button type="button" className="btn">
              Run Validation
            </button>
            <button type="button" className="btn btn-secondary">
              Save for Operations Review
            </button>
          </div>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Batch Processing Pipeline
          </Typography>
          {intakeBatches.map((batch) => (
            <div key={batch.batchId} className="suite-row">
              <div>
                <strong>{batch.batchId}</strong>
                <p className="muted">
                  {batch.source} • {batch.portfolioId}
                </p>
              </div>
              <div>
                <p>{batch.status}</p>
                <p className="muted">{batch.records} rows</p>
              </div>
            </div>
          ))}
        </Paper>
      </section>
    </main>
  );
}

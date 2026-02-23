"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import {
  advisoryQueue,
  advisorPriorityBoard,
  analyticsHighlights,
  dpmActionPlaybook,
  intakeBatches,
  OperatingRole,
} from "@/features/suite/mock-data";

export default function SuitePage() {
  const [activeRole, setActiveRole] = useState<OperatingRole>("ADVISOR");

  const roleLabel = useMemo(() => {
    if (activeRole === "RISK") return "Risk Officer";
    if (activeRole === "COMPLIANCE") return "Compliance Officer";
    return "Advisor";
  }, [activeRole]);

  const rolePriorities = useMemo(
    () => advisorPriorityBoard.filter((item) => item.assignedRole === activeRole),
    [activeRole]
  );
  const rolePlaybook = useMemo(() => dpmActionPlaybook.filter((item) => item.role === activeRole), [activeRole]);

  return (
    <main className="page-container">
      <section className="page-header">
        <Typography variant="h4" component="h1" className="page-title">
          Command Center
        </Typography>
        <Typography className="page-subtitle">
          Start with client priorities, execute next-best workflow actions, and close the day with decision-ready outcomes.
        </Typography>
      </section>

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
            Role Operations Lens
          </Typography>
          <Typography className="muted" sx={{ mb: 1 }}>
            Switch the active role to view ownership, queues, and actions for that operating function.
          </Typography>
          <ToggleButtonGroup
            color="primary"
            exclusive
            value={activeRole}
            onChange={(_event, nextRole: OperatingRole | null) => {
              if (nextRole) setActiveRole(nextRole);
            }}
            size="small"
            sx={{
              width: "100%",
              flexWrap: "wrap",
              gap: 0.5,
              "& .MuiToggleButton-root": {
                minWidth: 0,
                flex: { xs: "1 1 calc(50% - 8px)", sm: "0 0 auto" },
              },
            }}
          >
            <ToggleButton value="ADVISOR">Advisor</ToggleButton>
            <ToggleButton value="RISK">Risk</ToggleButton>
            <ToggleButton value="COMPLIANCE">Compliance</ToggleButton>
          </ToggleButtonGroup>
          <div className="toolbar">
            <Chip label={`Active Role: ${roleLabel}`} size="small" color="primary" />
            <Chip label={`Assigned Items: ${rolePriorities.length}`} size="small" />
            <Chip label={`Action Templates: ${rolePlaybook.length}`} size="small" />
          </div>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            {roleLabel} Priorities
          </Typography>
          {rolePriorities.map((item) => (
            <div key={item.proposalId} className="suite-row">
              <div>
                <strong>{item.clientName}</strong>
                <p className="muted">
                  {item.portfolioId} • {item.workflowState}
                </p>
              </div>
              <div>
                <p>{item.urgency}</p>
                <p className="muted">{item.businessAction}</p>
              </div>
            </div>
          ))}
          {rolePriorities.length === 0 ? <Typography className="muted">No active items for this role.</Typography> : null}
          <div className="toolbar">
            <Link href="/proposals" className="nav-link">
              Open Proposal Pipeline
            </Link>
            <Link href="/workbench/PF_1001" className="nav-link">
              Open Decision Console
            </Link>
          </div>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            {roleLabel} Action Playbook
          </Typography>
          {rolePlaybook.map((item) => (
            <div key={item.workflowState} className="suite-row">
              <div>
                <strong>{item.workflowState}</strong>
                <p className="muted">{item.advisorAction}</p>
              </div>
              <div>
                <Link href={item.route} className="nav-link">
                  {item.routeLabel}
                </Link>
              </div>
            </div>
          ))}
          {rolePlaybook.length === 0 ? <Typography className="muted">No mapped actions for this role.</Typography> : null}
        </Paper>
      </section>

      <section className="suite-grid">
        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Workflow Execution Controls
          </Typography>
          <div className="suite-row">
            <span>New Recommendation</span>
            <Link href="/proposals/simulate" className="nav-link">
              Launch Simulation
            </Link>
          </div>
          <div className="suite-row">
            <span>Review Existing Proposals</span>
            <Link href="/proposals" className="nav-link">
              Open Pipeline
            </Link>
          </div>
          <div className="suite-row">
            <span>Portfolio Decision Context</span>
            <Link href="/workbench/PF_1001" className="nav-link">
              Open Workbench
            </Link>
          </div>
        </Paper>

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

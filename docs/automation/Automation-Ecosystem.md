# Automation Ecosystem

This workspace now includes reusable automation scripts to accelerate day-to-day delivery across all six repositories.

## What It Automates

- Multi-repo sync with dirty-worktree safety
- PR monitoring across repos (`author:@me`)
- Targeted Docker service refresh only for changed services
- Continuous agent loop that writes a status feed

## Scripts

- `scripts/automation/Sync-Repos.ps1`
- `scripts/automation/PR-Monitor.ps1`
- `scripts/automation/Service-Refresh.ps1`
- `scripts/automation/Run-Agent.ps1`
- `scripts/automation/repos.json`

## Quick Start

Run one-off sync:

```powershell
npm run auto:sync
```

Run one-shot pulse (sync + PR monitor):

```powershell
npm run auto:pulse
```

Run one-off PR monitor:

```powershell
npm run auto:pr
```

Run continuous agent loop (writes `output/agent-status.md`):

```powershell
npm run auto:agent
```

Run one agent iteration:

```powershell
npm run auto:agent:once
```

Refresh only specific services in lotus-core:

```powershell
npm run auto:refresh:pas -- query_service demo_data_loader
```

## Output Files

- `output/pr-monitor.json`
- `output/agent-status.md`

## Design Principles

- Logs-first diagnostics, then code changes
- No full stack restarts unless required
- Preserve local uncommitted work during sync
- Keep PRs small, parallel, and continuously monitored

"use client";

import { useMemo, useState } from "react";
import { Alert } from "@mui/material";

import {
  ActionLink,
  ModeTabs,
  SectionBlock,
  SemanticBadge,
  Text,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import {
  advisoryQueue,
  advisorPriorityBoard,
  analyticsHighlights,
  dpmActionPlaybook,
  intakeBatches,
  OperatingRole,
} from "@/features/suite/mock-data";
import { usePlatformCapabilities } from "@/features/platform-capabilities/use-platform-capabilities";

export default function SuitePage() {
  const [activeRole, setActiveRole] = useState<OperatingRole>("ADVISOR");
  const capabilities = usePlatformCapabilities();
  const navFlags = capabilities.normalized.navigation;
  const moduleHealth = capabilities.normalized.moduleHealth;
  const policyVersions = capabilities.normalized.policyVersionsBySource;
  const lotusCorePolicyDiagnostics = capabilities.normalized.lotusCorePolicyDiagnostics;
  const sources = ["lotus_core", "lotus_performance", "lotus_manage"] as const;

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

  function renderRouteAction(label: string, href: string, enabled: boolean) {
    if (!enabled) {
      return (
        <span className="journey-step disabled" aria-disabled="true">
          {label}
        </span>
      );
    }
    return (
      <ActionLink href={href} className="journey-step">
        {label}
      </ActionLink>
    );
  }

  return (
    <main className="page-container">
      <WorkbenchPageFrame
        title="Command Center"
        subtitle="Start with client priorities, execute next-best workflow actions, and close the day with decision-ready outcomes."
        actions={
          <>
            <SemanticBadge tone={capabilities.partialFailure ? "warn" : "success"}>
              {capabilities.partialFailure ? "Capability partial" : "Capability ready"}
            </SemanticBadge>
            <SemanticBadge>Operations workspace</SemanticBadge>
          </>
        }
      >
        <WorkbenchSectionStack>
          {capabilities.partialFailure ? (
            <Alert severity="warning">
              Platform capability negotiation is partially degraded. Some routes are disabled based
              on currently available services.
            </Alert>
          ) : null}

          <section className="journey-grid">
        <SectionBlock
          title="Client Advisor Journey"
          subtitle="Intake data, review portfolio context, assess performance, and progress the next decision-ready action."
          className="journey-card"
        >
          <div className="journey-steps">
            {renderRouteAction("1. Portfolio Intake", "/intake", navFlags.portfolio_intake !== false)}
            {renderRouteAction("2. Portfolio Review", "/portfolio", navFlags.command_center !== false)}
            {renderRouteAction("3. Analytics Context", "/performance", navFlags.analytics_studio !== false)}
            {renderRouteAction("4. Decision Console", "/workbench", navFlags.decision_console !== false)}
          </div>
        </SectionBlock>

        <SectionBlock
          title="Portfolio Manager Journey"
          subtitle="Monitor live portfolio state, inspect risk/review queue, and approve execution-ready decisions."
          className="journey-card"
        >
          <div className="journey-steps">
            {renderRouteAction("1. Decision Console", "/workbench", navFlags.decision_console !== false)}
            {renderRouteAction("2. Performance Review", "/performance", navFlags.analytics_studio !== false)}
            {renderRouteAction("3. Portfolio Review", "/portfolio", navFlags.command_center !== false)}
            {renderRouteAction("4. Command Center Metrics", "/suite", navFlags.command_center !== false)}
          </div>
        </SectionBlock>
      </section>

      <SectionBlock
        title="Integration Status"
        actions={<SemanticBadge tone="success">Decision Flow Live</SemanticBadge>}
      >
        <div className="kpi-grid">
          {sources.map((source) => (
            <div key={source} className="kpi-box">
              <p className="kpi-label">{source.toUpperCase()} Module Health</p>
              <p className="kpi-value">{moduleHealth[source] ?? "unknown"}</p>
              <p className="kpi-label">Policy: {policyVersions[source] ?? "unknown"}</p>
            </div>
          ))}
        </div>
        <div className="suite-row">
          <div>
            <strong>lotus-core Policy Diagnostics</strong>
            <p className="muted">
              {lotusCorePolicyDiagnostics.available ? "available" : "unavailable"} | strict mode:{" "}
              {lotusCorePolicyDiagnostics.policyProvenance.strictMode ? "on" : "off"}
            </p>
            <p className="muted">
              Rule: {lotusCorePolicyDiagnostics.policyProvenance.matchedRuleId} | Source:{" "}
              {lotusCorePolicyDiagnostics.policyProvenance.policySource}
            </p>
            <p className="muted">
              Allowed sections:{" "}
              {lotusCorePolicyDiagnostics.allowedSections.length > 0
                ? lotusCorePolicyDiagnostics.allowedSections.join(", ")
                : "none"}
            </p>
            {lotusCorePolicyDiagnostics.warnings.length > 0 ? (
              <p className="muted">Warnings: {lotusCorePolicyDiagnostics.warnings.join(", ")}</p>
            ) : null}
          </div>
        </div>
      </SectionBlock>

      <section className="suite-grid">
        <SectionBlock
          title="Role Operations Lens"
          subtitle="Switch the active role to view ownership, queues, and actions for that operating function."
          className="suite-panel"
          bodyClassName="suite-panel-body"
        >
          <ModeTabs
            value={activeRole}
            onChange={setActiveRole}
            ariaLabel="Operating role"
            className="suite-role-tabs"
            options={[
              { key: "ADVISOR", label: "Advisor" },
              { key: "RISK", label: "Risk" },
              { key: "COMPLIANCE", label: "Compliance" },
            ]}
          />
          <div className="toolbar">
            <SemanticBadge emphasis="strong">{`Active Role: ${roleLabel}`}</SemanticBadge>
            <SemanticBadge>{`Assigned Items: ${rolePriorities.length}`}</SemanticBadge>
            <SemanticBadge>{`Action Templates: ${rolePlaybook.length}`}</SemanticBadge>
          </div>
        </SectionBlock>

        <SectionBlock title={`${roleLabel} Priorities`} className="suite-panel">
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
          {rolePriorities.length === 0 ? <Text variant="secondary">No active items for this role.</Text> : null}
          <div className="toolbar">
            <ActionLink href="/performance">
              Open Performance Workspace
            </ActionLink>
            <ActionLink href="/workbench">
              Open Decision Console
            </ActionLink>
          </div>
        </SectionBlock>

        <SectionBlock title={`${roleLabel} Action Playbook`} className="suite-panel">
          {rolePlaybook.map((item) => (
            <div key={item.workflowState} className="suite-row">
              <div>
                <strong>{item.workflowState}</strong>
                <p className="muted">{item.advisorAction}</p>
              </div>
              <div>
                <ActionLink href={item.route}>
                  {item.routeLabel}
                </ActionLink>
              </div>
            </div>
          ))}
          {rolePlaybook.length === 0 ? <Text variant="secondary">No mapped actions for this role.</Text> : null}
        </SectionBlock>
      </section>

      <section className="suite-grid">
        <SectionBlock title="Workflow Execution Controls" className="suite-panel">
          <div className="suite-row">
            <span>Portfolio Review</span>
            {navFlags.command_center === false ? (
              <span className="nav-link nav-link-disabled">Open Portfolio</span>
            ) : (
              <ActionLink href="/portfolio">
                Open Portfolio
              </ActionLink>
            )}
          </div>
          <div className="suite-row">
            <span>Performance Review</span>
            {navFlags.analytics_studio === false ? (
              <span className="nav-link nav-link-disabled">Open Performance</span>
            ) : (
              <ActionLink href="/performance">
                Open Performance
              </ActionLink>
            )}
          </div>
          <div className="suite-row">
            <span>Portfolio Decision Context</span>
            {navFlags.decision_console === false ? (
              <span className="nav-link nav-link-disabled">Open Workbench</span>
            ) : (
              <ActionLink href="/workbench">
                Open Workbench
              </ActionLink>
            )}
          </div>
        </SectionBlock>

        <SectionBlock title="Intake Control Tower" className="suite-panel">
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
          <ActionLink href="/intake">
            Open Intake Workspace
          </ActionLink>
        </SectionBlock>

        <SectionBlock title="Analytics Intelligence Desk" className="suite-panel">
          {analyticsHighlights.map((item) => (
            <div key={item.label} className="suite-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <ActionLink href="/performance">
            Open Analytics Workspace
          </ActionLink>
        </SectionBlock>

        <SectionBlock title="Advisory Decision Queue" className="suite-panel">
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
            <ActionLink href="/portfolio">
              Open Portfolio Workspace
            </ActionLink>
            <ActionLink href="/workbench">
              Open Decision Console
            </ActionLink>
          </div>
        </SectionBlock>
      </section>
      </WorkbenchSectionStack>
      </WorkbenchPageFrame>
    </main>
  );
}

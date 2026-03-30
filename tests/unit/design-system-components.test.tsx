import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ActionLink,
  ActionListCard,
  AnalyticsModule,
  AnalyticsRankedList,
  AnalyticsStat,
  AnalyticsTable,
  ContextCard,
  DegradedStatePanel,
  EmptyStatePanel,
  FilterBar,
  InsightCallout,
  KpiStatTile,
  ModuleStatePanel,
  MetricRow,
  PageToolbar,
  Panel,
  ReadinessIndicator,
  SectionLabel,
  SectionHeader,
  StatusChip,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMain,
  WorkspaceRail,
  WorkspaceRailLink,
  WorkspaceSide,
  WorkbenchPageFrame,
  WorkbenchPageHeader,
  WorkbenchRailCard,
  WorkbenchSectionStack,
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualCard,
  WorkbenchSummaryVisualHeading,
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualTrack,
  WorkbenchSummaryVisualValue,
  WorkstationPage,
  WorkstationShell,
} from "@/design-system";

describe("design-system components", () => {
  it("renders the compact workspace header with title and meta", () => {
    render(
      <WorkspaceHeader
        title="Portfolio"
        meta={
          <>
            <StatusChip>2 portfolios</StatusChip>
            <StatusChip tone="success">Catalog live</StatusChip>
          </>
        }
      />
    );

    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByText("2 portfolios")).toHaveClass("status-chip");
    expect(screen.getByText("Catalog live")).toHaveClass("success");
  });

  it("renders core panel and row primitives with shared classes", () => {
    render(
      <Panel>
        <SectionLabel>Summary</SectionLabel>
        <MetricRow label="Positions" value="12" />
      </Panel>
    );

    expect(screen.getByText("Summary")).toHaveClass("pill");
    expect(screen.getByText("Positions")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders shared workspace layout primitives with structural classes", () => {
    render(
      <WorkspaceLayout compact>
        <WorkspaceRail>
          <Panel>Rail</Panel>
        </WorkspaceRail>
        <WorkspaceMain>
          <WorkspaceGrid>
            <Panel>Main</Panel>
          </WorkspaceGrid>
        </WorkspaceMain>
        <WorkspaceSide>
          <Panel>Side</Panel>
        </WorkspaceSide>
      </WorkspaceLayout>
    );

    expect(screen.getByText("Rail").closest("section, aside, div")).toBeTruthy();
    expect(document.querySelector(".workspace-layout-compact")).toBeTruthy();
    expect(document.querySelector(".workspace-rail")).toBeTruthy();
    expect(document.querySelector(".workspace-main")).toBeTruthy();
    expect(document.querySelector(".workspace-grid")).toBeTruthy();
    expect(document.querySelector(".workspace-side")).toBeTruthy();
  });

  it("renders the shared workstation shell with explicit slot structure", () => {
    render(
      <WorkstationPage>
        <WorkstationShell
          sideDensity="comfortable"
          rail={<Panel>Workstation Rail</Panel>}
          main={<Panel>Workstation Main</Panel>}
          side={<Panel>Workstation Side</Panel>}
        />
      </WorkstationPage>
    );

    expect(document.querySelector(".workstation-page")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-both")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-rail")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side-density-comfortable")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side-comfortable")).toBeTruthy();
  });

  it("renders the shared workbench page frame with shared header and section stack", () => {
    render(
      <WorkstationPage>
        <WorkbenchPageFrame
          title="Portfolio"
          subtitle="Front-office portfolio context"
          actions={<StatusChip>Catalog live</StatusChip>}
        >
          <WorkbenchSectionStack>
            <Panel>Summary Section</Panel>
          </WorkbenchSectionStack>
        </WorkbenchPageFrame>
      </WorkstationPage>
    );

    expect(document.querySelector(".workbench-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByText("Catalog live")).toHaveClass("status-chip");
  });

  it("renders the shared workbench rail card primitive", () => {
    render(
      <WorkbenchRailCard className="portfolio-context-card">
        <div className="portfolio-card-header">
          <h3 className="portfolio-side-card-title">Portfolio Context</h3>
          <p className="portfolio-card-subtitle">Identity and setup.</p>
        </div>
      </WorkbenchRailCard>
    );

    expect(document.querySelector(".workbench-rail-card.portfolio-context-card")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Portfolio Context" })).toBeInTheDocument();
  });

  it("renders degraded state and rail link primitives", () => {
    render(
      <>
        <DegradedStatePanel
          label="Workspace"
          title="Portfolio unavailable"
          status="Core feed unavailable"
          actions={[{ href: "/performance", label: "Open Performance" }]}
        >
          <p>Upstream services are unavailable.</p>
        </DegradedStatePanel>
        <WorkspaceRailLink
          href="/portfolio?portfolioId=PORT_1"
          title="Global Balanced"
          meta="PORT_1"
          detail="USD · SG"
          active
        />
      </>
    );

    expect(screen.getByText("Portfolio unavailable")).toBeInTheDocument();
    expect(screen.getByText("Core feed unavailable")).toHaveClass("warn");
    expect(screen.getByRole("link", { name: "Open Performance" })).toHaveAttribute(
      "href",
      "/performance"
    );
    expect(screen.getByRole("link", { name: /Global Balanced/i })).toHaveClass(
      "portfolio-rail-item-active"
    );
  });

  it("renders shared action links with navigation styling", () => {
    render(<ActionLink href="/portfolio">Open Portfolio</ActionLink>);

    expect(screen.getByRole("link", { name: "Open Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio"
    );
    expect(screen.getByRole("link", { name: "Open Portfolio" })).toHaveClass("nav-link");
  });

  it("renders analytics tables with aligned numeric columns and totals", () => {
    render(
      <AnalyticsTable
        ariaLabel="Allocation summary"
        columns={[
          { key: "bucket", label: "Bucket" },
          { key: "value", label: "Market Value", align: "right" },
          { key: "weight", label: "Weight", align: "right" },
        ]}
        rows={[
          { key: "row-1", cells: ["Equity", "$500,000", "62.5%"] },
          { key: "row-2", cells: ["Cash", "$300,000", "37.5%"] },
        ]}
        footer={["Total", "$800,000", "100%"]}
      />
    );

    expect(screen.getByRole("table", { name: "Allocation summary" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Market Value" })).toBeInTheDocument();
    expect(screen.getByText("$800,000")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("supports keyboard activation for interactive analytics table rows", () => {
    const onClick = vi.fn();

    render(
      <AnalyticsTable
        ariaLabel="Interactive allocation summary"
        columns={[
          { key: "bucket", label: "Bucket" },
          { key: "value", label: "Market Value", align: "right" },
        ]}
        rows={[
          {
            key: "row-1",
            cells: ["Equity", "500,000 USD"],
            ariaLabel: "Equity row",
            onClick,
          },
        ]}
      />
    );

    fireEvent.keyDown(screen.getByLabelText("Equity row"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders analytics stats with semantic tone and business tooltip", async () => {
    const onClick = vi.fn();

    render(
      <AnalyticsStat
        label="Book Readiness"
        value="Partial"
        support="1 active exception"
        valueTone="warn"
        definition="Operational readiness based on holdings coverage and reporting status."
        onClick={onClick}
      />
    );

    fireEvent.mouseOver(screen.getByText("Book Readiness"));
    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText(/operational readiness based on holdings coverage/i)).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(onClick).toHaveBeenCalled();
  });

  it("renders modular page primitives for toolbar, section header, callouts, and context", () => {
    render(
      <>
        <PageToolbar>
          <FilterBar>
            <button type="button">Filters</button>
          </FilterBar>
        </PageToolbar>
        <SectionHeader title="Holdings" subtitle="As of 28 Mar 2026 in USD" actions={<button type="button">Export</button>} />
        <KpiStatTile label="AUM" value="1,250,000 USD" support="As of 28 Mar 2026" />
        <ReadinessIndicator label="Pricing" status="Partial" tone="warn" href="#pricing" />
        <InsightCallout title="Pricing not yet published" detail="Current holdings are not fully valued." severity="warning" href="#portfolio-attention" />
        <EmptyStatePanel
          title="No holdings yet"
          body="The holdings inventory is empty."
          hint="Book a trade to populate the book."
          why={{ body: "Holdings require booked positions or funded balances." }}
        />
        <ModuleStatePanel
          state="partial"
          title="Partial data"
          body="Some values are available."
          hint="Pricing is still missing for one holding."
          why={{ body: "Allocation requires valued holdings." }}
        />
        <ContextCard
          title="Portfolio Context"
          subtitle="Executive identity and book setup details."
          groups={[
            {
              key: "identity",
              title: "Identity",
              facts: [{ label: "Portfolio", value: "PORT_1" }],
            },
          ]}
        />
        <ActionListCard
          title="Next Actions"
          subtitle="Recommended workflow sequence."
          items={[
            {
              key: "fund",
              sequence: 1,
              title: "Fund portfolio",
              impact: "Cash is required before trades can settle.",
              target: "Target: Operations",
              href: "/workbench",
              ctaLabel: "Fund",
              recommended: true,
            },
          ]}
        />
      </>
    );

    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Holdings" })).toBeInTheDocument();
    expect(screen.getByText("Pricing not yet published")).toBeInTheDocument();
    expect(screen.getByText("Partial data")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Context")).toBeInTheDocument();
    expect(screen.getByText("Fund portfolio")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Why this section is unavailable" }).length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("toolbar", { name: "Page controls" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pricing readiness: Partial. Open related section.")).toBeInTheDocument();
  });

  it("renders KPI tiles with explicit label, value, and support classes", () => {
    render(
      <KpiStatTile
        label="Book Readiness"
        value="Ready"
        support="0 active exceptions"
        valueTone="success"
      />
    );

    expect(screen.getByText("Book Readiness")).toHaveClass("kpi-stat-label");
    expect(screen.getByText("Ready")).toHaveClass("kpi-stat-value");
    expect(screen.getByText("0 active exceptions")).toHaveClass("kpi-stat-support");
    expect(screen.getByText("Ready").closest(".kpi-stat-tile-success")).toBeTruthy();
  });

  it("renders analytics modules with the shared workbench summary-card contract", () => {
    render(
      <AnalyticsModule
        compact
        title="Shared Summary"
        subtitle="Shared subtitle"
        actions={<button type="button">Module Action</button>}
      >
        <div>Body</div>
      </AnalyticsModule>
    );

    expect(document.querySelector(".workbench-summary-card.workbench-summary-card-compact")).toBeTruthy();
    expect(screen.getByText("Shared Summary")).toHaveClass("workbench-summary-card-title");
    expect(screen.getByText("Shared subtitle")).toHaveClass("workbench-summary-card-subtitle");
    expect(screen.getByRole("button", { name: "Module Action" })).toBeInTheDocument();
  });

  it("renders ranked analytics content with shared summary visual typography classes", () => {
    render(
      <AnalyticsRankedList
        title="Highest"
        label="Contribution"
        scale={1}
        rows={[
          {
            key: "row-1",
            title: "Apple Inc",
            subtitle: "Avg. Weight 24.00%",
            value: "1.55%",
            magnitudePct: 1.55,
            tone: "positive",
          },
        ]}
      />
    );

    expect(screen.getByText("Highest")).toHaveClass("workbench-summary-visual-heading");
    expect(screen.getByText("Contribution")).toHaveClass("workbench-summary-visual-meta");
    expect(screen.getByText("Apple Inc")).toHaveClass("workbench-summary-visual-label");
    expect(screen.getByText("Avg. Weight 24.00%")).toHaveClass("workbench-summary-visual-meta");
    expect(screen.getByText("1.55%")).toHaveClass("workbench-summary-visual-value");
  });

  it("renders reusable workbench summary visual primitives with the shared class contract", () => {
    render(
      <>
        <WorkbenchSummaryToolbar>
          <span>Toolbar Item</span>
        </WorkbenchSummaryToolbar>
        <WorkbenchSummaryVisualCard>
          <WorkbenchSummaryVisualHeading>Visual Heading</WorkbenchSummaryVisualHeading>
          <WorkbenchSummaryVisualLabel>Visual Label</WorkbenchSummaryVisualLabel>
          <WorkbenchSummaryVisualMeta>Visual Meta</WorkbenchSummaryVisualMeta>
          <WorkbenchSummaryVisualTrack className="custom-track">
            <span>Track Body</span>
          </WorkbenchSummaryVisualTrack>
          <WorkbenchSummaryVisualValue>123</WorkbenchSummaryVisualValue>
        </WorkbenchSummaryVisualCard>
      </>
    );

    expect(document.querySelector(".workbench-summary-toolbar")).toBeTruthy();
    expect(document.querySelector(".workbench-summary-visual-card")).toBeTruthy();
    expect(screen.getByText("Visual Heading")).toHaveClass("workbench-summary-visual-heading");
    expect(screen.getByText("Visual Label")).toHaveClass("workbench-summary-visual-label");
    expect(screen.getByText("Visual Meta")).toHaveClass("workbench-summary-visual-meta");
    expect(screen.getByText("123")).toHaveClass("workbench-summary-visual-value");
    expect(document.querySelector(".custom-track")).toBeTruthy();
  });

  it("renders the shared neutral workbench page header with title, subtitle, and actions", () => {
    render(
      <WorkbenchPageHeader
        title="Performance Workbench"
        subtitle="Benchmark-aware portfolio performance, attribution, and contribution analysis"
        actions={<button type="button">Header Action</button>}
      />
    );

    expect(screen.getByRole("heading", { name: "Performance Workbench" })).toHaveClass(
      "workbench-page-header-title"
    );
    expect(
      screen.getByText(
        "Benchmark-aware portfolio performance, attribution, and contribution analysis"
      )
    ).toHaveClass("workbench-page-header-subtitle");
    expect(screen.getByRole("button", { name: "Header Action" })).toBeInTheDocument();
    expect(document.querySelector(".workbench-page-header-actions")).toBeTruthy();
  });
});

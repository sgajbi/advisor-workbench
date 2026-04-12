import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ActionLink,
  ActionButton,
  ActionListCard,
  AppPageShell,
  AnalyticsModule,
  AnalyticsRankedList,
  AnalyticsStat,
  AnalyticsTable,
  ContextCard,
  DeferredModulePlaceholder,
  DisclosureToggleButton,
  DegradedStatePanel,
  EmptyStatePanel,
  FieldLabel,
  FilterBar,
  InsightCallout,
  KpiStatTile,
  MainWithSideRailLayout,
  ModuleStatePanel,
  ModeTabs,
  MetricRow,
  PageToolbar,
  Panel,
  ReadinessIndicator,
  SectionBlock,
  SectionLabel,
  SectionHeader,
  SemanticBadge,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMain,
  WorkspaceRail,
  WorkspaceRailLink,
  WorkspaceSide,
  WorkbenchDeferredSection,
  WorkbenchInlineRefreshNote,
  WorkbenchSegmentedControl,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchPageHeader,
  WorkbenchLoadingState,
  WorkbenchRailCard,
  WorkbenchStatusRow,
  WorkbenchSectionStack,
  WorkbenchStatusStrip,
  WorkbenchSummaryToolbar,
  WorkbenchToolbarPlaceholder,
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
            <SemanticBadge>2 portfolios</SemanticBadge>
            <SemanticBadge tone="success">Catalog live</SemanticBadge>
            </>
          }
        />
    );

    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByText("2 portfolios")).toHaveClass("semantic-badge");
    expect(screen.getByText("Catalog live")).toHaveClass("semantic-badge-success");
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

  it("renders shared app-shell composition primitives with the workstation contract underneath", () => {
    render(
      <AppPageShell pageKey="performance" className="performance-page">
        <MainWithSideRailLayout
          className="performance-layout"
          rail={<Panel>Rail</Panel>}
          main={<Panel>Main</Panel>}
          side={<Panel>Side</Panel>}
          sideDensity="comfortable"
        />
      </AppPageShell>
    );

    expect(document.querySelector("main.app-page-shell.app-page-shell-performance.performance-page"))
      .toBeTruthy();
    expect(document.querySelector(".main-with-side-rail-layout.performance-layout")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-both")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-rail")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-side")).toBeTruthy();
  });

  it("renders the shared workbench page frame with shared header and section stack", () => {
    render(
      <WorkstationPage>
        <WorkbenchPageContainer className="portfolio-page-container">
          <WorkbenchPageFrame
            title="Portfolio"
            subtitle="Front-office portfolio context"
            actions={<SemanticBadge>Catalog live</SemanticBadge>}
          >
            <WorkbenchSectionStack>
              <Panel>Summary Section</Panel>
            </WorkbenchSectionStack>
          </WorkbenchPageFrame>
        </WorkbenchPageContainer>
      </WorkstationPage>
    );

    expect(document.querySelector(".workbench-page-container.portfolio-page-container")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-header.workbench-page-header")).toBeTruthy();
    expect(document.querySelector(".workbench-page-frame-body")).toBeTruthy();
    expect(document.querySelector(".workbench-section-stack")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByText("Catalog live")).toHaveClass("semantic-badge");
  });

  it("renders section blocks with a standardized header and body seam", () => {
    render(
      <SectionBlock title="Service State" subtitle="Operational posture" actions={<button type="button">Refresh</button>}>
        <MetricRow label="Portfolio catalog" value="Ready" />
      </SectionBlock>
    );

    expect(document.querySelector(".section-block")).toBeTruthy();
    expect(document.querySelector(".section-block-body")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Service State section header" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByText("Portfolio catalog")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders shared semantic badges, action buttons, and mode tabs with the standardized class contract", () => {
    const onChange = vi.fn();
    const onClick = vi.fn();

    render(
      <>
        <SemanticBadge tone="warn" emphasis="strong">
          Review
        </SemanticBadge>
        <ActionButton priority="primary" onClick={onClick}>
          Copy Note
        </ActionButton>
        <ModeTabs
          value="advisor"
          onChange={onChange}
          ariaLabel="Workspace modes"
          accentModeKey="advisor"
          options={[
            { key: "summary", label: "Summary" },
            { key: "advisor", label: "Advisor Brief" },
          ]}
        />
      </>
    );

    expect(screen.getByText("Review")).toHaveClass("semantic-badge", "semantic-badge-warn", "semantic-badge-strong");
    expect(screen.getByRole("button", { name: "Copy Note" })).toHaveClass("action-button", "action-button-primary");
    expect(screen.getByRole("tablist", { name: "Workspace modes" })).toHaveClass("mode-tabs");
    expect(screen.getByRole("tab", { name: "Advisor Brief" })).toHaveClass("workbench-segmented-control-button-active");

    fireEvent.click(screen.getByRole("button", { name: "Copy Note" }));
    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("summary");
  });

  it("renders the shared disclosure toggle contract with consistent labels and chevron state", () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <DisclosureToggleButton expanded={false} onToggle={onToggle} />
    );

    const button = screen.getByRole("button", { name: "Expand" });
    expect(button).toHaveClass("disclosure-toggle-button");
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <DisclosureToggleButton
        expanded
        decorative
        className="portfolio-disclosure-toggle"
        collapsedToggleLabel="Expand"
        expandedToggleLabel="Collapse"
      />
    );
    expect(screen.getByText("Collapse")).toHaveClass("disclosure-toggle-button-label");
    expect(document.querySelector(".disclosure-toggle-button-decorative")).toBeTruthy();
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
    expect(screen.getByText("Core feed unavailable")).toHaveClass("semantic-badge-warn");
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
        className="analysis-table"
        ariaLabel="Allocation summary"
        variant="analysis"
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
    expect(
      document.querySelector(
        ".analytics-table-frame.analytics-table-variant-analysis.analytics-table-density-comfortable.analysis-table"
      )
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Market Value" })).toBeInTheDocument();
    expect(screen.getByText("$800,000")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders dense analytics tables through the shared frame contract", () => {
    render(
      <AnalyticsTable
        density="compact"
        variant="observation"
        ariaLabel="Dense allocation summary"
        columns={[
          { key: "bucket", label: "Bucket" },
          { key: "value", label: "Market Value", align: "right" },
        ]}
        rows={[{ key: "row-1", cells: ["Equity", "$500,000"] }]}
      />
    );

    expect(screen.getByRole("table", { name: "Dense allocation summary" })).toBeInTheDocument();
    expect(
      document.querySelector(
        ".analytics-table-frame.analytics-table-density-compact.analytics-table-frame-dense.analytics-table-variant-observation"
      )
    ).toBeTruthy();
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

  it("renders shared empty and loading table states through the table shell", () => {
    const { rerender } = render(
      <AnalyticsTable
        ariaLabel="Portfolio cash ledger"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "date", label: "Date" },
          { key: "amount", label: "Amount", align: "right" },
        ]}
        rows={[]}
        emptyState={{
          title: "No cash movements",
          body: "Booked cash movements will appear once treasury events are published.",
        }}
      />
    );

    expect(screen.getByText("No cash movements")).toHaveClass("analytics-table-state-title");
    expect(
      screen.getByText("Booked cash movements will appear once treasury events are published.")
    ).toHaveClass("analytics-table-state-body");
    expect(
      document.querySelector(
        ".analytics-table-frame.analytics-table-variant-portfolio.analytics-table-density-compact"
      )
    ).toBeTruthy();

    rerender(
      <AnalyticsTable
        ariaLabel="Portfolio cash ledger"
        variant="portfolio"
        density="compact"
        columns={[
          { key: "date", label: "Date" },
          { key: "amount", label: "Amount", align: "right" },
        ]}
        rows={[]}
        loadingState={{
          title: "Loading cash ledger",
          body: "Cash ledger rows are loading for the selected horizon.",
        }}
      />
    );

    expect(screen.getByText("Loading cash ledger")).toBeInTheDocument();
    expect(screen.getByText("Cash ledger rows are loading for the selected horizon.")).toBeInTheDocument();
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
    const title = screen.getByText("Shared Summary");
    const subtitle = screen.getByText("Shared subtitle");
    const action = screen.getByRole("button", { name: "Module Action" });
    const header = document.querySelector(".workbench-summary-card-header");
    expect(header).toContainElement(title);
    expect(header).not.toContainElement(subtitle);
    expect(title.closest(".MuiBox-root")?.parentElement).toContainElement(action);
  });

  it("renders field labels through the shared typography contract", () => {
    render(<FieldLabel htmlFor="benchmark-select">Benchmark</FieldLabel>);

    expect(screen.getByText("Benchmark")).toHaveClass("workbench-field-label", "ui-text-label");
    expect(screen.getByText("Benchmark").tagName).toBe("LABEL");
    expect(screen.getByText("Benchmark")).toHaveAttribute("for", "benchmark-select");
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

  it("renders the shared workbench status strip with consistent item structure", () => {
    render(
      <WorkbenchStatusStrip
        label="Capability status"
        className="performance-trust-strip"
        gridClassName="performance-trust-strip-grid"
        itemClassName="performance-trust-item"
        itemLabelClassName="performance-trust-item-label"
        itemBodyClassName="performance-trust-item-body"
        itemChipClassName="performance-trust-item-chip"
        itemSupportClassName="performance-trust-item-support"
        items={[
          {
            label: "Benchmark",
            value: "Assigned",
            support: "Relative analytics are active.",
            tone: "success",
          },
          {
            label: "Evidence",
            value: "Pending",
            support: "Evidence is not yet exposed.",
            tone: "default",
          },
        ]}
      />
    );

    expect(screen.getByLabelText("Capability status")).toBeInTheDocument();
    expect(screen.getByText("Benchmark")).toHaveClass("performance-trust-item-label");
    expect(screen.getByText("Assigned")).toHaveClass("performance-trust-item-chip");
    expect(screen.getByText("Relative analytics are active.")).toHaveClass(
      "performance-trust-item-support"
    );
    expect(screen.getByText("Pending")).toHaveClass("performance-trust-item-chip");
  });

  it("renders the shared workbench status row with compact status chips", () => {
    render(
      <WorkbenchStatusRow
        label="Observation status"
        className="performance-observation-strip"
        items={[
          { value: "As of 2026-03-29" },
          { value: "USD" },
          { value: "2 observations", tone: "success" },
          { value: "Relative measurement", tone: "success" },
        ]}
      />
    );

    expect(screen.getByRole("group", { name: "Observation status" })).toBeInTheDocument();
    expect(screen.getByText("As of 2026-03-29")).toHaveClass("semantic-badge");
    expect(screen.getByText("2 observations")).toHaveClass("semantic-badge", "semantic-badge-success");
    expect(screen.getByText("Relative measurement")).toHaveClass("semantic-badge", "semantic-badge-success");
  });

  it("renders a reusable deferred workbench section with shared heading structure", () => {
    render(
      <WorkbenchDeferredSection
        className="performance-summary-context-section"
        title="Return vs Benchmark"
        subtitle="How the portfolio tracked against the selected benchmark over the current period."
        loadingTitle="Loading return path"
        loadingMessage="Return path is loading after first paint."
      >
        <div>Deferred content</div>
      </WorkbenchDeferredSection>
    );

    expect(document.querySelector(".performance-summary-context-section")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Return vs Benchmark" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "How the portfolio tracked against the selected benchmark over the current period."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Loading return path")).toBeInTheDocument();
    expect(screen.getByText("Return path is loading after first paint.")).toBeInTheDocument();
  });

  it("renders the shared deferred placeholder class contract with optional extension classes", () => {
    render(
      <DeferredModulePlaceholder
        title="Loading analysis"
        message="Analysis is loading after first paint."
        className="performance-analysis-loading"
      />
    );

    const placeholder = screen.getByRole("status");
    expect(placeholder).toHaveClass(
      "deferred-module-placeholder",
      "workbench-deferred-placeholder",
      "performance-analysis-loading"
    );
    expect(within(placeholder).getByText("Loading analysis")).toBeInTheDocument();
    expect(within(placeholder).getByText("Analysis is loading after first paint.")).toBeInTheDocument();
  });

  it("renders the shared segmented control with tab semantics and active-state classes", () => {
    const onChange = vi.fn();

    render(
      <WorkbenchSegmentedControl
        value="summary"
        onChange={onChange}
        ariaLabel="Workbench mode"
        className="performance-mode-switch"
        options={[
          { key: "summary", label: "Summary" },
          { key: "analysis", label: "Analysis" },
          { key: "evidence", label: "Evidence" },
        ]}
      />
    );

    const tablist = screen.getByRole("tablist", { name: "Workbench mode" });
    expect(tablist).toHaveClass("workbench-segmented-control", "performance-mode-switch");
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveClass(
      "workbench-segmented-control-button",
      "workbench-segmented-control-button-active"
    );
    expect(screen.getByRole("tab", { name: "Analysis" })).toHaveClass(
      "workbench-segmented-control-button"
    );

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(onChange).toHaveBeenCalledWith("evidence");
  });

  it("supports disabled segmented-control options with shared semantics", () => {
    render(
      <WorkbenchSegmentedControl
        value="asset_class"
        onChange={() => {}}
        ariaLabel="Allocation dimensions"
        options={[
          { key: "asset_class", label: "Asset Class" },
          { key: "region", label: "Region", disabled: true, title: "Region pending source support" },
        ]}
      />
    );

    expect(screen.getByRole("tab", { name: "Asset Class" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Region" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Region" })).toHaveAttribute(
      "title",
      "Region pending source support"
    );
  });

  it("renders the shared workbench toolbar placeholder with generic field widths", () => {
    render(
      <WorkbenchToolbarPlaceholder
        className="portfolio-workspace-toolbar"
        contextMessage="Loading workspace controls…"
        fields={[
          { key: "as-of", label: "As of" },
          { key: "view", label: "View", width: "wide" },
          { key: "period", label: "Period", width: "period" },
        ]}
      />
    );

    expect(document.querySelector(".workbench-toolbar-placeholder.portfolio-workspace-toolbar"))
      .toBeTruthy();
    expect(document.querySelector(".workbench-toolbar-placeholder-row")).toBeTruthy();
    expect(document.querySelectorAll(".workbench-toolbar-placeholder-field")).toHaveLength(3);
    expect(screen.getByText("As of")).toHaveClass("workbench-toolbar-placeholder-label");
    expect(document.querySelector(".workbench-toolbar-placeholder-control-wide")).toBeTruthy();
    expect(document.querySelector(".workbench-toolbar-placeholder-control-period")).toBeTruthy();
    expect(screen.getByText("Loading workspace controls…")).toBeInTheDocument();
  });

  it("renders the shared workbench loading state with explicit copy and skeleton", () => {
    render(
      <WorkbenchLoadingState
        title="Loading transactions"
        message="Transaction ledger detail is loading for the selected window."
        rows={5}
      />
    );

    const loadingState = screen.getByRole("status");
    expect(loadingState).toHaveClass("workbench-loading-state");
    expect(within(loadingState).getByText("Loading transactions")).toBeInTheDocument();
    expect(
      within(loadingState).getByText("Transaction ledger detail is loading for the selected window.")
    ).toBeInTheDocument();
    expect(loadingState.querySelector(".module-skeleton")).toBeTruthy();
  });

  it("renders the shared inline refresh note with polite status semantics", () => {
    render(<WorkbenchInlineRefreshNote message="Refreshing transactions…" />);

    const refreshNote = screen.getByRole("status");
    expect(refreshNote).toHaveClass("workbench-inline-refresh-note");
    expect(refreshNote).toHaveTextContent("Refreshing transactions…");
  });

  it("can defer content without rendering a duplicate wrapper header", async () => {
    render(
      <WorkbenchDeferredSection
        className="performance-summary-driver-section"
        title="Performance Drivers"
        subtitle="Top contributors and detractors for the current performance outcome."
        loadingTitle="Loading contributors"
        loadingMessage="Contributor ranking is loading after first paint."
        deferHeader
        hideHeader
        placeholder={null}
      >
        <div>Deferred driver content</div>
      </WorkbenchDeferredSection>
    );

    expect(document.querySelector(".performance-summary-driver-section")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Performance Drivers" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Deferred driver content")).toBeInTheDocument();
    });
  });
});

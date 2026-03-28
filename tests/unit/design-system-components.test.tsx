import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ActionLink,
  ActionListCard,
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
});

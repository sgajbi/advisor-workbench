import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ActionLink,
  AnalyticsStat,
  AnalyticsTable,
  DegradedStatePanel,
  MetricRow,
  Panel,
  SectionLabel,
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

  it("renders analytics stats with semantic tone and business tooltip", async () => {
    render(
      <AnalyticsStat
        label="Book Readiness"
        value="Partial"
        support="1 active exception"
        valueTone="warn"
        definition="Operational readiness based on holdings coverage and reporting status."
      />
    );

    fireEvent.mouseOver(screen.getByText("Book Readiness"));

    expect(await screen.findByText(/operational readiness based on holdings coverage/i)).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
  });
});

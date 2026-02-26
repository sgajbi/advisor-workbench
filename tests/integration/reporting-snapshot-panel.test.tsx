import React from "react";
import { render, screen } from "@testing-library/react";

import ReportingSnapshotPanel from "../../src/features/workbench/components/reporting-snapshot-panel";

describe("ReportingSnapshotPanel", () => {
  it("renders rows returned by reporting service", () => {
    render(
      <ReportingSnapshotPanel
        asOfDate="2026-02-24"
        sourceService="lotus-report"
        rows={[
          { bucket: "TOTAL", metric: "market_value_base", value: 1250000.12 },
          { bucket: "TOTAL", metric: "return_ytd_pct", value: 4.2 },
        ]}
      />
    );

    expect(screen.getByText("Reporting Snapshot")).toBeInTheDocument();
    expect(screen.getByText(/As of 2026-02-24/)).toBeInTheDocument();
    expect(screen.getByText("market_value_base")).toBeInTheDocument();
    expect(screen.getByText("return_ytd_pct")).toBeInTheDocument();
  });

  it("renders empty-state when rows are missing", () => {
    render(
      <ReportingSnapshotPanel
        asOfDate="2026-02-24"
        sourceService="lotus-report"
        rows={[]}
      />
    );

    expect(screen.getByText(/No report rows were returned/)).toBeInTheDocument();
  });
});

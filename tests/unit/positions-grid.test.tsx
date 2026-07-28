import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type MockPositionRow = Record<string, string | number>;
type MockPositionColumn = {
  field?: string;
  headerName?: string;
};

vi.mock("ag-grid-react", () => ({
  AgGridReact: ({
    rowData = [],
    columnDefs = [],
  }: {
    rowData?: MockPositionRow[];
    columnDefs?: MockPositionColumn[];
  }) => (
    <div data-testid="positions-grid">
      <div>
        {columnDefs.map((column) => (
          <span key={column.field}>{column.headerName}</span>
        ))}
      </div>
      {rowData.map((row) => (
        <div key={row.instrument_id}>
          {row.instrument_id} | {row.asset_class} | {row.weight_pct}
        </div>
      ))}
    </div>
  ),
}));

import PositionsGrid from "../../src/features/workbench/components/positions-grid";

describe("PositionsGrid", () => {
  it("renders synthesized position rows up to the capped display count", () => {
    render(<PositionsGrid count={12} />);

    expect(screen.getByRole("heading", { name: "Positions" })).toBeInTheDocument();
    expect(screen.getByText("Position count: 12")).toBeInTheDocument();
    expect(screen.getByText("Instrument")).toBeInTheDocument();
    expect(screen.getByText("Asset Class")).toBeInTheDocument();
    expect(screen.getByText("Weight %")).toBeInTheDocument();
    expect(screen.getAllByText(/INST_/).length).toBe(8);
    expect(screen.getByText("INST_001 | EQUITY | 3")).toBeInTheDocument();
    expect(screen.getByText("INST_008 | FIXED_INCOME | 11.4")).toBeInTheDocument();
  });

  it("renders at least one placeholder row when the count is zero", () => {
    render(<PositionsGrid count={0} />);

    expect(screen.getByText("Position count: 0")).toBeInTheDocument();
    expect(screen.getByText("INST_001 | EQUITY | 3")).toBeInTheDocument();
  });
});

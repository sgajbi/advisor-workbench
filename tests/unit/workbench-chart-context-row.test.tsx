import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchChartContextRow from "../../src/design-system/components/workbench-chart-context-row";

describe("WorkbenchChartContextRow", () => {
  it("renders compact labeled analytical context items", () => {
    render(
      <WorkbenchChartContextRow
        label="Return path context"
        items={[
          { key: "basis", label: "Basis", value: "Net" },
          { key: "benchmark", label: "Benchmark", value: "Global Balanced 60/40" },
        ]}
      />
    );

    const row = screen.getByRole("group", { name: "Return path context" });
    expect(row).toBeInTheDocument();
    expect(row).toHaveTextContent("BasisNet");
    expect(row).toHaveTextContent("BenchmarkGlobal Balanced 60/40");
    expect(document.querySelectorAll(".workbench-chart-context-row-item")).toHaveLength(2);
  });
});

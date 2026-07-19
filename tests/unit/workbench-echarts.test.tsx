import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkbenchECharts from "@/design-system/components/workbench-echarts";

vi.mock("echarts-for-react", () => ({
  default: ({ theme }: { theme?: string }) => (
    <div data-testid="workbench-echarts" data-theme={theme} />
  ),
}));

describe("WorkbenchECharts", () => {
  it("preserves the governed ECharts 5 visual baseline during the ECharts 6 migration", () => {
    render(<WorkbenchECharts option={{}} />);

    expect(screen.getByTestId("workbench-echarts")).toHaveAttribute("data-theme", "v5");
  });
});

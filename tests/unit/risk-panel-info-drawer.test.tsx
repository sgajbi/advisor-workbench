import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskPanelInfoDrawer from "../../src/apps/performance/components/risk/risk-panel-info-drawer";

describe("RiskPanelInfoDrawer", () => {
  it("keeps methodology hidden until requested and supports dismissal", () => {
    render(
      <RiskPanelInfoDrawer
        panelTitle="Risk Snapshot"
        rows={[
          {
            key: "portfolio-observations",
            label: "Portfolio Observations",
            value: "252",
            support: "Daily observations used for the portfolio return series.",
          },
          {
            key: "benchmark-context",
            label: "Benchmark Context",
            value: "Aligned",
            support: "Benchmark-relative measures are supported for the selected window.",
          },
        ]}
      />
    );

    expect(
      screen.queryByRole("dialog", { name: "Risk Snapshot methodology and coverage" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Risk Snapshot methodology and coverage" })
    );

    const dialog = screen.getByRole("dialog", {
      name: "Risk Snapshot methodology and coverage",
    });

    expect(within(dialog).getByText("Context available")).toBeInTheDocument();
    expect(within(dialog).getByText("Portfolio Observations")).toBeInTheDocument();
    expect(within(dialog).getByText("Benchmark Context")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(
      screen.queryByRole("dialog", { name: "Risk Snapshot methodology and coverage" })
    ).not.toBeInTheDocument();
  });

  it("does not render a trigger when no context rows are available", () => {
    render(<RiskPanelInfoDrawer panelTitle="Drawdown" rows={[]} />);

    expect(
      screen.queryByRole("button", { name: "Drawdown methodology and coverage" })
    ).not.toBeInTheDocument();
  });
});

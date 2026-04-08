import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RiskDetailDrawer from "../../src/apps/performance/components/risk/risk-detail-drawer";

describe("RiskDetailDrawer", () => {
  it("renders analytical detail in a dismissible drawer", () => {
    const onClose = vi.fn();

    render(
      <RiskDetailDrawer
        open
        title="Rolling series"
        subtitle="Selected-window rolling detail."
        contextItems={[
          { label: "Review window", value: "21D" },
          { label: "Horizon", value: "Short window" },
        ]}
        summaryTitle="21D selected-window review"
        summaryBody="Current volatility remains contained versus recent history."
        notes={[
          {
            key: "benchmark",
            title: "Benchmark-relative review is ready",
            body: "Aligned benchmark observations support beta and tracking error review.",
          },
        ]}
        onClose={onClose}
      >
        <div>Series table placeholder</div>
      </RiskDetailDrawer>
    );

    const dialog = screen.getByRole("dialog", { name: "Rolling series detail" });
    expect(within(dialog).getByText("Analytical detail")).toBeInTheDocument();
    expect(within(dialog).getByText("Review window")).toBeInTheDocument();
    expect(within(dialog).getByText("21D")).toBeInTheDocument();
    expect(within(dialog).getByText("Series table placeholder")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close Rolling series detail" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

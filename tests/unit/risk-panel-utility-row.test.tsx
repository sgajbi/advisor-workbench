import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RiskPanelUtilityRow from "../../src/apps/performance/components/risk/risk-panel-utility-row";

const methodologyRows = [
  {
    key: "window_set",
    label: "Window Set",
    value: "21, 63, 126, and 252 day windows emitted",
    support: "Emitted window set for rolling review.",
  },
];

describe("RiskPanelUtilityRow", () => {
  it("renders shared methodology access and drill-down actions in one utility group", () => {
    const onViewSeries = vi.fn();

    render(
      <RiskPanelUtilityRow
        panelTitle="Rolling Risk"
        methodologyRows={methodologyRows}
        drilldownAction={{ label: "View rolling series", onClick: onViewSeries }}
      />
    );

    const utilityGroup = screen.getByRole("group", { name: "Rolling Risk panel utilities" });
    expect(
      screen.getByRole("button", { name: "Rolling Risk methodology and coverage" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View rolling series" })).toBeInTheDocument();
    expect(utilityGroup.firstElementChild).toHaveAccessibleName(
      "Rolling Risk methodology and coverage"
    );

    fireEvent.click(screen.getByRole("button", { name: "View rolling series" }));
    expect(onViewSeries).toHaveBeenCalledTimes(1);
  });

  it("returns no output when the panel has no utilities to expose", () => {
    const { container } = render(<RiskPanelUtilityRow panelTitle="Risk Snapshot" />);

    expect(container).toBeEmptyDOMElement();
  });
});

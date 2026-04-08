import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskModuleShell from "../../src/apps/performance/components/risk/risk-module-shell";

describe("RiskModuleShell", () => {
  it("marks primary panels with the shared primary shell variant", () => {
    const { container } = render(
      <RiskModuleShell
        title="Risk Snapshot"
        subtitle="Executive risk posture."
        priority="primary"
        actions={<button type="button">Utility</button>}
        businessReading={<section aria-label="Business reading">Read</section>}
      />
    );

    expect(screen.getByRole("heading", { name: "Risk Snapshot" })).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-module-shell-primary")).toBeTruthy();
    expect(container.querySelector(".performance-risk-module-body")).toBeNull();
  });

  it("uses the shared body layout only when detail or context content exists", () => {
    const { container } = render(
      <RiskModuleShell
        title="Rolling Risk"
        subtitle="Selected-window behaviour."
        priority="secondary"
        detail={<section aria-label="Rolling detail">Detail</section>}
        context={<aside aria-label="Rolling context">Context</aside>}
      />
    );

    expect(container.querySelector(".performance-risk-module-shell-secondary")).toBeTruthy();
    expect(screen.getByLabelText("Rolling detail")).toBeInTheDocument();
    expect(screen.getByLabelText("Rolling context")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-module-body")).toBeTruthy();
    expect(container.querySelector(".performance-risk-module-main")).toBeTruthy();
    expect(container.querySelector(".performance-risk-module-side")).toBeTruthy();
  });
});

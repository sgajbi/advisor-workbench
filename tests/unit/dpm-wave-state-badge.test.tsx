import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmWaveStateBadge from "../../src/features/workbench/components/dpm-wave-state-badge";

describe("DpmWaveStateBadge", () => {
  it("renders DPM wave lifecycle states with front-office wording", () => {
    render(<DpmWaveStateBadge state="SIMULATION_READY" />);

    expect(screen.getByText("Ready to simulate")).toBeInTheDocument();
  });

  it("supports bounded display labels while preserving state tone ownership", () => {
    render(<DpmWaveStateBadge state="PENDING" label="Not loaded" />);

    expect(screen.getByText("Not loaded")).toBeInTheDocument();
  });
});

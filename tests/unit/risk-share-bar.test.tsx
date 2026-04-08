import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskShareBar from "../../src/apps/performance/components/risk/risk-share-bar";

describe("RiskShareBar", () => {
  it("renders contribution share using pre-shaped absolute share input", () => {
    const { container } = render(
      <RiskShareBar value="19.56%" absValue={19.56} maxAbsValue={61.98} />
    );

    expect(screen.getByLabelText("Contribution share 19.56%")).toBeInTheDocument();
    expect(container.querySelector(".performance-risk-share-bar-fill")).toBeTruthy();
  });
});

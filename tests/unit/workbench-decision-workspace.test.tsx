import fs from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";

import {
  WorkbenchDecisionWorkspace,
  WorkbenchRefreshStatus,
} from "../../src/design-system";

describe("WorkbenchDecisionWorkspace", () => {
  it("reflows from its owned module width before fixed columns can overflow", () => {
    const styles = fs.readFileSync(
      path.resolve(
        "src/design-system/components/workbench-decision-workspace.module.css",
      ),
      "utf8",
    );

    expect(styles).toContain("container-type: inline-size;");
    expect(styles).toContain("@container (max-width: 41rem)");
    expect(styles).toMatch(
      /@container \(max-width: 41rem\)[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    );
  });

  it("groups one worklist with one labelled decision region", () => {
    render(
      <WorkbenchDecisionWorkspace
        ariaLabel="Selected suitability decision"
        worklist={<p>Policy review worklist</p>}
        decision={<p>Selected policy evidence</p>}
      />,
    );

    expect(screen.getByText("Policy review worklist")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Selected suitability decision" }),
    ).toHaveTextContent("Selected policy evidence");
  });

  it("lets each workflow name its source retry accessibly", () => {
    render(
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Suitability evidence"
        title="Source refresh did not complete"
        message="Earlier evidence remains visible."
        requestedContext="Proposal P-2"
        confirmedContext="Proposal P-1"
        onRetry={() => undefined}
        retryLabel="Retry suitability evidence"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retry suitability evidence" }),
    ).toBeInTheDocument();
  });
});

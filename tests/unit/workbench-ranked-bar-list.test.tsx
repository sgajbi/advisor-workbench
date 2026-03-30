import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchRankedBarList from "../../src/design-system/components/workbench-ranked-bar-list";

describe("WorkbenchRankedBarList", () => {
  it("renders a shared ranked bar list with positive and negative rows", () => {
    render(
      <WorkbenchRankedBarList
        title="Top contributors"
        label="Contribution"
        scale={2}
        rows={[
          {
            key: "aapl",
            title: "AAPL",
            subtitle: "Avg. Weight 24.00%",
            value: "1.55%",
            magnitudePct: 1.55,
            tone: "positive",
          },
          {
            key: "tlt",
            title: "TLT",
            subtitle: "Avg. Weight 8.00%",
            value: "-0.20%",
            magnitudePct: 0.2,
            tone: "negative",
          },
        ]}
      />
    );

    expect(screen.getByText("Top contributors")).toHaveClass("workbench-summary-visual-heading");
    expect(screen.getByText("Contribution")).toHaveClass("workbench-summary-visual-meta");
    expect(document.querySelectorAll(".workbench-ranked-bar-row")).toHaveLength(2);
    expect(document.querySelector(".workbench-ranked-bar-fill-positive")).toBeTruthy();
    expect(document.querySelector(".workbench-ranked-bar-fill-negative")).toBeTruthy();
  });

  it("renders rows without a header when title and label are omitted", () => {
    render(
      <WorkbenchRankedBarList
        scale={1}
        rows={[
          {
            key: "equity",
            title: "Equity",
            value: "0.45%",
            magnitudePct: 0.45,
            tone: "positive",
          },
        ]}
      />
    );

    expect(document.querySelectorAll(".workbench-ranked-bar-row")).toHaveLength(1);
    expect(document.querySelector(".workbench-ranked-bar-list-header")).toBeFalsy();
  });
});

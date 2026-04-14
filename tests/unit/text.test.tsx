import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Text } from "@/design-system";

describe("Text", () => {
  it("renders semantic typography variants with shared classes", () => {
    render(
      <>
        <Text variant="workspaceTitle">Workbench</Text>
        <Text variant="pageTitle">Portfolio</Text>
        <Text variant="sectionTitle">Holdings</Text>
        <Text variant="panelTitle">Exposure</Text>
        <Text variant="dataLabel">As of</Text>
        <Text variant="metricValueM">1,250,000 USD</Text>
        <Text variant="tableHeader">Weight</Text>
      </>
    );

    expect(screen.getByRole("heading", { name: "Workbench", level: 1 })).toHaveClass(
      "ui-text-workspace-title"
    );
    expect(screen.getByRole("heading", { name: "Portfolio", level: 1 })).toHaveClass(
      "ui-text-page-title"
    );
    expect(screen.getByRole("heading", { name: "Holdings", level: 2 })).toHaveClass(
      "ui-text-section-title"
    );
    expect(screen.getByRole("heading", { name: "Exposure", level: 3 })).toHaveClass(
      "ui-text-panel-title"
    );
    expect(screen.getByText("As of")).toHaveClass("ui-text-data-label");
    expect(screen.getByText("1,250,000 USD")).toHaveClass("ui-text-metric-value-m");
    expect(screen.getByText("Weight")).toHaveClass("ui-text-table-header");
  });

  it("allows semantic tag overrides without losing the variant contract", () => {
    render(
      <Text as="span" variant="pageTitle">
        Summary
      </Text>
    );

    const node = screen.getByText("Summary");
    expect(node.tagName).toBe("SPAN");
    expect(node).toHaveClass("ui-text-page-title");
  });
});

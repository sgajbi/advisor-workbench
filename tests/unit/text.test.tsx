import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Text } from "@/design-system";

describe("Text", () => {
  it("renders semantic typography variants with shared classes", () => {
    render(
      <>
        <Text variant="pageTitle">Portfolio</Text>
        <Text variant="sectionTitle">Holdings</Text>
        <Text variant="label">As of</Text>
        <Text variant="metricValueCompact">1,250,000 USD</Text>
      </>
    );

    expect(screen.getByRole("heading", { name: "Portfolio", level: 1 })).toHaveClass(
      "ui-text-page-title"
    );
    expect(screen.getByRole("heading", { name: "Holdings", level: 2 })).toHaveClass(
      "ui-text-section-title"
    );
    expect(screen.getByText("As of")).toHaveClass("ui-text-label");
    expect(screen.getByText("1,250,000 USD")).toHaveClass("ui-text-metric-value-compact");
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

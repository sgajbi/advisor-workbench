import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import SupportDetails from "../../src/design-system/components/support-details";

describe("SupportDetails", () => {
  it("keeps support evidence secondary behind a native disclosure", () => {
    render(
      <SupportDetails context="Source and contract evidence">
        <span>Exact source reference</span>
      </SupportDetails>,
    );

    const disclosure = screen.getByText("Support details").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      screen.getByText("Source and contract evidence"),
    ).toBeInTheDocument();
    expect(screen.getByText("Exact source reference")).toBeInTheDocument();
  });

  it("wraps important context according to its panel width", () => {
    const styles = readFileSync(
      resolve(
        __dirname,
        "../../src/design-system/components/support-details.module.css",
      ),
      "utf8",
    );

    expect(styles).toContain("container-type: inline-size;");
    expect(styles).toContain("@container (max-width: 32.5rem)");
    expect(styles).toMatch(
      /@container \(max-width: 32\.5rem\)[\s\S]*?\.summary small\s*\{[\s\S]*?overflow-wrap: anywhere;[\s\S]*?white-space: normal;/,
    );
    expect(styles).not.toContain("@media (max-width: 520px)");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { AiAssistanceDisclosure, createAiAssistanceDisclosure } from "@/design-system";

describe("AiAssistanceDisclosure", () => {
  it("keeps business posture adjacent and reveals limitations with native disclosure semantics", () => {
    render(
      <AiAssistanceDisclosure
        disclosure={createAiAssistanceDisclosure({
          scopeLabel: "Performance advisor brief",
          preparation: "ai-assisted",
          availability: "partial",
          evidence: { state: "limited", sourceCount: 1 },
          humanReview: { state: "review-required", sourceRecorded: false },
          clientUse: "blocked",
          freshness: { state: "not-reported" },
          limitations: ["One source service did not return evidence."],
          diagnostics: [{ label: "Workflow run", value: "run_123" }],
        })}
      />,
    );

    const trigger = screen.getByText("How this was prepared").closest("summary");
    expect(trigger).toBeTruthy();
    expect(screen.getByText("Partial output")).toBeInTheDocument();
    expect(screen.getByText("Performance advisor brief")).toBeInTheDocument();

    fireEvent.click(trigger!);
    expect(screen.getByText("Prepared with AI assistance")).toBeVisible();
    expect(screen.getByText("Output is incomplete")).toBeVisible();
    expect(screen.getByText("Limited source evidence")).toBeVisible();
    expect(screen.getByText("Human review required")).toBeVisible();
    expect(screen.getByText("Not approved for client use")).toBeVisible();
    expect(screen.getByText("Freshness not reported")).toBeVisible();
    expect(screen.getByText("One source service did not return evidence.")).toBeVisible();
    expect(screen.getByLabelText("Technical support details")).toHaveTextContent("run_123");
  });

  it("uses visible text rather than color alone for deterministic output", () => {
    render(
      <AiAssistanceDisclosure
        disclosure={createAiAssistanceDisclosure({
          scopeLabel: "Performance working narrative",
          preparation: "deterministic",
          availability: "live",
          evidence: { state: "supported", sourceCount: 4 },
          humanReview: { state: "not-required", sourceRecorded: false },
          clientUse: "internal-only",
          freshness: { state: "current", asOf: "2026-08-04" },
        })}
      />,
    );

    expect(screen.getByText("Live rule-based output")).toBeInTheDocument();
  });

  it.each([
    ["live", "Live AI-assisted output"],
    ["partial", "Partial output"],
    ["stale", "Stale output"],
    ["simulation", "Simulation output"],
    ["unavailable", "Output unavailable"],
  ] as const)("names %s availability in summary text", (availability, expectedLabel) => {
    render(
      <AiAssistanceDisclosure
        disclosure={createAiAssistanceDisclosure({
          scopeLabel: "Advisor output",
          preparation: "ai-assisted",
          availability,
          evidence: { state: "supported", sourceCount: 2 },
          humanReview: { state: "not-required", sourceRecorded: false },
          clientUse: "internal-only",
          freshness: { state: "not-reported" },
        })}
      />,
    );

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("keeps business facts readable when the disclosure is embedded in a narrow panel", () => {
    const styles = readFileSync(
      resolve(
        __dirname,
        "../../src/design-system/components/ai-assistance-disclosure.module.css",
      ),
      "utf8",
    );

    expect(styles).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));",
    );
    expect(styles).not.toContain("repeat(6, minmax(0, 1fr))");
    expect(styles).toContain("overflow-wrap: break-word;");
    expect(styles).toContain("container-type: inline-size;");
    expect(styles).toContain("@container (max-width: 24rem)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr);");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("Review required")).toBeInTheDocument();
    expect(screen.getByText("Performance advisor brief")).toBeInTheDocument();

    fireEvent.click(trigger!);
    expect(screen.getByText("Prepared with AI assistance")).toBeVisible();
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

    expect(screen.getByText("Rule-based")).toBeInTheDocument();
  });
});

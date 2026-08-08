import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DpmAiWorkflowResult from "@/features/workbench/components/dpm-ai-workflow-result";
import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  buildDpmAiWorkflowResponse,
  getDpmAiWorkflowFixtureSourceReference,
} from "../fixtures/dpm-ai-workflow-fixtures";

describe("DpmAiWorkflowResult", () => {
  it("focuses only when a newly identified workflow result is published", async () => {
    const { rerender } = renderResult("packrun_exception_001", "Initial render");
    const heading = screen.getByRole("heading", {
      name: "Mandate exception review summary",
    });
    await waitFor(() => expect(heading).toHaveFocus());

    const nextAction = screen.getByRole("button", { name: "Next advisor action" });
    nextAction.focus();
    expect(nextAction).toHaveFocus();

    rerender(resultView("packrun_exception_001", "Unrelated owning-panel update"));
    expect(nextAction).toHaveFocus();

    rerender(resultView("packrun_exception_002", "New workflow result"));
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText("Repair missing tax-lot evidence.")).toBeInTheDocument();
    expect(screen.getByText("Validate source completeness")).toBeInTheDocument();
    expect(screen.queryByText("exception_summary")).not.toBeInTheDocument();
  });

  it("renders contradictory provider provenance as partial and hides its material", () => {
    const response = buildDpmAiWorkflowResponse("exception-summary", {
      providerMode: "disabled",
      stubbed: false,
      structuredOutput: {
        exception_summary: "Do not expose contradictory provider material.",
      },
    });

    render(
      <DpmAiWorkflowResult
        outcome={buildDpmAiWorkflowOutcome(
          "exception-summary",
          response,
          getDpmAiWorkflowFixtureSourceReference("exception-summary"),
        )}
      />,
    );

    expect(screen.getByText("Partial output")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mandate exception review summary is incomplete and requires source or control follow-up.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Do not expose contradictory provider material."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Live AI-assisted output")).not.toBeInTheDocument();
  });
});

function renderResult(runId: string, ownerState: string) {
  return render(resultView(runId, ownerState));
}

function resultView(runId: string, ownerState: string) {
  return (
    <>
      <button type="button">Next advisor action</button>
      <span>{ownerState}</span>
      <DpmAiWorkflowResult
        outcome={buildDpmAiWorkflowOutcome(
          "exception-summary",
          buildDpmAiWorkflowResponse("exception-summary", {
            runId,
            structuredOutput: {
              exception_summary: "Repair missing tax-lot evidence.",
              recommended_triage: ["Validate source completeness"],
            },
          }),
          getDpmAiWorkflowFixtureSourceReference("exception-summary"),
        )}
        focusOnMount
      />
    </>
  );
}

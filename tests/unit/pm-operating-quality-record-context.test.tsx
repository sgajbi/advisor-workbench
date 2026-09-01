import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PmOperatingQualityRecordContext from "../../src/features/workbench/components/pm-operating-quality-record-context";
import type { PmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";

const model = {
  scoreRunRows: [
    {
      key: "run-1",
      scoreRunId: "run-1",
      pmId: "PM_SG_001",
      bookId: "BALANCED_BOOK",
      policy: "PM quality / 2026.05",
      state: "READY",
      score: "88.00",
      asOfDate: "2026-05-13",
      sourceService: "lotus-manage",
    },
    {
      key: "run-2",
      scoreRunId: "run-2",
      pmId: "PM_SG_002",
      bookId: "INCOME_BOOK",
      policy: "PM quality / 2026.05",
      state: "REVIEW_REQUIRED",
      score: "74.00",
      asOfDate: "2026-05-13",
      sourceService: "lotus-manage",
    },
  ],
  fairnessAnalysisRows: [
    {
      key: "fairness-1",
      fairnessAnalysisId: "fairness-1",
      policy: "PM quality / 2026.05",
      state: "PENDING_REVIEW",
      asOfDate: "2026-05-13",
      observedSpread: "18.00",
      segmentCount: "2",
    },
  ],
  reviewActionRows: [
    {
      key: "review-1",
      reviewActionId: "review-1",
      reviewActionRef: "PMQ-RA-001",
      target: "Score Run / run-1",
      actionType: "Supervisory Review",
      actionState: "PENDING_REVIEW",
      asOfDate: "2026-05-13",
    },
  ],
} as PmOperatingQualityPanelModel;

const selection = {
  scoreRunId: "run-1",
  fairnessAnalysisId: "fairness-1",
  reviewActionId: "review-1",
};

describe("PmOperatingQualityRecordContext", () => {
  it("exposes one visible selected record for each supervisory evidence family", () => {
    render(
      <PmOperatingQualityRecordContext
        model={model}
        selection={selection}
        pendingFairnessDetail={false}
        pendingReviewActionDetail={false}
        selectionLocked={false}
        onScoreRunSelection={vi.fn()}
        onFairnessAnalysisSelection={vi.fn()}
        onReviewActionSelection={vi.fn()}
      />
    );

    expect(screen.getByText("Select evidence before you act")).toBeInTheDocument();
    expect(screen.getAllByRole("option", { selected: true })).toHaveLength(3);
    expect(screen.getByRole("option", { name: /PM_SG_001.*BALANCED_BOOK/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("Manage-backed records")).toBeInTheDocument();
  });

  it("supports pointer and listbox keyboard selection through the reusable selector", () => {
    const onScoreRunSelection = vi.fn();
    render(
      <PmOperatingQualityRecordContext
        model={model}
        selection={selection}
        pendingFairnessDetail={false}
        pendingReviewActionDetail={false}
        selectionLocked={false}
        onScoreRunSelection={onScoreRunSelection}
        onFairnessAnalysisSelection={vi.fn()}
        onReviewActionSelection={vi.fn()}
      />
    );

    const scoreRuns = screen.getByRole("listbox", {
      name: "PM operating quality score-run selection",
    });
    const firstRun = within(scoreRuns).getByRole("option", { name: /PM_SG_001/i });
    const secondRun = within(scoreRuns).getByRole("option", { name: /PM_SG_002/i });

    fireEvent.keyDown(firstRun, { key: "ArrowDown" });
    expect(onScoreRunSelection).toHaveBeenCalledWith("run-2");
    expect(secondRun).toHaveFocus();

    fireEvent.click(secondRun);
    expect(onScoreRunSelection).toHaveBeenLastCalledWith("run-2");
  });

  it("keeps source loading and empty-family posture explicit", () => {
    render(
      <PmOperatingQualityRecordContext
        model={{ ...model, fairnessAnalysisRows: [], reviewActionRows: [] }}
        selection={{ ...selection, fairnessAnalysisId: null, reviewActionId: null }}
        pendingFairnessDetail
        pendingReviewActionDetail
        selectionLocked={false}
        onScoreRunSelection={vi.fn()}
        onFairnessAnalysisSelection={vi.fn()}
        onReviewActionSelection={vi.fn()}
      />
    );

    expect(
      screen.getByText("No persisted fairness reviews were returned by Gateway.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No recorded supervisory actions were returned by Gateway.")
    ).toBeInTheDocument();
    const pendingStates = screen.getAllByRole("status");
    expect(pendingStates).toHaveLength(2);
    expect(pendingStates[0]).toHaveTextContent("Loading the selected fairness evidence.");
    expect(pendingStates[1]).toHaveTextContent("Loading the selected supervisory action.");
  });

  it("holds every record selector while a source-owned action is being recorded", () => {
    const onScoreRunSelection = vi.fn();
    render(
      <PmOperatingQualityRecordContext
        model={model}
        selection={selection}
        pendingFairnessDetail={false}
        pendingReviewActionDetail={false}
        selectionLocked
        onScoreRunSelection={onScoreRunSelection}
        onFairnessAnalysisSelection={vi.fn()}
        onReviewActionSelection={vi.fn()}
      />
    );

    expect(
      screen.getByText("Record selection is held while Manage records the current control action.")
    ).toHaveAttribute("role", "status");
    const options = screen.getAllByRole("option");
    expect(options).not.toHaveLength(0);
    options.forEach((option) => expect(option).toHaveAttribute("aria-disabled", "true"));

    fireEvent.click(screen.getByRole("option", { name: /PM_SG_002/i }));
    expect(onScoreRunSelection).not.toHaveBeenCalled();
  });
});

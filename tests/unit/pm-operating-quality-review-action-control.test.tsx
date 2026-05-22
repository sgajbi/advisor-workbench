import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PmOperatingQualityReviewActionControl from "../../src/features/workbench/components/pm-operating-quality-review-action-control";

const form = {
  actorId: "supervisor_sg_1",
  targetType: "SCORE_RUN",
  targetId: "pmq_run_001",
  actionType: "REQUEST_EVIDENCE_REMEDIATION",
  actionState: "REVIEW_REQUIRED",
  reviewActionRef: "PMQ-RA-001",
  boundedRationale: "Bounded supervisory action rationale.",
};

const targetOptions = [
  {
    targetType: "SCORE_RUN",
    value: "pmq_run_001",
    label: "pmq_run_001 / PM_SG_001",
    detail: "PM_BOOK_SG_BALANCED | READY | 2026-05-13",
  },
  {
    targetType: "FAIRNESS_ANALYSIS",
    value: "pmq_fair_001",
    label: "pmq_fair_001",
    detail: "PENDING_REVIEW | pmq_sg_dpm / 2026.05 | 2026-05-13",
  },
];

describe("PmOperatingQualityReviewActionControl", () => {
  it("renders bounded preview-before-create controls without unsupported actions", () => {
    const onFormChange = vi.fn();

    render(
      <PmOperatingQualityReviewActionControl
        form={form}
        readiness={{ state: "READY", detail: "Ready to preview score run pmq_run_001" }}
        previewReady={false}
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        targetOptions={targetOptions}
        onFormChange={onFormChange}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(
      screen.getByLabelText("PM operating quality supervisory review-action control")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Supervisor actor")).toHaveValue("supervisor_sg_1");
    expect(screen.getByLabelText("Target id")).toHaveValue("pmq_run_001");
    expect(screen.getByText("PM_BOOK_SG_BALANCED | READY | 2026-05-13")).toBeInTheDocument();
    expect(screen.getByText("Preview required before create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Review Action" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Review Action" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Bounded supervisory rationale"), {
      target: { value: "Updated bounded rationale." },
    });

    expect(onFormChange).toHaveBeenCalledWith(
      "boundedRationale",
      "Updated bounded rationale."
    );
    fireEvent.change(screen.getByLabelText("Target id"), {
      target: { value: "pmq_run_001" },
    });
    expect(onFormChange).toHaveBeenCalledWith("targetId", "pmq_run_001");
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /execute/i })).not.toBeInTheDocument();
  });

  it("enables create only after preview and renders Manage create evidence", () => {
    render(
      <PmOperatingQualityReviewActionControl
        form={form}
        readiness={{ state: "READY", detail: "Ready to preview score run pmq_run_001" }}
        previewReady
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={{
          reviewActionId: "pmq_review_001",
          correlationId: "corr-create",
          sourceService: "lotus-manage",
          upstreamStatus: "200",
        }}
        targetOptions={targetOptions}
        onFormChange={vi.fn()}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(
      screen.getByText("Preview available; create records an immutable Manage review action")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record Review Action" })).toBeEnabled();
    expect(
      screen.getByLabelText("PM operating quality persisted review-action evidence")
    ).toBeInTheDocument();
    expect(screen.getByText("corr-create")).toBeInTheDocument();
  });

  it("keeps preview and create disabled while source readiness is blocked", () => {
    render(
      <PmOperatingQualityReviewActionControl
        form={form}
        readiness={{ state: "BLOCKED", detail: "Blocked by Manage action register" }}
        previewReady
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        targetOptions={targetOptions}
        onFormChange={vi.fn()}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText("Blocked by Manage action register")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Review Action" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record Review Action" })).toBeDisabled();
  });
});

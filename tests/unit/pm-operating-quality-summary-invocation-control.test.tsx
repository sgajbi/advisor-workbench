import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PmOperatingQualitySummaryInvocationControl from "../../src/features/workbench/components/pm-operating-quality-summary-invocation-control";

const form = {
  requestedBy: "supervisor_sg_1",
  summaryRef: "PMQ-SUMMARY-pmq_run_001",
  scoreRunId: "pmq_run_001",
  reviewActionId: "pmq_review_001",
  invocationState: "PENDING_REVIEW",
  workflowPackName: "pm-operating-quality-summary",
  workflowPackVersion: "2026.05",
  workflowRunId: "",
  artifactRef: "",
  contentHash: "",
};

const scoreRunOptions = [
  {
    value: "pmq_run_001",
    label: "pmq_run_001 / PM_SG_001",
    detail: "PM_BOOK_SG_BALANCED | READY | 2026-05-13",
  },
];

const reviewActionOptions = [
  {
    value: "pmq_review_001",
    label: "PMQ-RA-001",
    detail: "pmq_review_001 | Score Run / pmq_run_001 | PENDING_REVIEW",
  },
];

describe("PmOperatingQualitySummaryInvocationControl", () => {
  it("renders bounded preview-before-create controls without unsupported actions", () => {
    const onFormChange = vi.fn();

    render(
      <PmOperatingQualitySummaryInvocationControl
        form={form}
        readiness={{ state: "READY", detail: "Ready to preview summary invocation" }}
        previewReady={false}
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        scoreRunOptions={scoreRunOptions}
        reviewActionOptions={reviewActionOptions}
        onFormChange={onFormChange}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(
      screen.getByLabelText("PM operating quality summary-invocation control")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Requested by")).toHaveValue("supervisor_sg_1");
    expect(screen.getByLabelText("Score run id")).toHaveValue("pmq_run_001");
    expect(screen.getByLabelText("Review action id")).toHaveValue("pmq_review_001");
    expect(screen.getByText("PM_BOOK_SG_BALANCED | READY | 2026-05-13")).toBeInTheDocument();
    expect(
      screen.getByText("pmq_review_001 | Score Run / pmq_run_001 | PENDING_REVIEW")
    ).toBeInTheDocument();
    expect(screen.getByText("Preview required before create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Summary Invocation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Content hash"), {
      target: { value: "sha256:summary-evidence" },
    });
    expect(onFormChange).toHaveBeenCalledWith("contentHash", "sha256:summary-evidence");

    fireEvent.change(screen.getByLabelText("Score run id"), {
      target: { value: "pmq_run_001" },
    });
    expect(onFormChange).toHaveBeenCalledWith("scoreRunId", "pmq_run_001");

    expect(screen.queryByRole("button", { name: /generate summary/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/prompt body/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/model response/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rank pm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /execute/i })).not.toBeInTheDocument();
  });

  it("enables create only after preview and renders Manage create evidence", () => {
    render(
      <PmOperatingQualitySummaryInvocationControl
        form={form}
        readiness={{ state: "READY", detail: "Ready to preview summary invocation" }}
        previewReady
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={{
          summaryInvocationId: "pmq_summary_invocation_001",
          correlationId: "corr-create",
          sourceService: "lotus-manage",
          upstreamStatus: "200",
        }}
        scoreRunOptions={scoreRunOptions}
        reviewActionOptions={reviewActionOptions}
        onFormChange={vi.fn()}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(
      screen.getByText("Preview available; create records a Manage-owned summary invocation")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeEnabled();
    expect(
      screen.getByLabelText("PM operating quality persisted summary-invocation evidence")
    ).toBeInTheDocument();
    expect(screen.getByText("corr-create")).toBeInTheDocument();
  });

  it("keeps preview and create disabled while source readiness is blocked", () => {
    render(
      <PmOperatingQualitySummaryInvocationControl
        form={form}
        readiness={{ state: "BLOCKED", detail: "Blocked by Manage summary invocation register" }}
        previewReady
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        scoreRunOptions={scoreRunOptions}
        reviewActionOptions={reviewActionOptions}
        onFormChange={vi.fn()}
        onPreview={vi.fn()}
        onCreate={vi.fn()}
      />
    );

    expect(screen.getByText("Blocked by Manage summary invocation register")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Summary Invocation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeDisabled();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualitySummaryInvocationsCard from "../../src/features/workbench/components/pm-operating-quality-summary-invocations-card";
import { buildPmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const scoreRuns: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-score",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    score_runs: [
      {
        score_run_id: "pmq_run_001",
        pm_id: "PM_SG_001",
        book_id: "PM_BOOK_SG_BALANCED",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        state: "READY",
        score: "90.00",
        as_of_date: "2026-05-13",
        content_hash: "sha256:pm-quality",
      },
    ],
  },
};

const summaryInvocationItem = {
  summary_invocation_id: "pmq_summary_001",
  summary_ref: "PMQ-SUMMARY-001",
  score_run_id: "pmq_run_001",
  review_action_id: "pmq_review_001",
  invocation_state: "PENDING_REVIEW",
  workflow_run_id: "wf_pmq_summary_001",
  summary_artifact_ref: "artifact://pmq-summary/001",
  summary_content_hash: "sha256:summary-invocation",
  requested_by: "supervisor_sg_1",
  as_of_date: "2026-05-13",
  policy_id: "pmq_sg_dpm",
  policy_version: "2026.05",
  reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
  text_boundary: {
    generated_summary_text_stored: false,
    prompt_body_stored: false,
    model_response_stored: false,
    client_communication_projected: false,
    order_or_oms_projected: false,
  },
  generated_summary_text: "Raw generated PM summary narrative must stay hidden.",
  prompt_body: "Prompt body must stay hidden.",
  model_response: "Model response must stay hidden.",
  pm_ranking_claim: "PM ranking must stay hidden.",
  client_contact_instruction: "Contact the client about this summary.",
  order_instruction: "Generate an OMS order.",
  source_refs: [
    {
      source_system: "lotus-manage",
      source_product: "PmOperatingQualitySummaryInvocation",
      source_id: "pmq_summary_001",
    },
  ],
};

const summaryInvocations: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-summary-invocations",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    summary_invocation_id: "pmq_summary_001",
    review_action_id: "pmq_review_001",
    reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
    count: 1,
  },
  data: {
    summary_invocations: [summaryInvocationItem],
  },
};

const summaryInvocationDetail: DpmPmOperatingQualityGatewayResponse = {
  ...summaryInvocations,
  correlation_id: "corr-summary-invocation-detail",
  data: {
    summary_invocation: {
      ...summaryInvocationItem,
      workflow_pack_name: "pm-operating-quality-summary",
      workflow_pack_version: "2026.05",
      forbidden_uses: ["client_contact", "oms_routing", "trade_execution"],
    },
  },
};

describe("PmOperatingQualitySummaryInvocationsCard", () => {
  it("renders persisted summary-invocation ledger and detail without generated text or workflow claims", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
      summaryInvocations,
      summaryInvocationDetail,
    });

    render(<PmOperatingQualitySummaryInvocationsCard model={model} />);

    expect(screen.getByText("Summary Invocation Detail")).toBeInTheDocument();
    expect(screen.getByText("Summary invocation returned by Gateway")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The summary invocation is recorded for audit, but no generated PM quality output is available from this record.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Status Output unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByText("How this was prepared"));
    expect(
      screen.getByText(
        "Manage published an invocation and audit record, not generated summary content.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Not approved for client use")).toBeVisible();
    expect(screen.getAllByText("PMQ-SUMMARY-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pmq_run_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pmq_review_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("wf_pmq_summary_001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("artifact://pmq-summary/001").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:summary-invocation")).toBeInTheDocument();
    expect(
      screen.getAllByText("Generated text stored: No; Prompt stored: No; Model response stored: No; Client communication projected: No; Order or OMS projected: No").length
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("PM operating quality summary invocations")
    ).toBeInTheDocument();
    expect(screen.queryByText("Raw generated PM summary narrative must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Prompt body must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Model response must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("PM ranking must stay hidden.")).not.toBeInTheDocument();
    expect(screen.queryByText("Contact the client about this summary.")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate an OMS order.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /message client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /route order/i })).not.toBeInTheDocument();
  });

  it("delegates bounded summary-invocation control rendering when command props are provided", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
      summaryInvocations,
      summaryInvocationDetail,
    });

    render(
      <PmOperatingQualitySummaryInvocationsCard
        model={model}
        form={{
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
        }}
        readiness={{ state: "READY", detail: "Ready to preview summary invocation" }}
        previewReady={false}
        pendingPreview={false}
        pendingCreate={false}
        createEvidence={null}
        scoreRunOptions={[
          {
            value: "pmq_run_001",
            label: "pmq_run_001 / PM_SG_001",
            detail: "PM_BOOK_SG_BALANCED | READY | 2026-05-13",
          },
        ]}
        reviewActionOptions={[
          {
            value: "pmq_review_001",
            label: "PMQ-RA-001",
            detail: "pmq_review_001 | Score Run / pmq_run_001 | PENDING_REVIEW",
          },
        ]}
        onFormChange={() => undefined}
        onPreview={() => undefined}
        onCreate={() => undefined}
      />
    );

    expect(
      screen.getByLabelText("PM operating quality summary-invocation control")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Requested by")).toHaveValue("supervisor_sg_1");
    expect(screen.getByText("Preview required before create")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview Summary Invocation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record Summary Invocation" })).toBeDisabled();
  });

  it("renders fail-closed empty posture when no summary invocation is returned", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns,
    });

    render(<PmOperatingQualitySummaryInvocationsCard model={model} />);

    expect(screen.getByText("No detail")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Manage summary-invocation detail")).toBeInTheDocument();
    expect(screen.getByText("No summary invocations returned")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Workbench waits for Manage-persisted PM quality summary invocation history through Gateway."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

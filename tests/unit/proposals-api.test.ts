import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approveCompliance,
  approveRisk,
  compareAdvisoryWorkspace,
  acknowledgeAdvisorCockpitAction,
  createProposalArtifact,
  createProposalAsync,
  createProposalExecutionHandoff,
  createProposalVersion,
  createProposalVersionAsync,
  createProposalReportRequest,
  createProposalMemo,
  getAdvisoryWorkspaceSavedVersionReplayEvidence,
  getAdvisoryPolicyEvaluation,
  getAdvisoryPolicyReviewQueue,
  getAdvisoryPolicySignOffPackage,
  getAdvisoryPolicyWorkflow,
  getAdvisorCockpitSnapshot,
  getAdvisorCockpitSupportability,
  getBankDemoScenarioContract,
  getBankDemoSupportedClaimRegister,
  getProposalExecutionStatus,
  getProposalIdempotencyRecord,
  getProposalDeliveryEvents,
  getProposalDeliverySummary,
  getProposalApprovals,
  getProposalMemo,
  getProposalMemoLineage,
  getProposalMemoProjection,
  getProposalMemoReplayEvidence,
  getProposalNarrative,
  getProposalOperation,
  getProposalOperationByCorrelation,
  getProposalOperationReplayEvidence,
  getProposalVersion,
  getProposalVersionReplayEvidence,
  getProposalWorkflowEvents,
  listAdvisoryWorkspaceSavedVersions,
  listAdvisorCockpitActions,
  listAdvisorCockpitPreparationPackets,
  recordProposalExecutionUpdate,
  recordProposalMemoReportPackageEvent,
  listProposals,
  recordAdvisoryPolicySignOffDecision,
  recordClientConsent,
  regenerateProposalNarrative,
  requestAdvisoryWorkspaceRationale,
  requestProposalMemoAdvisorCommentary,
  requestProposalMemoAiCommentary,
  requestProposalMemoReportPackage,
  resumeAdvisoryWorkspace,
  reviewAdvisoryWorkspaceRationale,
  reviewProposalMemo,
  reviewProposalNarrative,
  submitProposal,
} from "../../src/features/proposals/api";

const expectedBaseUrl = "/api/bff/api/v1";

describe("proposal api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls submit endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await submitProposal(
      "pp_1",
      {
        actor_id: "advisor_1",
        expected_state: "DRAFT",
        review_type: "RISK",
      },
      "idem-submit-1",
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/submit`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-submit-1",
        }),
      }),
    );
  });

  it("calls approval action endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await approveRisk(
      "pp_1",
      { actor_id: "risk_1", expected_state: "RISK_REVIEW" },
      "idem-risk-1",
    );
    await approveCompliance(
      "pp_1",
      {
        actor_id: "compliance_1",
        expected_state: "COMPLIANCE_REVIEW",
      },
      "idem-compliance-1",
    );
    await recordClientConsent(
      "pp_1",
      {
        actor_id: "advisor_1",
        expected_state: "AWAITING_CLIENT_CONSENT",
      },
      "idem-consent-1",
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/approve-risk`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-risk-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/approve-compliance`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-compliance-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/record-client-consent`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-consent-1",
        }),
      }),
    );
  });

  it("calls supportability endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: { events: [], approvals: [] },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await getProposalWorkflowEvents("pp_1");
    await getProposalApprovals("pp_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/workflow-events`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/approvals`,
    );
  });

  it("builds list query from server-side filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: { items: [] },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await listProposals({
      state: "DRAFT",
      portfolioId: "pf_1",
      createdBy: "advisor_1",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals?portfolio_id=pf_1&state=DRAFT&created_by=advisor_1`,
    );
  });

  it("loads the Gateway-backed advisory policy review queue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: { items: [{ evaluation_id: "pev_1" }], queue_posture: {} },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    const result = await getAdvisoryPolicyReviewQueue({
      evaluationStatus: "PENDING_REVIEW",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory-policy-evaluations/review-queue?evaluation_status=PENDING_REVIEW&portfolio_id=PB_SG_GLOBAL_BAL_001`,
    );
    expect(result.items?.[0]?.evaluation_id).toBe("pev_1");
  });

  it("loads RFC28 bank demo proof contracts through the Gateway BFF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const data = url.endsWith("/scenario-contract")
          ? {
              scenario_id: "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
              primary_portfolio_id: "PB_SG_GLOBAL_BAL_001",
            }
          : {
              claims: [
                {
                  claim_id: "client_ready_publication_blocked",
                  classification: "UNSUPPORTED",
                },
              ],
            };
        return new Response(
          JSON.stringify({
            correlationId: "c",
            contractVersion: "v1",
            data,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const scenario = await getBankDemoScenarioContract();
    const claimRegister = await getBankDemoSupportedClaimRegister();

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory/bank-demo-proof/scenario-contract`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory/bank-demo-proof/supported-claim-register`,
    );
    expect(scenario.scenario_id).toBe(
      "RFC28_BANK_DEMO_CLIENT_READY_PROOF_CANONICAL",
    );
    expect(claimRegister.claims?.[0]?.classification).toBe("UNSUPPORTED");
  });

  it("loads Gateway-backed advisory policy detail and sign-off package", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const data = url.endsWith("/sign-off-package")
          ? {
              package_posture: {
                sign_off_source_package:
                  "SUPPORTED_BY_RFC0025_SLICE8_ADVISE_API",
              },
            }
          : { evaluation_id: "pev_1", evaluation_status: "PENDING_REVIEW" };
        return new Response(
          JSON.stringify({
            correlation_id: "c",
            contract_version: "v1",
            data,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const evaluation = await getAdvisoryPolicyEvaluation("pev_1");
    const signOffPackage = await getAdvisoryPolicySignOffPackage("pev_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory-policy-evaluations/pev_1`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory-policy-evaluations/pev_1/sign-off-package`,
    );
    expect(evaluation.evaluation_id).toBe("pev_1");
    expect(signOffPackage.package_posture?.sign_off_source_package).toContain(
      "SUPPORTED",
    );
  });

  it("loads advisory policy workflow and records review requests through Gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const data =
          init?.method === "POST"
            ? { workflow: { sign_off_status: "PENDING_REVIEW" } }
            : {
                sign_off_status: "PENDING_REVIEW",
                maker_checker_required: true,
              };
        return new Response(
          JSON.stringify({
            correlation_id: "c",
            contract_version: "v1",
            data,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const workflow = await getAdvisoryPolicyWorkflow("pev_1");
    const decision = await recordAdvisoryPolicySignOffDecision(
      "pev_1",
      {
        body: {
          actor_id: "advisor_1",
          decision: "REQUEST_MORE_EVIDENCE",
          source_evaluation_hash: "sha256:policy-evaluation-1",
          reason: { purpose: "advisor_policy_review" },
        },
      },
      "idem-policy-review-request",
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory-policy-evaluations/pev_1/workflow`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisory-policy-evaluations/pev_1/sign-off-decisions`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-policy-review-request",
        }),
      }),
    );
    expect(workflow.sign_off_status).toBe("PENDING_REVIEW");
    expect(decision.workflow?.sign_off_status).toBe("PENDING_REVIEW");
  });

  it("calls Gateway-backed advisor cockpit read and acknowledgement endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const data =
          init?.method === "POST"
            ? { action_item: { action_item_id: "aci_1" }, replayed: false }
            : url.includes("/supportability")
              ? {
                  posture:
                    "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
                }
              : url.includes("/snapshot")
                ? {
                    snapshot_id: "cockpit_snapshot_1",
                    action_counts: { "status.BLOCKED": 1 },
                  }
                : { items: [{ action_item_id: "aci_1" }], total_count: 1 };
        return new Response(
          JSON.stringify({
            correlation_id: "c",
            contract_version: "v1",
            data,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const filters = {
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      advisorId: "advisor_sg_001",
      role: "ADVISOR" as const,
    };

    const actions = await listAdvisorCockpitActions({ ...filters, limit: 25 });
    const preparationPackets = await listAdvisorCockpitPreparationPackets({
      ...filters,
      limit: 25,
    });
    const snapshot = await getAdvisorCockpitSnapshot(filters);
    const supportability = await getAdvisorCockpitSupportability(filters);
    const acknowledgement = await acknowledgeAdvisorCockpitAction(
      "aci_1",
      {
        action_item_version: 1,
        acknowledged_by: "advisor_sg_001",
        acknowledgement_note: "Reviewed in Workbench.",
      },
      {
        filters,
        idempotencyKey: "idem-cockpit-ack-1",
      },
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisor-cockpit/actions?portfolio_id=PB_SG_GLOBAL_BAL_001&advisor_id=advisor_sg_001&role=ADVISOR&limit=25`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisor-cockpit/preparation-packets?portfolio_id=PB_SG_GLOBAL_BAL_001&advisor_id=advisor_sg_001&role=ADVISOR&limit=25`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisor-cockpit/snapshot?portfolio_id=PB_SG_GLOBAL_BAL_001&advisor_id=advisor_sg_001&role=ADVISOR`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisor-cockpit/supportability?portfolio_id=PB_SG_GLOBAL_BAL_001&advisor_id=advisor_sg_001&role=ADVISOR`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/advisor-cockpit/actions/aci_1/acknowledgements?portfolio_id=PB_SG_GLOBAL_BAL_001&advisor_id=advisor_sg_001&role=ADVISOR`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-cockpit-ack-1",
        }),
        body: JSON.stringify({
          action_item_version: 1,
          acknowledged_by: "advisor_sg_001",
          acknowledgement_note: "Reviewed in Workbench.",
        }),
      }),
    );
    expect(actions.total_count).toBe(1);
    expect(preparationPackets.total_count).toBe(1);
    expect(snapshot.snapshot_id).toBe("cockpit_snapshot_1");
    expect(supportability.posture).toBe(
      "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
    );
    expect(acknowledgement.replayed).toBe(false);
  });

  it("calls proposal version endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: { version_no: 2 },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await getProposalVersion("pp_1", 2, true);
    await createProposalVersion(
      "pp_1",
      { body: { created_by: "advisor_1", simulate_request: { options: {} } } },
      "idem-v2",
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/pp_1/versions/2?include_evidence=true`,
    );
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/pp_1/versions`);
  });

  it("calls full Gateway-backed advisory operation support endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await createProposalArtifact(
      { body: { proposal_run_id: "pr_1" } },
      "idem-artifact-1",
    );
    await createProposalAsync(
      { body: { created_by: "advisor_1" } },
      "idem-async-1",
    );
    await createProposalVersionAsync(
      "pp_1",
      { body: { created_by: "advisor_1" } },
      "idem-version-async-1",
    );
    await getProposalOperation("apo_1");
    await getProposalOperationByCorrelation("corr-operation-1");
    await getProposalOperationReplayEvidence("apo_1");
    await getProposalVersionReplayEvidence("pp_1", 2);
    await getProposalIdempotencyRecord("idem-create-1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/artifact`);
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/async`);
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/pp_1/versions/async`,
    );
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/operations/apo_1`,
    );
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/operations/by-correlation/corr-operation-1`,
    );
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/operations/apo_1/replay-evidence`,
    );
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/replay-evidence`,
    );
    expect(calledUrls).toContain(
      `${expectedBaseUrl}/proposals/idempotency/idem-create-1`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/artifact`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-artifact-1",
        }),
      }),
    );
  });

  it("calls reviewed narrative and delivery posture endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {
                narrative_review: {
                  review_state: "APPROVED_FOR_ADVISOR_USE",
                  source_narrative_hash: "sha256:narrative-001",
                },
                explanation: {
                  proposal_narrative_package: {
                    package_status: "INCLUDED_REVIEWED_NARRATIVE",
                  },
                },
                event_count: 1,
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await reviewProposalNarrative(
      "pp_1",
      2,
      {
        action: "APPROVE",
        reviewed_by: "advisor_1",
        reason: "Evidence-grounded advisor narrative.",
      },
      "idem-review-1",
    );
    await regenerateProposalNarrative("pp_1", 2, {
      body: { requested_by: "advisor_1" },
    });
    await getProposalNarrative("pp_1", 2);
    await createProposalReportRequest("pp_1", {
      report_type: "PORTFOLIO_REVIEW",
      requested_by: "advisor_1",
      related_version_no: 2,
      include_reviewed_narrative: true,
    });
    await getProposalDeliverySummary("pp_1");
    await getProposalDeliveryEvents("pp_1");
    await createProposalExecutionHandoff(
      "pp_1",
      {
        body: { requested_by: "advisor_1", execution_provider: "lotus-manage" },
      },
      "idem-execution-handoff-1",
    );
    await getProposalExecutionStatus("pp_1");
    await recordProposalExecutionUpdate(
      "pp_1",
      { body: { handoff_status: "PARTIALLY_EXECUTED" } },
      "idem-execution-update-1",
    );

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/narrative/review`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-review-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/report-requests`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/narrative/regenerate`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/narrative`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/delivery-summary`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/delivery-events`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/execution-handoffs`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-execution-handoff-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/execution-status`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/execution-updates`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-execution-update-1",
        }),
      }),
    );
  });

  it("calls proposal memo Gateway endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {
                memo_hash: "sha256:memo-001",
                projection: { audience: "COMPLIANCE" },
                report: { archive_refs: ["archive://memo/report/1"] },
                commentary: { authority: "NON_AUTHORITATIVE" },
                hashes: { memo_hash: "sha256:memo-001" },
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await createProposalMemo(
      "pp_1",
      2,
      { created_by: "advisor_1", lifecycle_status: "DRAFT" },
      "idem-memo-create-1",
    );
    await getProposalMemo("pp_1", 2);
    await getProposalMemoProjection("pp_1", 2, "COMPLIANCE");
    await reviewProposalMemo(
      "pp_1",
      2,
      {
        action: "APPROVE_FOR_ADVISOR_USE",
        reviewed_by: "compliance_1",
        reason: "Evidence-backed memo.",
        source_memo_hash: "sha256:memo-001",
        client_ready_release_requested: false,
      },
      "idem-memo-review-1",
    );
    await requestProposalMemoReportPackage(
      "pp_1",
      2,
      {
        requested_by: "advisor_1",
        source_memo_hash: "sha256:memo-001",
        requested_output_formats: ["pdf"],
        client_ready_document_requested: false,
      },
      "idem-memo-report-1",
    );
    await recordProposalMemoReportPackageEvent(
      "pp_1",
      2,
      { body: { event_type: "ARCHIVED", archive_ref: "archive_1" } },
      "idem-memo-report-event-1",
    );
    await requestProposalMemoAiCommentary(
      "pp_1",
      2,
      {
        requested_by: "advisor_1",
        source_memo_hash: "sha256:memo-001",
        requested_sections: ["EXECUTIVE_SUMMARY"],
      },
      "idem-memo-ai-1",
    );
    await requestProposalMemoAdvisorCommentary(
      "pp_1",
      2,
      {
        requested_by: "advisor_1",
        source_memo_hash: "sha256:memo-001",
        requested_sections: ["LIMITATIONS_AND_DISCLOSURES"],
      },
      "idem-memo-advisor-commentary-1",
    );
    await getProposalMemoLineage("pp_1");
    await getProposalMemoReplayEvidence("pp_1", 2);

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-create-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/projection?audience=COMPLIANCE`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/review`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-review-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/report-packages`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-report-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/report-package-events`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-report-event-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/ai-commentary`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-ai-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/ai-commentary`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "idem-memo-advisor-commentary-1",
        }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/memo/advisor-commentary"),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/memos/lineage`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/versions/2/memo/replay-evidence`,
    );
  });

  it("calls full advisory workspace support endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              correlation_id: "c",
              contract_version: "v1",
              data: {},
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    await listAdvisoryWorkspaceSavedVersions("aws_1");
    await getAdvisoryWorkspaceSavedVersionReplayEvidence("aws_1", "awv_1");
    await resumeAdvisoryWorkspace("aws_1", {
      body: { workspace_version_id: "awv_1", actor_id: "advisor_1" },
    });
    await compareAdvisoryWorkspace("aws_1", {
      body: { workspace_version_id: "awv_1" },
    });
    await requestAdvisoryWorkspaceRationale("aws_1", {
      body: {
        requested_by: "advisor_1",
        instruction: "Summarize client impact.",
      },
    });
    await reviewAdvisoryWorkspaceRationale("aws_1", {
      body: {
        run_id: "packrun_1",
        action_type: "APPROVE",
        reviewed_by: "advisor_1",
      },
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(calledUrls).toEqual([
      `${expectedBaseUrl}/advisory-workspaces/aws_1/saved-versions`,
      `${expectedBaseUrl}/advisory-workspaces/aws_1/saved-versions/awv_1/replay-evidence`,
      `${expectedBaseUrl}/advisory-workspaces/aws_1/resume`,
      `${expectedBaseUrl}/advisory-workspaces/aws_1/compare`,
      `${expectedBaseUrl}/advisory-workspaces/aws_1/assistant/rationale`,
      `${expectedBaseUrl}/advisory-workspaces/aws_1/assistant/rationale/review-actions`,
    ]);
  });
});

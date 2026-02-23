import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approveCompliance,
  approveRisk,
  getProposalApprovals,
  listProposals,
  getProposalWorkflowEvents,
  recordClientConsent,
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
      vi.fn(async () =>
        new Response(JSON.stringify({ correlation_id: "c", contract_version: "v1", data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await submitProposal("pp_1", {
      actor_id: "advisor_1",
      expected_state: "DRAFT",
      review_type: "RISK",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/submit`,
      expect.any(Object)
    );
  });

  it("calls approval action endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ correlation_id: "c", contract_version: "v1", data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await approveRisk("pp_1", { actor_id: "risk_1", expected_state: "RISK_REVIEW" });
    await approveCompliance("pp_1", {
      actor_id: "compliance_1",
      expected_state: "COMPLIANCE_REVIEW",
    });
    await recordClientConsent("pp_1", {
      actor_id: "advisor_1",
      expected_state: "AWAITING_CLIENT_CONSENT",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrls = fetchMock.mock.calls.map((call) => call[0] as string);
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/pp_1/approve-risk`);
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/pp_1/approve-compliance`);
    expect(calledUrls).toContain(`${expectedBaseUrl}/proposals/pp_1/record-client-consent`);
  });

  it("calls supportability endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "c",
            contract_version: "v1",
            data: { events: [], approvals: [] },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );

    await getProposalWorkflowEvents("pp_1");
    await getProposalApprovals("pp_1");

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/workflow-events`
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals/pp_1/approvals`
    );
  });

  it("builds list query from server-side filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "c",
            contract_version: "v1",
            data: { items: [] },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );

    await listProposals({
      state: "DRAFT",
      portfolioId: "pf_1",
      createdBy: "advisor_1",
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/proposals?portfolio_id=pf_1&state=DRAFT&created_by=advisor_1`
    );
  });
});

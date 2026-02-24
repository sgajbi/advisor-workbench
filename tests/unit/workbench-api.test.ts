import { afterEach, describe, expect, it, vi } from "vitest";

import { applySandboxChanges, createSandboxSession } from "../../src/features/workbench/api";

const expectedBaseUrl = "/api/bff/api/v1";

describe("workbench api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls sandbox session create endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            session_id: "sess_1",
            session_version: 1,
            projected_positions: [],
            projected_summary: {
              total_baseline_positions: 0,
              total_proposed_positions: 0,
              net_delta_quantity: 0,
            },
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await createSandboxSession("PF_1001", { created_by: "advisor_1", ttl_hours: 24 });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/workbench/PF_1001/sandbox/sessions`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls sandbox change apply endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            correlation_id: "corr",
            contract_version: "v1",
            portfolio_id: "PF_1001",
            session_id: "sess_1",
            session_version: 2,
            projected_positions: [],
            projected_summary: {
              total_baseline_positions: 1,
              total_proposed_positions: 1,
              net_delta_quantity: 2,
            },
            policy_feedback: { status: "PASS" },
            warnings: [],
            partial_failures: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await applySandboxChanges("PF_1001", "sess_1", {
      changes: [{ security_id: "EQ_1", transaction_type: "BUY", quantity: 2 }],
      evaluate_policy: true,
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBaseUrl}/workbench/PF_1001/sandbox/sessions/sess_1/changes`,
      expect.objectContaining({ method: "POST" })
    );
  });
});

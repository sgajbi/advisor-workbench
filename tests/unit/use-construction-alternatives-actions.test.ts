import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConstructionAlternativesActions } from "../../src/features/workbench/use-construction-alternatives-actions";
import {
  generateDpmConstructionAlternatives,
  getExternalOrderExecutionAcknowledgement,
  selectDpmConstructionAlternative,
} from "../../src/features/workbench/construction-api";
import type {
  DpmConstructionGatewayResponse,
  ExternalOrderExecutionAcknowledgementResponse,
  WorkbenchPortfolio360,
} from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/construction-api", () => ({
  generateDpmConstructionAlternatives: vi.fn(),
  getExternalOrderExecutionAcknowledgement: vi.fn(),
  selectDpmConstructionAlternative: vi.fn(),
}));

const portfolio: WorkbenchPortfolio360 = {
  correlation_id: "corr-p360",
  contract_version: "v1",
  as_of_date: "2026-02-24",
  portfolio: {
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    client_id: "C1",
    base_currency: "SGD",
    booking_center_code: "SG",
  },
  overview: {
    market_value_base: 100000,
    cash_weight_pct: 8,
    position_count: 2,
  },
  performance_snapshot: null,
  rebalance_snapshot: null,
  current_positions: [],
  projected_positions: [],
  projected_summary: null,
  active_session_id: null,
  warnings: [],
  partial_failures: [],
};

const readyResponse: DpmConstructionGatewayResponse = {
  correlation_id: "corr-rfc39",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0039",
    state: "READY",
    reason_codes: ["REGIME_SCENARIO_PACK_READY"],
    selected_alternative_id: null,
  },
  data: {
    alternative_set_id: "cas_1",
    status: "READY",
    alternatives: [
      {
        alternative_id: "alt_balanced_transition",
        label: "Balanced Transition",
        objective: "Restore model weights with moderate turnover",
        mandate_fit: "Within Range",
        recommended: true,
        method: "BALANCED_TRANSITION",
        method_status: "READY",
        rationale: "Balances drift reduction, cash deployment, transaction cost, and mandate fit.",
        comparison_metrics: {
          turnover_weight: "0.048",
          cash_weight: "0.021",
          drift_improvement_pct: "0.724",
          trade_count: 8,
        },
      },
    ],
  },
};

const blockedResponse: DpmConstructionGatewayResponse = {
  ...readyResponse,
  supportability: {
    ...readyResponse.supportability,
    state: "BLOCKED",
    reason_codes: ["CONSTRUCTION_SOURCE_READINESS_BLOCKED"],
  },
};

const selectedResponse: DpmConstructionGatewayResponse = {
  ...readyResponse,
  supportability: {
    ...readyResponse.supportability,
    selected_alternative_id: "alt_balanced_transition",
  },
};

const executionAcknowledgementResponse: ExternalOrderExecutionAcknowledgementResponse = {
  product_name: "ExternalOrderExecutionAcknowledgement",
  product_version: "v1",
  portfolio_id: "PB_SG_GLOBAL_BAL_001",
  order_reference_ids: [],
  acknowledgements: [],
  data_quality_status: "MISSING",
  supportability: {
    state: "UNAVAILABLE",
    reason: "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
    acknowledgement_count: 0,
    missing_data_families: ["external_oms_order_execution_acknowledgement"],
    blocked_capabilities: [
      "order_generation",
      "venue_routing",
      "best_execution",
      "oms_acknowledgement",
      "fills",
      "settlement",
      "execution_status_certification",
      "autonomous_execution",
    ],
  },
  lineage: {
    source_system: "external-bank-oms",
    source_table: "not_ingested",
    contract_version: "rfc_042_external_order_execution_acknowledgement_v1",
    integration_status: "not_ingested",
    runtime_posture: "fail_closed",
  },
};

describe("useConstructionAlternativesActions", () => {
  beforeEach(() => {
    vi.mocked(getExternalOrderExecutionAcknowledgement).mockResolvedValue(
      executionAcknowledgementResponse
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts idle and loads external OMS acknowledgement supportability through Gateway", async () => {
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    expect(result.current.portfolioId).toBe("PB_SG_GLOBAL_BAL_001");
    expect(result.current.model.state).toBe("idle");
    expect(result.current.canSelectSelectedAlternative).toBe(false);
    await waitFor(() =>
      expect(getExternalOrderExecutionAcknowledgement).toHaveBeenCalledWith({ portfolio })
    );
    await waitFor(() =>
      expect(result.current.executionAcknowledgementResponse?.supportability.state).toBe(
        "UNAVAILABLE"
      )
    );
    expect(JSON.stringify(result.current.executionAcknowledgementResponse)).not.toContain(
      "Execution ready"
    );
  });

  it("generates construction alternatives through Gateway without client-side construction logic", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(readyResponse);
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    await act(async () => {
      await result.current.generateAlternatives();
    });

    expect(generateDpmConstructionAlternatives).toHaveBeenCalledWith({ portfolio });
    expect(result.current.model.alternativeSetId).toBe("cas_1");
    expect(result.current.model.selectedAlternative?.label).toBe("Balanced Transition");
    expect(result.current.actionMessage).toBe(
      "Construction alternatives generated from mandate data.",
    );
  });

  it("does not publish success confirmation before source persistence succeeds", async () => {
    let resolveGeneration: ((response: DpmConstructionGatewayResponse) => void) | undefined;
    vi.mocked(generateDpmConstructionAlternatives).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    let generation: Promise<void> | undefined;
    act(() => {
      generation = result.current.generateAlternatives();
    });

    expect(result.current.generatePending).toBe(true);
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.model.state).toBe("idle");

    await act(async () => {
      resolveGeneration?.(readyResponse);
      await generation;
    });

    expect(result.current.generatePending).toBe(false);
    expect(result.current.actionMessage).toBe(
      "Construction alternatives generated from mandate data.",
    );
  });

  it("keeps a failed source request explicit and does not fabricate evidence", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockRejectedValue(
      new Error("Manage construction unavailable"),
    );
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    await act(async () => {
      await result.current.generateAlternatives();
    });

    expect(result.current.model.state).toBe("idle");
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.actionError).toBe("Manage construction unavailable");
  });

  it("reports source-owned blocking posture instead of a success claim", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(blockedResponse);
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    await act(async () => {
      await result.current.generateAlternatives();
    });

    expect(result.current.model.state).toBe("blocked");
    expect(result.current.actionMessage).toBe(
      "Construction request completed with blocking conditions.",
    );
  });

  it("selects an alternative through Gateway and does not construct execution posture", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(readyResponse);
    vi.mocked(selectDpmConstructionAlternative).mockResolvedValue(selectedResponse);
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    await act(async () => {
      await result.current.generateAlternatives();
    });
    await act(async () => {
      await result.current.selectAlternative("alt_balanced_transition");
    });

    expect(selectDpmConstructionAlternative).toHaveBeenCalledWith({
      alternativeSetId: "cas_1",
      alternativeId: "alt_balanced_transition",
    });
    expect(result.current.model.selectedAlternativeId).toBe("alt_balanced_transition");
    expect(result.current.actionMessage).toBe("Selected Balanced Transition.");
    expect(JSON.stringify(result.current.model)).not.toContain("Filled");
    expect(JSON.stringify(result.current.model)).not.toContain("Settled");
  });

  it("keeps selection fail-closed when alternatives are not generated or source readiness is blocked", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(blockedResponse);
    const { result } = renderHook(() => useConstructionAlternativesActions({ portfolio }));

    await act(async () => {
      await result.current.selectAlternative("alt_balanced_transition");
    });
    expect(selectDpmConstructionAlternative).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.generateAlternatives();
    });
    expect(result.current.model.state).toBe("blocked");

    await act(async () => {
      await result.current.selectAlternative("alt_balanced_transition");
    });
    expect(selectDpmConstructionAlternative).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ConstructionAlternativesPanel from "../../src/features/workbench/components/construction-alternatives-panel";
import type {
  DpmConstructionGatewayResponse,
  WorkbenchPortfolio360,
} from "../../src/features/workbench/types";
import {
  getExternalOrderExecutionAcknowledgement,
  generateDpmConstructionAlternatives,
  selectDpmConstructionAlternative,
} from "../../src/features/workbench/construction-api";

vi.mock("../../src/features/workbench/construction-api", () => ({
  getExternalOrderExecutionAcknowledgement: vi.fn(),
  generateDpmConstructionAlternatives: vi.fn(),
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
  current_positions: [
    {
      security_id: "UOB_EQ",
      instrument_name: "UOB",
      asset_class: "EQUITY",
      quantity: 100,
      market_value_base: 50000,
      weight_pct: 50,
    },
    {
      security_id: "SG_BOND",
      instrument_name: "SG Bond",
      asset_class: "FIXED_INCOME",
      quantity: 50,
      market_value_base: 42000,
      weight_pct: 42,
    },
  ],
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
        objective_trace: [{ term: "turnover" }],
        constraint_trace: [{ constraint: "cash_band" }],
        diagnostics: {
          authority_context: {
            currency_overlay_context: {
              supportability_status: "BLOCKED",
              source_system: "lotus-core",
              external_hedge_policy_source_product_name: "ExternalHedgePolicy",
              external_hedge_policy_source_product_version: "v1",
              external_hedge_policy_source_id: "sha256:external-hedge-policy",
              external_hedge_policy_content_hash:
                "sha256:external-hedge-policy-content",
              external_hedge_policy_rule_count: 0,
              external_hedge_policy_rules: [],
              external_eligible_hedge_instrument_source_product_name:
                "ExternalEligibleHedgeInstrument",
              external_eligible_hedge_instrument_source_product_version: "v1",
              external_eligible_hedge_instrument_source_id:
                "sha256:external-eligible-hedge-instrument",
              external_eligible_hedge_instrument_content_hash:
                "sha256:external-eligible-hedge-instrument-content",
              external_eligible_hedge_instrument_count: 0,
              external_eligible_hedge_instruments: [],
              missing_data_families: [
                "external_hedge_policy",
                "external_eligible_hedge_instrument",
              ],
              blocked_capabilities: [
                "hedge_policy_approval",
                "eligible_instrument_selection",
                "suitability_approval",
                "product_recommendation",
                "treasury_instruction",
                "counterparty_selection",
                "best_execution",
                "oms_acknowledgement",
                "fills",
                "settlement",
                "autonomous_treasury_action",
              ],
              reason_codes: [
                "EXTERNAL_HEDGE_POLICY_FAIL_CLOSED",
                "EXTERNAL_ELIGIBLE_HEDGE_INSTRUMENTS_FAIL_CLOSED",
              ],
            },
            execution_acknowledgement_context: {
              supportability_status: "BLOCKED",
              source_system: "lotus-core",
              source_product_name: "ExternalOrderExecutionAcknowledgement",
              source_product_version: "v1",
              source_id: "sha256:external-order-execution-acknowledgement",
              content_hash:
                "sha256:external-order-execution-acknowledgement-content",
              acknowledgement_count: 0,
              missing_data_families: [
                "external_oms_order_execution_acknowledgement",
              ],
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
              acknowledgements: [],
              reason_codes: [
                "EXTERNAL_OMS_SOURCE_NOT_INGESTED",
                "EXTERNAL_ORDER_EXECUTION_ACKNOWLEDGEMENT_FAIL_CLOSED",
              ],
            },
          },
        },
      },
      {
        alternative_id: "alt_low_turnover",
        label: "Low Turnover Path",
        objective: "Minimize trading while reducing cash drag",
        mandate_fit: "Acceptable",
        method: "MIN_TURNOVER",
        method_status: "READY",
        comparison_metrics: {
          turnover_weight: "0.021",
          cash_weight: "0.045",
          drift_improvement_pct: "0.48",
        },
      },
    ],
    trade_impact: {
      trade_count: 8,
      buy_count: 4,
      trim_count: 3,
      cash_reduction_count: 1,
    },
    constraints: [
      { name: "Asset allocation range", state: "PASS" },
      { name: "Cash range", state: "PASS" },
    ],
  },
};

const executionAcknowledgementResponse = {
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
    missing_data_families: [
      "external_oms_order_execution_acknowledgement",
    ],
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

describe("ConstructionAlternativesPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(getExternalOrderExecutionAcknowledgement).mockResolvedValue(
      executionAcknowledgementResponse,
    );
  });

  it("starts idle and does not claim alternatives before Gateway generation", async () => {
    render(<ConstructionAlternativesPanel portfolio={portfolio} />);

    expect(
      screen.getByRole("heading", { name: "Construction Alternatives" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Construction alternatives have not been generated"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate alternatives" }),
    ).toBeEnabled();
    expect(screen.getAllByText("Not generated").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Status Not generated")).toBeInTheDocument();
    expect(screen.queryByText("Evidence available")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(getExternalOrderExecutionAcknowledgement).toHaveBeenCalledWith({
        portfolio,
      });
    });
  });

  it("renders external OMS acknowledgement supportability through Gateway only", async () => {
    render(<ConstructionAlternativesPanel portfolio={portfolio} />);

    await waitFor(() => {
      expect(getExternalOrderExecutionAcknowledgement).toHaveBeenCalledWith({
        portfolio,
      });
    });
    expect(
      screen.getByRole("heading", { name: "Order acknowledgement evidence" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Support details")).toBeInTheDocument();
    expect(
      screen.getByText("ExternalOrderExecutionAcknowledgement v1"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Record status")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(
      screen.getByText(
        /External order acknowledgement records are not connected/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Order acknowledgement records")).toBeInTheDocument();
    expect(screen.getByText("Order generation")).toBeInTheDocument();
    expect(screen.getByText("Order-system acknowledgement")).toBeInTheDocument();
    expect(screen.getByText("Fill evidence")).toBeInTheDocument();
    expect(screen.getByText("Settlement evidence")).toBeInTheDocument();
    expect(screen.getByText("Runtime posture")).toBeInTheDocument();
    expect(screen.getByText("fail_closed")).toBeInTheDocument();
    expect(screen.getByText(/does not treat this portfolio as OMS-acknowledged/i)).toBeInTheDocument();
    expect(screen.queryByText("Execution ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settled")).not.toBeInTheDocument();
  });

  it("generates alternatives and renders backed construction methods", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(
      readyResponse,
    );

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );

    await waitFor(() => {
      expect(generateDpmConstructionAlternatives).toHaveBeenCalledWith({
        portfolio,
      });
    });
    expect(screen.queryByText("cas_1")).not.toBeInTheDocument();
    expect(screen.queryByText("alt_balanced_transition")).not.toBeInTheDocument();
    expect((await screen.findAllByText("Balanced Transition")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Status Evidence available")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Turnover" })).toBeInTheDocument();
    expect(screen.getAllByText("4.8%").length).toBeGreaterThan(0);
    expect(screen.getByText("Mandate Integrity Checks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Apply Selection" })).toBeEnabled();
    expect(screen.getByText("Construction Authority Evidence")).toBeInTheDocument();
    expect(screen.getByText("ExternalHedgePolicy v1")).toBeInTheDocument();
    expect(screen.getByText("sha256:external-hedge-policy")).toBeInTheDocument();
    expect(screen.getByText("sha256:external-hedge-policy-content")).toBeInTheDocument();
    expect(screen.getByText("Eligible instrument evidence")).toBeInTheDocument();
    expect(
      screen.getByText("ExternalEligibleHedgeInstrument v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Source id: sha256:external-eligible-hedge-instrument"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Evidence hash: sha256:external-eligible-hedge-instrument-content",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Instrument rows: 0")).toBeInTheDocument();
    expect(screen.getByText("Execution acknowledgement evidence")).toBeInTheDocument();
    expect(
      screen.getAllByText("ExternalOrderExecutionAcknowledgement v1").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Source id: sha256:external-order-execution-acknowledgement",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Evidence hash: sha256:external-order-execution-acknowledgement-content",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Acknowledgement rows: 0")).toBeInTheDocument();
    expect(screen.getByText("Hedge policy approval")).toBeInTheDocument();
    expect(screen.getByText("Eligible instrument selection")).toBeInTheDocument();
    expect(screen.getByText("Product recommendation")).toBeInTheDocument();
    expect(screen.getAllByText("Order generation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Order-system acknowledgement").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("External order acknowledgement").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("External hedge policy unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Eligible hedge instrument evidence unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Order acknowledgement evidence unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open evidence pack" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001?mode=proof",
    );
    expect(screen.queryByText("PDF Export")).not.toBeInTheDocument();
  });

  it("shows generating posture until the source response succeeds", async () => {
    let resolveGeneration: ((response: DpmConstructionGatewayResponse) => void) | undefined;
    vi.mocked(generateDpmConstructionAlternatives).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGeneration = resolve;
        }),
    );

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );

    expect(await screen.findByLabelText("Status Generating")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generating alternatives" }),
    ).toBeDisabled();
    expect(screen.queryByText("Evidence available")).not.toBeInTheDocument();

    resolveGeneration?.(readyResponse);
    expect(
      await screen.findByLabelText("Status Evidence available"),
    ).toBeInTheDocument();
  });

  it("keeps a failed generation visibly unavailable without fabricated evidence", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockRejectedValue(
      new Error("Manage construction unavailable"),
    );

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );

    expect(await screen.findByLabelText("Status Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("Construction alternatives unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Evidence available")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate alternatives" }),
    ).toBeEnabled();
  });

  it("shows source blocking posture without a success badge", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue({
      ...readyResponse,
      supportability: {
        ...readyResponse.supportability,
        state: "BLOCKED",
        reason_codes: ["CONSTRUCTION_SOURCE_READINESS_BLOCKED"],
      },
    });

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );

    const header = screen.getByRole("group", {
      name: "Construction Alternatives section header",
    });
    await waitFor(() => {
      expect(within(header).getByLabelText("Status Blocked")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Construction request completed with blocking conditions."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Evidence available")).not.toBeInTheDocument();
  });

  it("selects an alternative through Gateway without client-side decision logic", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(
      readyResponse,
    );
    vi.mocked(selectDpmConstructionAlternative).mockResolvedValue({
      ...readyResponse,
      supportability: {
        ...readyResponse.supportability,
        selected_alternative_id: "alt_balanced_transition",
      },
    });

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );
    await waitFor(() => {
      expect(screen.getAllByText("Balanced Transition").length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    await waitFor(() => {
      expect(selectDpmConstructionAlternative).toHaveBeenCalledWith({
        alternativeSetId: "cas_1",
        alternativeId: "alt_balanced_transition",
      });
    });
    expect(screen.getAllByText("Balanced Transition").length).toBeGreaterThan(0);
    expect(await screen.findByRole("button", { name: "Selected" })).toBeDisabled();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ConstructionAlternativesPanel from "../../src/features/workbench/components/construction-alternatives-panel";
import type {
  DpmConstructionGatewayResponse,
  WorkbenchPortfolio360,
} from "../../src/features/workbench/types";
import {
  generateDpmConstructionAlternatives,
  selectDpmConstructionAlternative,
} from "../../src/features/workbench/api";

vi.mock("../../src/features/workbench/api", () => ({
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

describe("ConstructionAlternativesPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts idle and does not claim alternatives before Gateway generation", () => {
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
    expect(screen.getAllByText("Not Generated").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("Balanced Transition").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Turnover" })).toBeInTheDocument();
    expect(screen.getAllByText("4.8%").length).toBeGreaterThan(0);
    expect(screen.getByText("Mandate Integrity Checks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "Selected" })).toBeDisabled();
  });
});

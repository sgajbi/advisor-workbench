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
        alternative_id: "alt_min_turnover",
        method: "MIN_TURNOVER",
        method_status: "READY",
        comparison_metrics: { turnover_weight: "0.045" },
        objective_trace: [{ term: "turnover" }],
        constraint_trace: [{ constraint: "cash_band" }],
      },
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
    expect(screen.getByText("NOT_GENERATED")).toBeInTheDocument();
  });

  it("generates alternatives through Gateway and renders manage-owned methods", async () => {
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
    expect(screen.getByText("cas_1")).toBeInTheDocument();
    expect(
      screen.getByText("MIN_TURNOVER / alt_min_turnover"),
    ).toBeInTheDocument();
    expect(screen.getByText("turnover weight: 0.045")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select" })).toBeEnabled();
  });

  it("selects an alternative through Gateway without client-side decision logic", async () => {
    vi.mocked(generateDpmConstructionAlternatives).mockResolvedValue(
      readyResponse,
    );
    vi.mocked(selectDpmConstructionAlternative).mockResolvedValue({
      ...readyResponse,
      supportability: {
        ...readyResponse.supportability,
        selected_alternative_id: "alt_min_turnover",
      },
    });

    render(<ConstructionAlternativesPanel portfolio={portfolio} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Generate alternatives" }),
    );
    await screen.findByText("MIN_TURNOVER / alt_min_turnover");
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    await waitFor(() => {
      expect(selectDpmConstructionAlternative).toHaveBeenCalledWith({
        alternativeSetId: "cas_1",
        alternativeId: "alt_min_turnover",
      });
    });
    expect(screen.getAllByText("alt_min_turnover").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Selected" })).toBeDisabled();
  });
});

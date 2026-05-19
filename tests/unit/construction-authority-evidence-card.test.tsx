import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConstructionAuthorityEvidenceCard from "../../src/features/workbench/components/construction-authority-evidence-card";
import { buildConstructionPanelModel } from "../../src/features/workbench/construction-alternatives-view-model";
import type { DpmConstructionGatewayResponse } from "../../src/features/workbench/types";

const constructionResponse: DpmConstructionGatewayResponse = {
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
        diagnostics: {
          authority_context: {
            currency_overlay_context: {
              supportability_status: "BLOCKED",
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
                "treasury_instruction",
                "counterparty_selection",
              ],
              reason_codes: [
                "EXTERNAL_HEDGE_POLICY_FAIL_CLOSED",
                "EXTERNAL_ELIGIBLE_HEDGE_INSTRUMENTS_FAIL_CLOSED",
              ],
            },
            execution_acknowledgement_context: {
              supportability_status: "BLOCKED",
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
    ],
  },
};

describe("ConstructionAuthorityEvidenceCard", () => {
  it("renders source-owned construction authority evidence without execution controls", () => {
    const model = buildConstructionPanelModel(constructionResponse);

    render(<ConstructionAuthorityEvidenceCard model={model} />);

    expect(screen.getByText("Construction Authority Evidence")).toBeInTheDocument();
    expect(screen.getByText("ExternalHedgePolicy v1")).toBeInTheDocument();
    expect(screen.getByText("sha256:external-hedge-policy")).toBeInTheDocument();
    expect(screen.getByText("sha256:external-hedge-policy-content")).toBeInTheDocument();
    expect(screen.getByText("Eligible instrument evidence")).toBeInTheDocument();
    expect(screen.getByText("ExternalEligibleHedgeInstrument v1")).toBeInTheDocument();
    expect(
      screen.getByText("Source id: sha256:external-eligible-hedge-instrument"),
    ).toBeInTheDocument();
    expect(screen.getByText("Execution acknowledgement evidence")).toBeInTheDocument();
    expect(
      screen.getByText("ExternalOrderExecutionAcknowledgement v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Source id: sha256:external-order-execution-acknowledgement",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("External Hedge Policy")).toBeInTheDocument();
    expect(
      screen.getByText("External OMS Order Execution Acknowledgement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Hedge Policy Approval")).toBeInTheDocument();
    expect(screen.getByText("Order Generation")).toBeInTheDocument();
    expect(screen.getByText("OMS Acknowledgement")).toBeInTheDocument();
    expect(screen.getByText("External Hedge Policy Fail Closed")).toBeInTheDocument();
    expect(
      screen.getByText("External Order Execution Acknowledgement Fail Closed"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Route Order")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark Filled")).not.toBeInTheDocument();
    expect(screen.queryByText("Settle")).not.toBeInTheDocument();
  });

  it("does not render when Gateway returns no authority evidence", () => {
    const model = buildConstructionPanelModel(null);
    const { container } = render(<ConstructionAuthorityEvidenceCard model={model} />);

    expect(container).toBeEmptyDOMElement();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualityPolicyCard from "../../src/features/workbench/components/pm-operating-quality-policy-card";
import { buildPmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const policies: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-policy",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    policies: [
      {
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        enabled: true,
        state: "READY",
        as_of_date: "2026-05-13",
        reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
      },
    ],
  },
};

describe("PmOperatingQualityPolicyCard", () => {
  it("renders Manage-owned policy evidence without command controls", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns: null,
    });

    render(<PmOperatingQualityPolicyCard model={model} />);

    expect(screen.getByRole("table", { name: "PM operating quality policies" }))
      .toBeInTheDocument();
    expect(screen.getByText("pmq_sg_dpm / 2026.05")).toBeInTheDocument();
    expect(screen.getAllByText("Enabled").length).toBe(2);
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("2026-05-13")).toBeInTheDocument();
    expect(screen.getByText(/PM_QUALITY_POLICY_APPROVED/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview Score Run/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Persist Fairness/i)).not.toBeInTheDocument();
  });

  it("renders a fail-closed empty policy posture", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: null,
      scoreRuns: null,
    });

    render(<PmOperatingQualityPolicyCard model={model} />);

    expect(screen.getByText("No PM operating quality policy returned")).toBeInTheDocument();
    expect(screen.getByText(/A Manage-owned policy is required/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

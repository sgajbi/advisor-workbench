import { describe, expect, it } from "vitest";

import {
  presentAdvisorCockpitOperatingBoundary,
  presentAdvisorCockpitReadiness,
  type AdvisorCockpitReadinessKind,
} from "../../src/features/proposals/advisor-cockpit-readiness-presentation";

describe("advisor cockpit readiness presentation", () => {
  it.each([
    [
      "overall",
      "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
      "Advisor Cockpit evidence is available for internal preparation.",
    ],
    [
      "integration",
      "SUPPORTED_BY_LOTUS_GATEWAY_RFC0026",
      "Required advisory information is available through the governed access path.",
    ],
    [
      "workstation",
      "CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026",
      "The advisor workspace passed its current source checks.",
    ],
    [
      "data",
      "ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026",
      "Required preparation data is published for internal advisor use.",
    ],
  ] as const)(
    "maps the exact %s readiness contract to advisor language",
    (kind, rawValue, detail) => {
      expect(presentAdvisorCockpitReadiness(kind, rawValue)).toEqual({
        state: "available",
        label: "Available",
        detail,
        tone: "success",
        rawValue,
      });
    },
  );

  it("keeps the source-owned publication block explicit", () => {
    expect(
      presentAdvisorCockpitReadiness("client_publication", "BLOCKED"),
    ).toEqual({
      state: "blocked",
      label: "Blocked",
      detail: "Client-ready publication remains blocked by the source workflow.",
      tone: "danger",
      rawValue: "BLOCKED",
    });
  });

  it.each([
    ["overall", "SOME_NEW_SUPPORTED_CODE"],
    ["data", "READY"],
    ["integration", "ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED"],
    ["workstation", null],
  ] as Array<[AdvisorCockpitReadinessKind, unknown]>)(
    "fails closed for an unrecognized %s readiness value",
    (kind, value) => {
      expect(presentAdvisorCockpitReadiness(kind, value)).toEqual({
        state: "not_reported",
        label: "Not reported",
        detail:
          "A recognized business readiness status is not available from the current source.",
        tone: "default",
        rawValue: typeof value === "string" ? value : null,
      });
    },
  );

  it.each([
    [
      "EXTERNAL_CLIENT_COMMUNICATION",
      "Client communication unavailable",
      "Client outreach remains outside this workspace.",
    ],
    [
      "OMS_ORDER_LIFECYCLE",
      "Order workflow unavailable",
      "Order routing and lifecycle actions remain outside this workspace.",
    ],
    [
      "CLIENT_READY_PUBLICATION",
      "Client publication unavailable",
      "This workspace does not release material for client use.",
    ],
  ])("translates the %s operating boundary", (rawValue, label, detail) => {
    expect(presentAdvisorCockpitOperatingBoundary(rawValue)).toEqual({
      label,
      detail,
      rawValue,
      isRecognized: true,
    });
  });

  it("keeps an unknown operating boundary unavailable and traceable", () => {
    expect(presentAdvisorCockpitOperatingBoundary("NEW_CAPABILITY")).toEqual({
      label: "Additional workflow capability unavailable",
      detail: "The source reports another unsupported capability; see Support details.",
      rawValue: "NEW_CAPABILITY",
      isRecognized: false,
    });
  });
});

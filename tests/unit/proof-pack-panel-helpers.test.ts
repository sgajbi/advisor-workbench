import { describe, expect, it } from "vitest";

import {
  proofPackAvailabilityLabel,
  proofPackAvailabilityTone,
  proofPackBadgeTone,
  proofPackStatePanelCopy,
  proofPackSupportabilityLabel,
  readProofPackAiWorkflowPackStatus,
  readProofPackMarkdown,
  shouldShowProofPackStatePanel,
} from "../../src/features/workbench/proof-pack-panel-helpers";
import type { DpmProofPackGatewayResponse } from "../../src/features/workbench/types";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

const proofPackResponse: DpmProofPackGatewayResponse = {
  correlation_id: "corr-rfc40",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0040",
    state: "READY",
    proof_pack_id: "ppack_1",
    reason_codes: [],
    section_state_counts: { READY: 1 },
    content_hash: "sha256:proof-pack",
    markdown_available: true,
    report_input_available: true,
    ai_evidence_input_available: true,
  },
  data: {
    proof_pack: {
      proof_pack_id: "ppack_1",
    },
  },
};

describe("proof pack panel helpers", () => {
  it("maps proof-pack posture into semantic badge tones", () => {
    expect(proofPackBadgeTone("READY")).toBe("success");
    expect(proofPackBadgeTone("PENDING_REVIEW")).toBe("warn");
    expect(proofPackBadgeTone("BLOCKED")).toBe("danger");
    expect(proofPackBadgeTone("UNKNOWN")).toBe("default");
  });

  it("keeps partial and degraded supportability distinct in business language", () => {
    expect(proofPackSupportabilityLabel("READY")).toBe("Ready");
    expect(proofPackSupportabilityLabel("PARTIAL")).toBe("Partially available");
    expect(proofPackSupportabilityLabel("DEGRADED")).toBe("Degraded");
    expect(proofPackSupportabilityLabel("UNAVAILABLE")).toBe("Unavailable");
  });

  it("keeps unavailable-state copy deterministic and portfolio-scoped", () => {
    expect(proofPackStatePanelCopy("empty", "PB_SG_GLOBAL_BAL_001")).toEqual({
      kind: "empty",
      title: "No evidence pack linked to this portfolio",
      body: "No evidence pack is currently linked to PB_SG_GLOBAL_BAL_001.",
    });
    expect(proofPackStatePanelCopy("blocked", "PB_SG_GLOBAL_BAL_001")).toMatchObject({
      kind: "permission_blocked",
      title: "Evidence handoff is blocked",
    });
    expect(proofPackStatePanelCopy("unsupported", "PB_SG_GLOBAL_BAL_001")).toMatchObject({
      kind: "unavailable",
      title: "Evidence pack is not supported",
    });
    expect(proofPackStatePanelCopy("partial", "PB_SG_GLOBAL_BAL_001")).toMatchObject({
      kind: "partial",
      title: "Evidence pack is unavailable",
    });
  });

  it("shows state panels only for unavailable, blocked, unsupported, empty, or error states", () => {
    expect(shouldShowProofPackStatePanel("ready")).toBe(false);
    expect(shouldShowProofPackStatePanel("partial")).toBe(false);
    expect(shouldShowProofPackStatePanel("empty")).toBe(true);
    expect(shouldShowProofPackStatePanel("blocked")).toBe(true);
    expect(shouldShowProofPackStatePanel("unsupported")).toBe(true);
    expect(shouldShowProofPackStatePanel("unavailable")).toBe(true);
    expect(shouldShowProofPackStatePanel("ready", "Gateway unavailable")).toBe(true);
  });

  it("maps handoff availability without inventing source truth", () => {
    expect(proofPackAvailabilityLabel(true)).toBe("Available");
    expect(proofPackAvailabilityLabel(false)).toBe("Unavailable");
    expect(proofPackAvailabilityTone("Available")).toBe("success");
    expect(proofPackAvailabilityTone("Ready")).toBe("success");
    expect(proofPackAvailabilityTone("Review pending")).toBe("warn");
    expect(proofPackAvailabilityTone("Unavailable")).toBe("danger");
    expect(proofPackAvailabilityTone("Not provided")).toBe("default");
  });

  it("reads markdown from bounded Gateway response fields", () => {
    expect(readProofPackMarkdown({ ...proofPackResponse, markdown: "# Summary" })).toBe("# Summary");
    expect(readProofPackMarkdown({ ...proofPackResponse, data: { markdown: "Gateway summary" } })).toBe(
      "Gateway summary"
    );
    expect(readProofPackMarkdown({ ...proofPackResponse, data: { content: "Gateway content" } })).toBe(
      "Gateway content"
    );
    expect(readProofPackMarkdown(proofPackResponse)).toBe(
      "No summary content is available for this evidence pack."
    );
  });

  it("summarizes AI workflow-pack request status from source-owned review state", () => {
    expect(
      readProofPackAiWorkflowPackStatus(buildDpmAiWorkflowExecution("proof-pack-memo"))
    ).toBe("Awaiting review.");
  });
});

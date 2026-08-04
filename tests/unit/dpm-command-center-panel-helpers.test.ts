import { describe, expect, it } from "vitest";

import {
  dpmCommandCenterBadgeTone,
  dpmCommandCenterStatePanelCopy,
  readDpmWorkflowPackStatus,
  shouldShowDpmCommandCenterStatePanel,
} from "../../src/features/workbench/dpm-command-center-panel-helpers";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

describe("DPM command-center panel helpers", () => {
  it("maps command-center states to semantic badge tones", () => {
    expect(dpmCommandCenterBadgeTone("COMPLETE")).toBe("success");
    expect(dpmCommandCenterBadgeTone("SUCCEEDED")).toBe("success");
    expect(dpmCommandCenterBadgeTone("PENDING_REVIEW")).toBe("warn");
    expect(dpmCommandCenterBadgeTone("EMPTY")).toBe("warn");
    expect(dpmCommandCenterBadgeTone("BLOCKED")).toBe("danger");
    expect(dpmCommandCenterBadgeTone("FAILED")).toBe("danger");
    expect(dpmCommandCenterBadgeTone("HIGH")).toBe("default");
  });

  it("keeps unavailable-state copy deterministic", () => {
    expect(dpmCommandCenterStatePanelCopy("empty")).toEqual({
      kind: "empty",
      title: "No monitoring run for this PM book",
      body: "Run monitoring to request a fresh mandate assessment.",
    });
    expect(dpmCommandCenterStatePanelCopy("partial")).toMatchObject({
      kind: "partial",
      title: "Mandate readiness is partial",
    });
    expect(dpmCommandCenterStatePanelCopy("unsupported")).toMatchObject({
      kind: "unavailable",
      title: "Command center is not supported",
    });
    expect(dpmCommandCenterStatePanelCopy("unavailable")).toMatchObject({
      kind: "partial",
      title: "Mandate health is unavailable",
    });
  });

  it("shows state panels for non-complete or error states only", () => {
    expect(shouldShowDpmCommandCenterStatePanel("complete")).toBe(false);
    expect(shouldShowDpmCommandCenterStatePanel("partial")).toBe(true);
    expect(shouldShowDpmCommandCenterStatePanel("empty")).toBe(true);
    expect(shouldShowDpmCommandCenterStatePanel("unsupported")).toBe(true);
    expect(shouldShowDpmCommandCenterStatePanel("unavailable")).toBe(true);
    expect(shouldShowDpmCommandCenterStatePanel("complete", "Gateway unavailable")).toBe(true);
    expect(shouldShowDpmCommandCenterStatePanel("complete", null, "Run failed")).toBe(true);
  });

  it("reads workflow-pack status from the typed Gateway execution contract", () => {
    expect(readDpmWorkflowPackStatus(undefined)).toBe("NOT_REQUESTED");
    expect(
      readDpmWorkflowPackStatus(buildDpmAiWorkflowExecution("exception-summary"))
    ).toBe("AWAITING_REVIEW");
    expect(
      readDpmWorkflowPackStatus(
        buildDpmAiWorkflowExecution("exception-summary", { reviewState: "ACCEPTED" })
      )
    ).toBe("ACCEPTED");
  });
});

import { describe, expect, it } from "vitest";

import {
  executionEvidenceItemLabel,
  executionEvidenceLineageLabel,
  executionEvidenceReasonLabel,
} from "../../src/copy/execution-evidence-copy";

describe("execution evidence copy", () => {
  it("uses business language for order acknowledgement evidence", () => {
    expect(
      executionEvidenceReasonLabel("EXTERNAL_OMS_SOURCE_NOT_INGESTED"),
    ).toBe("External order acknowledgement records are not connected");
    expect(executionEvidenceItemLabel("oms_acknowledgement")).toBe(
      "Order-system acknowledgement",
    );
    expect(executionEvidenceItemLabel("fills")).toBe("Fill evidence");
  });

  it("fails closed for unknown productive evidence labels", () => {
    expect(executionEvidenceItemLabel("NEW_EXECUTION_CAPABILITY")).toBe(
      "Review required",
    );
  });

  it("uses explicit support labels without altering raw evidence values", () => {
    expect(executionEvidenceLineageLabel("runtime_posture")).toBe(
      "Runtime posture",
    );
    expect(executionEvidenceLineageLabel("new_source_field")).toBe(
      "new_source_field",
    );
  });
});

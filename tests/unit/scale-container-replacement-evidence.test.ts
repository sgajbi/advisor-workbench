import { describe, expect, it } from "vitest";

import { assertContainerReplacement } from "../../scripts/scale/container-replacement-evidence.mjs";

describe("scale container replacement evidence", () => {
  it("records a disposable replacement only when the container identity changes", () => {
    expect(
      assertContainerReplacement({
        service: "workbench-a",
        beforeContainerId: "original-container",
        afterContainerId: "replacement-container",
      }),
    ).toEqual({
      service: "workbench-a",
      before_container_id: "original-container",
      after_container_id: "replacement-container",
      container_identity_changed: true,
    });
  });

  it.each([
    ["", "replacement-container", "original container"],
    ["original-container", "", "replacement container"],
    ["same-container", "same-container", "without disposable-container replacement"],
  ])(
    "rejects incomplete or unchanged container identity evidence",
    (beforeContainerId, afterContainerId, expectedMessage) => {
      expect(() =>
        assertContainerReplacement({
          service: "workbench-a",
          beforeContainerId,
          afterContainerId,
        }),
      ).toThrow(expectedMessage);
    },
  );
});

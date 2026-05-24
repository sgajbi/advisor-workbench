import { describe, expect, it } from "vitest";

import {
  buildManageModeHref,
  buildManageModeItems,
  getManageModeDefinition,
  normalizeManageMode,
} from "../../src/features/workbench/manage-workspace-navigation";

describe("manage workspace navigation", () => {
  it("normalizes unknown or mixed-case requested modes to governed manage modes", () => {
    expect(normalizeManageMode("WAVES")).toBe("waves");
    expect(normalizeManageMode(" quality ")).toBe("quality");
    expect(normalizeManageMode("client-contact")).toBe("overview");
    expect(normalizeManageMode(undefined)).toBe("overview");
  });

  it("builds stable manage mode links without leaking raw routing policy into the page", () => {
    expect(buildManageModeHref("PB SG/001", "overview")).toBe("/workbench/PB%20SG%2F001");
    expect(buildManageModeHref("PB SG/001", "proof")).toBe(
      "/workbench/PB%20SG%2F001?mode=proof"
    );
  });

  it("builds dense rail items with one active front-office mode", () => {
    const items = buildManageModeItems("PB_1", "reviews");

    expect(items.map((item) => item.key)).toEqual([
      "overview",
      "mandate",
      "waves",
      "construction",
      "memory",
      "copilot",
      "quality",
      "reviews",
      "proof",
    ]);
    expect(items.filter((item) => item.active).map((item) => item.key)).toEqual(["reviews"]);
    expect(items.find((item) => item.key === "reviews")).toMatchObject({
      label: "Reviews",
      detail: "Outcome review",
      href: "/workbench/PB_1?mode=reviews",
    });
  });

  it("keeps mode titles in private-banking language", () => {
    expect(getManageModeDefinition("mandate").title).toBe("Mandate Health");
    expect(getManageModeDefinition("copilot").title).toBe("PM Copilot Workspace");
    expect(getManageModeDefinition("construction").description).toBe(
      "Supported construction alternatives for advisor and PM review."
    );
  });
});

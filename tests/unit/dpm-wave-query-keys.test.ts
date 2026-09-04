import { describe, expect, it } from "vitest";

import {
  DPM_WAVE_COMMAND_SCOPE,
  dpmWaveMutationKeys,
  dpmWaveQueryKeys,
} from "../../src/features/workbench/dpm-wave-query-keys";

const context = {
  asOfDate: "2026-05-03",
  triggerType: "EXPLICIT_PORTFOLIO_LIST",
  limit: 10,
  offset: 0,
};

describe("DPM wave Query identity", () => {
  it("keeps list, wave, items, and proof evidence independently addressable", () => {
    const keys = [
      dpmWaveQueryKeys.list(context),
      dpmWaveQueryKeys.wave("wave-1"),
      dpmWaveQueryKeys.items("wave-1"),
      dpmWaveQueryKeys.proofPack("wave-1"),
      dpmWaveQueryKeys.confirmationLock("portfolio-1"),
    ];

    expect(new Set(keys.map((key) => JSON.stringify(key)))).toHaveLength(5);
    expect(dpmWaveQueryKeys.items("wave-1")).not.toEqual(
      dpmWaveQueryKeys.items("wave-2"),
    );
  });

  it("includes every source-list request dimension in its identity", () => {
    for (const variant of [
      { ...context, asOfDate: "2026-05-04" },
      { ...context, triggerType: "CAMPAIGN" },
      { ...context, limit: 20 },
      { ...context, offset: 10 },
    ]) {
      expect(dpmWaveQueryKeys.list(variant)).not.toEqual(
        dpmWaveQueryKeys.list(context),
      );
    }
  });

  it("keeps commands and AI evidence under one governed mutation family", () => {
    const keys = [
      dpmWaveMutationKeys.command(),
      dpmWaveMutationKeys.pmMemo(),
      dpmWaveMutationKeys.operationsBrief(),
    ];

    expect(new Set(keys.map((key) => JSON.stringify(key)))).toHaveLength(3);
    expect(
      keys.every((key) => key.slice(0, 3).join("/") === "workbench/dpm-waves/mutation"),
    ).toBe(true);
    expect(DPM_WAVE_COMMAND_SCOPE).toBe("workbench-dpm-wave-command");
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  createLoadGeneratorResourceTracker,
  parseDockerStatsLines,
  summarizeContainerResourceSamples,
} from "../../scripts/scale/phase-resource-evidence.mjs";

describe("scale phase resource evidence", () => {
  it("parses Docker Desktop stats despite terminal cursor-control output", () => {
    expect(
      parseDockerStatsLines([
        '\u001b[H{"Name":"workbench-a","CPUPerc":"12.5%"}',
        "^",
        "",
      ]),
    ).toEqual([{ Name: "workbench-a", CPUPerc: "12.5%" }]);
  });

  it("rejects malformed JSON-shaped stats instead of fabricating a sample", () => {
    expect(() => parseDockerStatsLines(['\u001b[H{"Name":}'])).toThrow();
  });

  it("retains per-container CPU and memory peaks from concurrent samples", () => {
    expect(
      summarizeContainerResourceSamples([
        { Name: "workbench-a", CPUPerc: "12.50%", MemUsage: "128MiB / 2GiB" },
        { Name: "workbench-a", CPUPerc: "47.25%", MemUsage: "144.5MiB / 2GiB" },
        { Name: "workbench-b", CPUPerc: "31%", MemUsage: "0.5GiB / 2GiB" },
      ]),
    ).toEqual([
      {
        name: "workbench-a",
        cpu_peak_percent: 47.25,
        memory_peak_bytes: 144.5 * 1024 ** 2,
        sample_count: 2,
      },
      {
        name: "workbench-b",
        cpu_peak_percent: 31,
        memory_peak_bytes: 0.5 * 1024 ** 3,
        sample_count: 1,
      },
    ]);
  });

  it("records the host Node load generator instead of attributing its cost to containers", () => {
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(300);
    const cpuUsage = vi
      .fn()
      .mockReturnValueOnce({ user: 10_000, system: 2_000 })
      .mockReturnValueOnce({ user: 100_000, system: 20_000 });
    const memoryUsage = vi
      .fn()
      .mockReturnValueOnce({ rss: 100 })
      .mockReturnValueOnce({ rss: 140 })
      .mockReturnValueOnce({ rss: 120 });
    const freeMemory = vi
      .fn()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(800)
      .mockReturnValueOnce(900);
    const loadAverage = vi
      .fn()
      .mockReturnValueOnce([1, 2, 3])
      .mockReturnValueOnce([2, 3, 4]);
    const tracker = createLoadGeneratorResourceTracker({
      now,
      cpuUsage,
      memoryUsage,
      freeMemory,
      loadAverage,
      logicalCpuCount: () => 8,
    });

    tracker.sample();
    expect(tracker.finish()).toEqual({
      process: "host-node-load-generator",
      duration_ms: 200,
      cpu_user_ms: 100,
      cpu_system_ms: 20,
      cpu_core_equivalents: 0.6,
      rss_peak_bytes: 140,
      host_logical_cpu_count: 8,
      host_free_memory_min_bytes: 800,
      host_load_average_start: [1, 2, 3],
      host_load_average_end: [2, 3, 4],
    });
  });
});

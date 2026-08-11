import type { ChildProcess } from "node:child_process";

export interface ContainerResourcePeak {
  name: string;
  cpu_peak_percent: number;
  memory_peak_bytes: number;
  sample_count: number;
}

export interface LoadGeneratorResourceEvidence {
  process: "host-node-load-generator";
  duration_ms: number;
  cpu_user_ms: number;
  cpu_system_ms: number;
  cpu_core_equivalents: number;
  rss_peak_bytes: number;
  host_logical_cpu_count: number;
  host_free_memory_min_bytes: number;
  host_load_average_start: number[];
  host_load_average_end: number[];
}

export function createLoadGeneratorResourceTracker(input?: {
  now?: () => number;
  cpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage;
  memoryUsage?: () => { rss: number };
  freeMemory?: () => number;
  loadAverage?: () => number[];
  logicalCpuCount?: () => number;
}): {
  sample(): void;
  finish(): LoadGeneratorResourceEvidence;
};

export function summarizeContainerResourceSamples(
  samples: Array<Record<string, unknown>>,
): ContainerResourcePeak[];

export function parseDockerStatsLines(
  lines: string[],
): Array<Record<string, string>>;

export function stopMonitoredProcess(
  child: ChildProcess,
  options?: {
    gracefulTimeoutMs?: number;
    forceTimeoutMs?: number;
  },
): Promise<void>;

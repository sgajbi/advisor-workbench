import { cpus, freemem, loadavg } from "node:os";
import { once } from "node:events";

const MEMORY_UNITS = new Map([
  ["B", 1],
  ["KiB", 1024],
  ["MiB", 1024 ** 2],
  ["GiB", 1024 ** 3],
]);

export function createLoadGeneratorResourceTracker({
  now = () => performance.now(),
  cpuUsage = (previous) => process.cpuUsage(previous),
  memoryUsage = () => process.memoryUsage(),
  freeMemory = () => freemem(),
  loadAverage = () => loadavg(),
  logicalCpuCount = () => cpus().length,
} = {}) {
  const startedAtMs = now();
  const startedCpu = cpuUsage();
  const startedLoadAverage = loadAverage();
  let peakRssBytes = 0;
  let minimumHostFreeMemoryBytes = Number.POSITIVE_INFINITY;

  const sample = () => {
    peakRssBytes = Math.max(peakRssBytes, memoryUsage().rss);
    minimumHostFreeMemoryBytes = Math.min(
      minimumHostFreeMemoryBytes,
      freeMemory(),
    );
  };
  sample();

  return {
    sample,
    finish() {
      sample();
      const durationMs = Math.max(now() - startedAtMs, Number.EPSILON);
      const cpuDelta = cpuUsage(startedCpu);
      return {
        process: "host-node-load-generator",
        duration_ms: durationMs,
        cpu_user_ms: cpuDelta.user / 1_000,
        cpu_system_ms: cpuDelta.system / 1_000,
        cpu_core_equivalents:
          (cpuDelta.user + cpuDelta.system) / (durationMs * 1_000),
        rss_peak_bytes: peakRssBytes,
        host_logical_cpu_count: logicalCpuCount(),
        host_free_memory_min_bytes: minimumHostFreeMemoryBytes,
        host_load_average_start: startedLoadAverage,
        host_load_average_end: loadAverage(),
      };
    },
  };
}

export function summarizeContainerResourceSamples(samples) {
  const peaks = new Map();
  for (const sample of samples) {
    const name = String(sample.Name ?? sample.name ?? "unknown");
    const current = peaks.get(name) ?? {
      name,
      cpu_peak_percent: 0,
      memory_peak_bytes: 0,
      sample_count: 0,
    };
    current.cpu_peak_percent = Math.max(
      current.cpu_peak_percent,
      parsePercentage(sample.CPUPerc),
    );
    current.memory_peak_bytes = Math.max(
      current.memory_peak_bytes,
      parseMemoryUsage(sample.MemUsage),
    );
    current.sample_count += 1;
    peaks.set(name, current);
  }
  return [...peaks.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function parseDockerStatsLines(lines) {
  return lines.flatMap((line) => {
    const start = line.indexOf("{");
    const end = line.lastIndexOf("}");
    if (start === -1 || end < start) {
      return [];
    }
    return [JSON.parse(line.slice(start, end + 1))];
  });
}

export async function stopMonitoredProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const closed = once(child, "close");
  child.kill();
  await closed;
}

function parsePercentage(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMemoryUsage(value) {
  const used = String(value ?? "").split("/")[0]?.trim() ?? "";
  const match = /^(\d+(?:\.\d+)?)\s*(B|KiB|MiB|GiB)$/.exec(used);
  if (!match) {
    return 0;
  }
  return Number.parseFloat(match[1]) * MEMORY_UNITS.get(match[2]);
}

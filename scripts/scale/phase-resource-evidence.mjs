import { cpus, freemem, loadavg } from "node:os";

const DEFAULT_GRACEFUL_CLOSE_TIMEOUT_MS = 5_000;
const DEFAULT_FORCED_CLOSE_TIMEOUT_MS = 5_000;

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

export async function stopMonitoredProcess(
  child,
  {
    gracefulTimeoutMs = DEFAULT_GRACEFUL_CLOSE_TIMEOUT_MS,
    forceTimeoutMs = DEFAULT_FORCED_CLOSE_TIMEOUT_MS,
  } = {},
) {
  if (hasProcessClosed(child)) {
    return;
  }
  assertPositiveTimeout(gracefulTimeoutMs, "gracefulTimeoutMs");
  assertPositiveTimeout(forceTimeoutMs, "forceTimeoutMs");

  if (await signalAndWaitForClose(child, undefined, gracefulTimeoutMs)) {
    return;
  }
  if (hasProcessClosed(child)) {
    return;
  }
  if (await signalAndWaitForClose(child, "SIGKILL", forceTimeoutMs)) {
    return;
  }
  throw new Error(
    `resource monitor did not close within ${gracefulTimeoutMs}ms after SIGTERM or ${forceTimeoutMs}ms after SIGKILL`,
  );
}

function signalAndWaitForClose(child, signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      child.off("close", onClose);
      child.off("error", onError);
    };
    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback(value);
    };
    const onClose = () => finish(resolve, true);
    const onError = (error) => finish(reject, error);
    const timer = setTimeout(() => finish(resolve, false), timeoutMs);

    child.once("close", onClose);
    child.once("error", onError);
    if (hasProcessClosed(child)) {
      onClose();
      return;
    }
    try {
      if (signal) {
        child.kill(signal);
      } else {
        child.kill();
      }
    } catch (error) {
      finish(reject, error);
    }
  });
}

function hasProcessClosed(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function assertPositiveTimeout(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite duration.`);
  }
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

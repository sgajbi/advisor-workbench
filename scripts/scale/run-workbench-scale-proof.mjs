import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import {
  parseUpstreamAttemptChain,
  resolveSuccessfulTerminalUpstream,
} from "./upstream-evidence.mjs";

const composeFile = "docker-compose.scale-proof.yml";
const baseUrl = "http://127.0.0.1:3090";
const image = process.env.WORKBENCH_SCALE_IMAGE ?? "lotus-workbench:scale-proof";
const skipBuild = process.env.SCALE_PROOF_SKIP_BUILD === "1";
const keepStack = process.env.SCALE_PROOF_KEEP_STACK === "1";
const thresholds = {
  requestCount: 240,
  concurrency: 12,
  p95Ms: 1_500,
  baselineMaxErrorRate: 0,
  replacementMaxErrorRate: 0.02,
  recoveryMaxErrorRate: 0,
};

let evidence;
try {
  if (!skipBuild) {
    run("docker", [
      "build",
      "--build-arg",
      "WORKBENCH_DEPLOYMENT_ID=scale-proof-issue-619",
      "-t",
      image,
      ".",
    ]);
  }
  compose(["up", "-d", "--no-build"]);
  await waitForHttp(`${baseUrl}/api/health/ready`, 120_000);

  const imageIdentity = inspectImageIdentity();
  if (imageIdentity.a !== imageIdentity.b) {
    throw new Error("Workbench replicas do not use the same immutable image identity.");
  }

  const actionId = `scale-proof-${Date.now()}`;
  const persisted = await requestJson("/api/bff/api/v1/scale-proof/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action_id: actionId }),
  });
  if (persisted.status !== 201 || persisted.body.persisted_action_id !== actionId) {
    throw new Error("Source-owned fixture action was not persisted truthfully.");
  }
  const crossReplicaRead = await readFromDifferentReplica(
    persisted.upstream,
    actionId,
  );

  const baseline = await runLoadPhase("baseline");
  assertPhase(baseline, thresholds.baselineMaxErrorRate, true);

  compose(["stop", "workbench-a"]);
  const replacement = await runLoadPhase("one-replica-unavailable");
  assertPhase(replacement, thresholds.replacementMaxErrorRate, false);
  const persistedDuringLoss = await requestJson("/api/bff/api/v1/scale-proof/state");
  if (persistedDuringLoss.body.persisted_action_id !== actionId) {
    throw new Error("Persisted source state was lost with a Workbench replica.");
  }

  compose(["up", "-d", "--no-deps", "--no-build", "workbench-a"]);
  await waitForContainerHealth("workbench-a", 60_000);
  const recovery = await runLoadPhase("replacement-recovered");
  assertPhase(recovery, thresholds.recoveryMaxErrorRate, true);

  evidence = {
    schema_version: "lotus-workbench.scale-proof.v1",
    issue: 619,
    generated_at: new Date().toISOString(),
    certification_posture: "engineering_regression_non_certifying",
    topology: {
      workbench_replicas: 2,
      session_affinity: false,
      load_balancer: "nginx-1.28.3-stable-alpine",
      load_balancer_digest:
        "sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236",
      gateway: "bounded-source-owned-fixture",
      workbench_image: image,
      workbench_image_identity: imageIdentity.a,
    },
    workload: thresholds,
    source_persistence: {
      action_id: actionId,
      persisted_version: persisted.body.persisted_version,
      mutation_upstream: persisted.upstream,
      cross_replica_read_upstream: crossReplicaRead.upstream,
      retained_during_replica_loss: true,
    },
    phases: [baseline, replacement, recovery],
    resources: collectResourceEvidence(),
    explicit_non_claims: [
      "production_high_availability",
      "disaster_recovery",
      "bank_capacity",
      "multi_region",
      "production_identity",
    ],
    result: "passed",
  };
  const paths = writeEvidence(evidence);
  console.log(`Workbench scale proof passed. JSON: ${paths.json}`);
  console.log(`Workbench scale proof summary: ${paths.markdown}`);
} finally {
  if (!keepStack) {
    compose(["down", "-v", "--remove-orphans"], { allowFailure: true });
  }
}

async function runLoadPhase(name) {
  const results = [];
  let nextIndex = 0;
  const workers = Array.from({ length: thresholds.concurrency }, async () => {
    while (nextIndex < thresholds.requestCount) {
      nextIndex += 1;
      const startedAt = performance.now();
      try {
        const response = await fetch(
          `${baseUrl}/api/bff/api/v1/scale-proof/state`,
          { cache: "no-store", signal: globalThis.AbortSignal.timeout(5_000) },
        );
        await response.arrayBuffer();
        const upstreamHeader = response.headers.get("x-workbench-upstream");
        results.push({
          ok: response.ok,
          status: response.status,
          latency_ms: performance.now() - startedAt,
          upstream_attempts: parseUpstreamAttemptChain(upstreamHeader),
          terminal_upstream: resolveSuccessfulTerminalUpstream(
            upstreamHeader,
            response.ok,
          ),
        });
      } catch {
        results.push({
          ok: false,
          status: 0,
          latency_ms: performance.now() - startedAt,
          upstream_attempts: [],
          terminal_upstream: "network-error",
        });
      }
    }
  });
  await Promise.all(workers);
  const latencies = results.map(({ latency_ms }) => latency_ms).sort((a, b) => a - b);
  const errors = results.filter(({ ok }) => !ok).length;
  const successfulResults = results.filter(({ ok }) => ok);
  const upstreams = Object.fromEntries(
    [...new Set(successfulResults.map(({ terminal_upstream }) => terminal_upstream))].map((upstream) => [
      upstream,
      successfulResults.filter((result) => result.terminal_upstream === upstream).length,
    ]),
  );
  return {
    name,
    requests: results.length,
    errors,
    error_rate: errors / results.length,
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    max_ms: Math.max(...latencies),
    upstreams,
    retried_requests: results.filter(({ upstream_attempts }) => upstream_attempts.length > 1)
      .length,
  };
}

function assertPhase(phase, maxErrorRate, requireTwoReplicas) {
  if (phase.error_rate > maxErrorRate) {
    throw new Error(
      `${phase.name} error rate ${phase.error_rate} exceeded ${maxErrorRate}.`,
    );
  }
  if (phase.p95_ms > thresholds.p95Ms) {
    throw new Error(`${phase.name} p95 ${phase.p95_ms}ms exceeded ${thresholds.p95Ms}ms.`);
  }
  const successfulUpstreams = Object.keys(phase.upstreams).filter(
    (upstream) => upstream !== "unknown" && upstream !== "network-error",
  );
  if (requireTwoReplicas && successfulUpstreams.length < 2) {
    throw new Error(`${phase.name} did not distribute requests across two replicas.`);
  }
}

async function requestJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    signal: globalThis.AbortSignal.timeout(5_000),
  });
  return {
    status: response.status,
    upstream: resolveSuccessfulTerminalUpstream(
      response.headers.get("x-workbench-upstream"),
      response.ok,
    ),
    body: await response.json(),
  };
}

async function readFromDifferentReplica(mutationUpstream, actionId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await requestJson("/api/bff/api/v1/scale-proof/state");
    if (
      current.status === 200 &&
      current.body.persisted_action_id === actionId &&
      current.upstream !== mutationUpstream
    ) {
      return current;
    }
  }
  throw new Error("Could not prove persisted state through a different Workbench replica.");
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: globalThis.AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // The bounded startup loop retains no failure as success evidence.
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function waitForContainerHealth(service, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const id = compose(["ps", "-q", service], { capture: true }).trim();
    if (id) {
      const status = run(
        "docker",
        ["inspect", "--format", "{{.State.Health.Status}}", id],
        { capture: true },
      ).trim();
      if (status === "healthy") {
        return;
      }
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for healthy ${service}.`);
}

function inspectImageIdentity() {
  return Object.fromEntries(
    ["a", "b"].map((suffix) => {
      const id = compose(["ps", "-q", `workbench-${suffix}`], { capture: true }).trim();
      return [
        suffix,
        run("docker", ["inspect", "--format", "{{.Image}}", id], {
          capture: true,
        }).trim(),
      ];
    }),
  );
}

function collectResourceEvidence() {
  const containerIds = compose(["ps", "-q"], { capture: true })
    .split(/\r?\n/)
    .filter(Boolean);
  if (containerIds.length === 0) {
    return [];
  }
  return run(
    "docker",
    ["stats", "--no-stream", "--format", "{{json .}}", ...containerIds],
    { capture: true },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeEvidence(result) {
  const timestamp = result.generated_at.replace(/[:.]/g, "-");
  const directory = join("output", "scale-proof");
  mkdirSync(directory, { recursive: true });
  const json = join(directory, `workbench-scale-proof-${timestamp}.json`);
  const markdown = join(directory, `workbench-scale-proof-${timestamp}.md`);
  writeFileSync(json, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(
    markdown,
    [
      "# Workbench Scale Proof",
      "",
      `- Result: ${result.result}`,
      `- Generated: ${result.generated_at}`,
      `- Image identity: \`${result.topology.workbench_image_identity}\``,
      `- Posture: ${result.certification_posture}`,
      "",
      "| Phase | Requests | Errors | Error rate | p95 ms | Upstreams |",
      "| --- | ---: | ---: | ---: | ---: | --- |",
      ...result.phases.map(
        (phase) =>
          `| ${phase.name} | ${phase.requests} | ${phase.errors} | ${(phase.error_rate * 100).toFixed(2)}% | ${phase.p95_ms.toFixed(1)} | ${Object.keys(phase.upstreams).join(", ")} |`,
      ),
      "",
      "This is engineering regression evidence, not production HA, DR, bank-capacity, multi-region, or production-identity certification.",
      "",
    ].join("\n"),
    "utf8",
  );
  return { json, markdown };
}

function percentile(sorted, percentileValue) {
  return sorted[Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)];
}

function compose(args, options) {
  return run("docker", ["compose", "-f", composeFile, ...args], options);
}

function run(command, args, { allowFailure = false, capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, WORKBENCH_SCALE_IMAGE: image },
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr ?? ""}`,
    );
  }
  return capture ? result.stdout ?? "" : "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

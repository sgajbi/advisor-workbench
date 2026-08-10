# Workbench Scalability And Availability Decision

- Status: in progress
- Owner: Workbench architecture maintainers
- GitHub issue: #619
- Decision date: 2026-08-10
- Next review: 2026-09-10
- Machine-readable evidence: [`workbench-runtime-state-inventory.v1.json`](workbench-runtime-state-inventory.v1.json)

## Decision

Workbench remains a self-hosted Next.js standalone application on the exact, governed Node runtime.
It will scale by running the same immutable production image as multiple disposable replicas behind
a standard load balancer. Gateway and source services retain portfolio, workflow, entitlement, and
persisted-action authority. Workbench must not require session affinity or process-local business
state.

This decision strengthens the existing mature stack. It does not introduce Redis, Kubernetes
manifests, a service mesh, an application session store, or another telemetry library without a
separately evidenced requirement.

## State Ownership

The runtime-state inventory is an allowlist, not a general permission to retain state. Every
module-scope mutable holder must be detected, classified, bounded, owner-reviewed, and explicitly
non-authoritative. The allowed categories are:

1. immutable lookup or configuration derived from source code and process-start configuration;
2. browser-ephemeral state that never acts as server or persisted authority;
3. short-lived browser in-flight coalescing that deletes entries on settlement;
4. idempotent process initialization;
5. per-instance telemetry that is bounded and aggregated outside the application by the platform
   metrics stack.

Server-rendered portfolio reads now bypass the module response cache. Each render recontacts Gateway,
so two replicas cannot disagree because one process retained an older URL response. Client-side reuse
remains a presentation optimization and cannot create source truth.

Analytics counters and histograms retain bounded aggregate series independently from a 1,024-event
diagnostic ring. Attention deduplication and panel-failure tracking are bounded, metric contexts come
from the reviewed surface registry, and source prose is reduced to a closed reason vocabulary. A
separate dropped-series counter makes budget exhaustion visible without disrupting business flows.

## Framework Cache And Version-Skew Posture

Workbench does not use App Router Server Actions, `unstable_cache`, on-demand revalidation, ISR, or
Cache Components for source-owned business data. Gateway/BFF and direct server reads use `no-store`.
Therefore the current product does not need a shared Next data cache or Server Action encryption key.
A deterministic source gate will reject unreviewed introduction of those features.

Next.js recommends a consistent build, a deployment identifier for rolling-version protection, and
shared cache coordination only when the application uses cache features that require it. Workbench
will add deterministic build/deployment identity and prove rolling replacement without inventing a
shared-cache dependency.

## Health, Readiness, And Downstream Failure

Liveness will prove that the Workbench process can serve HTTP. Readiness will prove that the exact
build and required runtime configuration are valid. Gateway degradation must not fabricate success;
it should remain visible through bounded BFF failure and panel-level recovery. A Gateway outage does
not automatically make the static Workbench shell unsafe to serve, so dependency health will be
observable separately instead of removing every otherwise healthy replica by default.

Every BFF call requires an explicit timeout. Mutations are not retried automatically. A timeout must
return a truthful, non-cacheable failure and the UI must confirm success only after source persistence
and refresh.

## Observability And Scale Signals

`/api/metrics` is per-instance evidence. The application owns bounded request count, latency,
error, panel-state, dependency, and process resource instrumentation. Shared Prometheus scraping,
Grafana aggregation, alert routing, and fleet dashboards remain `lotus-platform` responsibilities.
Metric labels use closed business-safe vocabularies; source warning prose, portfolio identifiers,
client identifiers, actor identifiers, and correlation values are not metric dimensions.

Capacity proof will record workload, warm-up, duration, concurrency or arrival rate, representative
journeys, test data, p95/p99, error rate, Workbench/Gateway/downstream attribution, target resources,
and load-generator resources. A developer or GitHub-hosted run is regression evidence, not a bank
production capacity claim.

## Deployment And Rollback Inputs

The deployment owner must supply:

1. the same image digest and deployment identifier to every replica in a rollout cohort;
2. at least two replicas for availability claims;
3. no sticky-session requirement;
4. readiness removal and a bounded termination grace period before forced stop;
5. CPU and memory requests/limits plus scaling signals based on measured saturation;
6. immutable-image rollback to the last exact-main releasable digest;
7. correlation propagation and per-instance scrape discovery.

Environment-specific orchestration manifests belong in their owning platform repository. This
Workbench decision defines application requirements and test evidence only.

## Required Proof Before Certification

1. the state inventory and framework-feature gate pass;
2. two identical production images distribute Gateway-backed reads without affinity;
3. one persisted action remains truthful across source refresh and replica replacement;
4. loss and replacement of one instance remain inside the agreed error and interruption thresholds;
5. BFF timeout and partial failure paths remain explicit;
6. workload thresholds fail automation when breached and retain resource evidence;
7. full security, SBOM, browser, Docker parity, PR, and exact-main lanes pass;
8. merged documentation and wiki truth are published with strict parity.

## Explicit Non-Claims

This in-progress decision does not certify production HA, disaster recovery, production identity,
multi-region operation, bank-wide capacity, or approval by a bank architecture, cyber, operations,
or procurement function.

## Primary Sources

1. [Next.js self-hosting and multi-instance guidance](https://nextjs.org/docs/app/guides/self-hosting)
2. [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
3. [Kubernetes rolling Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
4. [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
5. [Prometheus histogram practices](https://prometheus.io/docs/practices/histograms/)
6. [`lotus-platform` Scalability and Availability Standard](https://github.com/sgajbi/lotus-platform/blob/main/docs/standards/Scalability%20and%20Availability%20Standard.md)
7. [`lotus-platform` Platform Observability Standards](https://github.com/sgajbi/lotus-platform/blob/main/docs/standards/Platform%20Observability%20Standards.md)

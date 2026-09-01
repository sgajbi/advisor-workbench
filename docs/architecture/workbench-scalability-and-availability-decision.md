# Workbench Scalability And Availability Decision

- Status: implemented engineering proof; protected PR and exact-main evidence pending
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

Portfolio transport has no module response cache. Each server render recontacts Gateway, so two
replicas cannot disagree because one process retained an older URL response. In the browser, the
application-owned TanStack Query client is the sole owner of Portfolio shell and summary-detail
reuse: source-complete keys, the governed 30-second stale policy, five-minute garbage collection,
explicit invalidation, and cancellable `no-store` BFF reads bound reuse to the selected review
context. A stale or failed refetch retains the prior confirmed response as prior evidence; it does
not relabel that response as newly source-confirmed.

Performance Risk uses that same application-owned Query client for its five primary Gateway reads
and on-demand series detail. Complete portfolio, window, basis, benchmark, currency, attribution,
and series-shape keys fence concurrent and obsolete responses. Fresh mode revisits reuse exact
source-admitted evidence; stale revisits revalidate before the screen presents the evidence as
current. Source-declared failure states and identity-mismatched responses remain non-reusable.
There is no parallel hook-local response cache or request-sequence state machine.

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
now requires deterministic `WORKBENCH_DEPLOYMENT_ID` input outside development and proves replica
replacement without inventing a shared-cache dependency. Production-image builds fail without that
input, and readiness compares the runtime value with the identity embedded by the Next build so an
operator override cannot present a mismatched rollout cohort as ready.

## Health, Readiness, And Downstream Failure

`/api/health/live` proves that the Workbench process can serve HTTP. `/api/health/ready` proves that
the exact build and required runtime configuration are valid. Gateway degradation must not fabricate success;
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

The repository-owned scale proof records workload, duration, concurrency, representative
journeys, test data, p95/p99, error rate, Workbench/Gateway/downstream attribution, target resources,
and load-generator resources. Its bounded regression uses 240 requests per phase at concurrency 12,
including baseline, one-replica-unavailable, and recovered phases. A developer or GitHub-hosted run
is regression evidence, not a bank production capacity claim.

## Implemented Engineering Proof

`npm run scale:proof` runs two replicas of the same hardened production image behind the
digest-pinned stable NGINX validation balancer. The harness requires no session affinity, proves
both replicas receive requests, persists a mutation in the source fixture, reads it through the
other replica, stops and removes one replica, verifies the source record remains available,
creates a replacement container, asserts its container identity changed, and proves traffic
distribution recovers. Successful distribution counts the terminal
replica in each NGINX attempt chain, so retrying a failed replica through one healthy process cannot
masquerade as two serving replicas. The harness fails on image-identity drift, missing distribution,
unchanged replacement-container identity, lost persistence, excessive errors, or p95 latency above
the governed threshold.

The proof emits JSON and Markdown under `output/scale-proof/`. It streams container CPU and memory
samples concurrently during every workload phase and records the host Node load generator's CPU,
RSS, and host-resource posture for the same phase, rather than relying on a terminal idle snapshot.
It labels itself `engineering_regression_non_certifying`. The NGINX image is a mature, official,
digest-pinned validation dependency, scanned separately in protected CI; it is not a Workbench
production orchestration decision.

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

## Required Proof Before Production Certification

1. the implemented engineering proof must remain green on the exact PR and exact-main image;
2. platform-owned production manifests must provide replica, rollout, resource, scrape-discovery,
   termination, rollback, and disruption controls without adding sticky sessions;
3. representative production-like load, soak, saturation, dependency-degradation, and recovery
   exercises must establish environment-specific service objectives and scaling thresholds;
4. production identity, secret, network, observability, backup, disaster-recovery, and operational
   ownership evidence must pass their separate controls;
5. merged documentation and wiki truth must remain published with strict parity.

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

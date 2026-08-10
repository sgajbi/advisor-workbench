import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("Workbench scale-proof governance", () => {
  it("uses two identical hardened Workbench replicas without session affinity", () => {
    const compose = read("docker-compose.scale-proof.yml");
    const nginx = read("scripts", "scale", "nginx.conf");

    expect(compose).toContain("x-workbench: &workbench");
    expect(compose.match(/<<: \*workbench/g)).toHaveLength(2);
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toContain("cap_drop:");
    expect(nginx).toContain("least_conn;");
    expect(nginx).toContain("proxy_next_upstream_tries 2;");
    expect(nginx).not.toMatch(/ip_hash|sticky|hash\s+\$cookie/i);
  });

  it("pins mature official images and isolates the non-certifying source fixture", () => {
    const compose = read("docker-compose.scale-proof.yml");
    const fixture = read("scripts", "scale", "gateway-fixture.mjs");

    expect(compose).toContain(
      "nginx:1.28.3-alpine3.23@sha256:a8b39bd9cf0f83869a2162827a0caf6137ddf759d50a171451b335cecc87d236",
    );
    expect(compose).toContain(
      "node:22.23.1-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3",
    );
    expect(fixture).toContain('request.url === "/api/v1/scale-proof/state"');
    expect(fixture).toContain('request.url === "/api/v1/scale-proof/actions"');
    expect(fixture).not.toMatch(/portfolio|client|advisor|trade|order/i);
  });

  it("fails on distribution, latency, error, persistence, or image-identity drift", () => {
    const runner = read("scripts", "scale", "run-workbench-scale-proof.mjs");
    const packageJson = JSON.parse(read("package.json"));

    expect(packageJson.scripts["scale:proof"]).toBe(
      "node scripts/scale/run-workbench-scale-proof.mjs",
    );
    expect(runner).toContain("Workbench replicas do not use the same immutable image identity");
    expect(runner).toContain("did not distribute requests across two replicas");
    expect(runner).toContain("Persisted source state was lost with a Workbench replica");
    expect(runner).toContain("p95Ms: 1_500");
    expect(runner).toContain("replacementMaxErrorRate: 0.02");
    expect(runner).toContain('compose(["stop", "workbench-a"])');
    expect(runner).toContain("engineering_regression_non_certifying");
    expect(runner).toContain("explicit_non_claims");
  });
});

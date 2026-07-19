import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = join(__dirname, "..", "..");

function readRepositoryFile(...segments: string[]): string {
  return readFileSync(join(repositoryRoot, ...segments), "utf8");
}

describe("dependency security governance", () => {
  it("enforces high-risk toolchain and moderate-risk production audit thresholds", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["security:audit"]).toBe(
      "npm audit --audit-level=high && npm audit --omit=dev --audit-level=moderate",
    );
  });

  it("keeps the security gate in local check and protected CI lanes", () => {
    const makefile = readRepositoryFile("Makefile");

    expect(makefile).toMatch(/security:\r?\n\tnpm run security:audit/);
    expect(makefile).toMatch(/check: security lint typecheck test-coverage build/);

    for (const workflowName of [
      "feature-lane.yml",
      "pr-merge-gate.yml",
      "main-releasability.yml",
    ]) {
      const workflow = readRepositoryFile(".github", "workflows", workflowName);

      expect(workflow).toContain("name: Dependency Security Gate");
      expect(workflow).toContain("run: make security");
    }
  });

  it("uses one immutable enterprise LTS base for production and Docker parity", () => {
    const dockerfile = readRepositoryFile("Dockerfile");
    const dockerignore = readRepositoryFile(".dockerignore");
    const ciCompose = readRepositoryFile("docker-compose.ci-local.yml");
    const nextConfig = readRepositoryFile("next.config.mjs");
    const governedBase =
      "node:22.23.1-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3";

    expect(dockerfile).toContain(`ARG NODE_BASE_IMAGE=${governedBase}`);
    expect(dockerfile.match(/FROM \$\{NODE_BASE_IMAGE\}/g)).toHaveLength(1);
    expect(dockerfile).toContain("FROM ${NODE_BASE_IMAGE} AS ci-base");
    expect(dockerfile).toContain("FROM ci-base AS deps");
    expect(dockerfile).toContain("FROM ci-base AS builder");
    expect(dockerfile).toContain("FROM ci-base AS runner");
    expect(dockerfile).not.toContain("COPY . .");
    expect(dockerfile).toContain("COPY src ./src");
    expect(nextConfig).toContain('output: "standalone"');
    expect(dockerfile).toContain("/app/.next/standalone ./");
    expect(dockerfile).not.toContain("npm prune --omit=dev");
    expect(dockerfile).toContain("/usr/local/lib/node_modules/npm");
    expect(dockerfile).toContain("/usr/local/lib/node_modules/corepack");
    expect(dockerfile).toContain("/opt/yarn-v1.22.22");
    expect(dockerfile).toContain('CMD ["node", "server.js"]');
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).not.toContain("node:22-alpine");
    expect(dockerignore).toContain("\n*\n");
    expect(dockerignore).toContain("!package.json");
    expect(dockerignore).toContain("!package-lock.json");
    expect(dockerignore).toContain("!src/**");
    expect(dockerignore).toContain("!scripts/runtime/workbench-healthcheck.mjs");
    expect(dockerignore).not.toContain("!.env");
    expect(dockerignore).not.toContain("!output");
    expect(ciCompose).toContain("target: ci-base");
    expect(ciCompose).not.toContain("node:22-alpine");
  });

  it("keeps runtime health dependency-free and owned by the production image", () => {
    const dockerfile = readRepositoryFile("Dockerfile");
    const compose = readRepositoryFile("docker-compose.yml");
    const healthcheck = readRepositoryFile(
      "scripts",
      "runtime",
      "workbench-healthcheck.mjs",
    );

    expect(dockerfile).toContain(
      "COPY --chown=node:node scripts/runtime/workbench-healthcheck.mjs ./healthcheck.mjs",
    );
    expect(dockerfile).toContain(
      'HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 CMD ["node", "healthcheck.mjs"]',
    );
    expect(compose).not.toContain("healthcheck:");
    expect(compose).not.toContain("wget");
    expect(compose).not.toContain("curl");
    expect(healthcheck).toContain('import http from "node:http"');
    expect(healthcheck).toContain('host: "127.0.0.1"');
    expect(healthcheck).toContain("statusCode < 200 || statusCode >= 400");
    expect(healthcheck).not.toContain("fetch(");
  });

  it("pins the known-safe image scanner and publishes an SBOM in protected lanes", () => {
    const trivyActionCommit =
      "aquasecurity/trivy-action@57a97c7e7821a5776cebc9bb87c984fa69cba8f1";

    for (const workflowName of ["pr-merge-gate.yml", "main-releasability.yml"]) {
      const workflow = readRepositoryFile(".github", "workflows", workflowName);

      expect(workflow.match(new RegExp(trivyActionCommit, "g"))).toHaveLength(2);
      expect(workflow).toContain("version: v0.69.3");
      expect(workflow).toContain("severity: HIGH,CRITICAL");
      expect(workflow).toContain('exit-code: "1"');
      expect(workflow).toContain("ignore-unfixed: true");
      expect(workflow).toContain("scanners: vuln");
      expect(workflow).toContain("format: cyclonedx");
      expect(workflow).toContain("workbench-image.cdx.json");
      expect(workflow).not.toContain("aquasecurity/trivy-action@master");
      expect(workflow).not.toContain("version: latest");
    }
  });
});

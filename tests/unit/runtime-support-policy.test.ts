import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateRuntimeSupportPolicy } from "../../scripts/quality/check-runtime-support-policy.mjs";

const root = join(__dirname, "..", "..");

function loadEvidence() {
  return {
    packageJson: JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
    packageLock: JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")),
    policy: JSON.parse(
      readFileSync(
        join(root, "docs/architecture/workbench-runtime-support-policy.v1.json"),
        "utf8"
      )
    ),
    dockerfile: readFileSync(join(root, "Dockerfile"), "utf8"),
    makefile: readFileSync(join(root, "Makefile"), "utf8"),
    playwrightConfig: readFileSync(join(root, "playwright.config.ts"), "utf8"),
    livePlaywrightConfig: readFileSync(join(root, "playwright.live.config.ts"), "utf8"),
    workflowSources: Object.fromEntries(
      ["feature-lane.yml", "pr-merge-gate.yml", "main-releasability.yml"].map((name) => {
        const path = `.github/workflows/${name}`;
        return [path, readFileSync(join(root, path), "utf8")];
      })
    ),
    execution: {
      enforceExact: false,
      nodeVersion: "22.15.0",
      npmVersion: "10.9.2",
    },
    today: "2026-08-10",
  };
}

describe("runtime support policy", () => {
  it("keeps package, container, workflow, framework, and browser posture aligned", () => {
    expect(validateRuntimeSupportPolicy(loadEvidence())).toEqual([]);
  });

  it("rejects package and container runtime drift", () => {
    const evidence = loadEvidence();
    evidence.packageJson.engines.node = ">=24 <25";
    evidence.dockerfile = evidence.dockerfile.replace("node:22.23.1", "node:24.1.0");

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Node engines range"),
        expect.stringContaining("container base image"),
      ])
    );
  });

  it("rejects CI runtime and non-root container drift", () => {
    const evidence = loadEvidence();
    evidence.workflowSources[".github/workflows/feature-lane.yml"] += [
      "",
      "  unsupported-runtime-proof:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/setup-node@v6",
      '        with: { node-version: "22" }',
    ].join("\n");
    evidence.dockerfile = evidence.dockerfile.replace("USER node", "USER root");

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("feature-lane.yml must use Node 22.23.1"),
        expect.stringContaining("execute as node"),
      ])
    );
  });

  it("rejects the wrong executing CI toolchain", () => {
    const evidence = loadEvidence();
    evidence.execution = {
      enforceExact: true,
      nodeVersion: "22.22.0",
      npmVersion: "10.9.2",
    };

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("executing Node version"),
        expect.stringContaining("executing npm version"),
      ])
    );
  });

  it("rejects lockfile, install, and browser-tool drift", () => {
    const evidence = loadEvidence();
    evidence.packageLock.packages[""].engines.node = ">=24 <25";
    evidence.packageJson.devDependencies["@playwright/test"] = "^1.58.2";
    evidence.makefile = evidence.makefile.replace(
      "\tnpm ci --no-audit --no-fund",
      "\tnpm install"
    );
    evidence.workflowSources[".github/workflows/pr-merge-gate.yml"] = evidence.workflowSources[
      ".github/workflows/pr-merge-gate.yml"
    ].replace(
      "node node_modules/playwright/cli.js install chromium",
      "npx playwright install chromium"
    );

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("lockfile Node engines range"),
        expect.stringContaining("Playwright version"),
        expect.stringContaining("immutable npm ci"),
        expect.stringContaining("repository-locked Playwright CLI"),
      ])
    );
  });

  it("rejects an implicit browser family or mutable container install", () => {
    const evidence = loadEvidence();
    evidence.playwrightConfig = evidence.playwrightConfig.replace(
      'projects: [{ name: "chromium", use: { browserName: "chromium" } }],',
      ""
    );
    evidence.dockerfile = evidence.dockerfile.replace(
      "RUN npm ci --no-audit --no-fund",
      "RUN npm install"
    );

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("governed Chromium browser project"),
        expect.stringContaining("container dependency stage"),
      ])
    );
  });

  it("rejects expired review and premature certification claims", () => {
    const evidence = loadEvidence();
    evidence.policy.browserPolicy.certificationStatus = "bank-certified";
    evidence.policy.scalingPolicy.certificationStatus = "production-certified";
    evidence.policy.explicitNonClaims = [];
    evidence.today = "2026-09-16";

    expect(validateRuntimeSupportPolicy(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("review expired"),
        expect.stringContaining("Browser certification"),
        expect.stringContaining("Scaling certification"),
        expect.stringContaining("load or soak certification"),
      ])
    );
  });
});

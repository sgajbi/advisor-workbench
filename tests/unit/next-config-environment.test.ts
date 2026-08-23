import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = join(__dirname, "..", "..");

describe("Next build environment authority", () => {
  it("embeds an unconfigured authority boundary when LOTUS_ENVIRONMENT is absent", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const { default: createConfig } = await import('./next.config.mjs'); process.stdout.write(JSON.stringify(createConfig('phase-production-build')));",
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          LOTUS_ENVIRONMENT: "",
          WORKBENCH_DEPLOYMENT_ID: "",
        },
      },
    );
    const nextConfig = JSON.parse(output) as {
      deploymentId: string;
      env: Record<string, string>;
    };

    expect(nextConfig.deploymentId).toBe("local-development");
    expect(nextConfig.env).toMatchObject({
      WORKBENCH_BUILD_DEPLOYMENT_ID: "local-development",
      WORKBENCH_BUILD_ENVIRONMENT: "unconfigured",
    });
    expect(nextConfig).toMatchObject({ distDir: ".next-build" });
  });

  it("keeps the development server isolated from production build artifacts", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        "const [{ PHASE_DEVELOPMENT_SERVER }, { default: createConfig }] = await Promise.all([import('next/constants.js'), import('./next.config.mjs')]); process.stdout.write(JSON.stringify({ development: createConfig(PHASE_DEVELOPMENT_SERVER).distDir, production: createConfig('phase-production-build').distDir }));",
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          LOTUS_ENVIRONMENT: "",
          WORKBENCH_DEPLOYMENT_ID: "",
        },
      },
    );

    expect(JSON.parse(output)).toEqual({
      development: ".next-dev",
      production: ".next-build",
    });
  });
});

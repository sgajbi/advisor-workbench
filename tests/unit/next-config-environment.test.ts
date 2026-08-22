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
        "const { default: config } = await import('./next.config.mjs'); process.stdout.write(JSON.stringify(config));",
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
  });
});

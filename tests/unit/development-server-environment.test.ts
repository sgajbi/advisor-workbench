import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error The development launcher is a Node .mjs script without a declaration file.
import { resolveDevelopmentEnvironment } from "../../scripts/runtime/start-workbench-development.mjs";

const repositoryRoot = join(__dirname, "..", "..");

describe("development server authority posture", () => {
  it.each([undefined, "", "   "])(
    "supplies explicit development authority when LOTUS_ENVIRONMENT is %s",
    (environment) => {
      expect(
        resolveDevelopmentEnvironment({ LOTUS_ENVIRONMENT: environment })
          .LOTUS_ENVIRONMENT,
      ).toBe("dev");
    },
  );

  it("preserves an explicitly configured environment", () => {
    expect(
      resolveDevelopmentEnvironment({ LOTUS_ENVIRONMENT: "uat" })
        .LOTUS_ENVIRONMENT,
    ).toBe("uat");
  });

  it("keeps the repository development command wired to the governed launcher", () => {
    const packageJson = JSON.parse(
      readFileSync(join(repositoryRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.dev).toBe(
      "node scripts/runtime/start-workbench-development.mjs",
    );
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type ArtifactIsolationModule = {
  collectNextAssetPaths: (html: string) => string[];
  probeWorkbenchAssets: (options: {
    origin: string;
    fetchImpl: typeof fetch;
  }) => Promise<string[]>;
};

const isolationModulePromise =
  // @ts-expect-error The repository proof is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/testing/verify-next-artifact-isolation.mjs") as Promise<ArtifactIsolationModule>;

describe("Next artifact isolation proof", () => {
  it("keeps the concurrency proof in the protected browser gate", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const workflow = readFileSync(
      resolve(process.cwd(), ".github", "workflows", "pr-merge-gate.yml"),
      "utf8",
    ).replaceAll("\r\n", "\n");

    expect(packageJson.scripts?.["test:next-artifact-isolation"]).toBe(
      "node scripts/testing/verify-next-artifact-isolation.mjs",
    );
    const proofSource = readFileSync(
      resolve(process.cwd(), "scripts", "testing", "verify-next-artifact-isolation.mjs"),
      "utf8",
    );
    expect(proofSource).toContain('execFileSync("git", ["rev-parse", "HEAD"]');
    expect(proofSource).toContain('execFileSync("git", ["status", "--porcelain"]');
    expect(proofSource).toContain(
      "Next.js artifact isolation evidence requires a clean committed worktree.",
    );
    expect(workflow).toContain(
      [
        "      - name: Next Development And Production Artifact Isolation",
        "        run: npm run test:next-artifact-isolation",
        "      - name: Upload Next Artifact Isolation Evidence",
        "        uses: actions/upload-artifact@v7",
        "        with:",
        "          name: next-artifact-isolation",
        "          path: output/next-artifact-isolation.json",
        "          if-no-files-found: error",
        "      - name: Run Playwright Smoke",
        "        env:",
        '          PLAYWRIGHT_REUSE_VALIDATED_BUILD: "1"',
        "        run: make test-e2e",
      ].join("\n"),
    );
  });

  it("deduplicates only rendered Next static assets", async () => {
    const { collectNextAssetPaths } = await isolationModulePromise;

    expect(
      collectNextAssetPaths(`
        <link rel="stylesheet" href="/_next/static/css/advisor.css" />
        <script src="/_next/static/chunks/workbench.js"></script>
        <script src="/_next/static/chunks/workbench.js"></script>
        <img src="/lotus-mark.svg" />
      `),
    ).toEqual([
      "/_next/static/chunks/workbench.js",
      "/_next/static/css/advisor.css",
    ]);
  });

  it("proves the page and every published client asset are available", async () => {
    const { probeWorkbenchAssets } = await isolationModulePromise;
    const requests: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/intake")) {
        return new Response(
          '<script src="/_next/static/chunks/workbench.js"></script>',
          { status: 200 },
        );
      }
      return new Response("client asset", { status: 200 });
    }) as typeof fetch;

    await expect(
      probeWorkbenchAssets({ origin: "http://127.0.0.1:31983", fetchImpl }),
    ).resolves.toEqual(["/_next/static/chunks/workbench.js"]);
    expect(requests).toEqual([
      "http://127.0.0.1:31983/intake",
      "http://127.0.0.1:31983/_next/static/chunks/workbench.js",
    ]);
  });

  it("fails when the page publishes a missing client asset", async () => {
    const { probeWorkbenchAssets } = await isolationModulePromise;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/intake")) {
        return new Response(
          '<script src="/_next/static/chunks/missing.js"></script>',
          { status: 200 },
        );
      }
      return new Response("missing", { status: 404 });
    }) as typeof fetch;

    await expect(
      probeWorkbenchAssets({ origin: "http://127.0.0.1:31983", fetchImpl }),
    ).rejects.toThrow("/_next/static/chunks/missing.js returned HTTP 404");
  });
});

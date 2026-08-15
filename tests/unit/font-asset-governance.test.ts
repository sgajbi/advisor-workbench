import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface FontManifest {
  schemaVersion: number;
  delivery: string;
  forbiddenRuntimeHosts: string[];
  families: Array<{
    family: string;
    role: string;
    version: string;
    license: string;
    upstream: { repository: string; tag: string; commit: string };
    licenseFile: { path: string; sha256: string };
    assets: Array<{ path: string; sha256: string; style: string; weight: string }>;
  }>;
}

interface FontGovernanceModule {
  validateFontAssetGovernance(input?: { repoRoot?: string; manifest?: FontManifest }): void;
}

// @ts-expect-error The governance gate is a Node .mjs script without a TypeScript declaration.
const fontGovernancePromise = import("../../scripts/quality/check-font-asset-governance.mjs") as Promise<FontGovernanceModule>;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createFixture(runtimeSource = "export const delivery = 'same-origin';\n") {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "lotus-workbench-font-governance-"));
  const licenseText = "SIL OPEN FONT LICENSE Version 1.1";
  const licensePath = "docs/licenses/fonts/ui.txt";

  mkdirSync(path.join(repoRoot, "src/app"), { recursive: true });
  mkdirSync(path.join(repoRoot, "src/assets/fonts"), { recursive: true });
  mkdirSync(path.join(repoRoot, "docs/licenses/fonts"), { recursive: true });
  writeFileSync(
    path.join(repoRoot, ".gitattributes"),
    "src/assets/fonts/*.woff2 binary\ndocs/licenses/fonts/*.txt text eol=lf -whitespace\n",
  );
  const roles = ["operational-ui", "brand-display", "technical-evidence"];
  const assetPaths = roles.map((role) => `src/assets/fonts/${role}.woff2`);
  const assetTextByRole = Object.fromEntries(
    roles.map((role) => [role, `governed-${role}-font-binary`]),
  );
  writeFileSync(
    path.join(repoRoot, "src/app/fonts.ts"),
    `${assetPaths.map((assetPath) => `const font = "../assets/fonts/${path.basename(assetPath)}";`).join("\n")}\n${runtimeSource}`,
  );
  for (const [index, assetPath] of assetPaths.entries()) {
    writeFileSync(path.join(repoRoot, assetPath), assetTextByRole[roles[index]]);
  }
  writeFileSync(path.join(repoRoot, licensePath), licenseText);

  const family = (role: string, index: number) => ({
    family: role,
    role,
    version: "1.0.0",
    license: "OFL-1.1",
    upstream: {
      repository: "https://github.com/example/fonts",
      tag: "v1.0.0",
      commit: "a".repeat(40),
    },
    licenseFile: { path: licensePath, sha256: hash(licenseText) },
    assets: [{
      path: assetPaths[index],
      sha256: hash(assetTextByRole[role]),
      style: "normal",
      weight: "400",
    }],
  });

  return {
    repoRoot,
    manifest: {
      schemaVersion: 1,
      delivery: "same-origin",
      forbiddenRuntimeHosts: ["fonts.googleapis.com", "fonts.gstatic.com"],
      families: roles.map(family),
    } satisfies FontManifest,
  };
}

describe("font asset governance", () => {
  it("accepts the repository's licensed and checksummed same-origin fonts", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    expect(() => validateFontAssetGovernance({ repoRoot: process.cwd() })).not.toThrow();
  });

  it("rejects checksum drift", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    manifest.families[0].assets[0].sha256 = "0".repeat(64);

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/checksum drifted/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("requires cross-platform-stable font and license attributes", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    writeFileSync(path.join(repoRoot, ".gitattributes"), "src/assets/fonts/*.woff2 binary\n");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(
        /docs\/licenses\/fonts\/\*\.txt text eol=lf -whitespace/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects manifest traversal outside a governed asset root before reading the file", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const outsideAsset = path.join(repoRoot, "src/assets/outside.woff2");
    writeFileSync(outsideAsset, "must-not-be-read");
    manifest.families[0].assets[0].path = "src/assets/fonts/../outside.woff2";
    manifest.families[0].assets[0].sha256 = "0".repeat(64);

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(
        /resolves outside src\/assets\/fonts/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects public font hosts in production source", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture(
      "export const stylesheet = 'https://fonts.googleapis.com/css2?family=Inter';\n",
    );

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(
        /Public font runtime references are forbidden/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("does not allow the manifest to remove canonical public font hosts", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    manifest.forbiddenRuntimeHosts = ["example.invalid"];

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(
        /missing required forbidden runtime hosts: fonts\.googleapis\.com, fonts\.gstatic\.com/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a loader asset without checksum and license provenance", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const ungovernedAsset = "src/assets/fonts/ungoverned.woff2";
    writeFileSync(path.join(repoRoot, ungovernedAsset), "ungoverned-font-binary");
    writeFileSync(
      path.join(repoRoot, "src/app/fonts.ts"),
      `${readFileSync(path.join(repoRoot, "src/app/fonts.ts"), "utf8")}\nconst extraFont = "../assets/fonts/ungoverned.woff2";\n`,
    );

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(
        /must be governed in config\/font-assets\.json: src\/assets\/fonts\/ungoverned\.woff2/,
      );
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

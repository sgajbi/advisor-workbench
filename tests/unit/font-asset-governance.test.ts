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
    assets: Array<{
      path: string;
      sha256: string;
      style: string;
      weight: string;
    }>;
  }>;
}

interface FontGovernanceModule {
  validateFontAssetGovernance(input?: { repoRoot?: string; manifest?: FontManifest }): void;
}

const FONT_GOVERNANCE_MODULE_PATH = "../../scripts/quality/check-font-asset-governance.mjs";
const fontGovernancePromise = import(FONT_GOVERNANCE_MODULE_PATH) as Promise<FontGovernanceModule>;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function createFixture(runtimeSource = "export const delivery = 'same-origin';\n") {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "lotus-workbench-font-governance-"));
  const licenseText = "SIL OPEN FONT LICENSE Version 1.1";
  const licensePath = "docs/licenses/fonts/ui.txt";

  mkdirSync(path.join(repoRoot, "src/app"), { recursive: true });
  mkdirSync(path.join(repoRoot, "src/assets/fonts"), { recursive: true });
  mkdirSync(path.join(repoRoot, "src/styles/global"), { recursive: true });
  mkdirSync(path.join(repoRoot, "src/design-system/theme"), {
    recursive: true,
  });
  mkdirSync(path.join(repoRoot, "docs/licenses/fonts"), { recursive: true });
  writeFileSync(path.join(repoRoot, ".gitattributes"), "src/assets/fonts/*.woff2 binary\ndocs/licenses/fonts/*.txt text eol=lf -whitespace\n");
  const roles = ["operational-ui", "brand-display", "technical-evidence"];
  const semanticVariables = ["--font-lotus-ui-face", "--font-lotus-display-face", "--font-lotus-mono-face"];
  const assetPaths = roles.map((role) => `src/assets/fonts/${role}.woff2`);
  const assetTextByRole = Object.fromEntries(roles.map((role) => [role, `governed-${role}-font-binary`]));
  writeFileSync(
    path.join(repoRoot, "src/app/fonts.ts"),
    `import localFont from "next/font/local";\n${assetPaths.map((assetPath, index) => `const font${index} = localFont({ src: "../assets/fonts/${path.basename(assetPath)}", variable: "${semanticVariables[index]}", weight: "400", style: "normal" });`).join("\n")}\n${runtimeSource}`,
  );
  writeFileSync(
    path.join(repoRoot, "src/styles/global/tokens.css"),
    `:root {\n  --font-ui: var(--font-lotus-ui-face), sans-serif;\n  --font-display: var(--font-lotus-display-face), serif;\n  --font-mono: var(--font-lotus-mono-face), monospace;\n}\n`,
  );
  writeFileSync(
    path.join(repoRoot, "src/design-system/theme/tokens.ts"),
    `export const lotusThemeTokens = { typography: { fontFamily: { ui: "var(--font-lotus-ui-face), sans-serif", display: "var(--font-lotus-display-face), serif", mono: "var(--font-lotus-mono-face), monospace" } } };\n`,
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
    assets: [
      {
        path: assetPaths[index],
        sha256: hash(assetTextByRole[role]),
        style: "normal",
        weight: "400",
      },
    ],
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
  it(
    "accepts the repository's licensed and checksummed same-origin fonts",
    async () => {
      const { validateFontAssetGovernance } = await fontGovernancePromise;
      expect(() => validateFontAssetGovernance({ repoRoot: process.cwd() })).not.toThrow();
    },
    15_000,
  );

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
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/docs\/licenses\/fonts\/\*\.txt text eol=lf -whitespace/);
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
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/resolves outside src\/assets\/fonts/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects public font hosts in production source", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture("export const stylesheet = 'https://fonts.googleapis.com/css2?family=Inter';\n");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/Public font runtime references are forbidden/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects case variants of canonical public font hosts", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture("export const stylesheet = 'https://FONTS.GOOGLEAPIS.COM/css2?family=Inter';\n");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/Public font runtime references are forbidden/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("does not allow the manifest to remove canonical public font hosts", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    manifest.forbiddenRuntimeHosts = ["example.invalid"];

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/missing required forbidden runtime hosts: fonts\.googleapis\.com, fonts\.gstatic\.com/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a loader asset without checksum and license provenance", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const ungovernedAsset = "src/assets/fonts/ungoverned.woff2";
    writeFileSync(path.join(repoRoot, ungovernedAsset), "ungoverned-font-binary");
    writeFileSync(path.join(repoRoot, "src/app/fonts.ts"), `${readFileSync(path.join(repoRoot, "src/app/fonts.ts"), "utf8")}\nconst extraFont = localFont({ src: "../assets/fonts/ungoverned.woff2", variable: "--font-lotus-ui-face" });\n`);

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/must be governed in config\/font-assets\.json: src\/assets\/fonts\/ungoverned\.woff2/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("does not certify a manifest asset referenced only by dead source text", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const fontLoaderPath = path.join(repoRoot, "src/app/fonts.ts");
    writeFileSync(
      fontLoaderPath,
      readFileSync(fontLoaderPath, "utf8").replace(
        'const font0 = localFont({ src: "../assets/fonts/operational-ui.woff2", variable: "--font-lotus-ui-face", weight: "400", style: "normal" });',
        '// removed localFont call retained only as dead text: "../assets/fonts/operational-ui.woff2"',
      ),
    );

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/operational-ui\.woff2 is governed but not loaded by src\/app\/fonts\.ts/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a shadowed local font loader binding", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture("export function shadowed(localFont: Function) { return localFont({ src: '../assets/fonts/operational-ui.woff2' }); }\n");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/must not shadow the localFont import/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("preserves each manifest role through its semantic loader variable", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const fontLoaderPath = path.join(repoRoot, "src/app/fonts.ts");
    writeFileSync(
      fontLoaderPath,
      readFileSync(fontLoaderPath, "utf8").replace("operational-ui.woff2", "role-swap-placeholder.woff2").replace("brand-display.woff2", "operational-ui.woff2").replace("role-swap-placeholder.woff2", "brand-display.woff2"),
    );

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/operational-ui\.woff2 for operational-ui must be loaded through --font-lotus-ui-face, received --font-lotus-display-face/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a non-local Next font loader", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture('import { Inter } from "next/font/google";\nexport const remoteFont = Inter({ subsets: ["latin"] });\n');

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/non-local Next font loader next\/font\/google/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a font package outside the canonical local loader", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture('import "@fontsource/inter";\n');

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/non-canonical font package @fontsource\/inter/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a remote font stylesheet from any provider", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    writeFileSync(path.join(repoRoot, "src/app/remote-font.css"), '@import url("https://fonts.bunny.net/css?family=inter");\n');

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/remote stylesheet import/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a protocol-relative remote font stylesheet", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    writeFileSync(path.join(repoRoot, "src/app/remote-font.css"), '@import url("//fonts.bunny.net/css?family=inter");\n');

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/remote stylesheet import/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects direct font-face declarations in the canonical loader", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture("export const injectedCss = '@font-face { font-family: Ungoverned; src: url(/fonts/ungoverned.woff2); }';\n");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/direct @font-face declaration/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a dormant font binary without manifest provenance", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    writeFileSync(path.join(repoRoot, "src/assets/fonts/dormant.woff2"), "dead-font-binary");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/stored under src\/assets\/fonts must be governed.*dormant\.woff2/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects a nested dormant font binary without manifest provenance", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    mkdirSync(path.join(repoRoot, "src/assets/fonts/archive"));
    writeFileSync(path.join(repoRoot, "src/assets/fonts/archive/dormant.woff2"), "dead-font-binary");

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/stored under src\/assets\/fonts must be governed.*archive\/dormant\.woff2/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects semantic role reversal in CSS token consumers", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const tokenPath = path.join(repoRoot, "src/styles/global/tokens.css");
    writeFileSync(
      tokenPath,
      readFileSync(tokenPath, "utf8").replace("--font-lotus-ui-face", "--font-role-swap").replace("--font-lotus-display-face", "--font-lotus-ui-face").replace("--font-role-swap", "--font-lotus-display-face") +
        'const deadTokens = { fontFamily: { ui: "var(--font-lotus-ui-face), sans-serif" } };\n',
    );

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/--font-ui must consume --font-lotus-ui-face for operational-ui/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects semantic role reversal in TypeScript token consumers", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const tokenPath = path.join(repoRoot, "src/design-system/theme/tokens.ts");
    writeFileSync(tokenPath, readFileSync(tokenPath, "utf8").replace("--font-lotus-ui-face", "--font-role-swap").replace("--font-lotus-display-face", "--font-lotus-ui-face").replace("--font-role-swap", "--font-lotus-display-face"));

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/fontFamily\.ui must consume --font-lotus-ui-face for operational-ui/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects loader weight or style that drifts from the manifest", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    const fontLoaderPath = path.join(repoRoot, "src/app/fonts.ts");
    writeFileSync(fontLoaderPath, readFileSync(fontLoaderPath, "utf8").replace('weight: "400"', 'weight: "700"'));

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/loader descriptors must match manifest weight 400 and style normal/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects duplicate semantic roles in the manifest", async () => {
    const { validateFontAssetGovernance } = await fontGovernancePromise;
    const { repoRoot, manifest } = createFixture();
    manifest.families[1].role = "operational-ui";

    try {
      expect(() => validateFontAssetGovernance({ repoRoot, manifest })).toThrow(/Semantic font role operational-ui is declared more than once/);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

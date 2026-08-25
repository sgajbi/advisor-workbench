import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  scanProductCopyRepository,
  scanProductCopySource,
} from "../../scripts/quality/check-product-copy-governance.mjs";

function scan(sourceText: string) {
  return scanProductCopySource({ filePath: "src/example.tsx", sourceText });
}

function runCliWithBaseline(sourceText: string, baseline: number) {
  const temporaryRepository = mkdtempSync(
    join(tmpdir(), "lotus-product-copy-"),
  );
  const sourceDirectory = join(temporaryRepository, "src");
  mkdirSync(sourceDirectory);
  writeFileSync(join(sourceDirectory, "example.tsx"), sourceText, "utf8");

  try {
    return spawnSync(
      process.execPath,
      [
        join(
          process.cwd(),
          "scripts",
          "quality",
          "check-product-copy-governance.mjs",
        ),
        `--max=${baseline}`,
      ],
      { cwd: temporaryRepository, encoding: "utf8" },
    );
  } finally {
    rmSync(temporaryRepository, { recursive: true, force: true });
  }
}

describe("product-copy governance", () => {
  it("rejects transport and auditor language in productive JSX", () => {
    const findings = scan(`
      export function Example() {
        return <Panel title="Gateway supportability posture" />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "engineering-supportability",
    ]);
  });

  it("rejects technical copy in JSX expressions and copy properties", () => {
    const findings = scan(`
      const copy = {
        title: "Review unavailable",
        body: "RFC-0028 evidence was not source-confirmed",
      };
      export function Example() {
        return <p>{false ? "HTTP status unavailable" : "READY_FOR_REVIEW"}</p>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "engineering-rfc",
      "source-confirmed",
      "transport-http-status",
      "raw-enum",
    ]);
  });

  it("does not confuse internal contracts with productive copy", () => {
    expect(
      scan(`
        const BFF_PROXY_BASE = "/api/bff";
        type GatewayEnvelope = { supportability_state: string };
        const request = { body: JSON.stringify({ reason: "READY_FOR_REVIEW" }) };
        export const copy = {
          title: "Portfolio information unavailable",
          body: "Existing holdings remain visible. Refresh before advising the client.",
        };
      `),
    ).toEqual([]);
  });

  it("does not inspect implementation attributes inside rendered collections", () => {
    expect(
      scan(`
        export function Example({ items }) {
          return <div>{items.map((item) => <span className="supportability-row">{item.label}</span>)}</div>;
        }
      `),
    ).toEqual([]);
  });

  it("keeps the checked-in productive-copy inventory exact", () => {
    expect(scanProductCopyRepository().length).toBe(346);
  });

  it("exits non-zero when the CLI ratchet is exceeded", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway posture" />;',
      0,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exceeds the checked-in baseline of 0");
  });

  it("exits non-zero when the CLI baseline leaves regression headroom", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway status" />;',
      2,
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Ratchet --max down to 1 in package.json");
  });

  it("passes only when the CLI baseline matches the measured inventory", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Gateway status" />;',
      1,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "measured inventory matches the checked-in baseline at 1",
    );
  });
});

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

  it("keeps the checked-in productive-copy inventory from growing", () => {
    expect(scanProductCopyRepository().length).toBeLessThanOrEqual(360);
  });

  it("exits non-zero when the CLI ratchet is exceeded", () => {
    const temporaryRepository = mkdtempSync(
      join(tmpdir(), "lotus-product-copy-"),
    );
    const sourceDirectory = join(temporaryRepository, "src");
    mkdirSync(sourceDirectory);
    writeFileSync(
      join(sourceDirectory, "example.tsx"),
      'export const Example = () => <Panel title="Gateway posture" />;',
      "utf8",
    );

    try {
      const result = spawnSync(
        process.execPath,
        [
          join(
            process.cwd(),
            "scripts",
            "quality",
            "check-product-copy-governance.mjs",
          ),
          "--max=0",
        ],
        { cwd: temporaryRepository, encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("exceeds the maximum of 0");
    } finally {
      rmSync(temporaryRepository, { recursive: true, force: true });
    }
  });
});

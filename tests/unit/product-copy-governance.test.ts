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

// The exact repository scan parses every productive TypeScript source file. Keep
// a finite allowance for whole-suite worker contention without relaxing the
// measured inventory or its zero-headroom ratchet.
const REPOSITORY_SCAN_TIMEOUT_MS = 15_000;

function scan(sourceText: string) {
  return scanProductCopySource({ filePath: "src/example.tsx", sourceText });
}

type ProductCopyException = {
  id: string;
  filePath: string;
  ruleId: string;
  context: string;
  exactText: string;
  expectedMatches: number;
  reason: string;
  reviewUrl: string;
};

function runCliWithBaseline(
  sourceText: string,
  baseline: number,
  entries: ProductCopyException[] = [],
) {
  const temporaryRepository = mkdtempSync(
    join(tmpdir(), "lotus-product-copy-"),
  );
  const sourceDirectory = join(temporaryRepository, "src");
  const configDirectory = join(temporaryRepository, "config");
  mkdirSync(sourceDirectory);
  mkdirSync(configDirectory);
  writeFileSync(join(sourceDirectory, "example.tsx"), sourceText, "utf8");
  writeFileSync(
    join(configDirectory, "product-copy-exceptions.v1.json"),
    JSON.stringify({
      schemaVersion: "product-copy-exceptions.v1",
      governingIssue: "https://github.com/sgajbi/lotus-workbench/issues/798",
      entries,
    }),
    "utf8",
  );

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

  it("resolves local constant copy rendered through JSX", () => {
    const findings = scan(`
      const panelTitle = "Gateway posture";
      export function Example() {
        return <Panel title={panelTitle} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
    expect(findings.every((finding) => finding.context === "JSX title")).toBe(
      true,
    );
  });

  it("resolves statically inspectable object property copy rendered through JSX", () => {
    const findings = scan(`
      const copy = {
        panelTitle: "Gateway posture",
        panelBody: "HTTP status unavailable",
      } as const;
      export function Example() {
        return <Panel title={copy.panelTitle} body={copy["panelBody"]} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
      "transport-http-status",
    ]);
    expect(findings.map((finding) => finding.context)).toEqual([
      "JSX title",
      "JSX title",
      "JSX body",
    ]);
  });

  it("resolves copy inherited through statically inspectable object spreads", () => {
    const findings = scan(`
      const baseCopy = { panelTitle: "Gateway posture" } as const;
      const sharedCopy = { ...baseCopy } as const;
      const screenCopy = { ...sharedCopy } as const;
      export function Example() {
        return <Panel title={screenCopy.panelTitle} />;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
      "auditor-posture",
    ]);
  });

  it("honours static spread override order and fails safely for cyclic spreads", () => {
    expect(
      scan(`
        const technicalCopy = { panelTitle: "Gateway posture" } as const;
        const businessCopy = { panelTitle: "Client review status" } as const;
        const screenCopy = { ...technicalCopy, ...businessCopy } as const;
        const first = { ...second };
        const second = { ...first };
        export function Example() {
          return <><Panel title={screenCopy.panelTitle} /><Panel title={first.panelTitle} /></>;
        }
      `),
    ).toEqual([]);
  });

  it("resolves chains of local constants without evaluating executable code", () => {
    const findings = scan(`
      const technicalCopy = "HTTP status unavailable";
      const panelTitle = technicalCopy;
      const dynamicCopy = getRuntimeCopy();
      const canReview = state === "AWAITING_REVIEW";
      const sourceState = "PENDING_SOURCE_REVIEW";
      export function Example() {
        return <>{canReview && state === sourceState ? <Panel title={panelTitle} /> : <Panel title={dynamicCopy} />}</>;
      }
    `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-http-status",
    ]);
  });

  it("resolves shadowed constants by lexical scope and fails safely for cycles", () => {
    const findings = scan(`
        const first = second;
        const second = first;
        function First() {
          const copy = "Gateway status";
          return <Panel title={copy} />;
        }
        function Second() {
          const copy = "Client review status";
          return <Panel title={copy} />;
        }
        export const Example = () => <Panel title={first} />;
      `);

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "transport-gateway",
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

  it("accepts one exact reviewed use of legitimate wealth-management language", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Defensive posture reduces equity exposure to 30%." />;',
      0,
      [
        {
          id: "copy-exception-defensive-posture",
          filePath: "src/example.tsx",
          ruleId: "auditor-posture",
          context: "JSX title",
          exactText: "Defensive posture reduces equity exposure to 30%.",
          expectedMatches: 1,
          reason:
            "Posture is the precise portfolio-construction term in this reviewed advisor context.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1 reviewed exact exception(s)");
  });

  it("rejects a stale exception when the reviewed copy is no longer present", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="Defensive allocation" />;',
      0,
      [
        {
          id: "copy-exception-defensive-posture",
          filePath: "src/example.tsx",
          ruleId: "auditor-posture",
          context: "JSX title",
          exactText: "Defensive posture reduces equity exposure to 30%.",
          expectedMatches: 1,
          reason:
            "Posture is the precise portfolio-construction term in this reviewed advisor context.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected 1 exact match(es) but found 0");
  });

  it("rejects an exception when duplicate copy broadens its approved scope", () => {
    const result = runCliWithBaseline(
      `
        export const First = () => <Panel title="Structured note XS_2043 matured on 12 March." />;
        export const Second = () => <Panel title="Structured note XS_2043 matured on 12 March." />;
      `,
      0,
      [
        {
          id: "copy-exception-structured-note-identifier",
          filePath: "src/example.tsx",
          ruleId: "raw-enum",
          context: "JSX title",
          exactText: "Structured note XS_2043 matured on 12 March.",
          expectedMatches: 1,
          reason:
            "XS_2043 is the reviewed instrument identifier required to distinguish the holding.",
          reviewUrl: "https://github.com/sgajbi/lotus-workbench/pull/867",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected 1 exact match(es) but found 2");
  });

  it("rejects exception metadata without durable Workbench review evidence", () => {
    const result = runCliWithBaseline(
      'export const Example = () => <Panel title="This account is governed by a discretionary mandate." />;',
      0,
      [
        {
          id: "copy-exception-discretionary-mandate",
          filePath: "src/example.tsx",
          ruleId: "engineering-governed",
          context: "JSX title",
          exactText: "This account is governed by a discretionary mandate.",
          expectedMatches: 1,
          reason:
            "Governed describes the legal relationship between the account and its mandate.",
          reviewUrl: "https://example.com/not-durable-review",
        },
      ],
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "reviewUrl must be a Workbench GitHub issue or PR URL",
    );
  });

  it(
    "keeps the checked-in productive-copy inventory exact",
    () => {
      expect(scanProductCopyRepository().length).toBe(281);
    },
    REPOSITORY_SCAN_TIMEOUT_MS,
  );

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

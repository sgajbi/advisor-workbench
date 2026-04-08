import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  riskAttributionPanelCopy,
  riskRollingPanelCopy,
  riskSecondaryGroupCopy,
} from "../../src/apps/performance/components/risk/risk-secondary-copy";

const repoRoot = path.resolve(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("secondary risk copy governance", () => {
  it("centralizes secondary workspace framing copy in the shared copy contract", () => {
    expect(riskSecondaryGroupCopy.eyebrow).toBe("Analytical follow-through");
    expect(riskRollingPanelCopy.title).toBe("Rolling Risk");
    expect(riskAttributionPanelCopy.title).toBe("Historical Risk Attribution");
  });

  it("does not keep the removed shared review-frame abstraction around as dead code", () => {
    expect(
      fs.existsSync(
        path.join(
          repoRoot,
          "src",
          "apps",
          "performance",
          "components",
          "risk",
          "risk-analytical-review-frame.tsx"
        )
      )
    ).toBe(false);
  });

  it("keeps secondary-panel components free of duplicated local literals", () => {
    const fileExpectations = [
      {
        file: "src/apps/performance/components/risk/risk-secondary-panel-group.tsx",
        required: ['from "./risk-secondary-copy"'],
        forbidden: [
          "Analytical follow-through",
          "Rolling behaviour and attribution stay available as drill-down review after the current",
        ],
      },
      {
        file: "src/apps/performance/components/risk/risk-rolling-panel.tsx",
        required: ['from "./risk-secondary-copy"'],
        forbidden: [
          'title="Rolling Risk"',
          'subtitle="Selected-window behaviour, relative reliability, and next-horizon review."',
          'label: "View rolling series"',
        ],
      },
      {
        file: "src/apps/performance/components/risk/risk-rolling-window-detail.tsx",
        required: ['from "./risk-secondary-copy"'],
        forbidden: [
          'title="Window detail"',
          ">Review window<",
          ">Short to long horizon<",
          'ariaLabel="Rolling risk summary table"',
          "No rolling risk metrics",
        ],
      },
      {
        file: "src/apps/performance/components/risk/risk-attribution-panel.tsx",
        required: ['from "./risk-secondary-copy"'],
        forbidden: [
          'title="Historical Risk Attribution"',
          'title="Contributor review"',
          'ariaLabel="Risk attribution type"',
          'ariaLabel="Historical risk attribution table"',
          "Attribution reconciliation",
          "Attribution notes",
        ],
      },
    ];

    const violations = fileExpectations.flatMap(({ file, required, forbidden }) => {
      const contents = readRepoFile(file);

      return [
        ...required
          .filter((pattern) => !contents.includes(pattern))
          .map((pattern) => ({
            file,
            reason: `Expected shared secondary copy import missing: ${pattern}`,
          })),
        ...forbidden
          .filter((pattern) => contents.includes(pattern))
          .map((pattern) => ({
            file,
            reason: `Forbidden duplicated secondary copy literal remains in component: ${pattern}`,
          })),
      ];
    });

    expect(violations).toEqual([]);
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceCapabilityTrustStrip from "../../src/apps/performance/components/performance-capability-trust-strip";
import type { PerformanceTrustStripPresentation } from "../../src/apps/performance/components/performance-workspace-view-helpers";

describe("PerformanceCapabilityTrustStrip", () => {
  it("renders compact capability-driven trust statuses", () => {
    const presentation: PerformanceTrustStripPresentation = {
      items: [
        { label: "Benchmark", value: "Assigned", support: "Benchmark-relative return metrics are available.", tone: "default" },
        { label: "Return History", value: "Ready", support: "Time-series return observations are available.", tone: "default" },
        { label: "Contribution", value: "Partial", support: "Contribution exists, but only aggregate rows are available.", tone: "warn" },
        { label: "Attribution", value: "Unavailable", support: "Attribution detail is not available.", tone: "danger" },
        { label: "Evidence", value: "Pending", support: "Evidence and lineage surfaces are not exposed by the current gateway contract.", tone: "default" },
      ],
    };

    render(<PerformanceCapabilityTrustStrip presentation={presentation} />);

    expect(screen.getByLabelText("Trust and completeness strip")).toBeInTheDocument();
    expect(screen.getByText("Benchmark")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(screen.getByText("Contribution")).toBeInTheDocument();
    expect(screen.getByText("Partial")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(document.querySelectorAll(".performance-trust-item")).toHaveLength(5);
    expect(document.querySelectorAll(".performance-trust-item .semantic-badge")).toHaveLength(5);
  });
});

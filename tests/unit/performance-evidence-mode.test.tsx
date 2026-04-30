import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceEvidenceMode from "../../src/apps/performance/components/performance-evidence-mode";
import {
  buildPartialEvidencePerformanceScenario,
  buildSupportedEvidencePerformanceScenario,
  buildUnavailableEvidencePerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("PerformanceEvidenceMode", () => {
  it("renders an honest unavailable state when evidence is not exposed by the contract", () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();

    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelector(".performance-evidence-module")).toBeTruthy();
    expect(screen.getByText("Evidence unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Evidence and lineage surfaces are not exposed by the current gateway contract.")
    ).toBeInTheDocument();
    expect(
      document.querySelector(".performance-evidence-state-panel .portfolio-empty-state")
    ).toBeTruthy();
    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
  });

  it("renders a partial capability state when the contract is incomplete", () => {
    const scenario = buildPartialEvidencePerformanceScenario();

    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
    expect(
      screen.getByText("Lineage artifacts are available, but execution evidence is incomplete.")
    ).toBeInTheDocument();
    expect(screen.getByText("workspace_summary")).toBeInTheDocument();
    expect(
      screen.getByText("No lineage artifacts are currently published for this calculation.")
    ).toBeInTheDocument();
  });

  it("renders the evidence workspace when the backend contract supports it", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    if (scenario.workspace.evidence_view) {
      scenario.workspace.evidence_view.calculations[0].artifacts = [
        {
          artifact_name: "request.json",
          url: "/api/v1/workbench/PF_1001/performance/evidence/artifacts/calc-workspace-summary/request.json",
          content_type: "application/json",
        },
      ];
    }

    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(document.querySelector(".performance-evidence-status-strip")).toBeTruthy();
    expect(screen.getByText("Evidence and Calculation Context")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence support status")).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
    expect(screen.getByText("Evidence posture")).toBeInTheDocument();
    expect(screen.getByText("Calculations")).toBeInTheDocument();
    expect(screen.getByText("Lineage artifacts")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence product context")).toHaveTextContent("As of: 2026-02-24");
    expect(screen.getByLabelText("Evidence product context")).toHaveTextContent("Period: YTD");
    expect(screen.getByLabelText("Evidence product context")).toHaveTextContent("Basis: NET");
    expect(screen.getByLabelText("Evidence product context")).toHaveTextContent(
      "Benchmark: BMK_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByLabelText("Evidence source services")).toHaveTextContent("lotus-performance");
    expect(screen.getByLabelText("Evidence input freshness")).toHaveTextContent("performance: fresh");
    expect(screen.getByLabelText("Evidence methodology references")).toHaveTextContent(
      "lotus-performance/docs/methodologies"
    );
    expect(screen.getByLabelText("Evidence calculation versions")).toHaveTextContent(
      "gateway_contract: v1"
    );
    expect(screen.getByLabelText("Evidence coverage")).toHaveTextContent(
      "Supported dimensions: asset_class, country, currency, sector"
    );
    expect(screen.getByLabelText("Evidence coverage")).toHaveTextContent(
      "Unsupported dimensions: issuer"
    );
    expect(screen.getByText("workspace_summary")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "request.json" })).toHaveAttribute(
      "href",
      "/api/v1/workbench/PF_1001/performance/evidence/artifacts/calc-workspace-summary/request.json"
    );
    expect(
      screen.getByText("Execution and lineage evidence can be reviewed for this portfolio.")
    ).toBeInTheDocument();
  });

  it("renders archived artifacts with a gateway-backed download route", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    if (scenario.workspace.evidence_view) {
      scenario.workspace.evidence_view.calculations[0].artifacts = [
        {
          artifact_name: "portfolio-review.pdf",
          url: "/api/v1/documents/doc_1/download",
          content_type: "application/pdf",
          archive_document_id: "doc_1",
          archive_document_metadata_url: "/api/bff/api/v1/documents/doc_1?current=true",
          archive_document_download_url: "/api/bff/api/v1/documents/doc_1/download",
        },
      ];
    }

    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(screen.getByRole("link", { name: "portfolio-review.pdf" })).toHaveAttribute(
      "href",
      "/api/bff/api/v1/documents/doc_1/download"
    );
    expect(document.querySelector(".performance-evidence-archive-artifact")).toBeTruthy();
    expect(
      screen.getByText(
        "Archived document metadata and binary download are routed through the Workbench BFF and Gateway document boundary."
      )
    ).toBeInTheDocument();
  });

  it("renders RFC-0079 limitations when evidence is partially backed", () => {
    const scenario = buildPartialEvidencePerformanceScenario();

    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(screen.getByLabelText("Evidence limitations")).toHaveTextContent(
      "Limitation: One or more performance calculations still have pending lineage evidence."
    );
  });

  it.each([
    {
      name: "unavailable evidence",
      scenario: buildUnavailableEvidencePerformanceScenario(),
      expectedHeading: "Evidence unavailable",
      expectedReason: "Evidence and lineage surfaces are not exposed by the current gateway contract.",
      supportsWorkspace: true,
    },
    {
      name: "partial evidence",
      scenario: buildPartialEvidencePerformanceScenario(),
      expectedHeading: "Evidence and Calculation Context",
      expectedReason: "Lineage artifacts are available, but execution evidence is incomplete.",
      supportsWorkspace: true,
    },
    {
      name: "supported evidence",
      scenario: buildSupportedEvidencePerformanceScenario(),
      expectedHeading: "Evidence and Calculation Context",
      expectedReason: "Execution and lineage evidence can be reviewed for this portfolio.",
      supportsWorkspace: true,
    },
  ])("renders a contract-backed evidence state for $name", ({ scenario, expectedHeading, expectedReason, supportsWorkspace }) => {
    render(
      <PerformanceEvidenceMode
        capability={scenario.capabilities.evidence}
        evidenceView={scenario.workspace.evidence_view}
      />
    );

    expect(screen.getByText(expectedHeading)).toBeInTheDocument();
    expect(screen.getByText(expectedReason)).toBeInTheDocument();

    if (supportsWorkspace) {
      expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    } else {
      expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
    }
  });
});

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceEvidenceMode from "../../src/apps/performance/components/performance-evidence-mode";
import {
  buildPartialEvidencePerformanceScenario,
  buildSupportedEvidencePerformanceScenario,
  buildUnavailableEvidencePerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

function publishCalculationInputRecord(
  scenario: ReturnType<typeof buildSupportedEvidencePerformanceScenario>,
) {
  if (!scenario.workspace.evidence_view) return;
  scenario.workspace.evidence_view.calculations[0].artifacts = [{
    artifact_name: "request.json",
    url: "/api/v1/workbench/PF_1001/performance/evidence/artifacts/calc-workspace-summary/request.json",
  }];
}

describe("PerformanceEvidenceMode", () => {
  it("renders business-facing unavailable posture without a technical contract dump", () => {
    const scenario = buildUnavailableEvidencePerformanceScenario();
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    expect(document.querySelector("#performance-evidence.workbench-data-grid-frame")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Calculation assurance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Assurance unavailable" })).toBeInTheDocument();
    expect(screen.getByText("The source has not provided a usable calculation-assurance package for this performance selection.")).toBeInTheDocument();
    expect(screen.queryByText("Evidence and Calculation Context")).not.toBeInTheDocument();
    expect(screen.queryByText(/backend contract/i)).not.toBeInTheDocument();
  });

  it("makes partial calculation and lineage posture decision-ready", () => {
    const scenario = buildPartialEvidencePerformanceScenario();
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    const workspace = screen.getByTestId("performance-evidence-assurance");
    expect(workspace).toHaveAttribute("data-assurance-state", "incomplete");
    expect(within(workspace).getByText("Incomplete evidence")).toBeInTheDocument();
    expect(within(workspace).getByRole("heading", { name: "Control exceptions" })).toBeInTheDocument();
    expect(within(workspace).getByText("Evidence package incomplete")).toBeInTheDocument();
    expect(within(workspace).getByText("Supporting evidence still being prepared")).toBeInTheDocument();
    expect(within(workspace).getByText("Portfolio performance summary")).toBeInTheDocument();
    expect(within(workspace).getByText("No supporting record is published for this calculation.")).toBeInTheDocument();
  });

  it("renders concise assurance, context, coverage, and evidence access", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    publishCalculationInputRecord(scenario);
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    const workspace = screen.getByTestId("performance-evidence-assurance");
    expect(workspace).toHaveAttribute("data-assurance-state", "incomplete");
    expect(within(workspace).getByRole("heading", { name: "Calculation coverage" })).toBeInTheDocument();
    const context = within(workspace).getByLabelText("Performance assurance context");
    expect(context).toHaveTextContent("As of2026-02-24");
    expect(context).toHaveTextContent("Review periodYTD");
    expect(context).toHaveTextContent("Return basisNet of fees");
    expect(within(workspace).getByText("Evidence coverage is limited")).toBeInTheDocument();
    expect(within(workspace).getByText(/Issuer is outside the published evidence coverage/)).toBeInTheDocument();
    expect(within(workspace).getByText("Portfolio performance summary")).toBeInTheDocument();
    expect(within(workspace).getByRole("link", { name: "Calculation input record" })).toHaveAttribute(
      "href",
      "/api/bff/api/v1/workbench/PF_1001/performance/evidence/artifacts/calc-workspace-summary/request.json"
    );
    expect(within(workspace).getByRole("heading", { name: "Evidence access" })).toBeInTheDocument();
    expect(within(workspace).getByText(/1 governed methodology reference is recorded/)).toBeInTheDocument();
  });

  it("keeps raw identifiers and technical vocabulary in one collapsed support disclosure", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    publishCalculationInputRecord(scenario);
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    const workspace = screen.getByTestId("performance-evidence-assurance");
    const disclosure = within(workspace).getByText("Technical support details").closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure).not.toHaveAttribute("open");
    expect(within(disclosure!).getByText("lotus-performance")).toBeInTheDocument();
    expect(within(disclosure!).getByText("calc-workspace-summary")).toBeInTheDocument();
    expect(within(disclosure!).getAllByText("WORKSPACE_SUMMARY")).toHaveLength(2);
    expect(within(disclosure!).getByText("v1")).toBeInTheDocument();
    expect(within(disclosure!).getByText(/request\.json · \/api\/v1\/workbench/)).toBeInTheDocument();

    const primaryRegions = [
      within(workspace).getByRole("region", { name: "Incomplete evidence" }),
      within(workspace).getByRole("region", { name: "Control exceptions" }),
      within(workspace).getByRole("region", { name: "Calculation coverage" }),
    ];
    primaryRegions.forEach((region) => {
      expect(region).not.toHaveTextContent("lotus-performance");
      expect(region).not.toHaveTextContent("calc-workspace-summary");
      expect(region).not.toHaveTextContent("WORKSPACE_SUMMARY");
      expect(region).not.toHaveTextContent("gateway_contract");
    });
  });

  it("preserves an archived artifact through the Workbench BFF route", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    if (scenario.workspace.evidence_view) {
      scenario.workspace.evidence_view.calculations[0].artifacts = [{
        artifact_name: "portfolio-review.pdf",
        url: "/api/v1/documents/doc_1/download",
        content_type: "application/pdf",
        archive_document_id: "doc_1",
        archive_document_metadata_url: "/api/bff/api/v1/documents/doc_1?current=true",
        archive_document_download_url: "/api/bff/api/v1/documents/doc_1/download",
      }];
    }
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    expect(screen.getByRole("link", { name: "Archived evidence document" })).toHaveAttribute("href", "/api/bff/api/v1/documents/doc_1/download");
    expect(screen.getByText("Open the governed archived document through the Workbench evidence boundary.")).toBeInTheDocument();
  });

  it("does not render an unsafe source route as an actionable link", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    if (scenario.workspace.evidence_view) {
      scenario.workspace.evidence_view.calculations[0].artifacts = [{
        artifact_name: "request.json",
        url: "https://performance.internal/evidence/request.json",
      }];
    }
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    expect(screen.getByRole("heading", { name: "Attention required" })).toBeInTheDocument();
    expect(screen.getByText("Supporting record route unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Calculation input record" })).not.toBeInTheDocument();
    expect(screen.getByText("This source-published route is not available through the Workbench evidence boundary.")).toBeInTheDocument();
  });

  it("renders limitations as a business exception and preserves exact support detail", () => {
    const scenario = buildPartialEvidencePerformanceScenario();
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    expect(screen.getByText("Source limitation applies")).toBeInTheDocument();
    const disclosure = screen.getByText("Technical support details").closest("details");
    expect(within(disclosure!).getByText("One or more performance calculations still have pending lineage evidence.")).toBeInTheDocument();
  });

  it("renders a truthful empty calculation state", () => {
    const scenario = buildSupportedEvidencePerformanceScenario();
    if (scenario.workspace.evidence_view) scenario.workspace.evidence_view.calculations = [];
    render(<PerformanceEvidenceMode capability={scenario.capabilities.evidence} evidenceView={scenario.workspace.evidence_view} />);

    expect(screen.getByTestId("performance-evidence-assurance")).toHaveAttribute("data-assurance-state", "incomplete");
    expect(screen.getByText("No calculation evidence reported")).toBeInTheDocument();
    expect(screen.getByText(/cannot be treated as assured/)).toBeInTheDocument();
  });
});

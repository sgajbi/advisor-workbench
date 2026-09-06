import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ProposalEvidenceControlsPanel,
  ProposalLineageAuditPanel,
} from "@/features/proposals/components/proposal-detail-domain-panels";

const readySourcePosture = {
  isInitialLoading: false,
  isRefreshing: false,
  isPermissionBlocked: false,
  isUnavailable: false,
  hasRefreshFailure: false,
};

describe("proposal detail audit-time presentation", () => {
  it("renders version lookup and lineage instants in disclosed UTC", () => {
    render(
      <>
        <ProposalEvidenceControlsPanel
          includeEvidence={false}
          readControlsDisabled={false}
          createVersionDisabled={false}
          onIncludeEvidenceChange={vi.fn()}
          versionLookupNo={2}
          onVersionLookupNoChange={vi.fn()}
          onLoadVersion={vi.fn()}
          onCreateNextVersion={vi.fn()}
          creatingVersion={false}
          createdVersionNo={null}
          versionLookup={{
            version_no: 2,
            status_at_creation: "DRAFT",
            created_at: "2026-05-25T09:00:00+08:00",
          }}
          versionActionError={null}
          versionActionErrorSupportEvidence={null}
        />
        <ProposalLineageAuditPanel
          artifactHash="sha256:artifact"
          requestHash="sha256:request"
          simulationHash="sha256:simulation"
          generatedAt="25 May 2026, 01:00 UTC"
          lineageVersions={[
            { version_no: 2, created_at: "2026-05-25T01:00:00Z" },
          ]}
          sourcePosture={readySourcePosture}
        />
      </>,
    );

    expect(screen.getAllByText(/25 May 2026, 01:00 UTC/)).toHaveLength(3);
    expect(document.body).not.toHaveTextContent("2026-05-25T01:00:00Z");
    expect(document.body).not.toHaveTextContent("2026-05-25T09:00:00+08:00");
  });

  it("does not expose malformed proposal audit instants as business evidence", () => {
    render(
      <ProposalLineageAuditPanel
        generatedAt="Not reported"
        lineageVersions={[{ version_no: 3, created_at: "not-a-timestamp" }]}
        sourcePosture={readySourcePosture}
      />,
    );

    expect(screen.getByText("Latest artifact generated at Not reported.")).toBeInTheDocument();
    expect(screen.getByText("Created time not reported")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("not-a-timestamp");
  });
});

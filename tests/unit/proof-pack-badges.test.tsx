import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ProofPackAvailabilityBadge,
  ProofPackStateBadge,
} from "../../src/features/workbench/components/proof-pack-badges";

describe("proof-pack badges", () => {
  it("renders proof-pack states with business wording", () => {
    render(<ProofPackStateBadge state="PENDING_REVIEW" />);

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("renders proof-pack reason codes as advisor-readable reasons", () => {
    render(<ProofPackStateBadge state="PROOF_PACK_READY" reason />);

    expect(screen.getByText("Proof Pack Ready")).toBeInTheDocument();
  });

  it("renders evidence availability from source-backed status labels", () => {
    render(<ProofPackAvailabilityBadge label="Evidence" statusLabel="Review pending" />);

    expect(screen.getByText("Evidence Review pending")).toBeInTheDocument();
  });

  it("renders handoff availability without adding workflow capability", () => {
    render(<ProofPackAvailabilityBadge label="Memo" available={false} />);

    expect(screen.getByText("Memo Unavailable")).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import {
  ADVISORY_OVERVIEW_COPY,
  ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY,
  advisoryOverviewLoadingCopy,
  advisoryOverviewUnavailableCopy,
} from "../../src/copy/advisory-overview-copy";

describe("Advisory Overview business copy", () => {
  it("presents the workflow as proposal prioritisation and a next action", () => {
    expect(ADVISORY_OVERVIEW_COPY).toMatchObject({
      heading: "Adviser priorities",
      decisionEyebrow: "Adviser decision",
      worklistEyebrow: "Adviser worklist",
      buildDraftAction: "Build adviser-use draft",
    });
    expect(ADVISORY_OVERVIEW_COPY.subtitle).toContain("Prioritise open proposals");
    expect(ADVISORY_OVERVIEW_COPY.subtitle).toContain("next permitted action");
  });

  it("distinguishes loading from an adviser-requested retry", () => {
    expect(advisoryOverviewLoadingCopy("initial")).toEqual({
      title: "Loading advisory priorities",
      body: "Loading proposal priorities and current actions for this portfolio.",
    });
    expect(advisoryOverviewLoadingCopy("retrying")).toEqual({
      title: "Checking advisory priorities",
      body: "Checking for updated proposal priorities for this portfolio.",
    });
  });

  it("gives complete, recovery-led copy for initial and later-window failures", () => {
    expect(
      advisoryOverviewUnavailableCopy({
        hasPreviousWindow: false,
        retryFailed: false,
      }),
    ).toMatchObject({
      title: "Advisory priorities are unavailable",
      body: "The proposal worklist could not be loaded.",
      hint: expect.stringContaining("No substitute proposal"),
    });
    expect(
      advisoryOverviewUnavailableCopy({
        hasPreviousWindow: false,
        retryFailed: true,
      }).title,
    ).toBe("Advisory priorities remain unavailable");
    expect(
      advisoryOverviewUnavailableCopy({
        hasPreviousWindow: true,
        retryFailed: false,
      }),
    ).toEqual({
      title: "This proposal window is unavailable",
      body: "The next group of proposals could not be loaded.",
      hint: "Retry this proposal window, or return to the previously loaded proposals.",
    });
  });

  it("keeps retained proposals explicit when an update fails", () => {
    expect(ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY).toEqual({
      title: "Proposal priorities could not be updated",
      body:
        "Previously loaded proposals remain available, but the latest update did not complete.",
      hint:
        "Retry before relying on this worklist for a client discussion or implementation decision.",
    });
  });

  it("does not expose transport or evidence-governance jargon", () => {
    const productiveCopy = JSON.stringify({
      ...ADVISORY_OVERVIEW_COPY,
      ...ADVISORY_OVERVIEW_REFRESH_FAILURE_COPY,
      loading: advisoryOverviewLoadingCopy("initial"),
      retrying: advisoryOverviewLoadingCopy("retrying"),
      unavailable: advisoryOverviewUnavailableCopy({
        hasPreviousWindow: false,
        retryFailed: false,
      }),
    });

    expect(productiveCopy).not.toMatch(
      /gateway|bff|source[- ](?:owned|confirmed|backed)|supportability|posture|governed|inferred/i,
    );
  });
});

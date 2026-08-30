export const PERFORMANCE_EVIDENCE_COPY = {
  workspace: {
    title: "Calculation assurance",
    subtitle:
      "Confirm whether the selected performance result has complete calculation, lineage, and supporting evidence for internal review.",
    incompleteTitle: "Assurance evidence incomplete",
    unavailableTitle: "Assurance unavailable",
    unavailableBody:
      "The source has not provided a usable calculation-assurance package for this performance selection.",
  },
  summary: {
    eyebrow: "Review status",
    contextLabel: "Performance assurance context",
  },
  methodology: {
    none: "No methodology reference is published for this selection.",
    recorded: (count: number) =>
      `${count} methodology ${count === 1 ? "reference is" : "references are"} recorded in support details.`,
  },
  exceptions: {
    calculationVersionMissing: {
      title: "Calculation version not confirmed",
      detail:
        "The package does not identify the calculation definition or analytics version used for its results.",
      action:
        "Obtain versioned calculation evidence before relying on the assurance conclusion.",
    },
    calculationAvailabilityMissing: {
      title: "Calculation availability not confirmed",
      detail:
        "The package does not identify whether the required calculation is available for review.",
      action:
        "Obtain current calculation availability evidence before relying on the package.",
    },
    calculationAvailabilityIdentityMissing: {
      title: "Calculation reference not confirmed",
      detail:
        "An availability assessment does not identify both the responsible source and calculation reference.",
      action:
        "Obtain complete calculation availability evidence before relying on the assurance conclusion.",
    },
    calculationAvailabilityQualified:
      "The calculation is available with stated limitations.",
    calculationAvailabilityUnknown:
      "The calculation availability state is not recognised.",
    methodologyMissing: {
      title: "Methodology reference not confirmed",
      detail: "The source did not publish a methodology reference for this package.",
      action:
        "Obtain the applicable methodology reference before relying on the calculation evidence.",
    },
  },
  support: {
    evidenceStateLabel: "Evidence availability state",
    capabilityStateLabel: "Screen capability state",
    availabilityGroupTitle: "Source availability checks",
  },
} as const;

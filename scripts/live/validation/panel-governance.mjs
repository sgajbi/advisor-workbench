export function createPanelGovernance(summary, panelRegistry) {
  const panelRegistryById = new Map(panelRegistry.panels.map((panel) => [panel.panelId, panel]));

  function incrementCount(target, key) {
    const normalizedKey = typeof key === "string" && key ? key : "unknown";
    target[normalizedKey] = (target[normalizedKey] ?? 0) + 1;
  }

  function sortCountMap(counts) {
    return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
  }

  function buildSupportabilityMatrix() {
    const classifiedPanels = new Set(summary.panelClassifications.map((panel) => panel.panel));
    const requiredStateCounts = {};
    const observedStateCounts = {};
    const ownerCounts = {};
    const nonReadyPanels = [];
    const missingPanels = [];

    for (const panelSpec of panelRegistry.panels) {
      incrementCount(requiredStateCounts, panelSpec.requiredSupportState);
      if (!classifiedPanels.has(panelSpec.panelId)) {
        missingPanels.push(panelSpec.panelId);
      }
    }

    for (const panel of summary.panelClassifications) {
      const panelSpec = panelRegistryById.get(panel.panel);
      incrementCount(observedStateCounts, panel.state);
      incrementCount(ownerCounts, panel.owner);
      if (panel.state !== "ready") {
        nonReadyPanels.push({
          panel: panel.panel,
          state: panel.state,
          requiredSupportState: panelSpec?.requiredSupportState ?? null,
          owner: panel.owner,
          reason: panel.reason ?? null,
          knownLimitations: panelSpec?.knownLimitations ?? [],
          ownerFollowUpRfc: panelSpec?.ownerFollowUpRfc ?? null,
        });
      }
    }

    return {
      registeredPanelCount: panelRegistry.panels.length,
      classifiedPanelCount: summary.panelClassifications.length,
      requiredStateCounts: sortCountMap(requiredStateCounts),
      observedStateCounts: sortCountMap(observedStateCounts),
      ownerCounts: sortCountMap(ownerCounts),
      nonReadyPanels: nonReadyPanels.sort((left, right) => left.panel.localeCompare(right.panel)),
      missingPanels: missingPanels.sort(),
    };
  }

  function recordSupportabilityCheck(panel, evidence) {
    summary.supportabilityChecks.push({ panel, ...evidence });
  }

  function recordPanelClassification(panel, state, owner, evidence) {
    const panelSpec = panelRegistryById.get(panel);
    if (!panelSpec) {
      throw new Error(`Panel classification '${panel}' is not present in the governed panel registry.`);
    }
    if (!panelSpec.allowedStates.includes(state)) {
      throw new Error(
        `Panel classification '${panel}' used unsupported state '${state}'. Allowed states: ${panelSpec.allowedStates.join(", ")}.`
      );
    }
    summary.panelClassifications.push({ panel, state, owner, ...evidence });
  }

  function assertNoUnsupportedBlankPanels() {
    const unsupportedBlankPanels = summary.panelClassifications.filter(
      (panel) => panel.state === "supported_blank"
    );
    if (unsupportedBlankPanels.length > 0) {
      throw new Error(
        `Unsupported blank panels found: ${unsupportedBlankPanels
          .map((panel) => panel.panel)
          .join(", ")}.`
      );
    }
  }

  function assertPanelSupportabilityAlignment() {
    const classifiedPanels = new Set(summary.panelClassifications.map((panel) => panel.panel));

    for (const panelSpec of panelRegistry.panels) {
      if (!classifiedPanels.has(panelSpec.panelId)) {
        throw new Error(`Governed panel '${panelSpec.panelId}' was not classified during validation.`);
      }
    }

    for (const panel of summary.panelClassifications) {
      const panelSpec = panelRegistryById.get(panel.panel);
      if (panel.owner !== panelSpec.owningService) {
        throw new Error(
          `Panel '${panel.panel}' reported owner '${panel.owner}' but registry owner is '${panelSpec.owningService}'.`
        );
      }
      if (panel.state !== panelSpec.requiredSupportState) {
        throw new Error(
          `Panel '${panel.panel}' reported state '${panel.state}' but registry requires '${panelSpec.requiredSupportState}'.`
        );
      }
      if (
        (panel.state === "partial" || panel.state === "unavailable") &&
        !panel.reason &&
        panelSpec.knownLimitations.length < 1 &&
        !panelSpec.ownerFollowUpRfc
      ) {
        throw new Error(
          `Panel '${panel.panel}' is ${panel.state} without a governed reason, limitation, or follow-up RFC.`
        );
      }
      recordSupportabilityCheck(panel.panel, {
        owner: panel.owner,
        state: panel.state,
        requiredSupportState: panelSpec.requiredSupportState,
        gatewayEndpoint: panelSpec.gatewayEndpoint,
        ownerFollowUpRfc: panelSpec.ownerFollowUpRfc,
      });
    }

    summary.supportabilityMatrix = buildSupportabilityMatrix();
  }

  return {
    panelRegistryById,
    recordPanelClassification,
    assertNoUnsupportedBlankPanels,
    assertPanelSupportabilityAlignment,
  };
}

import type {
  PerformanceAdvisorBriefAction,
  PerformanceAdvisorBriefViewModel,
} from "../../advisor-brief-view-model";

export function dedupeAdvisorActions(actions: PerformanceAdvisorBriefAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.targetMode}:${action.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function canCopyAdvisorBrief(brief: PerformanceAdvisorBriefViewModel): boolean {
  const { aiDisclosure } = brief;
  const reviewAdmitsInternalCopy =
    aiDisclosure.humanReview.state === "not-required" ||
    aiDisclosure.humanReview.state === "review-required" ||
    (aiDisclosure.humanReview.state === "reviewed" &&
      aiDisclosure.humanReview.sourceRecorded);
  const currentAvailability = !["stale", "unavailable"].includes(
    aiDisclosure.availability
  );

  return (
    brief.talkingPoints.length > 0 &&
    aiDisclosure.evidence.state !== "missing" &&
    aiDisclosure.freshness.state !== "stale" &&
    currentAvailability &&
    reviewAdmitsInternalCopy
  );
}

export function toAdvisorNoteCopy(brief: PerformanceAdvisorBriefViewModel) {
  const sections = [
    getAdvisorNoteBoundary(brief),
    "",
    brief.summary,
    "",
    "Advisor Talking Points",
    ...brief.talkingPoints.map((item) => `- ${item.headline} ${item.detail}`),
    "",
    "Recommended Actions",
    ...brief.recommendedActions.map((action) => `- ${action.label}`),
    "",
    "Risks / Exceptions",
    ...(brief.risksAndExceptions.length
      ? brief.risksAndExceptions.map((item) => `- ${item.headline} ${item.detail}`)
      : ["- No material supportability exceptions are flagged."]),
  ];

  return sections.join("\n");
}

function getAdvisorNoteBoundary(brief: PerformanceAdvisorBriefViewModel): string {
  if (brief.aiDisclosure.humanReview.state === "rejected") {
    return "BLOCKED INTERNAL NOTE — Source review rejected this brief; do not use or copy.";
  }
  if (
    brief.aiDisclosure.availability === "stale" ||
    brief.aiDisclosure.freshness.state === "stale"
  ) {
    return "HISTORICAL INTERNAL NOTE — This brief is superseded; do not use or copy.";
  }
  if (
    brief.aiDisclosure.humanReview.state === "reviewed" &&
    brief.aiDisclosure.humanReview.sourceRecorded
  ) {
    return "INTERNAL REVIEWED NOTE — Source-recorded human review; not approved for client use.";
  }
  if (brief.aiDisclosure.humanReview.state === "not-required") {
    return "INTERNAL NOTE — The source reports human review is not required; not approved for client use.";
  }
  if (brief.aiDisclosure.humanReview.state === "review-required") {
    return "INTERNAL WORKING NOTE — Human review required; not approved for client use.";
  }
  return "BLOCKED INTERNAL NOTE — Review evidence is unavailable; do not use or copy.";
}

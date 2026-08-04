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

export function toAdvisorNoteCopy(brief: PerformanceAdvisorBriefViewModel) {
  const sections = [
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

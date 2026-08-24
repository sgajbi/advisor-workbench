const REVIEW_ACTOR_NAMESPACE = "review:";

export function resolveAdvisorBriefReviewerReference(value) {
  const sourceActor = typeof value === "string" ? value.trim() : "";
  if (!sourceActor) {
    return undefined;
  }

  if (!sourceActor.startsWith(REVIEW_ACTOR_NAMESPACE)) {
    return sourceActor;
  }

  const reviewerReference = sourceActor.slice(REVIEW_ACTOR_NAMESPACE.length).trim();
  return reviewerReference || undefined;
}

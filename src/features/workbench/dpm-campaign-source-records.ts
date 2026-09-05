const WORKFLOW_COLLECTION_KEYS = [
  "items",
  "approval_decisions",
  "assignment_actions",
  "assignment_tasks",
  "maker_checker_controls",
  "tasks",
  "controls",
] as const;

export function readDpmCampaignDefinitionRecords(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  const records = readFirstRecordCollection(data, [
    "items",
    "campaign_definitions",
  ]);
  if (records.length > 0) return records;
  return data &&
    typeof data.campaign_id === "string" &&
    typeof data.campaign_version === "string"
    ? [data]
    : [];
}

export function readDpmCampaignWorkflowRecords(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown>[] {
  return readFirstRecordCollection(data, WORKFLOW_COLLECTION_KEYS);
}

function readFirstRecordCollection(
  data: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): Record<string, unknown>[] {
  if (!data) return [];
  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key].filter(isRecord);
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class WorkbenchResponseEvidenceError extends Error {
  readonly statusClass = "2xx" as const;
  readonly errorCategory = "evidence" as const;

  constructor(message: string) {
    super(message);
    this.name = "WorkbenchResponseEvidenceError";
  }
}

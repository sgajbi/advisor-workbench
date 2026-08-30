import { z } from "zod";

const availabilityStateSchema = z.enum(["ready", "partial", "unavailable"]);
const businessDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eligibilityStateSchema = z.enum([
  "ready",
  "partial",
  "unavailable",
  "permission_blocked",
  "unsupported",
]);

const availabilitySchema = z
  .object({
    state: availabilityStateSchema,
    reasonCode: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const eligibilitySchema = z
  .object({
    state: eligibilityStateSchema,
    reasonCode: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const submissionCapabilitySchema = z
  .object({
    capabilityId: z.enum([
      "reporting.portfolio_review.single",
      "reporting.portfolio_review.explicit_batch",
    ]),
    method: z.literal("POST"),
    path: z.enum(["/api/v1/reports/portfolio-reviews", "/api/v1/report-batches"]),
    state: eligibilityStateSchema,
    reasonCode: z.string().min(1),
  })
  .strict();

const configurationOptionSchema = z
  .object({
    value: z.string().min(1),
    businessLabel: z.string().min(1),
  })
  .strict();

const configurationFieldBaseSchema = z.object({
    fieldId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    defaultingPolicy: z.string().min(1),
    valueSource: z.enum([
      "caller",
      "portfolio_context_or_caller",
      "gateway_eligible_benchmark",
      "report_catalogue",
    ]),
    options: z.array(configurationOptionSchema),
  });

const configurationFieldSchema = z.union([
  configurationFieldBaseSchema
    .extend({
      inputType: z.literal("text"),
      requirement: z.enum(["required", "optional", "conditional"]),
    })
    .strict(),
  configurationFieldBaseSchema
    .extend({
      fieldId: z.literal("as_of_date"),
      inputType: z.literal("business_date"),
      requirement: z.enum(["required", "optional"]),
    })
    .strict(),
  configurationFieldBaseSchema
    .extend({
      fieldId: z.literal("reporting_currency"),
      inputType: z.literal("currency"),
      requirement: z.enum(["required", "optional"]),
    })
    .strict(),
  configurationFieldBaseSchema
    .extend({
      fieldId: z.literal("benchmark_code"),
      inputType: z.literal("benchmark"),
      requirement: z.literal("optional"),
    })
    .strict(),
  configurationFieldBaseSchema
    .extend({
      fieldId: z.literal("allocation_dimensions"),
      inputType: z.literal("multi_select"),
      requirement: z.literal("optional"),
    })
    .strict(),
]);

const reportSectionSchema = z
  .object({
    sectionId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    displayOrder: z.number().int().min(1),
    selectionPosture: z.enum(["required", "optional"]),
    defaultSelected: z.boolean(),
    dependencyFieldIds: z.array(z.string().min(1)),
  })
  .strict();

const outputFormatSchema = z
  .object({
    formatId: z.enum(["json", "pdf"]),
    businessLabel: z.string().min(1),
    usePosture: z.enum(["system_integration", "governed_document"]),
    state: availabilityStateSchema,
    reasonCode: z.string().min(1),
  })
  .strict();

const orderingModeSchema = z
  .object({
    modeId: z.enum([
      "single_portfolio",
      "explicit_portfolio_batch",
      "governed_schedule",
      "source_workflow",
    ]),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    defaultOutputFormat: z.enum(["json", "pdf"]),
    interactive: z.boolean(),
    eligibility: eligibilitySchema,
    submission: submissionCapabilitySchema.nullable().optional(),
  })
  .strict();

const reportFamilySchema = z
  .object({
    reportFamilyId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    intendedUse: z.string().min(1),
    audienceRoles: z.array(z.string().min(1)),
    clientReleasePosture: z.enum([
      "advisor_review_required_distribution_not_supported",
      "internal_control_only",
    ]),
    orderingModes: z.array(orderingModeSchema),
    outputFormats: z.array(outputFormatSchema),
    configurationFields: z.array(configurationFieldSchema),
    sections: z.array(reportSectionSchema),
    availability: availabilitySchema,
    eligibility: eligibilitySchema,
  })
  .strict();

export const reportOrderingResponseSchema = z
  .object({
    contractVersion: z.literal("workbench-report-ordering.v1"),
    sourceAuthority: z.literal("reporting"),
    sourceContractVersion: z.literal("report-ordering-catalogue.v1"),
    scopeSelection: z
      .object({
        scopeType: z.enum(["portfolio", "client", "book"]),
        scopeId: z.string().min(1),
      })
      .strict()
      .nullable(),
    catalogueAvailability: availabilitySchema,
    scopeEligibility: eligibilitySchema,
    reportFamilies: z.array(reportFamilySchema),
  })
  .strict();

const portfolioScopeSchema = z
  .object({
    portfolio_ids: z.array(z.string().min(1)).min(1),
  })
  .passthrough();

export const reportJobHandleSchema = z
  .object({
    report_request_id: z.string().min(1),
    report_job_id: z.string().min(1),
    status: z.string().min(1),
    status_url: z.string().min(1),
    idempotency_key: z.string().min(1),
  })
  .strict();

const reportJobListItemSchema = z
  .object({
    reportJobId: z.string().min(1),
    reportRequestId: z.string().min(1),
    reportType: z.string().min(1),
    tenantId: z.string().min(1),
    region: z.string().min(1),
    portfolioScope: portfolioScopeSchema,
    asOfDate: z.string().min(1),
    status: z.string().min(1),
    failureCategory: z.string().nullable(),
    currentStep: z.string().min(1),
    retryEligible: z.boolean(),
    cancelRequested: z.boolean(),
    idempotencyKey: z.string().min(1),
    correlationId: z.string(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();

export const reportJobListResponseSchema = z
  .object({
    count: z.number().int().min(0),
    appliedFilters: z.object({}).passthrough(),
    items: z.array(reportJobListItemSchema),
  })
  .strict();

const batchStatusSchema = z.enum([
  "materialized", "running", "paused", "cancelled", "completed",
  "completed_with_failures", "failed",
]);
const batchItemStatusSchema = z.enum([
  "materialized", "leased", "waiting_on_report_job", "succeeded",
  "failed_retryable", "failed_terminal", "cancelled", "recovery_pending",
]);
const reportingSupportabilitySchema = z.object({
  feature_key: z.string().min(1),
  state: z.string().min(1),
  reason: z.string().min(1),
  freshness_bucket: z.string().min(1),
  evidence_feature_count: z.number().int().min(0),
  ready_evidence_feature_count: z.number().int().min(0),
  degraded_evidence_feature_count: z.number().int().min(0),
  workflow_count: z.number().int().min(0),
  ready_workflow_count: z.number().int().min(0),
}).strict();
const renderSupportabilitySchema = z.object({
  feature_key: z.string().min(1),
  state: z.string().min(1),
  reason: z.string().min(1),
  freshness_bucket: z.string().min(1),
  deterministic_output_supported: z.boolean(),
  render_store_ready: z.boolean(),
  template_registry_ready: z.boolean(),
  default_output_format: z.string().min(1).nullable(),
  supported_output_formats: z.array(z.string().min(1)),
}).strict();

export const reportBatchHandleSchema = z.object({
  batch_id: z.string().min(1),
  status: batchStatusSchema,
  status_url: z.string().min(1),
  idempotency_key: z.string().min(1),
  item_count: z.number().int().min(0),
  supportability: reportingSupportabilitySchema.nullable(),
  render_supportability: renderSupportabilitySchema.nullable(),
}).strict();

const reportBatchItemSchema = z.object({
  batch_item_id: z.string().min(1),
  item_position: z.number().int().min(1),
  portfolio_id: z.string().min(1),
  status: batchItemStatusSchema,
  report_job_id: z.string().min(1).nullable(),
  attempt_count: z.number().int().min(0),
  retry_eligible: z.boolean(),
  next_retry_at: z.string().min(1).nullable(),
  last_error_category: z.string().min(1).nullable(),
  last_error_summary: z.string().min(1).nullable(),
  created_at: z.string().min(1),
  started_at: z.string().min(1).nullable(),
  completed_at: z.string().min(1).nullable(),
  cancelled_at: z.string().min(1).nullable(),
}).strict();

const reportBatchStatusBaseSchema = z.object({
  batch_id: z.string().min(1),
  selector_mode: z.literal("explicit_portfolio_list"),
  tenant_id: z.string().min(1),
  region: z.string().min(1),
  materialized_portfolio_ids: z.array(z.string().min(1)).min(1),
  as_of_date: businessDateSchema,
  requested_output_formats: z.array(z.string().min(1)).min(1),
  reporting_currency: z.string().min(1).nullable(),
  status: batchStatusSchema,
  item_count: z.number().int().min(0),
  status_counts: z.record(z.string(), z.number().int().min(0)),
  items: z.array(reportBatchItemSchema),
  created_at: z.string().min(1),
  updated_at: z.string().min(1).nullable(),
  started_at: z.string().min(1).nullable(),
  completed_at: z.string().min(1).nullable(),
  cancelled_at: z.string().min(1).nullable(),
  failed_at: z.string().min(1).nullable(),
  correlation_id: z.string().min(1),
  trace_id: z.string().min(1),
  supportability: reportingSupportabilitySchema.nullable(),
  render_supportability: renderSupportabilitySchema.nullable(),
}).strict();

function validateReportBatchStatus(
  status: z.infer<typeof reportBatchStatusBaseSchema>,
  context: z.RefinementCtx,
) {
  const materializedPortfolioIds = new Set(status.materialized_portfolio_ids);
  const itemPortfolioIds = new Set(status.items.map((item) => item.portfolio_id));
  const itemPositions = new Set(status.items.map((item) => item.item_position));

  if (
    status.item_count !== status.materialized_portfolio_ids.length ||
    status.item_count !== status.items.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batch item count must match materialized portfolios and outcomes",
    });
  }
  if (materializedPortfolioIds.size !== status.materialized_portfolio_ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Materialized portfolio identifiers must be unique",
    });
  }
  if (itemPortfolioIds.size !== status.items.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batch outcome portfolio identifiers must be unique",
    });
  }
  if (itemPositions.size !== status.items.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batch outcome positions must be unique",
    });
  }
  if (
    materializedPortfolioIds.size !== itemPortfolioIds.size ||
    [...materializedPortfolioIds].some((portfolioId) => !itemPortfolioIds.has(portfolioId))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batch outcomes must match the materialized portfolio selection",
    });
  }
}

export const reportBatchStatusSchema = reportBatchStatusBaseSchema.superRefine(
  validateReportBatchStatus,
);

export type ReportOrderingResponse = z.infer<typeof reportOrderingResponseSchema>;
export type ReportFamily = ReportOrderingResponse["reportFamilies"][number];
export type ReportConfigurationField = ReportFamily["configurationFields"][number];
export type ReportSection = ReportFamily["sections"][number];
export type ReportOutputFormat = ReportFamily["outputFormats"][number];
export type ReportOrderingMode = ReportFamily["orderingModes"][number];
export type ReportJobHandle = z.infer<typeof reportJobHandleSchema>;
export type ReportJobListResponse = z.infer<typeof reportJobListResponseSchema>;
export type ReportJobListItem = ReportJobListResponse["items"][number];
export type ReportBatchHandle = z.infer<typeof reportBatchHandleSchema>;
export type ReportBatchStatus = z.infer<typeof reportBatchStatusSchema>;
export type ReportBatchReference = Pick<
  ReportBatchStatus,
  "batch_id" | "supportability" | "render_supportability"
>;
export type ReportBatchItem = ReportBatchStatus["items"][number];

export function parseReportOrderingResponse(value: unknown): ReportOrderingResponse {
  return reportOrderingResponseSchema.parse(value);
}

export function parseReportJobHandle(value: unknown): ReportJobHandle {
  return reportJobHandleSchema.parse(value);
}

export function parseReportJobListResponse(value: unknown): ReportJobListResponse {
  return reportJobListResponseSchema.parse(value);
}

export function parseReportBatchHandle(value: unknown): ReportBatchHandle {
  return reportBatchHandleSchema.parse(value);
}

export function parseReportBatchStatus(value: unknown): ReportBatchStatus {
  return reportBatchStatusSchema.parse(value);
}

import { z } from "zod";

const businessDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const advisorBookPortfolioSchema = z
  .object({
    portfolio_id: z.string().min(1),
    display_name: z.string().min(1),
    client_id: z.string().min(1),
    base_currency: z.string().min(1),
    booking_center_code: z.string().min(1),
    mandate_type: z.string().min(1),
    status: z.string().min(1),
    opened_on: businessDateSchema,
    closed_on: businessDateSchema.nullable(),
    membership_source: z.literal("PortfolioManagerBookMembership:v1"),
    membership_reference: z.string().min(1),
    membership_basis: z.enum(["governed_role_assignment", "legacy_advisor_projection"]),
  })
  .strict();

const advisorBookProvenanceSchema = z
  .object({
    product_name: z.literal("PortfolioManagerBookMembership"),
    product_version: z.literal("v1"),
    generated_at: z.string().min(1),
    latest_evidence_timestamp: z.string().min(1).nullable(),
    freshness_status: z.string().min(1),
    data_quality_status: z.string().min(1),
    source_evidence_current: z.boolean(),
    snapshot_id: z.string().min(1).nullable(),
    content_hash: z.string().min(1),
    lineage: z.record(z.string(), z.string()),
  })
  .strict();

export const advisorBookResponseSchema = z
  .object({
    correlation_id: z.string().min(1),
    contract_version: z.literal("v1"),
    scope: z
      .object({
        kind: z.literal("own_book"),
        label: z.literal("My book"),
        as_of_date: businessDateSchema,
        booking_center_code: z.string().min(1),
      })
      .strict(),
    page: z
      .object({
        total_count: z.number().int().min(0),
        offset: z.number().int().min(0),
        limit: z.number().int().min(1).max(100),
        returned_count: z.number().int().min(0),
        sort_by: z.enum(["portfolio_id", "client_id", "mandate_type"]),
        sort_order: z.enum(["asc", "desc"]),
      })
      .strict(),
    items: z.array(advisorBookPortfolioSchema),
    supportability: z
      .object({
        state: z.enum(["ready", "empty", "degraded"]),
        reason_code: z.enum([
          "advisor_book_ready",
          "advisor_book_empty",
          "advisor_book_filter_empty",
          "advisor_book_source_incomplete",
          "advisor_book_tenant_scope_not_reported",
          "advisor_book_legacy_projection",
        ]),
        tenant_scope: z.enum(["source_confirmed", "trusted_context_only"]),
        limitations: z.array(z.string().min(1)),
      })
      .strict(),
    provenance: advisorBookProvenanceSchema.nullable(),
  })
  .strict();

export type AdvisorBookResponse = z.infer<typeof advisorBookResponseSchema>;
export type AdvisorBookPortfolio = AdvisorBookResponse["items"][number];
export type AdvisorBookSortBy = AdvisorBookResponse["page"]["sort_by"];
export type AdvisorBookSortOrder = AdvisorBookResponse["page"]["sort_order"];

export function parseAdvisorBookResponse(value: unknown): AdvisorBookResponse {
  return advisorBookResponseSchema.parse(value);
}

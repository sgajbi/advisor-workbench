import type { AdvisorBookPortfolio, AdvisorBookResponse } from "./contracts";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";

export type AdvisorBookWorkspaceModel = {
  title: string;
  subtitle: string;
  scopeLabel: string;
  asOfLabel: string;
  bookingCentreLabel: string;
  state: "ready" | "degraded" | "empty";
  stateLabel: string;
  stateDetail: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  rows: AdvisorBookPortfolioRow[];
  limitations: Array<{
    key: string;
    label: string;
    detail: string;
    occurrenceCount: number;
  }>;
  supportDetails: Array<{ label: string; value: string }>;
};

export type AdvisorBookPortfolioRow = {
  portfolioId: string;
  portfolioLabel: string;
  portfolioReferenceLabel: string;
  clientReference: string;
  mandateLabel: string;
  currencyLabel: string;
  sourceLifecycleState: string;
  statusLabel: string;
  membershipLabel: string;
};

export type AdvisorBookResultScopeModel = {
  rangeLabel: string;
  viewLabel: string;
};

type AdvisorBookResultScopeRequest = {
  clientId?: string;
  mandateType?: "ADVISORY" | "DISCRETIONARY";
  sortBy?: AdvisorBookResponse["page"]["sort_by"];
  sortOrder?: AdvisorBookResponse["page"]["sort_order"];
};

export function buildAdvisorBookWorkspaceModel(
  response: AdvisorBookResponse,
): AdvisorBookWorkspaceModel {
  const clientCount = new Set(response.items.map((item) => item.client_id)).size;
  const legacyCount = response.items.filter(
    (item) => item.membership_basis === "legacy_advisor_projection",
  ).length;
  const state = response.supportability.state;

  return {
    title: response.scope.label,
    subtitle:
      "Review confirmed portfolio coverage, then continue into the selected client workflow.",
    scopeLabel: "Own book",
    asOfLabel: formatBusinessDateValue(response.scope.as_of_date, {
      nullDisplay: "Not confirmed",
    }),
    bookingCentreLabel: response.scope.booking_center_code,
    state,
    stateLabel: advisorBookStateLabel(state),
    stateDetail: advisorBookStateDetail(response),
    metrics: [
      {
        label: "Matching portfolios",
        value: String(response.page.total_count),
        detail: "Assignments matching the current view",
      },
      {
        label: "Portfolios shown",
        value: String(response.page.returned_count),
        detail: "Assignments on this page",
      },
      {
        label: "Clients shown",
        value: String(clientCount),
        detail: "Distinct client references on this page",
      },
      {
        label: "Assignment basis",
        value: legacyCount === 0 ? "Governed" : `${legacyCount} legacy`,
        detail:
          legacyCount === 0
            ? "Assignments shown use governed roles"
            : "Legacy assignments shown require awareness",
      },
    ],
    rows: response.items.map(toPortfolioRow),
    limitations: consolidateLimitations(response.supportability.limitations),
    supportDetails: [
      { label: "Membership record", value: "Portfolio manager assignments" },
      { label: "Operating scope", value: tenantScopeLabel(response.supportability.tenant_scope) },
      { label: "Availability reference", value: response.supportability.reason_code },
      {
        label: "Limitation references",
        value:
          [...new Set(response.supportability.limitations)].sort().join(", ") ||
          "None reported",
      },
      { label: "Request reference", value: response.correlation_id },
      { label: "Data snapshot reference", value: response.provenance?.snapshot_id ?? "Not reported" },
      {
        label: "Data currency",
        value: response.provenance?.source_evidence_current ? "Current" : "Not confirmed current",
      },
    ],
  };
}

export function buildAdvisorBookResultScopeModel(
  query: AdvisorBookResultScopeRequest,
  page: AdvisorBookResponse["page"],
): AdvisorBookResultScopeModel {
  const requestedSortBy = query.sortBy ?? "portfolio_id";
  const requestedSortOrder = query.sortOrder ?? "asc";
  const displayedOrder = orderLabel(page.sort_by, page.sort_order);
  const requestedOrder = orderLabel(requestedSortBy, requestedSortOrder);
  const scope = [
    query.clientId ? `Client reference ${query.clientId}` : "All clients",
    query.mandateType === "ADVISORY"
      ? "Advisory mandates"
      : query.mandateType === "DISCRETIONARY"
        ? "Discretionary mandates"
        : "All supported mandates",
    `Displayed order: ${displayedOrder}`,
  ];

  if (page.sort_by !== requestedSortBy || page.sort_order !== requestedSortOrder) {
    scope.push(`Requested order: ${requestedOrder}`);
  }

  return {
    rangeLabel: rangeLabel(page),
    viewLabel: scope.join(" · "),
  };
}

function rangeLabel(page: AdvisorBookResponse["page"]): string {
  if (page.returned_count === 0) {
    return `0 of ${page.total_count} portfolios`;
  }
  const firstReturned = page.offset + 1;
  const lastReturned = page.offset + page.returned_count;
  return `${firstReturned}–${lastReturned} of ${page.total_count} portfolios`;
}

function orderLabel(
  sortBy: AdvisorBookResponse["page"]["sort_by"],
  sortOrder: AdvisorBookResponse["page"]["sort_order"],
): string {
  const field =
    sortBy === "client_id"
      ? "Client reference"
      : sortBy === "mandate_type"
        ? "Mandate"
        : "Portfolio reference";
  return `${field}, ${sortOrder === "desc" ? "descending" : "ascending"}`;
}

function toPortfolioRow(item: AdvisorBookPortfolio): AdvisorBookPortfolioRow {
  const hasBusinessLabel = item.display_name !== item.portfolio_id;
  return {
    portfolioId: item.portfolio_id,
    portfolioLabel: item.display_name,
    portfolioReferenceLabel: hasBusinessLabel
      ? `Portfolio reference ${item.portfolio_id}`
      : "Portfolio reference",
    clientReference: item.client_id,
    mandateLabel: mandateLabel(item.mandate_type),
    currencyLabel: item.base_currency,
    sourceLifecycleState: item.status,
    statusLabel: lifecycleLabel(item.status),
    membershipLabel:
      item.membership_basis === "governed_role_assignment"
        ? "Governed role assignment"
        : "Legacy advisor assignment",
  };
}

function advisorBookStateLabel(state: AdvisorBookResponse["supportability"]["state"]): string {
  if (state === "ready") return "Book available";
  if (state === "empty") return "No portfolios in scope";
  return "Available with limitations";
}

function advisorBookStateDetail(response: AdvisorBookResponse): string {
  if (response.supportability.state === "empty") {
    return response.supportability.reason_code === "advisor_book_filter_empty"
      ? "No portfolio memberships match the selected client or mandate filter."
      : "No portfolio assignments were returned for this own-book scope and date.";
  }
  if (response.supportability.state === "degraded") {
    return "Portfolio assignments are available, with operating limitations shown below.";
  }
  return "Portfolio assignments are confirmed for the current own-book scope.";
}

function limitationCopy(rawValue: string) {
  const copy: Record<string, { label: string; detail: string }> = {
    delegated_scope_not_supported: {
      label: "Own book only",
      detail: "Delegated, team, and supervisor book scopes are not available in this release.",
    },
    tenant_scope_not_reported: {
      label: "Operating scope confirmation pending",
      detail: "The operating scope was not confirmed for this view.",
    },
    legacy_advisor_projection: {
      label: "Legacy assignment evidence",
      detail: "At least one portfolio relies on legacy advisor coverage records.",
    },
    source_evidence_not_current: {
      label: "Membership data not confirmed current",
      detail: "The portfolio assignment record was not confirmed current for this request.",
    },
  };
  return copy[rawValue] ?? {
    label: "Additional operating limitation",
    detail: "Operational details contain an unrecognised source limitation for review.",
  };
}

function consolidateLimitations(rawValues: string[]) {
  const limitations = new Map<
    string,
    AdvisorBookWorkspaceModel["limitations"][number]
  >();

  for (const rawValue of rawValues) {
    const copy = limitationCopy(rawValue);
    const key = `${copy.label}:${copy.detail}`;
    const existing = limitations.get(key);
    limitations.set(key, {
      key,
      ...copy,
      occurrenceCount: (existing?.occurrenceCount ?? 0) + 1,
    });
  }

  return [...limitations.values()];
}

function mandateLabel(value: string): string {
  if (value === "DISCRETIONARY") return "Discretionary mandate";
  if (value === "ADVISORY") return "Advisory mandate";
  return "Mandate classification available in operational details";
}

function lifecycleLabel(value: string): string {
  if (value === "ACTIVE") return "Active";
  if (value === "CLOSED") return "Closed";
  return "Status requires review";
}

function tenantScopeLabel(value: AdvisorBookResponse["supportability"]["tenant_scope"]): string {
  return value === "source_confirmed"
    ? "Confirmed by source"
    : "Workbench access context only";
}

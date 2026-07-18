import type { AdvisorBookPortfolio, AdvisorBookResponse } from "./contracts";

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
  limitations: Array<{ label: string; detail: string; rawValue: string }>;
  supportDetails: Array<{ label: string; value: string }>;
};

export type AdvisorBookPortfolioRow = {
  portfolioId: string;
  portfolioLabel: string;
  clientLabel: string;
  mandateLabel: string;
  currencyLabel: string;
  statusLabel: string;
  membershipLabel: string;
};

export function buildAdvisorBookWorkspaceModel(
  response: AdvisorBookResponse,
): AdvisorBookWorkspaceModel {
  const clientCount = new Set(response.items.map((item) => item.client_id)).size;
  const activeCount = response.items.filter((item) => item.status === "ACTIVE").length;
  const legacyCount = response.items.filter(
    (item) => item.membership_basis === "legacy_advisor_projection",
  ).length;
  const state = response.supportability.state;

  return {
    title: response.scope.label,
    subtitle:
      "Review confirmed portfolio coverage, then continue into the selected client workflow.",
    scopeLabel: "Own book",
    asOfLabel: formatBusinessDate(response.scope.as_of_date),
    bookingCentreLabel: response.scope.booking_center_code,
    state,
    stateLabel: advisorBookStateLabel(state),
    stateDetail: advisorBookStateDetail(response),
    metrics: [
      {
        label: "Portfolios",
        value: String(response.page.total_count),
        detail: "Portfolio assignments in the current book scope",
      },
      {
        label: "Clients on this page",
        value: String(clientCount),
        detail: "Distinct clients represented on this page",
      },
      {
        label: "Active portfolios",
        value: String(activeCount),
        detail: "Returned portfolios with an active lifecycle status",
      },
      {
        label: "Role assignment coverage",
        value: legacyCount === 0 ? "Governed" : `${legacyCount} legacy`,
        detail:
          legacyCount === 0
            ? "Returned memberships use governed role assignments"
            : "Legacy advisor projections require operating awareness",
      },
    ],
    rows: response.items.map(toPortfolioRow),
    limitations: response.supportability.limitations.map(toLimitation),
    supportDetails: [
      { label: "Membership record", value: "Portfolio manager assignments" },
      { label: "Operating scope", value: tenantScopeLabel(response.supportability.tenant_scope) },
      { label: "Availability reference", value: response.supportability.reason_code },
      { label: "Request reference", value: response.correlation_id },
      { label: "Data snapshot reference", value: response.provenance?.snapshot_id ?? "Not reported" },
      {
        label: "Data currency",
        value: response.provenance?.source_evidence_current ? "Current" : "Not confirmed current",
      },
    ],
  };
}

function toPortfolioRow(item: AdvisorBookPortfolio): AdvisorBookPortfolioRow {
  return {
    portfolioId: item.portfolio_id,
    portfolioLabel:
      item.display_name === item.portfolio_id
        ? `Portfolio ${item.portfolio_id}`
        : item.display_name,
    clientLabel: `Client ${item.client_id}`,
    mandateLabel: mandateLabel(item.mandate_type),
    currencyLabel: item.base_currency,
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
    return "Portfolio membership is available, with operating limitations shown below.";
  }
  return "Portfolio membership is confirmed for the current own-book scope.";
}

function toLimitation(rawValue: string) {
  const copy: Record<string, { label: string; detail: string }> = {
    delegated_scope_not_supported: {
      label: "Own book only",
      detail: "Delegated, team, and supervisor book scopes are not available in this release.",
    },
    tenant_scope_not_reported: {
      label: "Operating scope confirmation pending",
      detail: "The source did not confirm the operating scope for this request.",
    },
    legacy_advisor_projection: {
      label: "Legacy assignment evidence",
      detail: "At least one membership uses the bounded legacy advisor projection.",
    },
    source_evidence_not_current: {
      label: "Membership data not confirmed current",
      detail: "The portfolio assignment record was not confirmed current for this request.",
    },
  };
  return {
    ...(copy[rawValue] ?? {
      label: "Additional operating limitation",
      detail: "Operational details contain an unrecognised source limitation for review.",
    }),
    rawValue,
  };
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

function formatBusinessDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

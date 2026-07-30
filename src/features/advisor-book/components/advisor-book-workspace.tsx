"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  ActionButton,
  AnalyticsTable,
  DefinitionList,
  FieldLabel,
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import {
  getWorkbenchApiErrorStatus,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api-client";

import type { AdvisorBookQuery } from "../api";
import { resolveAdvisorBookAsOfDate } from "../configuration";
import { buildPortfolioContextHref } from "../navigation";
import { useAdvisorBook } from "../use-advisor-book";
import { buildAdvisorBookWorkspaceModel } from "../view-model";
import styles from "../advisor-book-workspace.module.css";

const PAGE_SIZE = 25;

export default function AdvisorBookWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => queryFromSearchParams(searchParams), [searchParams]);
  const queryClientId = query.clientId ?? "";
  const [clientDraft, setClientDraft] = useState({
    queryClientId,
    clientId: queryClientId,
  });
  const clientId =
    clientDraft.queryClientId === queryClientId ? clientDraft.clientId : queryClientId;
  const { response, loading, error, reload } = useAdvisorBook(query);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    setOptionalQuery(next, "clientId", clientId.trim());
    next.set("offset", "0");
    router.replace(`${pathname}?${next.toString()}`);
  }

  function updateSelect(name: "mandateType" | "sortBy", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    setOptionalQuery(next, name, value);
    next.set("offset", "0");
    router.replace(`${pathname}?${next.toString()}`);
  }

  function changePage(offset: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("offset", String(Math.max(offset, 0)));
    router.replace(`${pathname}?${next.toString()}`);
  }

  if (loading) {
    return (
      <ScreenStatePanel
        kind="loading"
        title="Loading your book"
        body="Confirming portfolio assignments for the selected business date."
        rows={6}
      />
    );
  }

  if (error) {
    return (
      <ScreenStatePanel
        kind={isWorkbenchPermissionBlockedError(error) ? "permission_blocked" : "error"}
        title={
          isWorkbenchPermissionBlockedError(error)
            ? "Book access is not available"
            : "Your book could not be loaded"
        }
        body={
          isWorkbenchPermissionBlockedError(error)
            ? "Your authenticated role does not currently provide access to this own-book view."
            : "Portfolio assignments are temporarily unavailable. No broader portfolio list has been substituted."
        }
        hint={
          getWorkbenchApiErrorStatus(error)
            ? `Reference ${getWorkbenchApiErrorStatus(error)}. Retry, or contact support if access should be available.`
            : "Retry when portfolio assignments are available."
        }
        action={<ActionButton onClick={() => void reload()}>Retry</ActionButton>}
      />
    );
  }

  if (!response) {
    return null;
  }

  const model = buildAdvisorBookWorkspaceModel(response);
  const lastReturned = response.page.offset + response.page.returned_count;

  return (
    <div className={styles.workspace}>
      <div className={styles.contextStrip} aria-label="Book scope">
        <SemanticBadge tone={model.state === "ready" ? "success" : model.state === "degraded" ? "warn" : "default"}>
          {model.stateLabel}
        </SemanticBadge>
        <div className={styles.contextItem}>
          <span>Scope</span>
          <strong>{model.scopeLabel}</strong>
        </div>
        <div className={styles.contextItem}>
          <span>Business date</span>
          <strong>{model.asOfLabel}</strong>
        </div>
        <div className={styles.contextItem}>
          <span>Booking centre</span>
          <strong>{model.bookingCentreLabel}</strong>
        </div>
        <span className={styles.supportReference}>{model.stateDetail}</span>
      </div>

      <WorkbenchSummaryMetricStrip
        ariaLabel="Book summary"
        items={model.metrics.map((metric) => ({
          key: metric.label,
          label: metric.label,
          value: metric.value,
          support: metric.detail,
        }))}
      />

      <SectionBlock
        title="Portfolio coverage"
        subtitle="Search and sort using the available client, mandate, and portfolio fields."
      >
        <form className={styles.filterForm} onSubmit={applyFilters}>
          <div className={styles.field}>
            <FieldLabel htmlFor="advisor-book-client-reference">Client reference</FieldLabel>
            <input
              id="advisor-book-client-reference"
              value={clientId}
              onChange={(event) =>
                setClientDraft({
                  queryClientId,
                  clientId: event.target.value,
                })
              }
              placeholder="Exact client reference"
              aria-label="Client reference"
            />
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="advisor-book-mandate">Mandate</FieldLabel>
            <select
              id="advisor-book-mandate"
              aria-label="Mandate"
              value={query.mandateType ?? ""}
              onChange={(event) => updateSelect("mandateType", event.target.value)}
            >
              <option value="">All supported mandates</option>
              <option value="ADVISORY">Advisory</option>
              <option value="DISCRETIONARY">Discretionary</option>
            </select>
          </div>
          <div className={styles.field}>
            <FieldLabel htmlFor="advisor-book-sort">Sort by</FieldLabel>
            <select
              id="advisor-book-sort"
              aria-label="Sort by"
              value={query.sortBy ?? "portfolio_id"}
              onChange={(event) => updateSelect("sortBy", event.target.value)}
            >
              <option value="portfolio_id">Portfolio</option>
              <option value="client_id">Client</option>
              <option value="mandate_type">Mandate</option>
            </select>
          </div>
          <ActionButton type="submit" priority="primary">Apply client</ActionButton>
        </form>

        <AnalyticsTable
          ariaLabel="Portfolios in my book"
          density="compact"
          variant="portfolio"
          columns={[
            { key: "portfolio", label: "Portfolio" },
            { key: "client", label: "Client" },
            { key: "mandate", label: "Mandate" },
            { key: "currency", label: "Currency" },
            { key: "status", label: "Status" },
            { key: "membership", label: "Membership" },
          ]}
          rows={model.rows.map((row) => ({
            key: row.portfolioId,
            cells: [
              <div key="portfolio" className={styles.portfolioCell}>
                <Link
                  href={buildPortfolioContextHref({
                    pathname: "/book",
                    searchParams,
                    portfolioId: row.portfolioId,
                  })}
                >
                  {row.portfolioLabel}
                </Link>
                <small>Open portfolio review</small>
              </div>,
              row.clientLabel,
              row.mandateLabel,
              row.currencyLabel,
              row.statusLabel,
              <span key="membership" className={styles.cellDetail}>{row.membershipLabel}</span>,
            ],
          }))}
          emptyState={{
            title: model.stateLabel,
            body: model.stateDetail,
          }}
        />

        <div className={styles.pagination} aria-label="Book pagination">
          <ActionButton
            priority="quiet"
            disabled={response.page.offset === 0}
            onClick={() => changePage(response.page.offset - response.page.limit)}
          >
            Previous
          </ActionButton>
          <span>
            {response.page.returned_count
              ? `${response.page.offset + 1}–${lastReturned} of ${response.page.total_count}`
              : `0 of ${response.page.total_count}`}
          </span>
          <ActionButton
            priority="quiet"
            disabled={lastReturned >= response.page.total_count}
            onClick={() => changePage(response.page.offset + response.page.limit)}
          >
            Next
          </ActionButton>
        </div>
      </SectionBlock>

      <div className={styles.supportGrid}>
        <SectionBlock title="Operating boundaries" subtitle="What this book view does and does not confirm.">
          {model.limitations.length ? (
            <ul className={styles.limitations}>
              {model.limitations.map((limitation) => (
                <li key={limitation.rawValue}>
                  <strong>{limitation.label}</strong>
                  <p>{limitation.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No operating limitations were reported for this own-book view.</p>
          )}
        </SectionBlock>
        <SectionBlock title="Operational details" subtitle="Evidence for operational follow-up.">
          <DefinitionList ariaLabel="Advisor book operational details" items={model.supportDetails} />
        </SectionBlock>
      </div>
    </div>
  );
}

function queryFromSearchParams(searchParams: URLSearchParams | Readonly<URLSearchParams>): AdvisorBookQuery {
  const mandateType = searchParams.get("mandateType");
  const sortBy = searchParams.get("sortBy");
  return {
    asOfDate: resolveAdvisorBookAsOfDate(searchParams.get("asOfDate")),
    clientId: searchParams.get("clientId") || undefined,
    mandateType:
      mandateType === "ADVISORY" || mandateType === "DISCRETIONARY"
        ? mandateType
        : undefined,
    sortBy:
      sortBy === "client_id" || sortBy === "mandate_type" || sortBy === "portfolio_id"
        ? sortBy
        : "portfolio_id",
    sortOrder: "asc",
    offset: nonNegativeInteger(searchParams.get("offset")),
    limit: PAGE_SIZE,
  };
}

function nonNegativeInteger(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function setOptionalQuery(query: URLSearchParams, key: string, value: string) {
  if (value) query.set(key, value);
  else query.delete(key);
}

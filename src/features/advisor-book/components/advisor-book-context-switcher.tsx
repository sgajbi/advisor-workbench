"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { resolveAdvisorBookAsOfDate } from "../configuration";
import { buildPortfolioContextHref } from "../navigation";
import { useAdvisorBook } from "../use-advisor-book";
import styles from "../advisor-book-context-switcher.module.css";

const RESTORE_FOCUS_KEY = "lotus:advisor-book-context-focus";

export default function AdvisorBookContextSwitcher({
  pathname,
  portfolioId,
}: {
  pathname: string;
  portfolioId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);
  const [locationSearch, setLocationSearch] = useState("");

  useEffect(() => {
    setLocationSearch(window.location.search);
    if (window.sessionStorage.getItem(RESTORE_FOCUS_KEY) === "true") {
      window.sessionStorage.removeItem(RESTORE_FOCUS_KEY);
      summaryRef.current?.focus();
    }
  }, [portfolioId]);

  const asOfDate = resolveAdvisorBookAsOfDate(
    new URLSearchParams(locationSearch).get("asOfDate"),
  );

  return (
    <div className={styles.switcher}>
      <div className={styles.header}>
        <span>Portfolio context</span>
        <Link href={`/book?asOfDate=${encodeURIComponent(asOfDate)}`}>My book</Link>
      </div>
      <details
        className={styles.disclosure}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
      >
        <summary ref={summaryRef} className={styles.summary}>
          Change portfolio
        </summary>
        {expanded ? (
          <AdvisorBookContextOptions
            pathname={pathname}
            locationSearch={locationSearch}
            asOfDate={asOfDate}
            portfolioId={portfolioId}
          />
        ) : null}
      </details>
      <p className={styles.support}>
        Open to load portfolios assigned to you for the current business task.
      </p>
    </div>
  );
}

function AdvisorBookContextOptions({
  pathname,
  locationSearch,
  asOfDate,
  portfolioId,
}: {
  pathname: string;
  locationSearch: string;
  asOfDate: string;
  portfolioId: string;
}) {
  const query = useMemo(
    () => ({ asOfDate, sortBy: "client_id" as const, sortOrder: "asc" as const, limit: 100 }),
    [asOfDate],
  );
  const { response, loading, error } = useAdvisorBook(query);
  const searchParams = new URLSearchParams(locationSearch);
  const selectedMembership = response?.items.find((item) => item.portfolio_id === portfolioId);

  if (loading) {
    return <p className={styles.optionState} role="status">Confirming own-book membership…</p>;
  }
  if (error) {
    return (
      <p className={`${styles.optionState} ${styles.warning}`}>
        Switching is unavailable until book membership can be confirmed.
      </p>
    );
  }
  if (!response?.items.length) {
    return <p className={styles.optionState}>No portfolio memberships are available to switch.</p>;
  }

  return (
    <div>
      {!selectedMembership ? (
        <p className={`${styles.optionState} ${styles.warning}`}>
          The selected portfolio is not confirmed in the returned own-book page.
        </p>
      ) : null}
      <ul className={styles.options} aria-label="Portfolio context options">
        {response.items.map((item) => {
          const selected = item.portfolio_id === portfolioId;
          return (
            <li key={item.portfolio_id}>
              {selected ? (
                <span className={styles.selected} aria-current="true">
                  <strong>{item.display_name}</strong>
                  <small>{item.client_id} · Current</small>
                </span>
              ) : (
                <Link
                  href={buildPortfolioContextHref({
                    pathname,
                    searchParams,
                    portfolioId: item.portfolio_id,
                  })}
                  onClick={() =>
                    window.sessionStorage.setItem(RESTORE_FOCUS_KEY, "true")
                  }
                >
                  <strong>{item.display_name}</strong>
                  <small>{item.client_id}</small>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

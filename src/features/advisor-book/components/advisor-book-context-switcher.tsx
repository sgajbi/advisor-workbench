"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { resolveAdvisorBookAsOfDate } from "../configuration";
import { buildPortfolioContextHref } from "../navigation";
import { useAdvisorBook } from "../use-advisor-book";
import styles from "../advisor-book-context-switcher.module.css";

const RESTORE_FOCUS_KEY = "lotus:advisor-book-context-focus";

export default function AdvisorBookContextSwitcher({ portfolioId }: { portfolioId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectRef = useRef<HTMLSelectElement>(null);
  const asOfDate = resolveAdvisorBookAsOfDate(searchParams.get("asOfDate"));
  const query = useMemo(
    () => ({ asOfDate, sortBy: "client_id" as const, sortOrder: "asc" as const, limit: 100 }),
    [asOfDate],
  );
  const { response, loading, error } = useAdvisorBook(query);
  const selectedMembership = response?.items.find((item) => item.portfolio_id === portfolioId);
  const bookHref = `/book?asOfDate=${encodeURIComponent(asOfDate)}`;

  useEffect(() => {
    if (window.sessionStorage.getItem(RESTORE_FOCUS_KEY) === "true") {
      window.sessionStorage.removeItem(RESTORE_FOCUS_KEY);
      selectRef.current?.focus();
    }
  }, [portfolioId]);

  function switchPortfolio(nextPortfolioId: string) {
    if (!nextPortfolioId || nextPortfolioId === portfolioId) {
      return;
    }
    window.sessionStorage.setItem(RESTORE_FOCUS_KEY, "true");
    router.push(
      buildPortfolioContextHref({
        pathname,
        searchParams,
        portfolioId: nextPortfolioId,
      }),
    );
  }

  return (
    <div className={styles.switcher}>
      <div className={styles.header}>
        <span>Portfolio context</span>
        <Link href={bookHref}>My book</Link>
      </div>
      <select
        ref={selectRef}
        className={styles.select}
        aria-label="Portfolio context"
        aria-describedby="advisor-book-context-support"
        value={portfolioId}
        disabled={loading || Boolean(error) || !response?.items.length}
        onChange={(event) => switchPortfolio(event.target.value)}
      >
        {loading ? <option value={portfolioId}>Confirming book membership…</option> : null}
        {error ? <option value={portfolioId}>Own-book context unavailable</option> : null}
        {!loading && !error && !selectedMembership ? (
          <option value={portfolioId}>Current portfolio · membership not confirmed</option>
        ) : null}
        {response?.items.map((item) => (
          <option key={item.portfolio_id} value={item.portfolio_id}>
            {item.display_name} · {item.client_id}
          </option>
        ))}
      </select>
      <p
        id="advisor-book-context-support"
        className={`${styles.support} ${!loading && !error && !selectedMembership ? styles.warning : ""}`}
      >
        {contextSupportCopy({ loading, error, membershipConfirmed: Boolean(selectedMembership) })}
      </p>
    </div>
  );
}

function contextSupportCopy({
  loading,
  error,
  membershipConfirmed,
}: {
  loading: boolean;
  error: unknown;
  membershipConfirmed: boolean;
}) {
  if (loading) return "Confirming source-backed own-book scope.";
  if (error) return "Switching is unavailable until book membership can be confirmed.";
  if (!membershipConfirmed) return "The selected portfolio is not confirmed in the returned own-book page.";
  return "Changing portfolio keeps the current business view and supported filters.";
}

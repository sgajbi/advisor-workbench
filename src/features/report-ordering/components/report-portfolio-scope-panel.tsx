"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActionButton, FieldLabel, ScreenStatePanel, SectionBlock, SemanticBadge } from "@/design-system";
import { useAdvisorBook } from "@/features/advisor-book/use-advisor-book";

import type { ReportOrderingScopeMode } from "../view-model";
import styles from "../report-ordering-workspace.module.css";

export function ReportPortfolioScopePanel({
  currentPortfolioId,
  asOfDate,
  scopeMode,
  batchAvailable,
  disabled,
  selectedPortfolioIds,
  onScopeModeChange,
  onSelectionChange,
  onBookStateChange,
}: {
  currentPortfolioId: string;
  asOfDate: string;
  scopeMode: ReportOrderingScopeMode;
  batchAvailable: boolean;
  disabled: boolean;
  selectedPortfolioIds: string[];
  onScopeModeChange: (mode: ReportOrderingScopeMode) => void;
  onSelectionChange: (portfolioIds: string[]) => void;
  onBookStateChange: (state: "loading" | "ready" | "error") => void;
}) {
  return (
    <SectionBlock
      title="Reporting scope"
      subtitle="Create one portfolio report or apply the same approved setup across a selected portfolio bundle."
      className={styles.section}
    >
      <fieldset className={styles.choiceFieldset}>
        <legend className={styles.srOnly}>Choose reporting scope</legend>
        <div className={styles.scopeModeGrid}>
          <ScopeChoice
            checked={scopeMode === "single_portfolio"}
            disabled={disabled}
            label="Selected portfolio"
            detail="Create one report for the portfolio in your current workspace."
            onChange={() => onScopeModeChange("single_portfolio")}
          />
          <ScopeChoice
            checked={scopeMode === "explicit_portfolio_batch"}
            disabled={disabled || !batchAvailable}
            label="Portfolio bundle"
            detail="Create a separate report for each selected portfolio in your book. This is not a consolidated client report."
            onChange={() => onScopeModeChange("explicit_portfolio_batch")}
          />
        </div>
      </fieldset>
      {!batchAvailable ? (
        <p className={styles.scopeBoundary}>
          Portfolio bundle ordering will appear only when Reporting publishes the governed batch capability.
        </p>
      ) : null}
      {scopeMode === "explicit_portfolio_batch" ? (
        <PortfolioBookSelection
          currentPortfolioId={currentPortfolioId}
          asOfDate={asOfDate}
          disabled={disabled}
          selectedPortfolioIds={selectedPortfolioIds}
          onSelectionChange={onSelectionChange}
          onBookStateChange={onBookStateChange}
        />
      ) : null}
    </SectionBlock>
  );
}

function ScopeChoice({
  checked,
  disabled = false,
  label,
  detail,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label className={`${styles.choiceCard} ${checked ? styles.choiceCardSelected : ""} ${disabled ? styles.choiceCardDisabled : ""}`}>
      <input type="radio" name="report-scope" checked={checked} disabled={disabled} onChange={onChange} />
      <span className={styles.choiceBody}>
        <span className={styles.choiceHeading}>
          <strong>{label}</strong>
          {checked ? <SemanticBadge>Current scope</SemanticBadge> : null}
        </span>
        <span>{detail}</span>
      </span>
    </label>
  );
}

function PortfolioBookSelection({
  currentPortfolioId,
  asOfDate,
  disabled,
  selectedPortfolioIds,
  onSelectionChange,
  onBookStateChange,
}: {
  currentPortfolioId: string;
  asOfDate: string;
  disabled: boolean;
  selectedPortfolioIds: string[];
  onSelectionChange: (portfolioIds: string[]) => void;
  onBookStateChange: (state: "loading" | "ready" | "error") => void;
}) {
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const book = useAdvisorBook({ asOfDate, sortBy: "client_id", sortOrder: "asc", offset, limit: 100 });
  const confirmedPageOffsetByPortfolioRef = useRef(new Map<string, number>());
  useEffect(() => {
    onBookStateChange(book.error ? "error" : book.response && !book.loading ? "ready" : "loading");
  }, [book.error, book.loading, book.response, onBookStateChange]);
  const initialSelectionKeyRef = useRef("");
  useEffect(() => {
    setFilter("");
    setOffset(0);
    initialSelectionKeyRef.current = "";
    confirmedPageOffsetByPortfolioRef.current.clear();
  }, [asOfDate]);
  useEffect(() => {
    if (
      !book.response ||
      selectedPortfolioIds.length > 0 ||
      initialSelectionKeyRef.current === `${asOfDate}:${currentPortfolioId}`
    ) {
      return;
    }
    initialSelectionKeyRef.current = `${asOfDate}:${currentPortfolioId}`;
    const currentPortfolio = book.response.items.find(
      (item) => item.portfolio_id === currentPortfolioId && item.status === "ACTIVE",
    );
    if (currentPortfolio) {
      onSelectionChange([currentPortfolio.portfolio_id]);
    }
  }, [asOfDate, book.response, currentPortfolioId, onSelectionChange, selectedPortfolioIds.length]);
  useEffect(() => {
    if (!book.response) return;
    const pageOffset = book.response.page.offset;
    const currentItems = new Map(book.response.items.map((item) => [item.portfolio_id, item]));
    for (const item of book.response.items) {
      if (item.status === "ACTIVE") {
        confirmedPageOffsetByPortfolioRef.current.set(item.portfolio_id, pageOffset);
      }
    }
    if (disabled || selectedPortfolioIds.length === 0) return;
    const retainedPortfolioIds = selectedPortfolioIds.filter((portfolioId) => {
      const currentItem = currentItems.get(portfolioId);
      if (currentItem) return currentItem.status === "ACTIVE";
      return confirmedPageOffsetByPortfolioRef.current.get(portfolioId) !== pageOffset;
    });
    if (retainedPortfolioIds.length === selectedPortfolioIds.length) return;
    onSelectionChange(retainedPortfolioIds);
  }, [book.response, disabled, onSelectionChange, selectedPortfolioIds]);
  const selected = useMemo(() => new Set(selectedPortfolioIds), [selectedPortfolioIds]);
  const visibleItems = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    if (!query) return book.response?.items ?? [];
    return (book.response?.items ?? []).filter((item) =>
      [item.display_name, item.portfolio_id, item.client_id, item.mandate_type, item.booking_center_code]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [book.response?.items, filter]);
  const selectableVisibleIds = visibleItems
    .filter((item) => item.status === "ACTIVE")
    .map((item) => item.portfolio_id);
  const page = book.response?.page;
  const lastReturned = page ? page.offset + page.returned_count : 0;

  function toggle(portfolioId: string) {
    const next = new Set(selected);
    if (next.has(portfolioId)) next.delete(portfolioId);
    else next.add(portfolioId);
    onSelectionChange([...next].sort());
  }

  return (
    <div className={styles.bookSelection} aria-labelledby="report-book-selection-title">
      <div className={styles.bookSelectionHeader}>
        <div>
          <h3 id="report-book-selection-title">Select portfolios from My book</h3>
          <p>Gateway verifies current membership and eligibility again when the bundle is submitted.</p>
        </div>
        <SemanticBadge tone={selected.size >= 2 ? "success" : "warn"} emphasis="strong">
          {selected.size} selected
        </SemanticBadge>
      </div>
      {book.loading ? (
        <ScreenStatePanel kind="loading" title="Loading your book" body="Checking source-confirmed portfolio assignments." rows={4} />
      ) : book.error ? (
        <ScreenStatePanel
          kind="error"
          title="Portfolio selection unavailable"
          body="Your portfolio assignments could not be loaded. No bundle can be reviewed until the source is available."
          action={<ActionButton disabled={disabled} onClick={() => void book.reload()}>Try Again</ActionButton>}
        />
      ) : book.response?.items.length === 0 ? (
        <ScreenStatePanel kind="empty" title="No portfolios available" body="No portfolio assignments are available for this business date." />
      ) : (
        <>
          <div className={styles.bookSelectionTools}>
            <div className={styles.bookSearch}>
              <FieldLabel htmlFor="report-portfolio-filter">Filter portfolios on this page</FieldLabel>
              <input
                id="report-portfolio-filter"
                className="workbench-input"
                type="search"
                disabled={disabled}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Client, mandate or portfolio"
              />
            </div>
            <div className={styles.selectionActions}>
              <ActionButton
                priority="secondary"
                onClick={() => onSelectionChange([...new Set([...selected, ...selectableVisibleIds])].sort())}
                disabled={disabled || selectableVisibleIds.length === 0}
              >
                Select portfolios shown
              </ActionButton>
              <ActionButton priority="secondary" onClick={() => onSelectionChange([])} disabled={disabled || selected.size === 0}>
                Clear selection
              </ActionButton>
            </div>
          </div>
          <div className={styles.portfolioSelectionList} role="group" aria-label="Portfolios in My book">
            {visibleItems.map((item) => {
              const inactive = item.status !== "ACTIVE";
              return (
                <label key={item.portfolio_id} className={`${styles.portfolioSelectionRow} ${inactive ? styles.portfolioSelectionRowDisabled : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.portfolio_id)}
                    disabled={disabled || inactive}
                    onChange={() => toggle(item.portfolio_id)}
                  />
                  <span className={styles.portfolioSelectionIdentity}>
                    <strong>{item.display_name}</strong>
                    <small>{item.portfolio_id} · Client {item.client_id}</small>
                  </span>
                  <span className={styles.portfolioSelectionFacts}>
                    <span>{businessMandate(item.mandate_type)}</span>
                    <span>{item.base_currency} · {item.booking_center_code}</span>
                  </span>
                  <SemanticBadge tone={inactive ? "warn" : "success"}>{inactive ? "Not active" : "In book"}</SemanticBadge>
                </label>
              );
            })}
          </div>
          {page ? (
            <nav className={styles.bookPagination} aria-label="Portfolio book pages">
              <ActionButton
                priority="secondary"
                disabled={disabled || book.loading || page.offset === 0}
                onClick={() => {
                  setFilter("");
                  setOffset(Math.max(page.offset - page.limit, 0));
                }}
              >
                Previous portfolios
              </ActionButton>
              <span>
                {page.returned_count > 0
                  ? `${page.offset + 1}–${lastReturned} of ${page.total_count}`
                  : `0 of ${page.total_count}`} portfolios
              </span>
              <ActionButton
                priority="secondary"
                disabled={disabled || book.loading || lastReturned >= page.total_count}
                onClick={() => {
                  setFilter("");
                  setOffset(page.offset + page.limit);
                }}
              >
                Next portfolios
              </ActionButton>
            </nav>
          ) : null}
          {visibleItems.length === 0 ? <p className={styles.scopeBoundary}>No portfolios match the current search.</p> : null}
          {book.response?.supportability.state === "degraded" ? (
            <p className={styles.scopeBoundary}>Portfolio assignments are available with source limitations. Gateway will fail closed if selected membership cannot be verified.</p>
          ) : null}
          <p className={styles.selectionAnnouncement} role="status" aria-live="polite">
            {selected.size < 2
              ? "Select at least two portfolios to prepare a bundle."
              : `${selected.size} portfolios selected for Gateway verification.`}
          </p>
        </>
      )}
    </div>
  );
}

function businessMandate(value: string): string {
  if (value === "ADVISORY") return "Advisory mandate";
  if (value === "DISCRETIONARY") return "Discretionary mandate";
  return "Mandate available";
}

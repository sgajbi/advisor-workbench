"use client";

import { useState } from "react";

import { cx } from "../utils/cx";
import styles from "./review-context-strip.module.css";

export type ReviewContextSourceState = "confirmed" | "partial" | "unavailable";

export type ReviewContextNotice = {
  label: string;
  message: string;
  tone?: "information" | "attention";
};

export type ReviewContextCurrency = {
  kind: "base" | "reporting";
  value: string;
};

export type ReviewContextStripModel = {
  portfolioName: string;
  portfolioId?: string | null;
  clientId?: string | null;
  mandateType?: string | null;
  bookingCenter?: string | null;
  businessDate?: string | null;
  currency?: ReviewContextCurrency | null;
  sourceState?: ReviewContextSourceState;
  notice?: ReviewContextNotice | null;
};

type ReviewContextStripProps = {
  context: ReviewContextStripModel;
  className?: string;
};

type ContextValue = {
  label: string;
  value: string | null | undefined;
};

type ContextFact = ContextValue & {
  slot: "business-date" | "currency" | "mandate" | "booking-centre";
};

type CopyState =
  | { kind: "idle" }
  | { kind: "copied"; label: string; value: string }
  | { kind: "failed"; label: string; value: string };

const NOT_CONFIRMED = "Not confirmed";

export default function ReviewContextStrip({
  context,
  className,
}: ReviewContextStripProps) {
  const [copyState, setCopyState] = useState<CopyState>({ kind: "idle" });
  const sourceState = context.sourceState ?? "confirmed";
  const facts: ContextFact[] = [
    { slot: "business-date", label: "Business date", value: context.businessDate },
    {
      slot: "currency",
      label: context.currency?.kind === "reporting" ? "Reporting currency" : "Base currency",
      value: context.currency?.value,
    },
    { slot: "mandate", label: "Mandate", value: context.mandateType },
    { slot: "booking-centre", label: "Booking centre", value: context.bookingCenter },
  ];
  const identifiers: ContextValue[] = [
    { label: "Portfolio ID", value: context.portfolioId },
    { label: "Client ID", value: context.clientId },
  ];

  async function copyIdentifier(label: string, value: string) {
    if (!navigator.clipboard?.writeText) {
      setCopyState({ kind: "failed", label, value });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ kind: "copied", label, value });
    } catch {
      setCopyState({ kind: "failed", label, value });
    }
  }

  return (
    <section
      aria-label="Review context"
      className={cx(styles.root, styles[sourceState], className)}
      data-source-state={sourceState}
      data-testid="review-context-strip"
    >
      <div className={styles.identity}>
        <span className={styles.eyebrow}>Review portfolio</span>
        <strong className={styles.portfolioName} data-context-slot="portfolio-name">
          {context.portfolioName}
        </strong>
      </div>

      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div className={styles.fact} data-context-slot={fact.slot} key={fact.label}>
            <dt>{fact.label}</dt>
            <dd data-confirmed={Boolean(fact.value)}>{fact.value || NOT_CONFIRMED}</dd>
          </div>
        ))}
      </dl>

      {context.notice ? (
        <div
          className={cx(
            styles.notice,
            context.notice.tone === "attention" ? styles.noticeAttention : undefined
          )}
          role={context.notice.tone === "attention" ? "status" : undefined}
        >
          <strong>{context.notice.label}</strong>
          <span>{context.notice.message}</span>
        </div>
      ) : null}

      <details className={styles.supportDetails}>
        <summary data-context-slot="support-details">Support details</summary>
        <dl className={styles.identifiers}>
          {identifiers.map((identifier) => {
            const value = identifier.value || NOT_CONFIRMED;
            const canCopy = Boolean(identifier.value);
            const isCurrentCopyState =
              copyState.kind !== "idle" &&
              copyState.label === identifier.label &&
              copyState.value === value;
            const copied = copyState.kind === "copied" && isCurrentCopyState;

            return (
              <div className={styles.identifier} key={identifier.label}>
                <div>
                  <dt>{identifier.label}</dt>
                  <dd>{value}</dd>
                </div>
                {canCopy ? (
                  <button
                    type="button"
                    onClick={() => void copyIdentifier(identifier.label, value)}
                    aria-label={`Copy ${identifier.label}`}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </dl>
        <p className={styles.copyStatus} aria-live="polite" aria-atomic="true">
          {copyState.kind === "copied" &&
          identifiers.some(
            ({ label, value }) => label === copyState.label && value === copyState.value,
          )
            ? `${copyState.label} copied.`
            : copyState.kind === "failed" &&
                identifiers.some(
                  ({ label, value }) => label === copyState.label && value === copyState.value,
                )
              ? `${copyState.label} could not be copied.`
              : ""}
        </p>
      </details>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { buildReviewContextHref, parseReviewContext } from "./review-context";
import styles from "./app-shell.module.css";

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

export function buildAdvisorBookHref(searchParams: SearchParamsReader): string | null {
  const reviewContextResult = parseReviewContext(searchParams);
  return reviewContextResult.status === "valid"
    ? buildReviewContextHref("/book", reviewContextResult.context)
    : null;
}

export default function AdvisorBookLink() {
  const searchParams = useSearchParams();
  const href = buildAdvisorBookHref(searchParams);

  if (!href) {
    return (
      <span
        className={styles.bookLink}
        aria-disabled="true"
        title="My book cannot be opened until the review context is corrected."
      >
        <small>Advisor</small>
        <strong>My book</strong>
      </span>
    );
  }

  return (
    <Link href={href} className={styles.bookLink}>
      <small>Advisor</small>
      <strong>My book</strong>
    </Link>
  );
}

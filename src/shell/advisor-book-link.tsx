"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  buildReviewContextHref,
  parseReviewContext,
  scopeReviewContextForWorkspace,
} from "./review-context";
import styles from "./app-shell.module.css";

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

export function buildAdvisorBookHref(searchParams: SearchParamsReader): string {
  const reviewContextResult = parseReviewContext(searchParams);
  return reviewContextResult.status === "valid"
    ? buildReviewContextHref(
        "/book",
        scopeReviewContextForWorkspace(reviewContextResult.context),
      )
    : "/book";
}

export default function AdvisorBookLink() {
  const searchParams = useSearchParams();
  const href = buildAdvisorBookHref(searchParams);

  return (
    <Link href={href} className={styles.bookLink}>
      <small>Advisor</small>
      <strong>My book</strong>
    </Link>
  );
}

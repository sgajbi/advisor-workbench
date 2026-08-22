"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import styles from "./app-shell.module.css";

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

export function buildAdvisorBookHref(searchParams: SearchParamsReader): string {
  const requestedDates = searchParams.getAll("asOfDate");
  const asOfDate = requestedDates.length === 1 ? requestedDates[0]?.trim() : undefined;

  if (!asOfDate) {
    return "/book";
  }

  const query = new URLSearchParams({ asOfDate });
  return `/book?${query.toString()}`;
}

export default function AdvisorBookLink() {
  const searchParams = useSearchParams();

  return (
    <Link href={buildAdvisorBookHref(searchParams)} className={styles.bookLink}>
      <small>Advisor</small>
      <strong>My book</strong>
    </Link>
  );
}

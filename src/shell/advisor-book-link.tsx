"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import styles from "./app-shell.module.css";

type SearchParamsReader = Pick<URLSearchParams, "get">;

export function buildAdvisorBookHref(searchParams: SearchParamsReader): string {
  const asOfDate = searchParams.get("asOfDate")?.trim();

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

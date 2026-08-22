"use client";

import Link from "next/link";

import styles from "./app-shell.module.css";

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

export function buildAdvisorBookHref(_searchParams: SearchParamsReader): string {
  return "/book";
}

export default function AdvisorBookLink() {
  return (
    <Link href="/book" className={styles.bookLink}>
      <small>Advisor</small>
      <strong>My book</strong>
    </Link>
  );
}

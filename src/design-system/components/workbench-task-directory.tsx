import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./workbench-task-directory.module.css";

export type WorkbenchTaskDirectoryItem = {
  key: string;
  title: string;
  description: string;
  status?: ReactNode;
  href: string;
  actionLabel: string;
};

export default function WorkbenchTaskDirectory({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: ReadonlyArray<WorkbenchTaskDirectoryItem>;
}) {
  return (
    <nav className={styles.directory} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.key} className={styles.item}>
            <Link href={item.href} className={styles.link}>
              <span className={styles.heading}>
                <strong>{item.title}</strong>
                {item.status ? <span className={styles.status}>{item.status}</span> : null}
              </span>
              <span className={styles.description}>{item.description}</span>
              <span className={styles.action}>
                {item.actionLabel}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

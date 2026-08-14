import type { ReactNode } from "react";

import styles from "./operational-record-list.module.css";

export type OperationalRecordFact = {
  label: string;
  value: ReactNode;
};

export type OperationalRecordListItem = {
  key: string;
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  facts: ReadonlyArray<OperationalRecordFact>;
  detail?: ReactNode;
};

export default function OperationalRecordList({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: ReadonlyArray<OperationalRecordListItem>;
}) {
  return (
    <ol className={styles.list} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.key}>
          <article className={styles.record} aria-label={item.title}>
            <div className={styles.heading}>
              <div className={styles.identity}>
                <h3 className={styles.title}>{item.title}</h3>
                {item.description ? (
                  <p className={styles.description}>{item.description}</p>
                ) : null}
              </div>
              {item.status ? <div className={styles.status}>{item.status}</div> : null}
            </div>
            <dl className={styles.facts}>
              {item.facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <dt className={styles.factTerm}>{fact.label}</dt>
                  <dd className={styles.factValue}>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {item.detail ? <div className={styles.detail}>{item.detail}</div> : null}
          </article>
        </li>
      ))}
    </ol>
  );
}

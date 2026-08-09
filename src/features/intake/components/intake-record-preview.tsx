import { useId, useRef, useState } from "react";

import { ActionButton } from "@/design-system";

import type { IntakeReviewPreviewRecord, IntakeReviewPreviewSection } from "../draft";
import styles from "../intake-workspace.module.css";

export const INTAKE_PREVIEW_PAGE_SIZE = 10;

export function IntakeRecordPreview({
  sections,
}: {
  sections: IntakeReviewPreviewSection[];
}) {
  return (
    <div className={styles.recordPreview} aria-label="Parsed record preview">
      <div className={styles.recordPreviewHeader}>
        <strong>Parsed record preview</strong>
        <span>Open each record family and review every page before publication.</span>
      </div>
      {sections.map((section) => (
        <IntakeRecordPreviewSection key={section.title} section={section} />
      ))}
    </div>
  );
}

function IntakeRecordPreviewSection({
  section,
}: {
  section: IntakeReviewPreviewSection;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const recordListId = useId();
  const recordListRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(section.recordCount / INTAKE_PREVIEW_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * INTAKE_PREVIEW_PAGE_SIZE;
  const endIndex = Math.min(startIndex + INTAKE_PREVIEW_PAGE_SIZE, section.recordCount);
  const visibleRecords = isOpen
    ? projectRecordRange(section, startIndex, endIndex)
    : [];

  function showPage(nextPage: number) {
    if (recordListRef.current) recordListRef.current.scrollTop = 0;
    setPage(nextPage);
  }

  return (
    <details
      className={styles.previewSection}
      aria-label={`${section.title} preview`}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{section.title}</span>
        <span className={styles.previewCount}>
          {section.recordCount} {section.recordCount === 1 ? "record" : "records"}
        </span>
      </summary>
      {isOpen ? (
        <>
          <div className={styles.previewRecords} id={recordListId} ref={recordListRef}>
            {visibleRecords.map((record, recordIndex) => (
              <article
                className={styles.previewRecord}
                data-testid="intake-preview-record"
                key={`${startIndex + recordIndex}:${record.title}`}
              >
                <h4>{record.title}</h4>
                <dl className={styles.previewFacts}>
                  {record.facts.map((fact) => (
                    <div className={styles.factRow} key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <nav className={styles.previewPagination} aria-label={`${section.title} pages`}>
            <div className={styles.previewPageStatus} aria-live="polite" aria-atomic="true">
              <span>{`Records ${startIndex + 1}–${endIndex} of ${section.recordCount}`}</span>
              <span aria-current="page">{`Page ${currentPage} of ${pageCount}`}</span>
            </div>
            <div className={styles.previewPageActions}>
              <ActionButton
                priority="quiet"
                aria-controls={recordListId}
                aria-label={`Previous ${section.title.toLowerCase()}`}
                disabled={currentPage === 1}
                onClick={() => showPage(Math.max(1, currentPage - 1))}
              >
                Previous
              </ActionButton>
              <ActionButton
                priority="quiet"
                aria-controls={recordListId}
                aria-label={`Next ${section.title.toLowerCase()}`}
                disabled={currentPage === pageCount}
                onClick={() => showPage(Math.min(pageCount, currentPage + 1))}
              >
                Next
              </ActionButton>
            </div>
          </nav>
        </>
      ) : null}
    </details>
  );
}

function projectRecordRange(
  section: IntakeReviewPreviewSection,
  startIndex: number,
  endIndex: number,
): IntakeReviewPreviewRecord[] {
  const records: IntakeReviewPreviewRecord[] = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const record = section.recordAt(index);
    if (record) records.push(record);
  }
  return records;
}

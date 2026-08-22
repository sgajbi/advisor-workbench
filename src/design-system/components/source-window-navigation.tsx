import ActionButton from "./action-button";
import styles from "./source-window-navigation.module.css";

export default function SourceWindowNavigation({
  ariaLabel,
  currentWindow,
  hasPrevious,
  hasNext,
  isLoading = false,
  itemLabel = "proposals",
  viewLabel = "Proposal view",
  onPrevious,
  onNext,
}: {
  ariaLabel: string;
  currentWindow: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isLoading?: boolean;
  itemLabel?: string;
  viewLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <nav className={styles.navigation} aria-label={ariaLabel}>
      <ActionButton
        priority="quiet"
        disabled={!hasPrevious || isLoading}
        onClick={onPrevious}
      >
        Previous {itemLabel}
      </ActionButton>
      <span className={styles.label} aria-live="polite">
        {isLoading ? `Loading ${itemLabel}` : `${viewLabel} ${currentWindow}`}
      </span>
      <ActionButton priority="quiet" disabled={!hasNext || isLoading} onClick={onNext}>
        Next {itemLabel}
      </ActionButton>
    </nav>
  );
}

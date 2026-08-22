import { cx } from "../utils/cx";
import styles from "./workbench-context-notice.module.css";

/**
 * A compact, non-blocking explanation of how a source interprets carried
 * business context. Use it when a workspace remains usable but does not
 * support every control owned by the wider advisor review.
 */
export default function WorkbenchContextNotice({
  eyebrow = "Source scope",
  title,
  body,
  className,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <aside
      className={cx(styles.root, className)}
      aria-label={title}
      data-testid="workbench-context-notice"
    >
      <p className={styles.eyebrow}>{eyebrow}</p>
      <p className={styles.title}>{title}</p>
      <p className={styles.body}>{body}</p>
    </aside>
  );
}

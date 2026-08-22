import { cx } from "../utils/cx";
import styles from "./workbench-icon.module.css";

export type WorkbenchIconName = "chevron-right" | "success" | "warning";

type Props = {
  name: WorkbenchIconName;
  className?: string;
};

export default function WorkbenchIcon({ name, className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={cx(styles.icon, className)}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
    >
      {name === "success" ? (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="m8.2 12.1 2.45 2.45 5.2-5.3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}
      {name === "warning" ? (
        <>
          <path
            d="M10.35 4.6a1.9 1.9 0 0 1 3.3 0l7.05 12.35a1.9 1.9 0 0 1-1.65 2.85H4.95a1.9 1.9 0 0 1-1.65-2.85L10.35 4.6Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M12 8.7v4.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <circle cx="12" cy="16.55" fill="currentColor" r="1" />
        </>
      ) : null}
      {name === "chevron-right" ? (
        <path
          d="m9.25 5.5 6.5 6.5-6.5 6.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ) : null}
    </svg>
  );
}

import { cx } from "../utils/cx";
import styles from "./workbench-icon.module.css";

export type WorkbenchIconName =
  | "archive"
  | "chevron-right"
  | "pending"
  | "refresh"
  | "success"
  | "verify"
  | "warning";

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
      {name === "refresh" ? (
        <>
          <path
            d="M19 8.5V4.8l-1.9 1.9A7.5 7.5 0 1 0 19.2 14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M19 4.8h-3.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}
      {name === "archive" ? (
        <>
          <path
            d="M4.5 8.2h15v10.3a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V8.2Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 4h17v4.2h-17V4Zm5.7 8h5.6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}
      {name === "verify" ? (
        <>
          <path
            d="M8.2 5.2H6.7A1.7 1.7 0 0 0 5 6.9v12.4h14V6.9a1.7 1.7 0 0 0-1.7-1.7h-1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M8.2 3.8h7.6v3.4H8.2V3.8Zm.4 9 2.1 2.1 4.8-4.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}
      {name === "pending" ? (
        <>
          <circle cx="12" cy="12" r="8.7" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 7.2v5.2l3.2 2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : null}
    </svg>
  );
}

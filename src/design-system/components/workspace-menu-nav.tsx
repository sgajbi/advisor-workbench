"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { cx } from "../utils/cx";
import styles from "./workspace-menu-nav.module.css";

export type WorkspaceMenuNavItem = {
  key: string;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
};

export default function WorkspaceMenuNav({
  items,
  ariaLabel,
  className,
  navigationIdentity,
}: {
  items: WorkspaceMenuNavItem[];
  ariaLabel: string;
  className?: string;
  navigationIdentity?: string;
}) {
  const [disclosureState, setDisclosureState] = useState({
    expanded: false,
    navigationIdentity,
  });
  const disclosureId = useId();
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const activeItem = items.find((item) => item.active) ?? null;
  const expanded =
    disclosureState.navigationIdentity === navigationIdentity &&
    disclosureState.expanded;

  function close({ restoreFocus = false } = {}) {
    setDisclosureState({ expanded: false, navigationIdentity });
    if (restoreFocus) {
      disclosureRef.current?.focus();
    }
  }

  return (
    <nav
      className={cx(styles.root, className)}
      aria-label={ariaLabel}
      data-current-workspace={activeItem?.key ?? "none"}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !expanded) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        close({ restoreFocus: true });
      }}
    >
      <button
        ref={disclosureRef}
        type="button"
        className={styles.trigger}
        aria-label={`Switch workspace. Current workspace ${activeItem?.label ?? "not selected"}`}
        aria-expanded={expanded}
        aria-controls={disclosureId}
        onClick={() =>
          setDisclosureState({ expanded: !expanded, navigationIdentity })
        }
      >
        <span>
          <small>Workspace</small>
          <strong>{activeItem?.label ?? "Browse workspaces"}</strong>
        </span>
        <em aria-hidden="true">{expanded ? "Close" : "Switch"}</em>
      </button>

      <div
        id={disclosureId}
        className={styles.panel}
        hidden={!expanded}
      >
        <span className={styles.label}>Workspace directory</span>
        <div className={styles.list}>
          {items.map((item) =>
            item.disabled || !item.href ? (
              <span
                key={item.key}
                className={cx(
                  styles.link,
                  item.active && styles.linkActive,
                  styles.linkDisabled,
                )}
                aria-disabled="true"
                aria-current={item.active ? "page" : undefined}
                title={item.title}
              >
                {item.label}
                <small>Unavailable</small>
              </span>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                className={cx(
                  styles.link,
                  item.active && styles.linkActive,
                )}
                title={item.title}
                aria-current={item.active ? "page" : undefined}
                onClick={() => close()}
              >
                {item.label}
                <small>{item.active ? "Current workspace" : "Open workspace"}</small>
              </Link>
            ),
          )}
        </div>
      </div>
    </nav>
  );
}

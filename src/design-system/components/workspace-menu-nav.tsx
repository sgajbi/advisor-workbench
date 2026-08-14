"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { cx } from "../utils/cx";

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
}: {
  items: WorkspaceMenuNavItem[];
  ariaLabel: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const disclosureId = useId();
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const activeItem = items.find((item) => item.active) ?? null;

  function close({ restoreFocus = false } = {}) {
    setExpanded(false);
    if (restoreFocus) {
      disclosureRef.current?.focus();
    }
  }

  return (
    <nav
      className={cx("workspace-menu-nav", className)}
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
        className="workspace-menu-trigger"
        aria-label={`Switch workspace. Current workspace ${activeItem?.label ?? "not selected"}`}
        aria-expanded={expanded}
        aria-controls={disclosureId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <small>Workspace</small>
          <strong>{activeItem?.label ?? "Browse workspaces"}</strong>
        </span>
        <em aria-hidden="true">{expanded ? "Close" : "Switch"}</em>
      </button>

      <div
        id={disclosureId}
        className="workspace-menu-panel"
        hidden={!expanded}
      >
        <span className="workspace-menu-label">Available workspaces</span>
        <div className="workspace-menu-list">
          {items.map((item) =>
            item.disabled || !item.href ? (
              <span
                key={item.key}
                className={cx(
                  "workspace-menu-link",
                  item.active && "workspace-menu-link-active",
                  "workspace-menu-link-disabled",
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
                  "workspace-menu-link",
                  item.active && "workspace-menu-link-active",
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

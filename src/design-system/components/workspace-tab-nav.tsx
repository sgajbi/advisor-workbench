import Link from "next/link";

import { cx } from "../utils/cx";

export type WorkspaceTabNavItem = {
  key: string;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
};

export default function WorkspaceTabNav({
  items,
  ariaLabel,
  className,
}: {
  items: WorkspaceTabNavItem[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav className={cx("workspace-tab-nav", className)} aria-label={ariaLabel}>
      {items.map((item) =>
        item.disabled || !item.href ? (
          <span
            key={item.key}
            className="workspace-tab-nav-link workspace-tab-nav-link-disabled"
            aria-disabled="true"
            title={item.title}
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            className={cx(
              "workspace-tab-nav-link",
              item.active && "workspace-tab-nav-link-active"
            )}
            title={item.title}
            aria-current={item.active ? "page" : undefined}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

import Link from "next/link";

import { cx } from "../utils/cx";

export default function WorkspaceRailLink({
  href,
  title,
  meta,
  detail,
  active = false,
}: {
  href: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  detail?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx("portfolio-rail-item", active && "portfolio-rail-item-active")}
    >
      <strong>{title}</strong>
      {meta ? <span>{meta}</span> : null}
      {detail ? <span>{detail}</span> : null}
    </Link>
  );
}

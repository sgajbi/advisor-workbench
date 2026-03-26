import Link from "next/link";

import { cx } from "../utils/cx";

export default function ActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cx("nav-link", className)}>
      {children}
    </Link>
  );
}

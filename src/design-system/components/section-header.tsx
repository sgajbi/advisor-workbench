import type { ReactNode } from "react";

import Text from "./text";

export default function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="section-header" role="group" aria-label={`${title} section header`}>
      <div className="section-header-copy">
        <Text variant="sectionTitle">{title}</Text>
        {subtitle ? <Text variant="secondary">{subtitle}</Text> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </div>
  );
}

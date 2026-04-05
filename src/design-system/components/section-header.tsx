import type { ReactNode } from "react";

import Text from "./text";

export default function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const accessibleTitle =
    typeof title === "string" ? title : typeof subtitle === "string" ? subtitle : "Section";

  return (
    <div className="section-header" role="group" aria-label={`${accessibleTitle} section header`}>
      <div className="section-header-copy">
        <Text variant="sectionTitle">{title}</Text>
        {subtitle ? <Text variant="secondary">{subtitle}</Text> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </div>
  );
}

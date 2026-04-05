import { cx } from "../utils/cx";
import ActionLink from "./action-link";
import Panel from "./panel";
import SectionLabel from "./section-label";
import SemanticBadge from "./semantic-badge";

type Action = {
  href: string;
  label: string;
};

export default function DegradedStatePanel({
  label,
  title,
  tone = "warn",
  status,
  children,
  actions,
  className,
}: {
  label?: React.ReactNode;
  title: React.ReactNode;
  tone?: "warn" | "danger";
  status?: React.ReactNode;
  children?: React.ReactNode;
  actions?: Action[];
  className?: string;
}) {
  return (
    <Panel className={cx("degraded-state-panel", className)}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <div className="degraded-state-header">
        <h2>{title}</h2>
        {status ? <SemanticBadge tone={tone}>{status}</SemanticBadge> : null}
      </div>
      {children ? <div className="degraded-state-copy">{children}</div> : null}
      {actions?.length ? (
        <div className="toolbar">
          {actions.map((action) => (
            <ActionLink key={action.href} href={action.href}>
              {action.label}
            </ActionLink>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

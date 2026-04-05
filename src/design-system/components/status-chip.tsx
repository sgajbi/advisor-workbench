import SemanticBadge, { type SemanticBadgeTone } from "./semantic-badge";

type StatusTone = SemanticBadgeTone;

export default function StatusChip({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <SemanticBadge tone={tone} className={["status-chip", tone !== "default" ? tone : "", className].filter(Boolean).join(" ")}>
      {children}
    </SemanticBadge>
  );
}

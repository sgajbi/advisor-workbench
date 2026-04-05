type LotusSemanticBadgeTone = "default" | "success" | "warn" | "danger";

export default function LotusSemanticBadge({
  children,
  tone = "default",
  emphasis = "subtle",
  className,
}: {
  children: React.ReactNode;
  tone?: LotusSemanticBadgeTone;
  emphasis?: "subtle" | "strong";
  className?: string;
}) {
  return (
    <span
      className={[
        "lotus-semantic-badge",
        `lotus-semantic-badge-${tone}`,
        emphasis === "strong" ? "lotus-semantic-badge-strong" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}

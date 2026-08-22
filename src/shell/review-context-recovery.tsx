import { ActionLink, ScreenStatePanel } from "@/design-system";

export default function ReviewContextRecovery({
  body,
  href,
  actionLabel,
}: {
  body: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <ScreenStatePanel
      kind="error"
      surface="portfolio"
      title="Review context needs attention"
      body={body}
      action={<ActionLink href={href}>{actionLabel}</ActionLink>}
    />
  );
}

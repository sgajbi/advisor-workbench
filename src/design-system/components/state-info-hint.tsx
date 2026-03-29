import Tooltip from "@mui/material/Tooltip";

/**
 * Compact reusable explanation affordance for empty, partial, or unavailable module states.
 * Use this instead of page-local "why" links so state explanations stay consistent.
 */
export default function StateInfoHint({
  body,
  title = "Why?",
  label = "Why this section is unavailable",
}: {
  body: string;
  title?: string;
  label?: string;
}) {
  return (
    <Tooltip title={body} placement="top" arrow>
      <button type="button" className="state-info-hint" aria-label={label}>
        {title}
      </button>
    </Tooltip>
  );
}

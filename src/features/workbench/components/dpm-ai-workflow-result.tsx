"use client";

import { useEffect, useRef } from "react";

import { AiAssistanceDisclosure } from "@/design-system";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";

type Props = {
  outcome: DpmAiWorkflowOutcome;
  ariaLabel?: string;
  eyebrow?: string;
  focusOnMount?: boolean;
};

export default function DpmAiWorkflowResult({
  outcome,
  ariaLabel = "Latest decision-support result",
  eyebrow = "Latest result",
  focusOnMount = false,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      headingRef.current?.focus();
    }
  }, [focusOnMount, outcome.sourceIdentity]);

  return (
    <section className="dpm-ai-workflow-result" aria-label={ariaLabel} aria-live="polite">
      <div className="dpm-ai-workflow-result-copy">
        <span>{eyebrow}</span>
        <h3 ref={headingRef} tabIndex={focusOnMount ? -1 : undefined}>
          {outcome.scopeLabel}
        </h3>
        <p>{outcome.businessSummary}</p>
      </div>
      <AiAssistanceDisclosure disclosure={outcome.disclosure} />
    </section>
  );
}

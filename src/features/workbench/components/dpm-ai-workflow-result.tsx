"use client";

import { useLayoutEffect, useRef } from "react";

import { AiAssistanceDisclosure } from "@/design-system";
import type { DpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";

import styles from "./dpm-ai-workflow-result.module.css";

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

  useLayoutEffect(() => {
    if (focusOnMount) {
      headingRef.current?.focus();
    }
  }, [focusOnMount, outcome.sourceIdentity]);

  return (
    <section className={styles.result} aria-label={ariaLabel} aria-live="polite">
      <div className={styles.copy}>
        <span>{eyebrow}</span>
        <h3 ref={headingRef} tabIndex={focusOnMount ? -1 : undefined}>
          {outcome.scopeLabel}
        </h3>
        <p>{outcome.businessSummary}</p>
      </div>
      {outcome.material.sections.length > 0 ? (
        <section
          className={styles.material}
          aria-label={outcome.material.title}
        >
          <h4>{outcome.material.title}</h4>
          <dl>
            {outcome.material.sections.map((section) => (
              <div key={section.label}>
                <dt>{section.label}</dt>
                <dd>
                  {section.values.length === 1 ? (
                    section.values[0]
                  ) : (
                    <ul>
                      {section.values.map((value, index) => (
                        <li key={`${section.label}-${index}`}>{value}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <AiAssistanceDisclosure disclosure={outcome.disclosure} />
    </section>
  );
}

import { screen } from "@testing-library/react";
import { expect } from "vitest";

function normalizeAccessibleText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

type ContextualFact = {
  label: string;
  value: string | null | undefined;
};

export function expectReviewContextOwns({
  exclusiveFacts,
  contextualFacts = [],
}: {
  exclusiveFacts: ReadonlyArray<string | null | undefined>;
  contextualFacts?: ReadonlyArray<ContextualFact>;
}): void {
  const reviewContext = screen.getByTestId("review-context-strip");
  const documentWithoutReviewContext = document.body.cloneNode(true) as HTMLElement;
  documentWithoutReviewContext
    .querySelector('[data-testid="review-context-strip"]')
    ?.remove();
  const outsideText = normalizeAccessibleText(
    documentWithoutReviewContext.textContent ?? "",
  );

  for (const fact of exclusiveFacts) {
    expect(fact, "Review-context census facts must be source-confirmed").toBeTruthy();
    if (!fact) {
      continue;
    }
    const normalizedFact = normalizeAccessibleText(fact);
    expect(reviewContext).toHaveTextContent(normalizedFact);
    expect(outsideText).not.toContain(normalizedFact);
  }

  for (const fact of contextualFacts) {
    expect(fact.value, "Review-context census facts must be source-confirmed").toBeTruthy();
    if (!fact.value) {
      continue;
    }
    const factRow = Array.from(reviewContext.querySelectorAll("dt")).find(
      (term) => normalizeAccessibleText(term.textContent ?? "") === fact.label,
    )?.parentElement;
    expect(factRow, `${fact.label} must be owned by the review-context strip`).toBeTruthy();
    expect(factRow).toHaveTextContent(normalizeAccessibleText(fact.value));
    expect(
      Array.from(documentWithoutReviewContext.querySelectorAll("dt")).some(
        (term) => normalizeAccessibleText(term.textContent ?? "") === fact.label,
      ),
      `${fact.label} must not be recreated as page-local context`,
    ).toBe(false);
  }
}

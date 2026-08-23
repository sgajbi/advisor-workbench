import { screen } from "@testing-library/react";
import { expect } from "vitest";

function normalizeAccessibleText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function expectReviewContextOwns(
  facts: ReadonlyArray<string | null | undefined>,
): void {
  const reviewContext = screen.getByTestId("review-context-strip");
  const documentWithoutReviewContext = document.body.cloneNode(true) as HTMLElement;
  documentWithoutReviewContext
    .querySelector('[data-testid="review-context-strip"]')
    ?.remove();
  const outsideText = normalizeAccessibleText(
    documentWithoutReviewContext.textContent ?? "",
  );

  for (const fact of facts) {
    expect(fact, "Review-context census facts must be source-confirmed").toBeTruthy();
    if (!fact) {
      continue;
    }
    const normalizedFact = normalizeAccessibleText(fact);
    expect(reviewContext).toHaveTextContent(normalizedFact);
    expect(outsideText).not.toContain(normalizedFact);
  }
}

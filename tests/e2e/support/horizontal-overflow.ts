import type { Locator } from "@playwright/test";

export type OverflowDiagnostic = {
  tag: string;
  className: string;
  text: string;
  clientWidth: number;
  scrollWidth: number;
};

export async function collectHorizontalOverflow(
  root: Locator,
): Promise<OverflowDiagnostic[]> {
  return root.evaluate((element) =>
    [element, ...element.querySelectorAll<HTMLElement>("*")]
      .filter((candidate) => {
        const style = getComputedStyle(candidate);
        const bounds = candidate.getBoundingClientRect();
        const isVisuallyHidden =
          style.position === "absolute"
          && bounds.width <= 1
          && bounds.height <= 1
          && (style.overflow === "hidden"
            || style.clip !== "auto"
            || style.clipPath !== "none");

        return (
          !isVisuallyHidden
          && candidate.clientWidth > 0
          && candidate.scrollWidth > candidate.clientWidth + 1
        );
      })
      .map((candidate) => ({
        tag: candidate.tagName.toLowerCase(),
        className:
          typeof candidate.className === "string" ? candidate.className : "",
        text: (candidate.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120),
        clientWidth: candidate.clientWidth,
        scrollWidth: candidate.scrollWidth,
      })),
  );
}

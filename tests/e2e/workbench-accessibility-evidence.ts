import { type Locator, type Page } from '@playwright/test';

export type FocusableElementEvidence = {
  key: string;
  name: string;
  tag: string;
  href: string | null;
  focusVisible: boolean;
  notObscured: boolean;
  withinViewport: boolean;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export async function collectFocusableDomOrder(root: Locator) {
  return root.locator(FOCUSABLE_SELECTOR).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        const style = getComputedStyle(htmlElement);
        const closedDetails = htmlElement.closest('details:not([open])');
        return (
          htmlElement.getClientRects().length > 0 &&
          htmlElement.tabIndex >= 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          htmlElement.getAttribute('aria-hidden') !== 'true' &&
          (!closedDetails || htmlElement.tagName === 'SUMMARY')
        );
      })
      .map((element, index) => {
        const htmlElement = element as HTMLElement;
        const labelledBy = htmlElement.getAttribute('aria-labelledby');
        const labelledByText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
              .filter(Boolean)
              .join(' ')
          : '';
        const formLabelText =
          htmlElement instanceof HTMLInputElement ||
          htmlElement instanceof HTMLSelectElement ||
          htmlElement instanceof HTMLTextAreaElement
            ? Array.from(htmlElement.labels ?? [])
                .map((label) => label.textContent?.trim() ?? '')
                .filter(Boolean)
                .join(' ')
            : '';
        const name = [
          htmlElement.getAttribute('aria-label'),
          labelledByText,
          formLabelText,
          htmlElement.getAttribute('alt'),
          htmlElement.getAttribute('title'),
          htmlElement.innerText,
        ]
          .find((candidate) => candidate?.trim())
          ?.replace(/\s+/g, ' ')
          .trim() ?? '';
        const href = htmlElement instanceof HTMLAnchorElement
          ? htmlElement.getAttribute('href')
          : null;
        return {
          key: `${htmlElement.tagName.toLowerCase()}:${index}:${href ?? ''}:${name}`,
          name,
          tag: htmlElement.tagName.toLowerCase(),
          href,
        };
      })
  );
}

export async function traverseSequentialKeyboardFocus(
  page: Page,
  expectedFocusableCount: number
): Promise<FocusableElementEvidence[]> {
  await page.evaluate(() => {
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
  });

  const evidence: FocusableElementEvidence[] = [];
  const observedKeys = new Set<string>();
  const maximumSteps = expectedFocusableCount * 2 + 10;

  for (let step = 0; step < maximumSteps; step += 1) {
    await page.keyboard.press('Tab');
    const current = await page.evaluate((focusableSelector) => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) {
        return null;
      }

      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledByText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .filter(Boolean)
            .join(' ')
        : '';
      const formLabelText =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? Array.from(element.labels ?? [])
              .map((label) => label.textContent?.trim() ?? '')
              .filter(Boolean)
              .join(' ')
          : '';
      const name = [
        element.getAttribute('aria-label'),
        labelledByText,
        formLabelText,
        element.getAttribute('alt'),
        element.getAttribute('title'),
        element.innerText,
      ]
        .find((candidate) => candidate?.trim())
        ?.replace(/\s+/g, ' ')
        .trim() ?? '';
      const href = element instanceof HTMLAnchorElement ? element.getAttribute('href') : null;
      const domPosition = Array.from(document.querySelectorAll(focusableSelector)).indexOf(element);
      const description = {
        key: `${element.tagName.toLowerCase()}:${domPosition}:${href ?? ''}:${name}`,
        name,
        tag: element.tagName.toLowerCase(),
        href,
      };
      const bounds = element.getBoundingClientRect();
      const sampleX = Math.min(
        Math.max(bounds.left + bounds.width / 2, 0),
        Math.max(window.innerWidth - 1, 0)
      );
      const sampleY = Math.min(
        Math.max(bounds.top + Math.min(bounds.height / 2, 12), 0),
        Math.max(window.innerHeight - 1, 0)
      );
      const topmostElement = document.elementFromPoint(sampleX, sampleY);

      return {
        ...description,
        focusVisible: element.matches(':focus-visible'),
        notObscured: Boolean(
          topmostElement &&
            (topmostElement === element ||
              element.contains(topmostElement) ||
              topmostElement.contains(element))
        ),
        withinViewport:
          bounds.left >= -1 &&
          bounds.right <= window.innerWidth + 1 &&
          bounds.top >= -1 &&
          bounds.bottom <= window.innerHeight + 1,
      };
    }, FOCUSABLE_SELECTOR);

    if (!current) {
      break;
    }
    if (observedKeys.has(current.key)) {
      if (current.key === evidence[0]?.key && evidence.length >= expectedFocusableCount) {
        break;
      }
      continue;
    }
    observedKeys.add(current.key);
    evidence.push(current);
  }

  await page.evaluate(() => document.body.removeAttribute('tabindex'));
  return evidence;
}

export async function measureViewportEvidence(page: Page) {
  return page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    },
  }));
}

export async function collectReviewContextOwnershipEvidence(
  page: Page,
  facts: readonly string[],
) {
  return page.evaluate((expectedFacts) => {
    const reviewContext = document.querySelector<HTMLElement>(
      '[data-testid="review-context-strip"]'
    );
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    const reviewContextText = normalize(reviewContext?.textContent ?? '');
    const renderedOutsideText: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (
        parent &&
        !parent.closest('[data-testid="review-context-strip"]') &&
        !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(parent.tagName) &&
        parent.getClientRects().length > 0
      ) {
        renderedOutsideText.push(node.textContent ?? '');
      }
      node = walker.nextNode();
    }
    const outsideText = normalize(renderedOutsideText.join(' '));

    return expectedFacts.map((fact) => ({
      fact,
      presentInReviewContext: reviewContextText.includes(fact),
      presentOutsideReviewContext: outsideText.includes(fact),
    }));
  }, facts);
}

import { type Locator, type Page } from '@playwright/test';

export async function setLocalStorageBeforeNavigation(
  page: Page,
  entries: Record<string, string>
) {
  await page.addInitScript((values: Record<string, string>) => {
    for (const [key, value] of Object.entries(values)) {
      window.localStorage.setItem(key, value);
    }
  }, entries);
}

export async function measureElement(locator: Locator) {
  return locator.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    width: element.getBoundingClientRect().width,
  }));
}

export async function measureGrid(locator: Locator) {
  return locator.evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns,
    width: element.getBoundingClientRect().width,
    childWidths: Array.from(element.children).map((child) => child.getBoundingClientRect().width),
    childCount: element.children.length,
  }));
}

export async function measureTableFrame(locator: Locator) {
  return locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
}

export async function measureAgGridViewport(locator: Locator) {
  return locator.evaluate((element) => {
    const centerViewport = element.querySelector('.ag-center-cols-viewport') as HTMLElement | null;
    return {
      clientWidth: element.clientWidth,
      centerClientWidth: centerViewport?.clientWidth ?? 0,
    };
  });
}

export function parseServerTimingDuration(header: string | null) {
  if (!header) {
    return null;
  }
  const match = header.match(/(?:^|,)\s*app;dur=([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function parseServerTimingMetrics(header: string | null) {
  const metrics = new Map<string, number>();
  if (!header) {
    return metrics;
  }
  for (const segment of header.split(',')) {
    const match = segment.trim().match(/^([^;,\s]+);dur=([0-9]+(?:\.[0-9]+)?)$/i);
    if (!match) {
      continue;
    }
    metrics.set(match[1], Number(match[2]));
  }
  return metrics;
}

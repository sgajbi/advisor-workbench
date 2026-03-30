import { expect, type Locator, type Page } from '@playwright/test';

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

export async function expectActiveTab(page: Page, name: string | RegExp) {
  await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
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

import { test as base, expect } from '@playwright/test';

/**
 * `page.goto` resolves only once the page is hydrated: every link in <main> carries React's
 * props (React sets `__reactProps$…` on the DOM nodes it hydrates; with app/loading.tsx the
 * page content hydrates after the layout). Tests click right after loading; a click that lands
 * mid-hydration can be lost — the intermittent "clicked a link, the URL never changed"
 * failures, seen under the load of the parallel suite. Real visitors don't click that fast.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const res = await goto(url, options);
      await page
        .waitForFunction(
          () => [...document.querySelectorAll('main a')].every((a) => Object.keys(a).some((k) => k.startsWith('__reactProps'))),
          undefined,
          { timeout: 30_000 },
        )
        .catch(() => {}); // pages that fail to hydrate are caught by the tests' own assertions
      return res;
    };
    await use(page);
  },
});

export { expect };
export type { Page, APIRequestContext } from '@playwright/test';

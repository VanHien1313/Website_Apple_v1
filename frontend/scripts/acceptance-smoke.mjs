// Layout/semantics checks supplement the behavioral suites. No WCAG certification.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-6/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
const checks = [], errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const go = async (route) => { await page.goto(base + route, { waitUntil: 'domcontentloaded' }); await page.locator('h1').first().waitFor(); };
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
async function layout() {
  const result = await page.evaluate(() => {
    const visible = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const name = (e) => e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')?.split(' ').map((id) => document.getElementById(id)?.textContent).join(' ') || e.labels?.[0]?.textContent || e.textContent || e.getAttribute('title');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 2,
      unnamed: [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea')].filter(visible).filter((e) => !name(e)?.trim()).map((e) => e.outerHTML.slice(0, 180)),
      images: [...document.images].filter((e) => !e.hasAttribute('alt')).map((e) => e.src),
      main: document.querySelectorAll('main').length,
    };
  });
  assert.equal(result.overflow, false, 'horizontal page overflow');
  assert.deepEqual(result.unnamed, [], 'controls need accessible names');
  assert.deepEqual(result.images, [], 'images need alt attributes');
  assert.equal(result.main, 1);
}
try {
  await go('/admin/login'); await page.getByRole('button', { name: /Chủ cửa hàng demo/ }).click(); await page.waitForURL('**/admin');
  const routes = ['/', '/iphone', '/product/iphone-16-pro-max', '/cart', '/register', '/admin/products', '/admin/products/new', '/admin/categories', '/admin/admin-users', '/admin/orders', '/admin/reports', '/admin/customers', '/not-found'];
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('aura_store_theme', value), theme);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) await check(`${theme} ${width}px ${route}: reflow and named controls`, async () => { await go(route); await layout(); });
    }
  }
  await check('200% text sizing: catalog, registration and product editor reflow', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const route of ['/iphone', '/register', '/admin/products/new']) {
      await go(route); await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await layout();
    }
    await page.screenshot({ path: `${output}/editor-text-200.png`, fullPage: true });
  });
  await check('Keyboard skip link moves focus to main content', async () => {
    await go('/iphone'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('ui-skip-link')), true);
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');
  });
  await check('Reduced motion and native theme are applied', async () => {
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).transitionDuration), '1e-05s');
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), '#000000');
  });
  await page.setViewportSize({ width: 390, height: 844 }); await go('/admin/products');
  await page.screenshot({ path: `${output}/admin-mobile-dark.png`, fullPage: true });
  await go('/register'); await page.screenshot({ path: `${output}/register-mobile-dark.png`, fullPage: true });
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ date: new Date().toISOString(), base, browser: await browser.version(), checks, runtimeErrors: errors, limitations: ['200% text sizing is not browser UI zoom', 'Chrome only; no screen-reader certification', 'Names/alt checks do not measure contrast or full WCAG compliance'] }, null, 2));
} catch (error) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; }
finally { await browser.close(); }

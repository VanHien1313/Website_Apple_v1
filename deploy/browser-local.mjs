// Read-only browser smoke against the running local Docker stack.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const output = new URL('../docs/qa/docker-local/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const errors = [];
const checks = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4000/') && response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/admin/login']) {
      const response = await page.goto(`http://127.0.0.1:4000${route}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.ok((await page.locator('body').innerText()).trim().length > 50);
      if (route === '/admin/login') await page.locator('input[type="password"]').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Horizontal overflow: ${route} @ ${width}`);
      await page.screenshot({ path: fileURLToPath(new URL(`${route === '/' ? 'store' : 'login'}-${width}.png`, output)), fullPage: true });
      checks.push({ route, width, status: 'passed' });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('browser.json', output), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
} finally { await browser.close(); }

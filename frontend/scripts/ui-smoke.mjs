// Uses an existing Playwright installation; no browser/dependency download.
// node scripts/ui-smoke.mjs <playwright-module-path> [chrome-executable-path]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-1/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
try {
  await page.goto(`${base}/admin/login`);
  await page.getByRole('button', { name: /Chủ cửa hàng demo/ }).click();
  await page.goto(`${base}/admin/design-system`);
  await page.getByRole('heading', { name: 'Nhất quán trong từng chi tiết.' }).waitFor();
  await check('Dialog traps focus, Escape closes, focus returns', async () => {
    const trigger = page.getByRole('button', { name: 'Mở hộp thoại', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Xóa bản mẫu?' });
    await dialog.waitFor();
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
  await check('Drawer closes and restores focus', async () => {
    const trigger = page.getByRole('button', { name: 'Mở ngăn bên', exact: true });
    await trigger.click();
    await page.getByRole('dialog', { name: 'Tùy chọn hiển thị' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
  });
  await check('Tabs support arrows, Home and End', async () => {
    await page.getByRole('tab', { name: 'Biểu mẫu', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Đang tải', exact: true }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: 'Lỗi', exact: true }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab', { name: 'Biểu mẫu', exact: true }).getAttribute('aria-selected'), 'true');
  });
  await check('Form connects validation errors and preserves input', async () => {
    await page.getByRole('button', { name: 'Lưu bản mẫu', exact: true }).click();
    const name = page.getByLabel('Tên sản phẩm', { exact: false });
    assert.equal(await name.getAttribute('aria-invalid'), 'true');
    assert.equal(await name.evaluate((element) => element === document.activeElement), true);
    await name.fill('MacBook mẫu');
    await page.getByRole('button', { name: 'Lưu bản mẫu', exact: true }).click();
    await page.getByText('Đã lưu bản mẫu: MacBook mẫu.', { exact: true }).waitFor();
    assert.equal(await name.inputValue(), 'MacBook mẫu');
    await page.getByRole('button', { name: 'Đóng thông báo' }).click();
  });
  await check('Pagination updates records and boundary buttons', async () => {
    const nav = page.getByRole('navigation', { name: 'Phân trang', exact: true });
    assert.equal(await nav.getByRole('button', { name: 'Trước' }).isDisabled(), true);
    for (let index = 0; index < 4; index++) await nav.getByRole('button', { name: 'Sau' }).click();
    assert.equal(await nav.getByRole('button', { name: 'Sau' }).isDisabled(), true);
    await page.getByText('Đang xem bản ghi 41–42 trong 42 bản ghi mẫu.').waitFor();
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('aura_store_theme', value), theme);
    await page.reload();
    await page.getByRole('heading', { name: 'Nhất quán trong từng chi tiết.' }).waitFor();
    await check(`Dialog keyboard works in ${theme} theme`, async () => {
      await page.getByRole('button', { name: 'Mở hộp thoại', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Xóa bản mẫu?' });
      await page.keyboard.press('Shift+Tab');
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    });
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await check(`Design system fits ${width}px ${theme}`, async () => {
        await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, null, { timeout: 3000 });
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), theme === 'dark');
      });
      if (width === 390 || width === 1440) await page.screenshot({ path: `${output}/design-system-${width}-${theme}.png`, fullPage: true });
    }
  }
  await check('Admin mobile navigation works', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Mở menu quản trị' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Tổng quan', exact: true }).click();
    await page.getByRole('heading', { name: 'Chăm chút từng trải nghiệm.' }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.screenshot({ path: `${output}/admin-mobile.png`, fullPage: true });
  });
  await check('Store mobile menu and search navigate', async () => {
    await page.goto(`${base}/mac`);
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'iPad', exact: true }).click();
    await page.waitForURL('**/ipad');
    const input = page.getByRole('searchbox', { name: 'Tìm sản phẩm' });
    await input.fill('Mac');
    await input.press('Enter');
    await page.waitForURL('**/search?q=Mac');
    await page.getByRole('heading', { name: 'Kết quả tìm kiếm' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}/store-mobile.png`, fullPage: true });
  });
  await check('Extracted product dialogs and checkout summary still work', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/product/iphone-16-pro-max`);
    await page.getByRole('button', { name: 'Xem cấu hình chi tiết' }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Xem ảnh lớn' }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
    await page.waitForURL('**/checkout');
    await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).waitFor();
    await page.getByRole('heading', { name: 'Đơn hàng của bạn' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
  await check('Home links to the full catalog', async () => {
    await page.goto(base);
    await page.getByRole('link', { name: 'Tất cả sản phẩm', exact: true }).click();
    await page.waitForURL('**/search');
  });
  await check('404 retains URL and 403 has a clear recovery link', async () => {
    await page.goto(`${base}/missing-page`);
    await page.getByRole('heading', { name: 'Trang này không tồn tại' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/missing-page');
    await page.goto(`${base}/403`);
    await page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' }).waitFor();
    await page.getByRole('link', { name: 'Quay về trang chính' }).waitFor();
  });
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await writeFile(`${output}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), checks, runtimeErrors: errors }, null, 2) + '\n');
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.error(await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowing: Array.from(document.querySelectorAll('body *')).filter((element) => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 10).map((element) => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right })) })));
  throw error;
} finally { await browser.close(); }

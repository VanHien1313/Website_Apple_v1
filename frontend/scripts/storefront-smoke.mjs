// node scripts/storefront-smoke.mjs <playwright-module-path> <chrome-executable-path>
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-2/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(15000);
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
const checks = [], runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
async function fits() { await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth, null, { timeout: 3000 }); }
async function capture(name) {
  for (const button of await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).all()) await button.click();
  // Load below-fold images before taking a full-page screenshot, then restore the viewport.
  await page.evaluate(async () => {
    document.activeElement?.blur();
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await Promise.all([...document.images].map((img) => Promise.race([
      img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 4000)),
    ])));
    scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
async function waitReadyButton(name) { await page.getByRole('button', { name, exact: true }).waitFor(); await page.waitForFunction((text) => [...document.querySelectorAll('button')].some((button) => button.textContent.trim() === text && !button.disabled), name); }
try {
  await page.goto(base);
  await check('Home has product previews with links to complete lists', async () => {
    await page.getByRole('heading', { level: 1, name: /Một thiết bị/ }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Xem tất cả', exact: true }).count(), 4);
    await fits();
    await capture('home-desktop');
  });
  await check('Search, category, price and sort combine and survive Back', async () => {
    const search = page.getByRole('searchbox', { name: 'Tìm sản phẩm' });
    await search.fill('Mac'); await search.press('Enter'); await page.waitForURL('**/search?q=Mac');
    const filters = page.getByRole('complementary');
    await filters.getByRole('radio', { name: 'Mac', exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('category') === 'mac');
    await filters.getByRole('radio', { name: 'Trên 35.000.000₫', exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('priceRange') === 'above35');
    await page.getByLabel('Sắp xếp', { exact: true }).selectOption('price_desc');
    assert.ok(page.url().includes('q=Mac') && page.url().includes('category=mac') && page.url().includes('priceRange=above35') && page.url().includes('sort=price_desc'));
    await page.getByRole('link', { name: 'Chọn cấu hình', exact: true }).first().waitFor();
    await page.getByLabel('Sắp xếp', { exact: true }).selectOption('price_asc');
    await page.goBack();
    assert.equal(await page.getByLabel('Sắp xếp', { exact: true }).inputValue(), 'price_desc');
    await page.getByRole('link', { name: 'Chọn cấu hình', exact: true }).first().click();
    await page.waitForURL('**/product/**');
  });
  await check('Product selection changes price, add-to-cart and quantities work', async () => {
    const configurations = page.getByRole('group', { name: 'Cấu hình', exact: true }).getByRole('button');
    if (await configurations.count() > 1) {
      await configurations.last().click();
      assert.equal(await configurations.last().getAttribute('aria-pressed'), 'true');
    }
    await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
    await page.getByRole('link', { name: /Giỏ hàng, 1 sản phẩm/ }).click();
    await page.getByRole('button', { name: /Tăng số lượng/ }).click();
    await page.getByRole('button', { name: /Xóa / }).click();
    await page.getByRole('button', { name: 'Giữ lại', exact: true }).click();
    await waitReadyButton('Tiến hành đặt hàng');
    await page.getByRole('button', { name: 'Tiến hành đặt hàng', exact: true }).click();
    await page.waitForURL('**/checkout');
  });
  await check('Guest form validates fields, permits no email and updates delivery fee', async () => {
    await waitReadyButton('Xác nhận đặt hàng demo');
    await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).click();
    assert.equal(await page.getByLabel('Họ và tên', { exact: false }).getAttribute('aria-invalid'), 'true');
    await page.getByLabel('Họ và tên', { exact: false }).fill('Khách kiểm thử');
    await page.getByLabel('Số điện thoại', { exact: false }).fill('0901234567');
    await page.getByLabel('Tỉnh / thành phố', { exact: false }).fill('Thành phố mẫu');
    await page.getByLabel('Phường / xã', { exact: false }).fill('Phường mẫu');
    await page.getByLabel('Số nhà, đường và địa chỉ chi tiết', { exact: false }).fill('12 đường kiểm thử');
    await page.getByRole('radio', { name: 'Giao nhanh — 50.000 ₫', exact: true }).click();
    await waitReadyButton('Xác nhận đặt hàng demo');
    assert.equal(await page.getByLabel('Email (không bắt buộc)', { exact: true }).inputValue(), '');
    await page.setViewportSize({ width: 390, height: 844 }); await fits();
    await capture('checkout-mobile');
  });
  await check('Storage failure keeps form and cart; retry does not create duplicate orders', async () => {
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'aura_demo_orders_v1') throw new DOMException('Test storage failure', 'QuotaExceededError'); return window.originalSetItem.call(this, key, value); };
    });
    await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).click();
    await page.getByText('Chưa tạo được đơn hàng', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Họ và tên', { exact: false }).inputValue(), 'Khách kiểm thử');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_apple_cart_v2')).items[0].quantity), 2);
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).evaluate((button) => { button.click(); button.click(); });
    await page.waitForURL('**/order-confirmation/**');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_demo_orders_v1')).orders.length), 1);
  });
  const orderUrl = page.url();
  await check('Confirmation survives reload, is unpaid, matches quantities and clears cart', async () => {
    await page.reload();
    await page.getByRole('heading', { name: 'Đã lưu đơn hàng demo.' }).waitFor();
    const order = await page.evaluate(() => JSON.parse(localStorage.getItem('aura_demo_orders_v1')).orders[0].order);
    assert.equal(order.customer.email, undefined);
    assert.equal(order.paymentStatus, 'PENDING');
    assert.equal(order.items[0].quantity, 2);
    assert.equal(order.shippingFee, 50000);
    assert.equal(order.total, order.subtotal + 50000);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_apple_cart_v2')).items.length), 0);
    await fits(); await capture('confirmation-mobile');
  });
  await check('Pagination and empty search have working recovery paths', async () => {
    await page.goto(`${base}/search?page=999`);
    await page.waitForURL((url) => url.searchParams.has('page') && url.searchParams.get('page') !== '999');
    const nav = page.getByRole('navigation', { name: 'Phân trang sản phẩm' });
    assert.equal(await nav.getByRole('button', { name: 'Sau' }).isDisabled(), true);
    await page.goto(`${base}/search?q=does-not-exist`);
    await page.getByRole('heading', { name: 'Không tìm thấy sản phẩm', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem lại toàn bộ danh mục' }).click();
    await page.getByRole('link', { name: 'Chọn cấu hình', exact: true }).first().waitFor();
  });
  await check('Cart requires acceptance of changed prices and blocks invalid configurations', async () => {
    await page.goto(`${base}/product/iphone-16-pro-max`);
    await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
    await page.evaluate(() => { const cart = JSON.parse(localStorage.getItem('aura_apple_cart_v2')); cart.items[0].variant.price = 1; localStorage.setItem('aura_apple_cart_v2', JSON.stringify(cart)); });
    await page.goto(`${base}/cart`);
    await page.getByText('Giá sản phẩm đã thay đổi', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Chấp nhận giá mới' }).click();
    await waitReadyButton('Tiến hành đặt hàng');
    await page.evaluate(() => { const cart = JSON.parse(localStorage.getItem('aura_apple_cart_v2')); cart.items[0].color.id = 'unavailable-color'; localStorage.setItem('aura_apple_cart_v2', JSON.stringify(cart)); });
    await page.reload();
    await page.getByText('Cần kiểm tra giỏ hàng', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Tiến hành đặt hàng' }).isDisabled(), true);
  });
  await check('Broken product images show fallback and gallery remains usable', async () => {
    await page.route('**/*', (route) => route.request().resourceType() === 'image' ? route.abort() : route.continue());
    await page.goto(`${base}/product/iphone-16-pro-max`);
    await page.getByText('Ảnh đang cập nhật').first().waitFor();
    await page.getByRole('button', { name: 'Xem ảnh lớn' }).click();
    await page.getByRole('dialog').getByText('Ảnh đang cập nhật').first().waitFor();
    await page.keyboard.press('Escape');
    await page.unroute('**/*');
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('aura_store_theme', value), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/', '/search', '/product/iphone-16-pro-max', '/cart', '/checkout', new URL(orderUrl).pathname]) {
        await check(`${route.split('/')[1] || 'home'} fits ${width}px ${theme}`, async () => {
          await page.goto(base + route);
          await page.locator('h1').waitFor();
          await fits();
        });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/product/iphone-16-pro-max`);
    await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).waitFor();
    await capture(`product-mobile-${theme}`);
  }
  await page.goto(`${base}/order-confirmation/not-found`);
  await page.getByRole('heading', { name: 'Không tìm thấy đơn demo' }).waitFor();
  assert.deepEqual(runtimeErrors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), checks, runtimeErrors }, null, 2) + '\n');
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally { await browser.close(); }

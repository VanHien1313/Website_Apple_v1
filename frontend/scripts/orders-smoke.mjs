// node scripts/orders-smoke.mjs <playwright-module-path> <chrome-executable-path>
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-4/', import.meta.url)); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(15000);
const base = process.env.APP_URL || 'http://127.0.0.1:3000'; const checks = [], runtimeErrors = [];
page.on('pageerror', (e) => runtimeErrors.push(e.message));
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
const go = async (path) => { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.locator('h1').waitFor(); };
async function createOrder(name) {
  await go('/product/iphone-16-pro-max'); await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
  await page.getByLabel('Họ và tên').fill(name); await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel('Tỉnh / thành phố').fill('Thành phố mẫu'); await page.getByLabel('Phường / xã').fill('Phường mẫu'); await page.getByLabel('Số nhà, đường và địa chỉ chi tiết').fill('12 đường mẫu');
  await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).click(); await page.waitForURL('**/order-confirmation/**');
  return new URL(page.url()).pathname.split('/').at(-1);
}
async function action(name) {
  await page.getByRole('button', { name, exact: true }).click(); await page.getByLabel('Ghi chú thao tác').fill('Thao tác kiểm thử mẫu');
  await page.getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Tải lại đơn', exact: true }).waitFor();
}
try {
  let id, cancelled;
  await check('Checkout orders appear in admin list and recipient search', async () => {
    id = await createOrder('Khách hoàn thành'); cancelled = await createOrder('Khách hủy');
    await go('/admin/login'); await page.getByRole('button', { name: /Chủ cửa hàng demo/ }).click(); await page.waitForURL('**/admin');
    await go('/admin/orders'); await page.getByLabel('Tìm mã đơn, người nhận, điện thoại').fill('Khách hoàn thành');
    await page.getByText('1 đơn hàng', { exact: true }).waitFor(); await page.locator(`a[href="/admin/orders/${id}"]`).click();
    await page.getByRole('heading', { name: 'Người nhận', exact: true }).waitFor();
  });
  await check('Storage failure preserves order state and retry succeeds', async () => {
    await page.evaluate(() => { window.saveItem = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'aura_demo_orders_v1') throw new Error('test quota'); return window.saveItem.call(this, key, value); }; });
    await page.getByRole('button', { name: 'Đang chuẩn bị', exact: true }).click(); await page.getByLabel('Ghi chú thao tác').fill('Ghi chú mẫu'); await page.getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click();
    await page.getByText('Chưa cập nhật được', { exact: true }).waitFor();
    assert.equal(await page.evaluate((id) => JSON.parse(localStorage.getItem('aura_demo_orders_v1')).orders.find((x) => x.order.id === id).order.status, id), 'PENDING');
    await page.evaluate(() => { Storage.prototype.setItem = window.saveItem; });
    await page.getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await check('Order lifecycle separates delivery/payment, logs history and updates customer confirmation', async () => {
    await action('Đang giao'); assert.equal(await page.getByRole('button', { name: 'Đã hủy', exact: true }).count(), 0);
    await action('Đã giao'); assert.equal(await page.getByRole('button', { name: 'Hoàn thành', exact: true }).count(), 0);
    await action('Ghi nhận thu tiền demo'); await action('Hoàn thành'); await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Hoàn thành · Đã thanh toán (demo)', { exact: true }).waitFor();
    const order = await page.evaluate((id) => JSON.parse(localStorage.getItem('aura_demo_orders_v1')).orders.find((x) => x.order.id === id).order, id);
    assert.equal(order.history.length, 5); assert.equal(order.revision, 5); assert.ok(order.completedAt);
    await page.screenshot({ path: `${output}/order-desktop.png`, fullPage: true });
    await go(`/order-confirmation/${id}`); await page.getByText('Hoàn thành · Đã thanh toán (demo)', { exact: true }).waitFor();
  });
  await check('Cancellation is terminal and excluded from revenue', async () => {
    await go(`/admin/orders/${cancelled}`); await action('Đã hủy');
    assert.equal(await page.getByRole('button', { name: 'Đang chuẩn bị', exact: true }).count(), 0);
    await go('/admin/reports'); await page.getByRole('heading', { name: 'Đơn được ghi nhận', exact: true }).waitFor();
    assert.equal(await page.locator('article').filter({ has: page.getByRole('heading', { name: 'Đơn được ghi nhận', exact: true }) }).locator('p').innerText(), '1');
    const expected = await page.evaluate((id) => JSON.parse(localStorage.getItem('aura_demo_orders_v1')).orders.find((x) => x.order.id === id).order.total, id);
    for (const period of ['day', 'week', 'month']) {
      await page.getByLabel('Nhóm báo cáo').selectOption(period);
      await page.waitForURL((url) => url.searchParams.get('period') === period);
      await page.locator('tfoot').waitFor();
      const text = await page.locator('tfoot td').last().innerText(); assert.equal(Number(text.replace(/\D/g, '')), expected);
    }
    await page.screenshot({ path: `${output}/report-desktop.png`, fullPage: true });
  });
  await check('Stale revision is rejected and reload recovers', async () => {
    await go(`/admin/orders/${id}`); await page.getByRole('button', { name: 'Ghi nhận hoàn tiền demo' }).click();
    await page.evaluate((id) => { const db = JSON.parse(localStorage.getItem('aura_demo_orders_v1')); db.orders.find((x) => x.order.id === id).order.revision++; localStorage.setItem('aura_demo_orders_v1', JSON.stringify(db)); }, id);
    await page.getByLabel('Ghi chú thao tác').fill('Hoàn mẫu'); await page.getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click();
    await page.getByText('Đơn đã thay đổi. Hãy tải lại trước khi cập nhật.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Tải lại dữ liệu mới' }).click();
    await action('Ghi nhận hoàn tiền demo'); await go('/admin/reports'); await page.getByText('Chưa phát sinh doanh thu', { exact: true }).waitFor();
  });
  await check('Invalid report range has a recoverable error', async () => {
    await go('/admin/reports?from=2026-10-18&to=2026-10-17'); await page.getByText('Chưa lập được báo cáo', { exact: true }).waitFor();
    await page.getByLabel('Từ ngày hoàn thành').fill('2026-10-01'); await page.getByRole('table').waitFor();
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('aura_store_theme', value), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/admin/orders', `/admin/orders/${id}`, '/admin/reports']) await check(`${route.includes(id) ? 'order-detail' : route} fits ${width}px ${theme}`, async () => { await go(route); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); });
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go(`/admin/orders/${id}`); await page.getByRole('heading', { name: 'Lịch sử thay đổi' }).waitFor();
    await page.screenshot({ path: `${output}/order-mobile-${theme}.png`, fullPage: true });
  }
  await check('Missing order and empty list recover without crashing', async () => {
    await go('/admin/orders?q=not-a-real-order'); await page.getByText('Chưa có đơn phù hợp', { exact: true }).waitFor();
    await page.goto(base + '/admin/orders/missing', { waitUntil: 'domcontentloaded' }); await page.getByText('Không tìm thấy đơn hàng', { exact: true }).waitFor();
  });
  assert.deepEqual(runtimeErrors, []); await writeFile(`${output}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), checks, runtimeErrors }, null, 2) + '\n');
} catch (error) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; }
finally { await browser.close(); }

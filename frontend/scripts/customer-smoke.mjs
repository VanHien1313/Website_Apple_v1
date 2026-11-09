// Uses existing Playwright/Chrome in an isolated context; sample identities only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-5/', import.meta.url)); await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(15000);
const base = process.env.APP_URL || 'http://127.0.0.1:3000'; const checks = [], runtimeErrors = [];
page.on('pageerror', (e) => runtimeErrors.push(e.message));
const check = async (name, fn) => { await fn(); checks.push(name); console.log(`PASS ${name}`); };
const go = async (path) => { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); await page.locator('h1').waitFor(); };
const password = 'Sample-password-123'; const email = 'customer-a@example.test';
async function register(address, name) {
  await go('/register'); await page.getByLabel('Họ tên').fill(name); await page.getByLabel('Số điện thoại').fill('0901234567'); await page.getByLabel('Email').fill(address);
  await page.getByLabel(/^Mật khẩu mẫu/).fill(password); await page.getByLabel('Nhập lại mật khẩu mẫu').fill(password); await page.getByRole('button', { name: 'Tạo tài khoản demo', exact: true }).click();
}
async function login(address, pass = password) {
  await go('/login'); await page.getByLabel('Email').fill(address); await page.getByLabel(/^Mật khẩu mẫu/).fill(pass); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}
async function order() {
  await go('/product/iphone-16-pro-max'); await page.getByRole('button', { name: 'Mua ngay', exact: true }).click();
  await page.getByLabel('Họ và tên').waitFor(); assert.equal(await page.getByLabel('Họ và tên').inputValue(), 'Khách A mẫu');
  assert.equal(await page.getByLabel('Email (không bắt buộc)', { exact: true }).inputValue(), email);
  await page.getByLabel('Tỉnh / thành phố').fill('Thành phố mẫu'); await page.getByLabel('Phường / xã').fill('Phường mẫu'); await page.getByLabel('Số nhà, đường và địa chỉ chi tiết').fill('12 đường mẫu');
  await page.getByRole('button', { name: 'Xác nhận đặt hàng demo' }).click(); await page.waitForURL('**/order-confirmation/**'); return new URL(page.url()).pathname.split('/').at(-1);
}
async function adminAction(name) {
  await page.getByRole('button', { name, exact: true }).click(); await page.getByLabel('Ghi chú thao tác').fill('Chuyển trạng thái mẫu'); await page.getByRole('button', { name: 'Xác nhận cập nhật', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
try {
  let first, second;
  await check('Account routes redirect, registration persists and duplicate email is rejected', async () => {
    await go('/account/orders'); await page.waitForURL('**/login');
    await register(email, 'Khách A mẫu'); await page.getByText('Đã tạo hồ sơ demo', { exact: true }).waitFor();
    await register(email.toUpperCase(), 'Khách trùng'); await page.getByText('Email đã được đăng ký trong demo.', { exact: true }).waitFor();
    assert.equal(await page.evaluate((p) => localStorage.getItem('aura_customers_demo_v1').includes(p), password), false);
  });
  await check('Wrong password preserves form, correct login shows empty history', async () => {
    await login(email, 'wrong-password'); await page.getByText('Email hoặc mật khẩu mẫu không đúng.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Email').inputValue(), email);
    await page.getByLabel(/^Mật khẩu mẫu/).fill(password); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL('**/account/orders'); await page.getByText('Chưa có đơn phù hợp', { exact: true }).waitFor();
  });
  await check('Checkout autofills profile, links orders and history survives reload', async () => {
    first = await order(); second = await order(); await go('/account/orders'); await page.getByText('2 đơn hàng', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText('2 đơn hàng', { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/account-desktop.png`, fullPage: true });
  });
  await check('Cancellation requires reason, persists and appears to admin', async () => {
    await go(`/account/orders/${first}`); await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).click(); await page.getByLabel('Lý do hủy').fill('Đổi lựa chọn mẫu'); await page.getByRole('button', { name: 'Xác nhận hủy', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByText('Đã hủy · Chưa thanh toán', { exact: true }).waitFor(); assert.equal(await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).isDisabled(), true);
    await go('/admin/login'); await page.getByRole('button', { name: /Chủ cửa hàng demo/ }).click(); await page.waitForURL('**/admin'); await go(`/admin/orders/${first}`); await page.getByText('Đã hủy · Chưa thanh toán', { exact: true }).waitFor(); await page.getByText('Đổi lựa chọn mẫu', { exact: true }).waitFor();
  });
  await check('Orders in transit cannot be cancelled by customer', async () => {
    await go(`/admin/orders/${second}`); await adminAction('Đang chuẩn bị'); await adminAction('Đang giao');
    await go(`/account/orders/${second}`); assert.equal(await page.getByRole('button', { name: 'Hủy đơn hàng', exact: true }).isDisabled(), true);
  });
  await check('Another account cannot view orders through either customer route', async () => {
    await page.getByRole('button', { name: 'Đăng xuất tài khoản', exact: true }).click(); await register('customer-b@example.test', 'Khách B mẫu'); await page.getByText('Đã tạo hồ sơ demo', { exact: true }).waitFor();
    await login('customer-b@example.test'); await page.waitForURL('**/account/orders'); await page.getByText('0 đơn hàng', { exact: true }).waitFor();
    await go(`/account/orders/${first}`); await page.getByRole('heading', { name: 'Không tìm thấy đơn của bạn' }).waitFor();
    await go(`/order-confirmation/${first}`); await page.getByRole('heading', { name: 'Không tìm thấy đơn demo' }).waitFor();
  });
  await check('Password change rejects wrong current password and invalidates old credentials', async () => {
    await login(email); await page.waitForURL('**/account/orders'); await go('/account/security');
    await page.getByLabel('Mật khẩu hiện tại').fill('wrong-password'); await page.getByLabel('Mật khẩu mẫu mới').fill('Updated-sample-password-123'); await page.getByLabel('Nhập lại mật khẩu mới').fill('Updated-sample-password-123');
    await page.getByRole('button', { name: 'Lưu mật khẩu mẫu' }).click(); await page.getByText('Mật khẩu hiện tại không đúng.', { exact: true }).waitFor();
    await page.getByLabel('Mật khẩu hiện tại').fill(password); await page.getByRole('button', { name: 'Lưu mật khẩu mẫu' }).click(); await page.waitForURL('**/login?changed=1'); await page.getByText('Đã đổi mật khẩu mẫu', { exact: true }).waitFor();
    await login(email); await page.getByText('Email hoặc mật khẩu mẫu không đúng.', { exact: true }).waitFor(); await login(email, 'Updated-sample-password-123'); await page.waitForURL('**/account/orders');
  });
  await check('Admin customer directory is searchable and read-only', async () => {
    await go('/admin/customers'); await page.getByLabel('Tìm kiếm').fill('customer-a'); await page.getByRole('heading', { name: 'Khách A mẫu', exact: true }).waitFor();
    await page.getByRole('link', { name: /Khách A mẫu.*Xem hồ sơ/ }).click(); await page.getByRole('heading', { name: 'Hồ sơ chỉ xem', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Xóa', exact: true }).count(), 0); assert.equal(await page.getByRole('button', { name: 'Sửa', exact: true }).count(), 0);
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((v) => localStorage.setItem('aura_store_theme', v), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/login', '/register', '/account/orders', `/account/orders/${second}`, '/account/security', '/admin/customers']) await check(`${route.includes(second) ? 'account-detail' : route} fits ${width}px ${theme}`, async () => { await go(route); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); });
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go('/register'); await page.screenshot({ path: `${output}/register-mobile-${theme}.png`, fullPage: true });
    await go('/account/orders'); await page.getByText('2 đơn hàng', { exact: true }).waitFor(); await page.screenshot({ path: `${output}/account-mobile-${theme}.png`, fullPage: true });
  }
  await check('Expired customer session redirects to login without exposing orders', async () => {
    await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('aura_customer_session_v1')); s.expires = 1; sessionStorage.setItem('aura_customer_session_v1', JSON.stringify(s)); });
    await go('/account/orders'); await page.waitForURL('**/login');
  });
  assert.deepEqual(runtimeErrors, []); await writeFile(`${output}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), checks, runtimeErrors }, null, 2) + '\n');
} catch (error) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; } finally { await browser.close(); }

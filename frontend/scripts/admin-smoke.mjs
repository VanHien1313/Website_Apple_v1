// Uses existing Playwright and Chrome; no downloads. Isolated browser context with sample data.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const output = fileURLToPath(new URL('../../docs/qa/phase-3/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(15000);
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
const checks = [], runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
const check = async (name, action) => { await action(); checks.push(name); console.log(`PASS ${name}`); };
const go = async (route) => { await page.goto(base + route); await page.locator('h1').waitFor(); };
const login = async (name) => { await go('/admin/login'); await page.getByRole('button', { name: new RegExp(name) }).click(); await page.waitForURL('**/admin'); };
try {
  await check('Direct admin route redirects and owner demo login works', async () => {
    await go('/admin/products'); await page.waitForURL('**/admin/login'); await login('Chủ cửa hàng demo');
    await page.getByRole('heading', { name: 'Chăm chút từng trải nghiệm.' }).waitFor();
    await page.screenshot({ path: `${output}/overview-desktop.png`, fullPage: true });
  });
  await check('Category CRUD and referenced-category deletion guard', async () => {
    await go('/admin/categories');
    const iphone = page.locator('article').filter({ has: page.getByRole('heading', { name: 'iPhone', exact: true }) });
    await iphone.getByRole('button', { name: 'Xóa', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await page.getByText('Danh mục còn sản phẩm. Chuyển hoặc xóa sản phẩm trước.').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
    await page.getByLabel('Tên danh mục').fill('Phụ kiện thử');
    await page.getByLabel('Mã danh mục').fill('phu-kien-thu');
    await page.getByRole('button', { name: 'Lưu danh mục' }).click();
    await page.getByRole('heading', { name: 'Phụ kiện thử', exact: true }).waitFor();
  });
  await check('Create product with configuration, color, image and new category', async () => {
    await go('/admin/products/new');
    await page.getByLabel('Tên sản phẩm').fill('Thiết bị kiểm thử');
    await page.getByLabel('Slug').fill('thiet-bi-kiem-thu');
    await page.getByLabel('Danh mục', { exact: true }).selectOption('phu-kien-thu');
    await page.getByLabel('Mô tả (mỗi dòng một đoạn)').fill('Sản phẩm mẫu phục vụ kiểm thử.');
    await page.getByLabel('Ảnh đại diện').fill('/vite.svg');
    await page.getByLabel('SKU').fill('QA-DEVICE-001');
    await page.getByLabel('Dung lượng').fill('128GB');
    await page.getByLabel('Giá bán (VND)').fill('1200000');
    await page.getByLabel('Giá gốc (VND)').fill('1500000');
    await page.getByLabel('Tên màu 1').fill('Đen mẫu');
    await page.getByLabel('Ảnh màu 1').fill('/vite.svg');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.waitForURL('**/admin/products');
    await page.getByLabel('Tìm kiếm').fill('Thiết bị kiểm thử');
    await page.getByRole('heading', { name: 'Thiết bị kiểm thử', exact: true }).waitFor();
  });
  await check('Storefront sees new category/product and admin price changes invalidate cart price', async () => {
    await go('/search?category=phu-kien-thu');
    await page.getByRole('radio', { name: 'Phụ kiện thử', exact: true }).first().waitFor();
    await page.getByRole('link', { name: 'Chọn cấu hình' }).click();
    await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
    await go('/admin/products?q=Thiết+bị+kiểm+thử');
    await page.getByRole('link', { name: 'Sửa', exact: true }).click();
    await page.getByLabel('Giá bán (VND)').fill('1300000');
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.waitForURL('**/admin/products'); await go('/cart');
    await page.getByText('Giá sản phẩm đã thay đổi', { exact: true }).waitFor();
  });
  await check('Storage failure retains product edits and retry saves', async () => {
    await go('/admin/products?q=Thiết+bị+kiểm+thử'); await page.getByRole('link', { name: 'Sửa', exact: true }).click();
    await page.getByLabel('Tên sản phẩm').fill('Thiết bị đã sửa');
    await page.evaluate(() => { window.savedSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'aura_catalog_v1') throw new Error('Test quota'); return window.savedSetItem.call(this, key, value); }; });
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
    await page.getByText('Chưa lưu được sản phẩm', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Tên sản phẩm').inputValue(), 'Thiết bị đã sửa');
    await page.evaluate(() => { Storage.prototype.setItem = window.savedSetItem; });
    await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click(); await page.waitForURL('**/admin/products');
  });
  await check('Account creation, duplicate email validation and password form rehearsal', async () => {
    await go('/admin/admin-users'); await page.getByRole('button', { name: 'Thêm tài khoản' }).click();
    await page.getByLabel('Họ tên').fill('Nhân viên thử'); await page.getByLabel('Email').fill('owner@example.test');
    await page.getByRole('button', { name: 'Lưu tài khoản' }).click(); await page.getByRole('dialog').getByText('Email đã được sử dụng.').waitFor();
    await page.getByLabel('Email').fill('test@example.test'); await page.getByRole('button', { name: 'Lưu tài khoản' }).click();
    const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Nhân viên thử' }) });
    await row.getByRole('button', { name: 'Đổi mật khẩu' }).click();
    await page.getByLabel(/^Mật khẩu mẫu/).fill('Sample-only-123'); await page.getByLabel('Nhập lại mật khẩu mẫu').fill('Sample-only-124');
    await page.getByRole('button', { name: 'Kiểm tra biểu mẫu' }).click(); await page.getByRole('dialog').getByText('Hai mật khẩu chưa khớp.').waitFor();
    await page.getByLabel('Nhập lại mật khẩu mẫu').fill('Sample-only-123'); await page.getByRole('button', { name: 'Kiểm tra biểu mẫu' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => localStorage.getItem('aura_catalog_v1').includes('Sample-only-123')), false);
    await row.getByRole('button', { name: 'Xóa', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa' }).click(); await row.waitFor({ state: 'hidden' });
  });
  await check('Editor cannot access admin accounts and expired session redirects', async () => {
    await page.getByRole('button', { name: 'Đăng xuất' }).click(); await login('Biên tập viên demo');
    await go('/admin/admin-users'); await page.waitForURL('**/admin/403');
    await page.evaluate(() => sessionStorage.setItem('aura_admin_session_v1', JSON.stringify({ userId: 'demo-editor', expires: 1 })));
    await go('/admin/products'); await page.waitForURL('**/admin/login'); await login('Chủ cửa hàng demo');
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((v) => localStorage.setItem('aura_store_theme', v), theme);
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/admin', '/admin/products', '/admin/products/new', '/admin/categories', '/admin/admin-users']) {
        await check(`${route} fits ${width}px ${theme}`, async () => { await go(route); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); if (route === '/admin/products') { const title = page.locator('article h2').first(); await title.waitFor(); assert.ok((await title.boundingBox()).width >= 140, 'Product name must retain readable width'); } });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 }); await go('/admin/products');
    await page.getByRole('heading', { level: 2 }).first().waitFor();
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 100)); } await Promise.all([...document.images].map((img) => Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]))); scrollTo(0, 0); document.activeElement?.blur(); });
    await page.screenshot({ path: `${output}/products-mobile-${theme}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await check('Delete product updates storefront and allows removing empty category', async () => {
    await go('/admin/products?q=Thiết+bị+đã+sửa'); await page.getByRole('button', { name: 'Xóa', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await go('/admin/categories'); const row = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Phụ kiện thử' }) });
    await row.getByRole('button', { name: 'Xóa', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận xóa' }).click(); await row.waitFor({ state: 'hidden' });
    await go('/product/thiet-bi-kiem-thu'); await page.getByText('Không tìm thấy sản phẩm', { exact: true }).waitFor();
  });
  await check('Reset requires confirmation and restores seed catalog with logout', async () => {
    await go('/admin'); await page.getByRole('button', { name: 'Khôi phục catalog mẫu' }).click();
    await page.getByRole('button', { name: 'Giữ dữ liệu hiện tại' }).click();
    await page.getByRole('button', { name: 'Khôi phục catalog mẫu' }).click();
    await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click();
    await page.waitForURL('**/admin/login');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_catalog_v1')).users.length), 2);
  });
  assert.deepEqual(runtimeErrors, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ timestamp: new Date().toISOString(), checks, runtimeErrors }, null, 2) + '\n');
} catch (error) { await page.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; }
finally { await browser.close(); }

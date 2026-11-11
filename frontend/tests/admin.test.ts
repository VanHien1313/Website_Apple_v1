import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogRepository, CATALOG_KEY } from '../src/services/mock/catalogRepository';
import { createAdminService } from '../src/services/adminService';
function setup() {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const repo = createCatalogRepository(storage); const actor = repo.read().users[0];
  return { values, storage, repo, service: createAdminService(repo, () => actor), actor };
}
test('catalog persists product edits and validates slug, SKU, price, image and category', async () => {
  const { repo, service, storage } = setup(); const product = repo.read().products[0];
  product.name = 'Updated name'; product.variants[0].price = 100000;
  await service.saveProduct(product);
  const saved = createCatalogRepository(storage).read().products.find((p) => p.id === product.id)!;
  assert.equal(saved.name, 'Updated name'); assert.equal(saved.basePrice, 100000);
  await assert.rejects(service.saveProduct({ ...product, id: 'another' }), /Slug/);
  await assert.rejects(service.saveProduct({ ...product, id: 'another', slug: 'unique-product' }), /SKU/);
  await assert.rejects(service.saveProduct({ ...product, thumbnail: 'javascript:alert(1)' }), /Ảnh/);
  await assert.rejects(service.saveProduct({ ...product, category: 'missing' }), /Danh mục/);
  product.variants[0].price = -1; await assert.rejects(service.saveProduct(product), /Giá/);
});
test('categories reject duplicate IDs and deletion while referenced', async () => {
  const { repo, service } = setup();
  await assert.rejects(service.deleteCategory('iphone'), /còn sản phẩm/);
  await service.saveCategory({ id: 'accessories', name: 'Phụ kiện' });
  await assert.rejects(service.saveCategory({ id: 'accessories', name: 'Khác' }), /tồn tại/);
  await service.saveCategory({ id: 'accessories', name: 'Phụ kiện mới' }, 'accessories');
  await service.deleteCategory('accessories'); assert.ok(!repo.read().categories.some((c) => c.id === 'accessories'));
});
test('demo authorization protects admin users, revoked sessions and current owner', async () => {
  const { repo, service, actor } = setup();
  const editor = repo.read().users[1]; const editorService = createAdminService(repo, () => editor);
  await assert.rejects(editorService.deleteUser(actor.id), /Chỉ chủ/);
  await assert.rejects(service.deleteUser(actor.id), /đang dùng/);
  await assert.rejects(service.saveUser({ ...actor, active: false }), /tự khóa/);
  await service.saveUser({ ...editor, active: false });
  await assert.rejects(editorService.read(), /hết hạn/);
  await assert.rejects(createAdminService(repo, () => null).read(), /hết hạn/);
});
test('user uniqueness and password rehearsal never persist credentials', async () => {
  const { service, values, actor } = setup();
  await assert.rejects(service.saveUser({ ...actor, id: 'other' }), /Email/);
  await service.saveUser({ id: 'new', name: 'New', email: 'new@example.test', role: 'editor', active: true });
  await assert.rejects(service.simulatePasswordChange('new', 'short'), /12/);
  await service.simulatePasswordChange('new', 'Example-only-12345');
  assert.ok(!values.get(CATALOG_KEY)!.includes('Example-only-12345'));
  await service.deleteUser('new');
});
test('storage errors never report a successful mutation or silently overwrite corruption', async () => {
  const { repo, service, values, storage } = setup();
  const product = repo.read().products[0]; storage.setItem = () => { throw new Error('quota'); };
  await assert.rejects(service.saveProduct(product), /Không lưu/);
  values.set(CATALOG_KEY, '{broken'); assert.throws(() => repo.read(), /Không đọc/);
});
test('catalog reset restores seed profiles and products and is owner-only', async () => {
  const { repo, service } = setup(); const editor = repo.read().users[1];
  await assert.rejects(createAdminService(repo, () => editor).resetCatalog(), /Chỉ chủ/);
  const count = repo.read().products.length;
  await service.deleteProduct(repo.read().products[0].id);
  await service.resetCatalog(); assert.equal(repo.read().products.length, count);
});

test('demo catalog stamps createdAt on new products and keeps date and position when editing', async () => {
  const { repo, service } = setup(); const before = repo.read().products; const first = before[0];
  await service.saveProduct({ ...first, name: 'Renamed' });
  const after = repo.read().products;
  assert.equal(after[0].id, first.id); assert.equal(after[0].name, 'Renamed'); assert.equal(after[0].createdAt, first.createdAt);
  const clone = structuredClone(first);
  const fresh = { ...clone, id: 'prod_new', slug: 'fresh-item', createdAt: undefined,
    variants: clone.variants.map((v, i) => ({ ...v, id: `fresh-${i}`, sku: `FRESH-${i}` })) };
  const started = Date.now(); await service.saveProduct(fresh);
  const saved = repo.read().products.find((p) => p.id === 'prod_new')!;
  assert.ok(Date.parse(saved.createdAt!) >= started - 1000);
  assert.equal(repo.read().products.at(-1)!.id, 'prod_new');
});

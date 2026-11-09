import { MOCK_PRODUCTS } from '../../data/mockProducts';
import type { AdminCatalog } from '../../types/admin';
export type { Category, AdminUser } from '../../types/admin';
export interface CatalogDatabase extends AdminCatalog { version: 1 }
export const CATALOG_KEY = 'aura_catalog_v1';
export const createCatalogSeed = (): CatalogDatabase => ({ version: 1, products: structuredClone(MOCK_PRODUCTS), categories: [
  { id: 'iphone', name: 'iPhone' }, { id: 'ipad', name: 'iPad' }, { id: 'mac', name: 'Mac' }, { id: 'watch', name: 'Apple Watch' },
], users: [{ id: 'demo-owner', name: 'Chủ cửa hàng demo', email: 'owner@example.test', role: 'owner', active: true }, { id: 'demo-editor', name: 'Biên tập viên demo', email: 'editor@example.test', role: 'editor', active: true }] });
export function createCatalogRepository(storage?: Pick<Storage, 'getItem' | 'setItem'>) {
  let memory = createCatalogSeed();
  const resolve = () => storage ?? (typeof window === 'undefined' ? undefined : window.localStorage);
  return {
    read(): CatalogDatabase {
      try {
        const raw = resolve()?.getItem(CATALOG_KEY);
        if (!raw) return structuredClone(memory);
        const value = JSON.parse(raw) as CatalogDatabase;
        if (value.version !== 1 || !Array.isArray(value.products) || !Array.isArray(value.categories) || !Array.isArray(value.users)) throw new Error();
        if (!value.products.every((p) => typeof p.name === 'string' && typeof p.slug === 'string' && Array.isArray(p.variants) && Array.isArray(p.colors) && Array.isArray(p.gallery) && Array.isArray(p.description) && Array.isArray(p.keySpecs)) || !value.categories.every((c) => typeof c.id === 'string' && typeof c.name === 'string') || !value.users.every((u) => typeof u.id === 'string' && typeof u.email === 'string' && typeof u.name === 'string' && ['owner', 'editor'].includes(u.role) && typeof u.active === 'boolean')) throw new Error();
        if (!value.products.every((p) => typeof p.id === 'string' && typeof p.category === 'string' && typeof p.thumbnail === 'string' && typeof p.tagline === 'string' && typeof p.warrantyInfo === 'string' && Number.isFinite(p.basePrice) && Number.isFinite(p.originalPrice) && p.description.every((line) => typeof line === 'string') && p.gallery.every((url) => typeof url === 'string') && p.keySpecs.every((s) => typeof s.label === 'string' && typeof s.value === 'string') && p.variants.length > 0 && p.variants.every((v) => typeof v.id === 'string' && typeof v.sku === 'string' && Number.isFinite(v.price) && Number.isFinite(v.originalPrice) && typeof v.inStock === 'boolean') && p.colors.length > 0 && p.colors.every((c) => typeof c.id === 'string' && typeof c.name === 'string' && typeof c.hex === 'string' && typeof c.image === 'string'))) throw new Error();
        return value;
      } catch { throw new Error('Không đọc được dữ liệu demo. Hãy kiểm tra quyền lưu trữ hoặc dữ liệu trình duyệt.'); }
    },
    write(value: CatalogDatabase) {
      try { resolve()?.setItem(CATALOG_KEY, JSON.stringify(value)); memory = structuredClone(value); }
      catch { throw new Error('Không lưu được thay đổi. Dữ liệu biểu mẫu vẫn được giữ lại.'); }
    },
  };
}
export const catalogRepository = createCatalogRepository();

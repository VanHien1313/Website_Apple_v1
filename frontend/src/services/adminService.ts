import { catalogRepository, createCatalogSeed, type AdminUser, type CatalogDatabase, type Category } from './mock/catalogRepository';
import type { Product } from '../types/product';
import type { AdminService } from './contracts';
export type { AdminUser, Category } from './mock/catalogRepository';
const SESSION_KEY = 'aura_admin_session_v1';
interface Session { userId: string; expires: number }
export function getAdminSession(): AdminUser | null {
  try {
    const session: Session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!session || session.expires <= Date.now()) return null;
    return catalogRepository.read().users.find((u) => u.id === session.userId && u.active) ?? null;
  } catch { return null; }
}
export function loginDemo(id: string) {
  const user = catalogRepository.read().users.find((u) => u.id === id && u.active);
  if (!user) throw new Error('Tài khoản không khả dụng.');
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, expires: Date.now() + 60 * 60 * 1000 }));
}
export function logoutDemo() { sessionStorage.removeItem(SESSION_KEY); }
export function validateProduct(p: Product, db: CatalogDatabase) {
  if (!p.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) throw new Error('Nhập tên và slug hợp lệ (chữ thường, số, dấu gạch ngang).');
  if (!db.categories.some((c) => c.id === p.category)) throw new Error('Danh mục không tồn tại.');
  if (db.products.some((x) => x.id !== p.id && x.slug === p.slug)) throw new Error('Slug đã được sử dụng.');
  const safeImage = (value: string) => /^https?:\/\//.test(value) || /^\/(?!\/)/.test(value);
  if (!safeImage(p.thumbnail) || p.gallery.some((url) => !safeImage(url))) throw new Error('Ảnh cần URL http/https hoặc đường dẫn / trong website.');
  if (!p.description.some((line) => line.trim()) || !p.variants.length || !p.colors.length) throw new Error('Cần mô tả, ít nhất một biến thể và một màu.');
  const skus = new Set(db.products.filter((x) => x.id !== p.id).flatMap((x) => x.variants.map((v) => v.sku.trim().toLowerCase())));
  const ids = new Set<string>();
  for (const v of p.variants) {
    if (!v.id || ids.has(v.id) || !v.sku.trim() || skus.has(v.sku.trim().toLowerCase())) throw new Error('ID biến thể hoặc SKU bị trùng/rỗng.');
    if (!Number.isSafeInteger(v.price) || v.price <= 0 || !Number.isSafeInteger(v.originalPrice) || v.originalPrice < v.price) throw new Error('Giá phải là số nguyên dương; giá gốc không thấp hơn giá bán.');
    ids.add(v.id); skus.add(v.sku.trim().toLowerCase());
  }
  const colors = new Set<string>();
  for (const c of p.colors) {
    if (!c.id || colors.has(c.id) || !c.name.trim() || !/^#[0-9a-f]{6}$/i.test(c.hex) || !safeImage(c.image)) throw new Error('Màu cần tên, mã hex, ảnh hợp lệ và ID riêng.');
    colors.add(c.id);
  }
}
export function createAdminService(repository = catalogRepository, session = getAdminSession): AdminService {
  const authorize = (owner = false) => {
    const user = session();
    const current = user && repository.read().users.find((u) => u.id === user.id && u.active);
    if (!current) throw new Error('Phiên demo đã hết hạn. Vui lòng đăng nhập lại.');
    if (owner && current.role !== 'owner') throw new Error('Chỉ chủ cửa hàng demo được quản lý tài khoản.');
    return current;
  };
  return {
    async resetCatalog() { authorize(true); repository.write(createCatalogSeed()); },
    async read() { authorize(); return repository.read(); },
    async saveProduct(product: Product) {
      authorize(); const db = repository.read(); validateProduct(product, db);
      const cheapest = product.variants.reduce((a, b) => a.price < b.price ? a : b);
      const normalized = { ...product, name: product.name.trim(), variants: product.variants.map((v) => ({ ...v, sku: v.sku.trim() })), basePrice: cheapest.price, originalPrice: cheapest.originalPrice };
      db.products = [...db.products.filter((p) => p.id !== product.id), normalized]; repository.write(db);
    },
    async deleteProduct(id: string) { authorize(); const db = repository.read(); db.products = db.products.filter((p) => p.id !== id); repository.write(db); },
    async saveCategory(category: Category, originalId?: string) {
      category = { ...category, name: category.name.trim() };
      authorize(); const db = repository.read();
      if (!category.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id)) throw new Error('Nhập tên và mã danh mục hợp lệ.');
      if (originalId && originalId !== category.id) throw new Error('Không đổi mã danh mục đã tạo.');
      if (db.categories.some((c) => c.id !== originalId && (c.id === category.id || c.name.toLowerCase() === category.name.toLowerCase()))) throw new Error('Danh mục đã tồn tại.');
      db.categories = [...db.categories.filter((c) => c.id !== originalId), category]; repository.write(db);
    },
    async deleteCategory(id: string) {
      authorize(); const db = repository.read();
      if (db.products.some((p) => p.category === id)) throw new Error('Danh mục còn sản phẩm. Chuyển hoặc xóa sản phẩm trước.');
      db.categories = db.categories.filter((c) => c.id !== id); repository.write(db);
    },
    async saveUser(user: AdminUser) {
      user = { ...user, name: user.name.trim(), email: user.email.trim().toLowerCase() };
      if (!['owner', 'editor'].includes(user.role) || typeof user.active !== 'boolean') throw new Error('Vai trò hoặc trạng thái không hợp lệ.');
      const actor = authorize(true); const db = repository.read();
      if (!user.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) throw new Error('Tên hoặc email chưa hợp lệ.');
      if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === user.email.toLowerCase())) throw new Error('Email đã được sử dụng.');
      if (actor.id === user.id && (!user.active || user.role !== 'owner')) throw new Error('Không tự khóa hoặc hạ quyền tài khoản đang dùng.');
      db.users = [...db.users.filter((u) => u.id !== user.id), user]; repository.write(db);
    },
    async deleteUser(id: string) { const actor = authorize(true); if (actor.id === id) throw new Error('Không thể xóa tài khoản đang dùng.'); const db = repository.read(); db.users = db.users.filter((u) => u.id !== id); repository.write(db); },
    async simulatePasswordChange(id: string, password: string) {
      authorize(true); if (!repository.read().users.some((u) => u.id === id)) throw new Error('Tài khoản không tồn tại.');
      if (password.length < 12) throw new Error('Mật khẩu mẫu cần ít nhất 12 ký tự.');
      // UI rehearsal only. Never persist or log passwords in the browser demo.
    },
  };
}
export const adminService = createAdminService();

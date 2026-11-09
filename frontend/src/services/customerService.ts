import type { CustomerProfile, CustomerRegistration } from '../types/customer';
import { createOrderRepository } from './mock/orderRepository';
import { changeOrder, queryOrders, type OrderQuery } from '../domain/orders';
import { getAdminSession } from './adminService';
import type { CustomerService } from './contracts';
interface RecordEntry { profile: CustomerProfile; salt: string; verifier: string }
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const CUSTOMER_KEY = 'aura_customers_demo_v1';
export const CUSTOMER_SESSION_KEY = 'aura_customer_session_v1';
const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
async function verifier(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)));
}
export function createCustomerService(persistent: () => StorageLike = () => localStorage, session: () => StorageLike = () => sessionStorage, orders = createOrderRepository()): CustomerService {
  function read(): RecordEntry[] {
    try { const raw = persistent().getItem(CUSTOMER_KEY); if (!raw) return []; const db = JSON.parse(raw);
      if (db.version !== 1 || !Array.isArray(db.customers) || !db.customers.every((e: RecordEntry) => typeof e.profile?.id === 'string' && typeof e.profile.fullName === 'string' && typeof e.profile.email === 'string' && typeof e.profile.phone === 'string' && Number.isSafeInteger(e.profile.credentialVersion) && Number.isFinite(Date.parse(e.profile.createdAt)) && /^[a-f0-9]{32}$/.test(e.salt) && /^[a-f0-9]{64}$/.test(e.verifier))) throw new Error(); return db.customers;
    } catch { throw new Error('Không đọc được hồ sơ demo. Kiểm tra dữ liệu hoặc quyền lưu trữ trình duyệt.'); }
  }
  function write(customers: RecordEntry[]) { try { persistent().setItem(CUSTOMER_KEY, JSON.stringify({ version: 1, customers })); } catch { throw new Error('Không lưu được hồ sơ. Hãy cho phép lưu trữ và thử lại.'); } }
  function current(): CustomerProfile | null {
    try { const raw = session().getItem(CUSTOMER_SESSION_KEY); if (!raw) return null; const s = JSON.parse(raw); if (!Number.isFinite(s.expires) || s.expires <= Date.now()) return null; return read().find((e) => e.profile.id === s.id && e.profile.credentialVersion === s.version)?.profile ?? null; }
    catch { throw new Error('Phiên khách hàng không đọc được. Hãy đăng xuất rồi đăng nhập lại.'); }
  }
  function requireCustomer() { const profile = current(); if (!profile) throw new Error('Phiên đã hết hạn. Vui lòng đăng nhập lại.'); return profile; }
  const passwordRule = (p: string) => { if (p.length < 12 || p.length > 128) throw new Error('Mật khẩu mẫu cần từ 12 đến 128 ký tự.'); };
  return {
    current,
    logout() { session().removeItem(CUSTOMER_SESSION_KEY); },
    async register(input: CustomerRegistration) {
      passwordRule(input.password); const email = input.email.trim().toLowerCase(); const fullName = input.fullName.trim(); const phone = input.phone.replace(/\s/g, '');
      if (!fullName || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^(0|\+84)\d{9}$/.test(phone)) throw new Error('Họ tên, email hoặc số điện thoại chưa hợp lệ.');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16))); const hash = await verifier(input.password, salt);
      const entries = read(); if (entries.some((e) => e.profile.email === email)) throw new Error('Email đã được đăng ký trong demo.');
      const profile = { id: crypto.randomUUID(), fullName, email, phone, createdAt: new Date().toISOString(), credentialVersion: 1 };
      write([...entries, { profile, salt, verifier: hash }]); return profile;
    },
    async login(email: string, password: string) {
      const entry = read().find((e) => e.profile.email === email.trim().toLowerCase());
      if (!entry || await verifier(password, entry.salt) !== entry.verifier) throw new Error('Email hoặc mật khẩu mẫu không đúng.');
      const latest = read().find((e) => e.profile.id === entry.profile.id);
      if (!latest || latest.verifier !== entry.verifier) throw new Error('Thông tin đăng nhập đã thay đổi. Hãy thử lại.');
      session().setItem(CUSTOMER_SESSION_KEY, JSON.stringify({ id: entry.profile.id, version: entry.profile.credentialVersion, expires: Date.now() + 3600000 })); return entry.profile;
    },
    async changePassword(oldPassword: string, newPassword: string) {
      const profile = requireCustomer(); passwordRule(newPassword); if (oldPassword === newPassword) throw new Error('Mật khẩu mới cần khác mật khẩu cũ.');
      const entry = read().find((e) => e.profile.id === profile.id)!;
      if (await verifier(oldPassword, entry.salt) !== entry.verifier) throw new Error('Mật khẩu hiện tại không đúng.');
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16))); const hash = await verifier(newPassword, salt);
      const entries = read(); const latest = entries.find((e) => e.profile.id === profile.id);
      if (requireCustomer().id !== profile.id) throw new Error('Phiên đã thay đổi. Hãy đăng nhập lại.');
      if (!latest || latest.verifier !== entry.verifier) throw new Error('Hồ sơ đã thay đổi. Hãy đăng nhập lại.');
      write(entries.map((e) => e.profile.id === profile.id ? { profile: { ...profile, credentialVersion: profile.credentialVersion + 1 }, salt, verifier: hash } : e));
      // The persisted credential version already invalidates every old session.
      // Cleanup failure must not report a committed password change as failed.
      try { session().removeItem(CUSTOMER_SESSION_KEY); } catch { /* stale session is invalid */ }
    },
    async listOrders(query: OrderQuery = {}) { const user = requireCustomer(); return queryOrders(orders.list().filter((o) => o.customerId === user.id), query); },
    async getOrder(id: string) { const user = requireCustomer(); const order = orders.find(id); if (!order || order.customerId !== user.id) return null; return order; },
    async cancelOrder(id: string, revision: number, note: string) {
      const user = requireCustomer(); return orders.update(id, revision, (order) => {
        if (order.customerId !== user.id) throw new Error('Không có quyền thao tác đơn hàng này.');
        return changeOrder(order, 'status', 'CANCELLED', note, `Khách: ${user.fullName}`, new Date().toISOString());
      });
    },
    async adminCustomers() { if (!getAdminSession()) throw new Error('Phiên quản trị đã hết hạn.'); return read().map((e) => e.profile); },
  };
}
export const customerService = createCustomerService();

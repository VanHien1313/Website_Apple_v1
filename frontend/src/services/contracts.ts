import type { Product, ProductCategory, ProductFilter } from '../types/product';
import type { CatalogFilter, CatalogResult } from '../domain/catalog';
import type { CreateOrderInput, Order } from '../types/order';
import type { CartItem, CartState } from '../types/cart';
import type { AdminCatalog, AdminUser, Category } from '../types/admin';
import type { CustomerProfile, CustomerRegistration } from '../types/customer';
export interface CustomerService {
  current(): CustomerProfile | null;
  logout(): void;
  register(input: CustomerRegistration): Promise<CustomerProfile>;
  login(email: string, password: string): Promise<CustomerProfile>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  listOrders(query?: OrderQuery): Promise<ReturnType<typeof queryOrders>>;
  getOrder(id: string): Promise<Order | null>;
  cancelOrder(id: string, revision: number, note: string): Promise<Order>;
  adminCustomers(): Promise<CustomerProfile[]>;
}
import type { OrderQuery, ReportPeriod, queryOrders, reportRevenue } from '../domain/orders';
export interface AdminOrderService {
  list(query?: OrderQuery): Promise<ReturnType<typeof queryOrders>>;
  get(id: string): Promise<Order | null>;
  update(id: string, revision: number, kind: 'status' | 'payment', target: string, note: string): Promise<Order>;
  report(from: string, to: string, period: ReportPeriod): Promise<ReturnType<typeof reportRevenue>>;
}
export interface AdminService {
  read(): Promise<AdminCatalog>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  saveCategory(category: Category, originalId?: string): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  saveUser(user: AdminUser): Promise<void>;
  deleteUser(id: string): Promise<void>;
  simulatePasswordChange(id: string, password: string): Promise<void>;
  resetCatalog(): Promise<void>;
}
export interface CartQuote extends CartState { issues: string[] }
export interface RequestOptions { signal?: AbortSignal }
export interface ProductService {
  getCategories(options?: RequestOptions): Promise<{ id: string; name: string }[]>;
  getProducts(filter?: ProductFilter, options?: RequestOptions): Promise<Product[]>;
  getCatalog(filter?: CatalogFilter, options?: RequestOptions): Promise<CatalogResult>;
  getProductBySlug(slug: string, options?: RequestOptions): Promise<Product | null>;
  getProductsByCategory(category: ProductCategory, options?: RequestOptions): Promise<Product[]>;
  getRelatedProducts(id: string, category: ProductCategory, limit?: number, options?: RequestOptions): Promise<Product[]>;
  getFeaturedProducts(limit?: number, options?: RequestOptions): Promise<Product[]>;
}
export interface OrderService {
  quoteCart(items: readonly CartItem[], shippingMethod: CreateOrderInput['shippingMethod'], options?: RequestOptions): Promise<CartQuote>;
  getOrder(id: string, options?: RequestOptions): Promise<Order | null>;
  createOrder(input: CreateOrderInput, options?: RequestOptions): Promise<Order>;
}

import type { Product } from './product';
export interface Category { id: string; name: string }
export interface AdminUser { id: string; name: string; email: string; role: 'owner' | 'editor'; active: boolean }
export interface AdminCatalog { products: Product[]; categories: Category[]; users: AdminUser[] }

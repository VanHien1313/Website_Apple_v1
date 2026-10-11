export type ProductCategory = 'iphone' | 'ipad' | 'mac' | 'watch';

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  image: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  storage?: string;          // e.g. '128GB', '256GB', '512GB', '1TB'
  screenSize?: string;       // e.g. '11 inch', '13 inch', '42mm', '46mm'
  connectivity?: string;     // e.g. 'Wi-Fi', 'Wi-Fi + Cellular', 'GPS', 'GPS + Cellular'
  chip?: string;             // e.g. 'M4', 'A18 Pro', 'S10'
  price: number;
  originalPrice: number;
  inStock: boolean;
}

export interface ProductSpecItem {
  label: string;
  value: string;
}

export interface SpecGroup {
  groupName: string;
  items: ProductSpecItem[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  subCategory?: string;      // e.g. 'Pro Series', 'Air', 'Standard', 'Ultra'
  tagline: string;
  badge?: 'Mới' | 'Bán chạy' | 'Ưu đãi';
  rating: number;
  reviewCount: number;
  basePrice: number;
  originalPrice: number;
  colors: ProductColor[];
  variants: ProductVariant[];
  thumbnail: string;
  gallery: string[];
  keySpecs: ProductSpecItem[];
  detailedSpecs?: SpecGroup[];
  description: string[];
  warrantyInfo: string;
}

export interface ProductFilter {
  category?: ProductCategory;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  storage?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
}

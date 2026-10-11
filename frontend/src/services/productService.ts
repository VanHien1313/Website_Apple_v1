import { Product, ProductCategory, ProductFilter } from '../types/product';
import { MOCK_PRODUCTS } from '../data/mockProducts';

/**
 * Product Service abstraction.
 * Currently serves data from normalized mock dataset with simulated async latency.
 * Future migration to backend: replace mock resolution with `fetch('/api/products...')`.
 */
export const productService = {
  /**
   * Get all products with optional filters and sorting
   */
  async getProducts(filter?: ProductFilter): Promise<Product[]> {
    // Simulate brief network latency (50ms) for realistic UX state testing
    await new Promise((resolve) => setTimeout(resolve, 50));

    let results = [...MOCK_PRODUCTS];

    if (filter?.category) {
      results = results.filter((p) => p.category === filter.category);
    }

    if (filter?.subCategory) {
      results = results.filter((p) => p.subCategory?.toLowerCase() === filter.subCategory?.toLowerCase());
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filter?.minPrice !== undefined) {
      results = results.filter((p) => p.basePrice >= (filter.minPrice || 0));
    }

    if (filter?.maxPrice !== undefined) {
      results = results.filter((p) => p.basePrice <= (filter.maxPrice || Infinity));
    }

    if (filter?.sort) {
      switch (filter.sort) {
        case 'price_asc':
          results.sort((a, b) => a.basePrice - b.basePrice);
          break;
        case 'price_desc':
          results.sort((a, b) => b.basePrice - a.basePrice);
          break;
        case 'newest':
          results.sort((a, b) => (b.badge === 'Mới' ? 1 : 0) - (a.badge === 'Mới' ? 1 : 0));
          break;
        case 'featured':
        default:
          // Keep default curated ranking
          break;
      }
    }

    return results;
  },

  /**
   * Get a single product by slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return found || null;
  },

  /**
   * Get products by category
   */
  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    return this.getProducts({ category });
  },

  /**
   * Get related products in the same category, excluding the current product
   */
  async getRelatedProducts(currentId: string, category: ProductCategory, limit = 4): Promise<Product[]> {
    const list = await this.getProducts({ category });
    return list.filter((p) => p.id !== currentId).slice(0, limit);
  },

  /**
   * Get featured products for homepage spotlight
   */
  async getFeaturedProducts(limit = 4): Promise<Product[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_PRODUCTS.filter((p) => p.badge === 'Mới' || p.badge === 'Bán chạy').slice(0, limit);
  },
};

export interface Configuration { id: string; storage: string; screenSize: string; connectivity: string; chip: string }
export interface ProductColor { id: string; name: string; hex: string; image: string }
export interface ProductSku { id: string; configurationId: string; colorId: string; sku: string; price: number; originalPrice: number; onHand: number; reserved?: number; revision?: number }
export interface Spec { label: string; value: string }
export interface ManagedProduct {
  id: string; revision?: string; name: string; slug: string; categoryId: string; active: boolean;
  tagline: string; thumbnail: string; gallery: string[]; description: string[]; keySpecs: Spec[];
  detailedSpecs: { groupName: string; items: Spec[] }[]; warrantyInfo: string; subCategory: string; badge: string | null;
  configurations: Configuration[]; colors: ProductColor[]; skus: ProductSku[];
}
export function newProduct(): ManagedProduct {
  const configurationId = crypto.randomUUID(), colorId = crypto.randomUUID();
  return { id: crypto.randomUUID(), name: '', slug: '', categoryId: '', active: false, tagline: '', thumbnail: '/images/placeholder.svg', gallery: [], description: [], keySpecs: [], detailedSpecs: [], warrantyInfo: '', subCategory: '', badge: null,
    configurations: [{ id: configurationId, storage: '', screenSize: '', connectivity: '', chip: '' }], colors: [{ id: colorId, name: '', hex: '#000000', image: '/images/placeholder.svg' }],
    skus: [{ id: crypto.randomUUID(), configurationId, colorId, sku: '', price: 1, originalPrice: 1, onHand: 0 }] };
}
export const configurationName = (row: Configuration, index: number) => [row.storage, row.screenSize, row.connectivity, row.chip].filter(Boolean).join(' · ') || `Cấu hình ${index + 1}`;

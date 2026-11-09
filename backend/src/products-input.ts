import { ApiError } from './auth/service.ts';
const fail = (message = 'Thông tin sản phẩm, cấu hình, màu hoặc SKU không hợp lệ.') => new ApiError(422, 'INVALID_PRODUCT', message);
export const guid = (value: unknown): string => { if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) throw fail(); return value.toLowerCase(); };
const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(); return value as Record<string, unknown>; };
const str = (value: unknown, max: number, optional = false) => { if (optional && (value === undefined || value === null)) return ''; if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) throw fail(); return value.trim(); };
const slug = (value: unknown) => { const text = str(value, 200); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) throw fail('Slug/mã danh mục chỉ dùng chữ thường, số và gạch nối.'); return text; };
const list = (value: unknown, max: number, required = false): unknown[] => { if (!Array.isArray(value) || value.length > max || (required && !value.length)) throw fail(); return value; };
const unique = (ids: string[]) => { if (new Set(ids).size !== ids.length) throw fail('Có mã hoặc cấu hình bị lặp trong sản phẩm.'); };
function image(value: unknown) {
  const path = str(value, 2048);
  if (!/^\/images\/[a-zA-Z0-9_/-]+\.(?:png|jpg|jpeg|webp|svg)$/.test(path) && !/^\/api\/v1\/media\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(path)) throw fail('Ảnh phải là đường dẫn nội bộ /images/ hoặc ảnh đã tải lên qua API.');
  return path;
}
function specs(value: unknown) { return list(value ?? [], 50).map((raw) => { const row = object(raw); return { label: str(row.label, 120), value: str(row.value, 1000) }; }); }
export function parseProduct(value: unknown) {
  const input = object(value);
  if (typeof input.active !== 'boolean') throw fail();
  const configurations = list(input.configurations, 30, true).map((raw) => { const row = object(raw); return { id: guid(row.id), storage: str(row.storage, 200, true), screenSize: str(row.screenSize, 200, true), connectivity: str(row.connectivity, 200, true), chip: str(row.chip, 200, true) }; });
  const colors = list(input.colors, 30, true).map((raw) => { const row = object(raw), hex = str(row.hex, 7); if (!/^#[a-f0-9]{6}$/i.test(hex)) throw fail(); return { id: guid(row.id), name: str(row.name, 120), hex, image: image(row.image) }; });
  const skus = list(input.skus, 100, true).map((raw) => {
    const row = object(raw), price = row.price, originalPrice = row.originalPrice, onHand = row.onHand;
    if (!Number.isSafeInteger(price) || Number(price) < 1 || !Number.isSafeInteger(originalPrice) || Number(originalPrice) < Number(price) || !Number.isInteger(onHand) || Number(onHand) < 0 || Number(onHand) > 2147483647) throw fail('Giá phải là số nguyên VND, giá gốc không thấp hơn giá bán và tồn kho là số nguyên không âm.');
    if (row.revision !== undefined && (!Number.isInteger(row.revision) || Number(row.revision) < 0 || Number(row.revision) > 2147483647)) throw fail();
    const sku = str(row.sku, 120).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) throw fail('Mã SKU chỉ dùng chữ ASCII, số, dấu chấm, gạch dưới và gạch nối.');
    return { id: guid(row.id), configurationId: guid(row.configurationId), colorId: guid(row.colorId), sku, price: price as number, originalPrice: originalPrice as number, onHand: onHand as number, revision: row.revision as number | undefined };
  });
  unique(configurations.map((row) => row.id)); unique(colors.map((row) => row.id)); unique(skus.map((row) => row.id));
  unique(skus.map((row) => row.sku.toLowerCase())); unique(skus.map((row) => `${row.configurationId}:${row.colorId}`));
  if (skus.some((row) => !configurations.some((config) => config.id === row.configurationId) || !colors.some((color) => color.id === row.colorId))) throw fail('SKU phải tham chiếu cấu hình và màu của chính sản phẩm.');
  const badge = input.badge === undefined || input.badge === null || input.badge === '' ? null : str(input.badge, 20);
  if (badge && !['Mới', 'Bán chạy', 'Ưu đãi'].includes(badge)) throw fail();
  const revision = input.revision;
  if (revision !== undefined && (typeof revision !== 'string' || !/^[a-f0-9]{16}$/i.test(revision))) throw fail('Phiên bản sản phẩm không hợp lệ.');
  return { id: guid(input.id), revision: revision as string | undefined, slug: slug(input.slug), name: str(input.name, 200), categoryId: slug(input.categoryId),
    active: input.active, tagline: str(input.tagline, 200, true), warrantyInfo: str(input.warrantyInfo, 2000, true), subCategory: str(input.subCategory, 200, true), badge,
    thumbnail: image(input.thumbnail), gallery: list(input.gallery ?? [], 30).map(image), description: list(input.description ?? [], 30).map((item) => str(item, 3000)),
    keySpecs: specs(input.keySpecs), detailedSpecs: list(input.detailedSpecs ?? [], 20).map((raw) => { const row = object(raw); return { groupName: str(row.groupName, 120), items: specs(row.items) }; }),
    configurations, colors, skus };
}

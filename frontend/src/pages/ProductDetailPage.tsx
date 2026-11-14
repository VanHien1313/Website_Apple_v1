import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Maximize2 } from 'lucide-react';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { productService } from '../services/productService';
import { useCart } from '../store/CartContext';
import { cartItemId, MAX_QUANTITY } from '../domain/cart';
import type { Product } from '../types/product';
import { Button } from '../components/common/Button';
import { AsyncState } from '../components/common/AsyncState';
import { EmptyState } from '../components/common/EmptyState';
import { Alert } from '../components/common/Alert';
import { useToast } from '../components/common/Toast';
import { ProductImage } from '../components/product/ProductImage';
import { ProductCard } from '../components/product/ProductCard';
import { ProductGalleryDialog, ProductSpecsDialog } from '../components/product/ProductDialogs';
import { formatCurrency } from '../utils/formatters';
import { isApiMode } from '../config/dataSource';
import { selectColorVariant, variantsForColor } from '../domain/productSelection';
export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => productService.getProductBySlug(slug, { signal }), [slug]);
  const { data, loading, error, retry } = useAsyncResource(load);
  if (loading || error) return <AsyncState error={error} onRetry={retry} />;
  if (!data) return <div className="ui-container py-12"><h1 className="sr-only">Sản phẩm không tồn tại</h1><EmptyState title="Không tìm thấy sản phẩm" description="Sản phẩm có thể đã ngừng kinh doanh. Hãy khám phá các lựa chọn khác." /><Link to="/search" className="block text-center text-sm font-semibold text-accent">Xem tất cả sản phẩm</Link></div>;
  return <ProductDetails key={data.id} product={data} />;
}
function ProductDetails({ product }: { product: Product }) {
  const initialVariant = product.variants.find((variant) => variant.inStock) ?? product.variants[0];
  const initialColor = product.colors.find((color) => color.id === initialVariant?.colorId) ?? product.colors[0];
  const [colorId, setColorId] = useState(initialColor?.id);
  const [variantId, setVariantId] = useState(selectColorVariant(product, initialColor?.id, initialVariant)?.id);
  const [image, setImage] = useState(initialColor?.image || product.thumbnail);
  const [dialog, setDialog] = useState<'gallery' | 'specs' | null>(null);
  const { addItem, items, selectItems } = useCart();
  const navigate = useNavigate();
  const notify = useToast();
  const variant = product.variants.find((item) => item.id === variantId);
  const color = product.colors.find((item) => item.id === colorId);
  const available = Boolean(variant?.inStock && color && (!variant.colorId || variant.colorId === color.id));
  const gallery = [...new Set([product.thumbnail, ...product.gallery, ...product.colors.map((item) => item.image)].filter(Boolean))];
  const loadRelated = useCallback((signal: AbortSignal) => productService.getRelatedProducts(product.id, product.category, 4, { signal }), [product.id, product.category]);
  const related = useAsyncResource(loadRelated);
  function add(buyNow: boolean) {
    if (!variant || !color || !available) return;
    if (isApiMode && items.length >= 50 && !items.some((item) => item.variant.id === variant.id)) {
      notify('Giỏ hàng tối đa 50 cấu hình khác nhau.'); return;
    }
    if ((items.find((item) => item.id === cartItemId(product.id, variant.id, color.id))?.quantity ?? 0) >= MAX_QUANTITY) {
      notify('Đã đạt giới hạn số lượng cho cấu hình này.'); return;
    }
    addItem(product, variant, color);
    if (buyNow) { if (isApiMode) selectItems([cartItemId(product.id, variant.id, color.id)]); navigate('/checkout'); }
    else notify(`Đã thêm ${product.name} vào giỏ hàng.`, { label: 'Xem giỏ hàng', to: '/cart' });
  }
  return <div className="ui-container space-y-12 py-6 sm:py-10">
    <nav aria-label="Đường dẫn sản phẩm" className="flex flex-wrap items-center gap-2 text-sm text-secondary"><Link to={`/search?category=${encodeURIComponent(product.category)}`} className="flex min-h-11 items-center gap-2 hover:text-accent"><ArrowLeft size={16} />Danh mục {product.category === 'watch' ? 'Apple Watch' : product.category}</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></nav>
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-14">
      <section aria-label="Ảnh sản phẩm" className="min-w-0"><div className="relative rounded-xl bg-surface-subtle p-3 sm:p-6"><ProductImage src={image} fallback={product.thumbnail} alt={product.name} eager className="aspect-square" /><button type="button" onClick={() => setDialog('gallery')} className="absolute bottom-6 right-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-4 text-xs font-semibold"><Maximize2 size={16} />Xem ảnh lớn</button></div><div className="mt-4 flex gap-3 overflow-x-auto p-1">{gallery.map((url, index) => <button key={url} type="button" onClick={() => setImage(url)} aria-label={`Ảnh sản phẩm ${index + 1}`} aria-pressed={image === url} className={`h-20 w-20 shrink-0 rounded-lg border-2 p-1 ${image === url ? 'border-accent' : 'border-border-subtle'}`}><ProductImage src={url} alt="" className="h-full w-full" /></button>)}</div></section>
      <section className="min-w-0"><p className="text-sm text-accent">{product.tagline}</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1><div className="my-6 border-b border-border-subtle pb-6" aria-live="polite"><p className="text-3xl font-bold tabular-nums">{formatCurrency(variant?.price ?? product.basePrice)}</p>{variant && variant.originalPrice > variant.price && <p className="mt-2 text-sm text-secondary"><del>{formatCurrency(variant.originalPrice)}</del><span className="ml-3 text-success">Tiết kiệm {formatCurrency(variant.originalPrice - variant.price)}</span></p>}</div>
        <fieldset className="mb-6"><legend className="mb-3 text-sm font-semibold">Màu sắc: {color?.name ?? 'Chưa có lựa chọn'}</legend><div className="flex flex-wrap gap-2">{product.colors.map((item) => <button key={item.id} type="button" aria-pressed={item.id === colorId} onClick={() => { setVariantId(selectColorVariant(product, item.id, variant)?.id); setColorId(item.id); setImage(item.image || product.thumbnail); }} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${item.id === colorId ? 'border-accent bg-accent-light text-accent' : 'border-border-hover'}`}><span className="h-4 w-4 rounded-full border border-black/20" style={{ background: item.hex }} />{item.name}</button>)}</div></fieldset>
        <fieldset><legend className="mb-3 text-sm font-semibold">Cấu hình</legend><div className="grid gap-3 sm:grid-cols-2">{variantsForColor(product, colorId).map((item) => <button key={item.id} type="button" aria-pressed={item.id === variantId} onClick={() => setVariantId(item.id)} className={`rounded-lg border p-4 text-left ${item.id === variantId ? 'border-accent bg-accent-light' : 'border-border-hover'}`}><span className="block text-sm font-semibold">{[item.storage, item.screenSize, item.connectivity, item.chip].filter(Boolean).join(' · ') || 'Tiêu chuẩn'}</span><span className="mt-2 block text-xs text-secondary">{formatCurrency(item.price)}{!item.inStock && ' — Tạm hết hàng'}</span></button>)}</div></fieldset>
        <p className={`my-5 text-sm ${available ? 'text-success' : 'text-danger'}`} role="status">{available ? (isApiMode ? 'Cấu hình này đang còn hàng.' : 'Cấu hình này đang còn hàng trong bản demo.') : 'Cấu hình chưa khả dụng. Vui lòng chọn cấu hình khác.'}</p>
        <div className="grid gap-3 sm:grid-cols-2"><Button disabled={!available} variant="outline" onClick={() => add(false)} icon={<ShoppingBag size={18} />}>Thêm vào giỏ</Button><Button disabled={!available} onClick={() => add(true)}>Mua ngay</Button></div>
        <p className="mt-5 text-xs leading-relaxed text-secondary">Giao tiêu chuẩn miễn phí với tổng hàng trên 10 triệu đồng; các đơn còn lại 50.000 ₫. Giá và cấu hình được kiểm tra lại trước khi đặt hàng.</p>
      </section>
    </div>
    <div className="grid gap-8 lg:grid-cols-2"><section className="ui-panel p-6 sm:p-8"><h2 className="mb-5 text-xl font-bold">Một góc nhìn gần hơn</h2><div className="space-y-4 text-sm leading-7 text-secondary">{product.description.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section><section className="ui-panel p-6 sm:p-8"><h2 className="mb-5 text-xl font-bold">Thông số nổi bật</h2><dl className="divide-y divide-border-subtle">{product.keySpecs.map((spec) => <div key={spec.label} className="grid grid-cols-2 gap-4 py-4 text-sm"><dt className="text-secondary">{spec.label}</dt><dd className="break-words font-medium">{spec.value}</dd></div>)}</dl><Button variant="ghost" onClick={() => setDialog('specs')}>Xem cấu hình chi tiết</Button></section></div>
    <Alert title={isApiMode ? "Thông tin sản phẩm" : "Thông tin trong bản demo"}>{isApiMode ? product.warrantyInfo : "Ảnh, cấu hình và giá đang dùng dữ liệu mẫu; chưa phải cam kết bán hàng hoặc chính sách bảo hành thực."}</Alert>
    <section><h2 className="mb-6 text-2xl font-bold">Bạn cũng có thể thích</h2>{related.loading || related.error ? <AsyncState error={related.error} onRetry={related.retry} /> : <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{related.data?.map((item) => <ProductCard key={item.id} product={item} />)}</div>}</section>
    <ProductSpecsDialog open={dialog === 'specs'} onClose={() => setDialog(null)} product={product} />
    <ProductGalleryDialog open={dialog === 'gallery'} onClose={() => setDialog(null)} name={product.name} images={gallery} activeImage={image} onSelect={setImage} />
  </div>;
}

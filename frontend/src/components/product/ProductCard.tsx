import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatCurrency, calculateDiscountPercent } from '../../utils/formatters';
import { ProductImage } from './ProductImage';
import { Badge } from '../common/Badge';
export function ProductCard({ product }: { product: Product }) {
  const variant = [...product.variants].sort((a, b) => a.price - b.price)[0];
  const price = variant?.price ?? product.basePrice;
  const original = variant?.originalPrice ?? product.originalPrice;
  const available = product.colors.length > 0 && product.variants.some((item) => item.inStock && (!item.colorId || product.colors.some((color) => color.id === item.colorId)));
  return <article className="ui-panel aura-product-card group flex h-full flex-col p-3 transition-shadow hover:shadow-card-hover sm:p-5">
    <Link to={`/product/${product.slug}`} tabIndex={-1} aria-hidden="true"><ProductImage src={product.thumbnail} alt="" className="aspect-square w-full" /></Link>
    <div className="mt-4 flex min-h-6 items-center gap-2">{original > price ? <Badge label={`Giảm ${calculateDiscountPercent(price, original)}%`} variant="sale" /> : <span className="text-xs text-secondary">{product.category === 'mac' ? 'Mac' : product.category === 'watch' ? 'Apple Watch' : product.category === 'ipad' ? 'iPad' : product.category === 'iphone' ? 'iPhone' : product.category}</span>}</div>
    <h3 className="mt-2 min-h-12 text-sm font-bold leading-6 sm:text-base"><Link to={`/product/${product.slug}`} className="hover:text-accent">{product.name}</Link></h3>
    <p className="mt-2 line-clamp-2 text-xs leading-5 text-secondary">{product.tagline}</p>
    <div className="mt-3 flex items-center gap-1.5" aria-label={`${product.colors.length} màu sắc`}>{product.colors.slice(0, 5).map((color) => <span key={color.id} title={color.name} className="h-3 w-3 rounded-full border border-black/20" style={{ background: color.hex }} />)}</div>
    <div className="mt-auto pt-5"><p className="text-xs text-secondary">Từ</p><p className="aura-product-price mt-1 text-base font-bold tabular-nums sm:text-lg">{formatCurrency(price)}</p><div className="mt-1 min-h-5 text-xs text-secondary">{original > price && <del>{formatCurrency(original)}</del>}</div>
      <p className={`mt-2 text-xs ${available ? 'text-success' : 'text-secondary'}`}>{available ? 'Có cấu hình còn hàng' : 'Tạm hết hàng'}</p>
      <Link to={`/product/${product.slug}`} className="aura-product-action mt-4 flex min-h-11 items-center justify-center rounded-md px-2 text-center text-xs font-semibold transition-colors sm:text-sm">Chọn cấu hình</Link>
    </div>
  </article>;
}

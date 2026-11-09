import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Smartphone, Laptop, Tablet, Watch } from 'lucide-react';
import { productService } from '../services/productService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { ProductCard } from '../components/product/ProductCard';
import { ProductImage } from '../components/product/ProductImage';
import { formatCurrency } from '../utils/formatters';
const categories = [
  { slug: 'iphone', name: 'iPhone', text: 'Mọi khoảnh khắc, thật gần.', icon: Smartphone },
  { slug: 'mac', name: 'Mac', text: 'Không gian cho ý tưởng lớn.', icon: Laptop },
  { slug: 'ipad', name: 'iPad', text: 'Sáng tạo theo cách của bạn.', icon: Tablet },
  { slug: 'watch', name: 'Apple Watch', text: 'Đồng hành trong từng chuyển động.', icon: Watch },
] as const;
export function HomePage() {
  const loader = useCallback((signal: AbortSignal) => productService.getProducts(undefined, { signal }), []);
  const { data: products = [], loading, error, retry } = useAsyncResource(loader);
  if (loading || error) return <AsyncState error={error} onRetry={retry} />;
  const hero = products.find((product) => product.category === 'mac') ?? products[0];
  return <div className="pb-4">
    <section className="bg-surface-subtle"><div className="ui-container grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
      <div><p className="mb-5 text-sm font-semibold text-accent">Khám phá cùng Aura</p><h1 className="max-w-xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">Một thiết bị.<br />Nhiều điều có thể.</h1><p className="mt-6 max-w-md text-base leading-relaxed text-secondary">Cho ngày làm việc tập trung, những ý tưởng bất chợt và khoảng thời gian của riêng bạn.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/mac" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent">Khám phá Mac<ArrowUpRight size={18} /></Link><Link to="/search" className="inline-flex min-h-12 items-center rounded-full border border-border-hover px-6 text-sm font-semibold">Tất cả sản phẩm</Link></div></div>
      {hero && <Link to={`/product/${hero.slug}`} className="ui-panel relative block p-6 sm:p-8"><ProductImage src={hero.thumbnail} alt={hero.name} eager className="aspect-[4/3]" /><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-lg font-bold">{hero.name}</p><p className="mt-2 text-sm text-secondary">Từ {formatCurrency(hero.basePrice)}</p></div><span className="ui-icon-button bg-surface-subtle"><ArrowUpRight size={22} /></span></div></Link>}
    </div></section>
    <section className="ui-container py-12 sm:py-16" aria-labelledby="categories-title"><h2 id="categories-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Tìm điều phù hợp với bạn.</h2><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{categories.map(({ slug, name, text, icon: Icon }) => <Link key={slug} to={`/${slug}`} className="ui-panel flex items-center gap-4 p-5 hover:border-border-hover"><Icon className="shrink-0 text-accent" size={28} strokeWidth={1.5} /><div><h3 className="font-bold">{name}</h3><p className="mt-1 text-xs leading-5 text-secondary">{text}</p></div></Link>)}</div></section>
    <div className="ui-container space-y-14">{categories.map(({ slug, name }) => <section key={slug} aria-labelledby={`section-${slug}`}><div className="mb-6 flex items-center justify-between gap-4"><h2 id={`section-${slug}`} className="text-2xl font-bold tracking-tight">{name}</h2><Link to={`/${slug}`} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">Xem tất cả<ArrowUpRight size={16} /></Link></div><div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.filter((product) => product.category === slug).slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>)}</div>
    <section className="ui-container mt-16"><div className="rounded-xl bg-surface-subtle p-7 sm:p-10"><p className="text-sm font-semibold text-accent">Mua sắm theo nhịp của bạn</p><h2 className="mt-3 text-2xl font-bold tracking-tight">Chọn kỹ. Đặt hàng gọn.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-secondary">So sánh cấu hình ngay trên trang sản phẩm, xem rõ tổng tiền và đặt hàng mà không cần tạo tài khoản.</p><p className="mt-5 text-xs text-secondary">Website mô phỏng phục vụ học tập. Chưa tiếp nhận giao dịch hoặc thanh toán thực.</p></div></section>
  </div>;
}

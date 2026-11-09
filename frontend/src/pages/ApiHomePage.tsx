import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { productService } from '../services/productService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { ProductCard } from '../components/product/ProductCard';
import { ProductImage } from '../components/product/ProductImage';
import { formatCurrency } from '../utils/formatters';

export default function ApiHomePage() {
  const load = useCallback(async (signal: AbortSignal) => {
    const [catalog, categories] = await Promise.all([
      productService.getCatalog({ pageSize: 8 }, { signal }), productService.getCategories({ signal }),
    ]);
    return { catalog, categories };
  }, []);
  const { data, loading, error, retry } = useAsyncResource(load);
  if (loading || error) return <AsyncState error={error} onRetry={retry} />;
  const hero = data?.catalog.items[0];
  return <div className="space-y-14 pb-8">
    <section className="bg-surface-subtle"><div className="ui-container grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
      <div><p className="mb-5 text-sm font-semibold text-accent">Khám phá cùng Aura</p><h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Một thiết bị.<br />Nhiều điều có thể.</h1><p className="mt-6 max-w-md leading-7 text-secondary">Tìm lựa chọn phù hợp với nhu cầu, cấu hình và ngân sách của bạn.</p><Link to="/search" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent">Khám phá sản phẩm<ArrowUpRight size={18} /></Link></div>
      {hero && <Link to={`/product/${hero.slug}`} className="ui-panel p-8"><ProductImage src={hero.thumbnail} alt={hero.name} eager className="aspect-[4/3]" /><p className="mt-5 text-xl font-bold">{hero.name}</p><p className="mt-2 text-secondary">Từ {formatCurrency(hero.basePrice)}</p></Link>}
    </div></section>
    <section className="ui-container"><h2 className="text-2xl font-bold">Tìm điều phù hợp với bạn.</h2><div className="mt-6 flex flex-wrap gap-3">{data?.categories.map((category) => <Link key={category.id} to={`/search?category=${encodeURIComponent(category.id)}`} className="ui-panel inline-flex min-h-12 items-center gap-6 px-5 py-3 font-semibold">{category.name}<ArrowUpRight size={18} className="text-accent" /></Link>)}</div></section>
    <section className="ui-container"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">Khám phá bộ sưu tập</h2><Link to="/search" className="text-sm font-semibold text-accent">Xem tất cả</Link></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{data?.catalog.items.map((product) => <ProductCard key={product.id} product={product} />)}</div>{data?.catalog.total === 0 && <p className="py-10 text-secondary">Cửa hàng đang cập nhật sản phẩm. Hãy quay lại sau.</p>}</section>
  </div>;
}

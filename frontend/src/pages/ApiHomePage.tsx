import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Smartphone, Tablet, Laptop, Watch, Layers }  from 'lucide-react';
import { productService } from '../services/productService';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { AsyncState } from '../components/common/AsyncState';
import { ProductCard } from '../components/product/ProductCard';
import { ProductRunway } from '../components/product/ProductRunway';

export default function ApiHomePage() {
  const load = useCallback(async (signal: AbortSignal) => {
    const [catalog, categories, showcases] = await Promise.all([
      productService.getCatalog({ pageSize: 8 }, { signal }), productService.getCategories({ signal }),
      Promise.all(['mac', 'iphone', 'ipad', 'watch'].map(category => productService.getCatalog({ category, pageSize: 1, sort: 'price_desc' }, { signal }))),
    ]);
    return { catalog, categories, showcases: showcases.flatMap(result => result.items).sort((a, b) => b.basePrice - a.basePrice) };
  }, []);
  const { data, loading, error, retry } = useAsyncResource(load);
  if (loading || error) return <AsyncState error={error} onRetry={retry} />;
  return <div className="space-y-14 pb-8">
    <ProductRunway products={data?.showcases ?? []} />
    <section className="ui-container"><h2 className="aura-section-title text-2xl font-bold">Tìm điều phù hợp với bạn.</h2><div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{data?.categories.map((category) => <Link key={category.id} to={`/search?category=${encodeURIComponent(category.id)}`} className="aura-category flex min-h-24 items-center gap-3 px-4 py-5 font-semibold sm:gap-4"><span className="aura-category-icon">{category.id === 'iphone' ? <Smartphone size={23} /> : category.id === 'ipad' ? <Tablet size={23} /> : category.id === 'mac' ? <Laptop size={23} /> : category.id === 'watch' ? <Watch size={23} /> : <Layers size={23} />}</span><span className="text-sm sm:text-base">{category.name}</span><ArrowUpRight size={17} className="ml-auto hidden shrink-0 text-accent sm:block" /></Link>)}</div></section>
    <section className="ui-container"><div className="mb-6 flex items-center justify-between gap-4"><h2 className="aura-section-title text-2xl font-bold">Khám phá bộ sưu tập</h2><Link to="/search" className="text-sm font-semibold text-accent">Xem tất cả</Link></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{data?.catalog.items.map((product) => <ProductCard key={product.id} product={product} />)}</div>{data?.catalog.total === 0 && <p className="py-10 text-secondary">Cửa hàng đang cập nhật sản phẩm. Hãy quay lại sau.</p>}</section>
  </div>;
}

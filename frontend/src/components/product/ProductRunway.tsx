import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Product } from '../../types/product';
import { ProductImage } from './ProductImage';
import { formatCurrency } from '../../utils/formatters';

const categoryLabel = (product: Product) => ({ iphone: 'iPhone', ipad: 'iPad', mac: 'Mac', watch: 'Apple Watch' }[product.category] ?? product.category);

/** Manual product showcase: no timers, scroll interception or third-party animation runtime. */
export function ProductRunway({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState(0);
  const touchX = useRef<number | null>(null);
  const items = products.slice(0, 4);
  const active = selected % Math.max(items.length, 1);
  const product = items[active];
  const move = (step: number) => setSelected((value) => (value + step + items.length) % items.length);
  if (!product) return <section className="ui-container py-16"><h1 className="ui-page-title">Một thiết bị. Nhiều điều có thể.</h1><Link to="/search" className="mt-6 inline-block text-accent">Khám phá sản phẩm →</Link></section>;

  return <section className="product-runway" aria-label="Sân khấu sản phẩm Aura">
    <div className="runway-layout ui-container">
      <div className="runway-main">
        <div className="runway-intro"><h1>Khám phá Apple<span aria-hidden="true">.</span></h1></div>
        <div className="runway-stage" role="region" aria-roledescription="carousel" aria-label="Chọn thiết bị bằng các nút hoặc phím mũi tên" tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } }}
          onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touchX.current !== null && end !== undefined && Math.abs(end - touchX.current) > 55) move(end < touchX.current ? 1 : -1); touchX.current = null; }}>
          <span className="runway-watermark" aria-hidden="true">{categoryLabel(product)}</span>
          <div className="runway-floor" aria-hidden="true" />
          {items.map((item, index) => {
            const depth = (index - active + items.length) % items.length;
            return <button key={item.id} type="button" className={`runway-device runway-depth-${depth}`} aria-label={`Khám phá ${item.name}`} aria-pressed={index === active} onClick={() => setSelected(index)}>
              <ProductImage src={item.thumbnail} alt={item.name} eager={index === 0} className="aspect-square" />
              <span className="runway-device-label"><span>{String(index + 1).padStart(2, '0')}</span>{categoryLabel(item)}<ArrowUpRight size={16} /></span>
            </button>;
          })}
          <p className="runway-hint">{String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</p>
        </div>
        <div className="runway-controls">
          <button type="button" className="runway-arrow" aria-label="Thiết bị trước" onClick={() => move(-1)} disabled={items.length < 2}><ArrowLeft size={21} /></button>
          <div className="runway-steps" role="group" aria-label="Danh sách thiết bị nổi bật">{items.map((item, index) => <button type="button" key={item.id} aria-label={`Chọn ${item.name}`} aria-pressed={index === active} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, '0')}</span><span>{categoryLabel(item)}</span></button>)}</div>
          <button type="button" className="runway-arrow" aria-label="Thiết bị tiếp theo" onClick={() => move(1)} disabled={items.length < 2}><ArrowRight size={21} /></button>
        </div>
      </div>
      <aside className="runway-detail" aria-label="Thông tin thiết bị đang chọn">
        <div className="runway-detail-top"><span>{categoryLabel(product)}</span><span>{String(active + 1).padStart(2, '0')}</span></div>
        <div className="runway-description" aria-live="polite" aria-atomic="true"><h2>{product.name}</h2><p className="runway-price"><span>Từ</span> {formatCurrency(product.basePrice)}</p></div>
        <dl className="runway-specs">{product.keySpecs.slice(0, 3).map((spec, index) => <div key={`${spec.label}-${index}`}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl>
        <div className="runway-actions"><Link to={`/product/${product.slug}`} className="runway-primary">Xem sản phẩm <ArrowUpRight size={20} /></Link><Link to="/search" className="runway-secondary">Xem tất cả sản phẩm <ArrowRight size={17} /></Link></div>
      </aside>
    </div>
  </section>;
}

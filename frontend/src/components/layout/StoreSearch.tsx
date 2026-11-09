import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatters';
import { ProductImage } from '../product/ProductImage';

export function StoreSearch() {
  const id = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ items: Product[]; state: 'loading' | 'ready' | 'error' }>({ items: [], state: 'ready' });
  useEffect(() => { setOpen(false); setQuery(new URLSearchParams(location.search).get('q') ?? ''); }, [location.key, location.search]);
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    setResult({ items: [], state: 'loading' });
    const timer = setTimeout(() => {
      productService.getCatalog({ searchQuery: query.trim(), pageSize: 4 }, { signal: controller.signal }).then(
        (data) => { if (!controller.signal.aborted) setResult({ items: data.items, state: 'ready' }); },
        () => { if (!controller.signal.aborted) setResult({ items: [], state: 'error' }); },
      );
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const resultsUrl = `/search?q=${encodeURIComponent(query.trim())}`;
  return <div ref={root} className="relative mx-auto w-full max-w-xl" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); root.current?.querySelector('input')?.focus(); } }}>
    <form role="search" aria-label="Tìm sản phẩm" className="flex items-center rounded-full border border-border-subtle bg-surface-subtle" onSubmit={(event) => { event.preventDefault(); setOpen(false); navigate(resultsUrl); }}>
      <label className="sr-only" htmlFor={id}>Tìm sản phẩm</label><input id={id} type="search" name="q" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Tìm iPhone, Mac, iPad…" className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent py-2 pl-5 pr-2 text-sm placeholder:text-muted" aria-controls={open && query.trim() ? `${id}-results` : undefined} />
      <button type="submit" className="ui-icon-button mr-1" aria-label="Tìm kiếm"><Search size={19} aria-hidden="true" /></button>
    </form>
    {open && query.trim() && <div id={`${id}-results`} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border-subtle bg-surface-elevated p-2 shadow-dropdown">
      <p className="px-3 py-2 text-xs text-secondary" role="status">{result.state === 'loading' ? 'Đang tìm sản phẩm…' : result.state === 'error' ? 'Chưa tải được gợi ý. Hãy mở trang kết quả để thử lại.' : result.items.length ? 'Gợi ý sản phẩm' : 'Không tìm thấy sản phẩm phù hợp.'}</p>
      <ul>{result.items.map((product) => <li key={product.id}><Link to={`/product/${product.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md p-3 hover:bg-surface-subtle"><ProductImage src={product.thumbnail} alt="" className="h-12 w-12 shrink-0" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{product.name}</p><p className="mt-1 text-xs text-secondary">{formatCurrency(product.basePrice)}</p></div></Link></li>)}</ul>
      <Link to={resultsUrl} onClick={() => setOpen(false)} className="mt-1 block rounded-md px-3 py-3 text-sm font-semibold text-accent hover:bg-accent-light">Xem tất cả kết quả</Link>
    </div>}
  </div>;
}

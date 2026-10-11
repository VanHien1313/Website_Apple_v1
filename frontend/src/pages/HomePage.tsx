import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Flame,
  Clock,
  Sparkles,
  MapPin,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';

interface HeroSlide {
  id: string;
  taglineBadge: string;
  title: string;
  subtitle: string;
  description: string;
  priceLabel: string;
  priceValue: number;
  promoText: string;
  productSlug: string;
  categoryLink: string;
  categoryText: string;
  image: string;
  glowClass: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide_ip16pm',
    taglineBadge: 'Flagship Apple 2026',
    title: 'iPhone 16 Pro Max',
    subtitle: 'Titan Sa Mạc. Sức mạnh đột phá A18 Pro.',
    description: 'Khung titan Cấp 5 bền nhẹ vượt trội. Nút Điều khiển Camera thế hệ mới kết hợp màn hình Super Retina XDR 6.9 inch viền mỏng kỷ lục.',
    priceLabel: 'Từ',
    priceValue: 34990000,
    promoText: 'Giảm ngay 3.000.000₫ • Trả góp 0% lãi suất',
    productSlug: 'iphone-16-pro-max',
    categoryLink: '/iphone',
    categoryText: 'Xem dòng iPhone 16',
    image: 'https://cdn.topzone.vn/Products/Images/42/329149/s16/iphone-16-pro-max-titan-sa-mac-thumbnew-650x650.png',
    glowClass: 'ambient-glow-titanium',
  },
  {
    id: 'slide_mac_m4',
    taglineBadge: 'Hiệu Năng Pro Đỉnh Cao',
    title: 'MacBook Pro M4',
    subtitle: 'Tuyệt tác chuyên nghiệp. M4 Pro & M4 Max.',
    description: 'Thời lượng pin kỷ lục lên đến 24 giờ. Màn hình Liquid Retina XDR với tùy chọn Nano-texture và cổng Thunderbolt 5 băng thông vượt trội.',
    priceLabel: 'Từ',
    priceValue: 39990000,
    promoText: 'Trợ giá lên đời 2.000.000₫ • Tặng gói bảo dưỡng Aura Care',
    productSlug: 'macbook-pro-14-m4',
    categoryLink: '/mac',
    categoryText: 'Xem hệ sinh thái Mac',
    image: 'https://cdn.topzone.vn/Products/Images/44/358089/s16/macbook-pro-14-inch-m5-24gb-1tb-den-thumb-650x650.png',
    glowClass: 'ambient-glow-blue',
  },
  {
    id: 'slide_ipad_m4',
    taglineBadge: 'Mỏng Kỷ Lục Lịch Sử',
    title: 'iPad Pro M4',
    subtitle: 'Màn hình Ultra Retina XDR OLED kép đỉnh cao.',
    description: 'Thiết kế mỏng kinh ngạc chỉ 5.1mm. Sức mạnh chip Apple M4 cùng sự kết hợp đột phá với Apple Pencil Pro và Magic Keyboard mới.',
    priceLabel: 'Từ',
    priceValue: 28990000,
    promoText: 'Giảm 2.500.000₫ • Hỗ trợ học sinh & sinh viên',
    productSlug: 'ipad-pro-13-m4',
    categoryLink: '/ipad',
    categoryText: 'Xem toàn bộ iPad',
    image: 'https://cdn.topzone.vn/Products/Images/522/358082/s16/ipad-pro-m5-wifi-11-inch-black-thumbtz-650x650.png',
    glowClass: 'ambient-glow-purple',
  },
  {
    id: 'slide_watch_ultra',
    taglineBadge: 'Bản Titan Đen Hoàn Mới',
    title: 'Apple Watch Ultra 2',
    subtitle: 'Chinh phục cực hạn. Bền bỉ không đối thủ.',
    description: 'Vỏ titan 49mm chống ăn mòn đạt chuẩn quân đội, GPS tần số kép chính xác vượt bậc và thời lượng pin 72 giờ ở chế độ Tiết Kiệm Pin.',
    priceLabel: 'Từ',
    priceValue: 21990000,
    promoText: 'Tặng kèm dây đeo thể thao cao cấp chính hãng',
    productSlug: 'apple-watch-ultra-2',
    categoryLink: '/watch',
    categoryText: 'Xem các mẫu Apple Watch',
    image: 'https://cdn.topzone.vn/Products/Images/7077/344764/s16/apple-watch-ultra-3-gps-cellular-49mm-vien-titanium-day-ocean-den-thumb-1-650x650.png',
    glowClass: 'ambient-glow-dark',
  },
];

export const HomePage: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);

  // Category showcase sub-tab filters
  const [iphoneSubTab, setIphoneSubTab] = useState<'all' | 'pro' | 'standard'>('all');
  const [macSubTab, setMacSubTab] = useState<'all' | 'pro' | 'air'>('all');
  const [ipadSubTab, setIpadSubTab] = useState<'all' | 'pro' | 'air'>('all');
  const [watchSubTab, setWatchSubTab] = useState<'all' | 'ultra' | 'series'>('all');

  // Live Flash Deal countdown timer
  const [countdown, setCountdown] = useState({ hours: 7, minutes: 42, seconds: 19 });

  useEffect(() => {
    async function loadData() {
      const prods = await productService.getProducts();
      setAllProducts(prods);
    }
    loadData();
  }, []);

  // Slide autoplay
  useEffect(() => {
    if (isSlidePaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isSlidePaused]);

  // Flash Sale countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filtered lists
  const iphones = useMemo(() => {
    const list = allProducts.filter((p) => p.category === 'iphone');
    if (iphoneSubTab === 'pro') return list.filter((p) => p.name.includes('Pro'));
    if (iphoneSubTab === 'standard') return list.filter((p) => !p.name.includes('Pro'));
    return list;
  }, [allProducts, iphoneSubTab]);

  const macs = useMemo(() => {
    const list = allProducts.filter((p) => p.category === 'mac');
    if (macSubTab === 'pro') return list.filter((p) => p.name.includes('Pro'));
    if (macSubTab === 'air') return list.filter((p) => p.name.includes('Air'));
    return list;
  }, [allProducts, macSubTab]);

  const ipads = useMemo(() => {
    const list = allProducts.filter((p) => p.category === 'ipad');
    if (ipadSubTab === 'pro') return list.filter((p) => p.name.includes('Pro'));
    if (ipadSubTab === 'air') return list.filter((p) => p.name.includes('Air'));
    return list;
  }, [allProducts, ipadSubTab]);

  const watches = useMemo(() => {
    const list = allProducts.filter((p) => p.category === 'watch');
    if (watchSubTab === 'ultra') return list.filter((p) => p.name.includes('Ultra'));
    if (watchSubTab === 'series') return list.filter((p) => !p.name.includes('Ultra'));
    return list;
  }, [allProducts, watchSubTab]);

  // Curated Flash Sale items
  const flashSaleItems = useMemo(() => {
    return allProducts.slice(0, 4);
  }, [allProducts]);

  const currentHero = HERO_SLIDES[activeSlide];

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* ================= 1. DYNAMIC FLAGSHIP CAMPAIGN CAROUSEL ================= */}
      <section
        className="relative overflow-hidden bg-[#FAFAFC] dark:bg-[#0A0A0C] border-b border-black/[0.06] dark:border-white/[0.08] transition-colors"
        onMouseEnter={() => setIsSlidePaused(true)}
        onMouseLeave={() => setIsSlidePaused(false)}
      >
        {/* Soft Ambient Radial Lighting behind hardware */}
        <div
          className={`absolute top-0 right-0 w-full lg:w-2/3 h-full pointer-events-none transition-all duration-700 opacity-80 dark:opacity-60 ${currentHero.glowClass}`}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Typography, Commercial Offer & CTAs */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-white/10 border border-black/[0.08] dark:border-white/15 shadow-2xs text-[11px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>{currentHero.taglineBadge}</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.06]">
                  {currentHero.title}
                </h1>
                <p className="text-xl sm:text-2xl text-secondary font-semibold tracking-tight">
                  {currentHero.subtitle}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-secondary/90 max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
                {currentHero.description}
              </p>

              {/* Pricing & Exclusive APR Offer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <div className="text-sm font-semibold text-primary">
                  {currentHero.priceLabel}{' '}
                  <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums">
                    {formatCurrency(currentHero.priceValue)}
                  </span>
                </div>
                <span className="hidden sm:inline text-secondary/30">•</span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                  {currentHero.promoText}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link to={`/product/${currentHero.productSlug}`}>
                  <Button size="lg" className="px-8 shadow-sm">
                    Khám phá ngay
                  </Button>
                </Link>
                <Link to={currentHero.categoryLink}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-6 bg-white dark:bg-white/10 dark:hover:bg-white/20 hover:bg-surface-subtle"
                  >
                    {currentHero.categoryText} <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column: Hero Hardware Canvas */}
            <div className="lg:col-span-6 flex items-center justify-center relative">
              <div className="relative w-full max-w-lg lg:max-w-xl flex items-center justify-center py-4">
                {/* Hardware Ambient Pedestal Light */}
                <div className="absolute -bottom-2 w-4/5 h-10 bg-black/15 dark:bg-black/70 blur-2xl rounded-full pointer-events-none" />
                <img
                  key={currentHero.id}
                  src={currentHero.image}
                  alt={currentHero.title}
                  className="w-full h-auto max-h-[440px] sm:max-h-[520px] lg:max-h-[580px] object-contain drop-shadow-[0_28px_56px_rgba(0,0,0,0.22)] dark:drop-shadow-[0_36px_72px_rgba(0,0,0,0.75)] transition-all duration-700 transform hover:scale-[1.05] mix-blend-multiply dark:mix-blend-normal animate-in fade-in zoom-in-95 duration-500 z-10"
                />
              </div>
            </div>
          </div>

          {/* Slide Indicator Dots & Prev/Next Nav Controls */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {HERO_SLIDES.map((slide, idx) => {
                const isActive = activeSlide === idx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-background shadow-sm'
                        : 'bg-white dark:bg-white/10 text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-white/20 border border-black/[0.06] dark:border-white/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{slide.title.split(' ')[0]} {slide.title.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
                className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-black/[0.08] dark:border-white/15 flex items-center justify-center text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label="Slide trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-black/[0.08] dark:border-white/15 flex items-center justify-center text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label="Slide tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. TOPZONE FLASH SALE / HOT DEALS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-1 shadow-lg">
          <div className="bg-white dark:bg-[#121214] rounded-[22px] p-5 sm:p-7">
            {/* Header: Flame Icon + Live Countdown Timer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Săn Deal Apple Độc Quyền
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase animate-pulse">
                      Hot Sale
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                    Giá Sốc Online Hôm Nay
                  </h2>
                </div>
              </div>

              {/* Countdown Ticker */}
              <div className="flex items-center gap-2 bg-surface-subtle dark:bg-white/5 border border-black/[0.06] dark:border-white/10 px-4 py-2 rounded-2xl self-start sm:self-auto">
                <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-semibold text-secondary">Kết thúc trong:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-xs text-primary tabular-nums">
                  <span className="px-1.5 py-0.5 rounded bg-primary text-background">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary text-background">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                  <span>:</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary text-background">
                    {String(countdown.seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Flash Deals 4 Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 pt-6">
              {flashSaleItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. HARDWARE CATEGORY DISCOVERY (CHOOSE-CATE) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Hệ Sinh Thái Toàn Diện</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
              Khám Phá Danh Mục Thiết Bị
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-secondary mt-2 sm:mt-0 max-w-md">
            100% sản phẩm ủy quyền chính hãng từ Apple với tiêu chuẩn trải nghiệm APR cao cấp nhất.
          </p>
        </div>

        {/* 4 Hardware Silhouette Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* iPhone */}
          <Link
            to="/iphone"
            className="group relative bg-white dark:bg-[#161618] hover:bg-[#FAFAFC] dark:hover:bg-[#1c1c1e] rounded-3xl p-5 sm:p-6 flex flex-col justify-between border border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:shadow-card-hover transition-all duration-300 min-h-[300px] sm:min-h-[330px]"
          >
            <div>
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Điện thoại</span>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mt-0.5 group-hover:text-accent transition-colors">
                iPhone
              </h3>
              <p className="text-xs text-secondary/80 mt-1">16 Pro Max, 16, Plus</p>
            </div>
            
            <div className="relative my-3.5 py-6 rounded-2xl bg-gradient-to-b from-surface-subtle/80 via-surface-subtle/40 to-surface-subtle/10 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial from-white/80 via-transparent to-transparent dark:from-white/[0.06] pointer-events-none" />
              <div className="absolute bottom-2.5 w-3/5 h-2.5 bg-black/10 dark:bg-black/45 blur-sm rounded-full pointer-events-none group-hover:scale-115 transition-transform duration-500" />
              <img
                src="https://cdn.topzone.vn/Products/Images/42/329149/s16/iphone-16-pro-max-titan-sa-mac-thumbnew-650x650.png"
                alt="iPhone"
                className="h-36 sm:h-44 object-contain transition-transform duration-500 ease-out group-hover:scale-115 drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_18px_32px_rgba(0,0,0,0.50)] mix-blend-multiply dark:mix-blend-normal z-10"
              />
            </div>

            <div className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Khám phá ngay <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* iPad */}
          <Link
            to="/ipad"
            className="group relative bg-white dark:bg-[#161618] hover:bg-[#FAFAFC] dark:hover:bg-[#1c1c1e] rounded-3xl p-5 sm:p-6 flex flex-col justify-between border border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:shadow-card-hover transition-all duration-300 min-h-[300px] sm:min-h-[330px]"
          >
            <div>
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Máy tính bảng</span>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mt-0.5 group-hover:text-accent transition-colors">
                iPad
              </h3>
              <p className="text-xs text-secondary/80 mt-1">Pro M4, Air M2, Gen 10</p>
            </div>

            <div className="relative my-3.5 py-6 rounded-2xl bg-gradient-to-b from-surface-subtle/80 via-surface-subtle/40 to-surface-subtle/10 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial from-white/80 via-transparent to-transparent dark:from-white/[0.06] pointer-events-none" />
              <div className="absolute bottom-2.5 w-3/5 h-2.5 bg-black/10 dark:bg-black/45 blur-sm rounded-full pointer-events-none group-hover:scale-115 transition-transform duration-500" />
              <img
                src="https://cdn.topzone.vn/Products/Images/522/358082/s16/ipad-pro-m5-wifi-11-inch-black-thumbtz-650x650.png"
                alt="iPad"
                className="h-36 sm:h-44 object-contain transition-transform duration-500 ease-out group-hover:scale-115 drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_18px_32px_rgba(0,0,0,0.50)] mix-blend-multiply dark:mix-blend-normal z-10"
              />
            </div>

            <div className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Khám phá ngay <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Mac */}
          <Link
            to="/mac"
            className="group relative bg-white dark:bg-[#161618] hover:bg-[#FAFAFC] dark:hover:bg-[#1c1c1e] rounded-3xl p-5 sm:p-6 flex flex-col justify-between border border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:shadow-card-hover transition-all duration-300 min-h-[300px] sm:min-h-[330px]"
          >
            <div>
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Máy vi tính</span>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mt-0.5 group-hover:text-accent transition-colors">
                Mac
              </h3>
              <p className="text-xs text-secondary/80 mt-1">MacBook Pro, Air, mini M4</p>
            </div>

            <div className="relative my-3.5 py-6 rounded-2xl bg-gradient-to-b from-surface-subtle/80 via-surface-subtle/40 to-surface-subtle/10 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial from-white/80 via-transparent to-transparent dark:from-white/[0.06] pointer-events-none" />
              <div className="absolute bottom-2.5 w-3/5 h-2.5 bg-black/10 dark:bg-black/45 blur-sm rounded-full pointer-events-none group-hover:scale-115 transition-transform duration-500" />
              <img
                src="https://cdn.topzone.vn/Products/Images/44/363488/s16/macbook-pro-14-inch-m5-pro-24gb-1tb-bac-thumb-650x650.png"
                alt="Mac"
                className="h-36 sm:h-44 object-contain transition-transform duration-500 ease-out group-hover:scale-115 drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_18px_32px_rgba(0,0,0,0.50)] mix-blend-multiply dark:mix-blend-normal z-10"
              />
            </div>

            <div className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Khám phá ngay <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Apple Watch */}
          <Link
            to="/watch"
            className="group relative bg-white dark:bg-[#161618] hover:bg-[#FAFAFC] dark:hover:bg-[#1c1c1e] rounded-3xl p-5 sm:p-6 flex flex-col justify-between border border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:shadow-card-hover transition-all duration-300 min-h-[300px] sm:min-h-[330px]"
          >
            <div>
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Đồng hồ thông minh</span>
              <h3 className="text-xl sm:text-2xl font-bold text-primary mt-0.5 group-hover:text-accent transition-colors">
                Apple Watch
              </h3>
              <p className="text-xs text-secondary/80 mt-1">Ultra 2, Series 10, SE</p>
            </div>

            <div className="relative my-3.5 py-6 rounded-2xl bg-gradient-to-b from-surface-subtle/80 via-surface-subtle/40 to-surface-subtle/10 dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-radial from-white/80 via-transparent to-transparent dark:from-white/[0.06] pointer-events-none" />
              <div className="absolute bottom-2.5 w-3/5 h-2.5 bg-black/10 dark:bg-black/45 blur-sm rounded-full pointer-events-none group-hover:scale-115 transition-transform duration-500" />
              <img
                src="https://cdn.topzone.vn/Products/Images/7077/344764/s16/apple-watch-ultra-3-gps-cellular-49mm-vien-titanium-day-ocean-den-thumb-1-650x650.png"
                alt="Watch"
                className="h-36 sm:h-44 object-contain transition-transform duration-500 ease-out group-hover:scale-115 drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_18px_32px_rgba(0,0,0,0.50)] mix-blend-multiply dark:mix-blend-normal z-10"
              />
            </div>

            <div className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Khám phá ngay <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* ================= 4. iPHONE SHOWCASE (WITH SUB-TABS) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Hệ Sinh Thái iPhone
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-0.5">
              iPhone 16 Series & Pro
            </h2>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setIphoneSubTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                iphoneSubTab === 'all'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Tất cả ({allProducts.filter((p) => p.category === 'iphone').length})
            </button>
            <button
              type="button"
              onClick={() => setIphoneSubTab('pro')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                iphoneSubTab === 'pro'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Dòng Pro & Pro Max
            </button>
            <button
              type="button"
              onClick={() => setIphoneSubTab('standard')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                iphoneSubTab === 'standard'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              iPhone Tiêu Chuẩn
            </button>

            <Link
              to="/iphone"
              className="text-xs font-semibold text-accent hover:underline ml-2 flex items-center gap-0.5 shrink-0"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
          {iphones.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ================= 5. MAC SHOWCASE (WITH SUB-TABS) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Hệ Sinh Thái Mac
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-0.5">
              MacBook Pro, Air & Mac Studio
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setMacSubTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                macSubTab === 'all'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setMacSubTab('pro')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                macSubTab === 'pro'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              MacBook Pro
            </button>
            <button
              type="button"
              onClick={() => setMacSubTab('air')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                macSubTab === 'air'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              MacBook Air
            </button>

            <Link
              to="/mac"
              className="text-xs font-semibold text-accent hover:underline ml-2 flex items-center gap-0.5 shrink-0"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
          {macs.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ================= 6. iPAD SHOWCASE (WITH SUB-TABS) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Hệ Sinh Thái iPad
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-0.5">
              iPad Pro M4 & iPad Air M2
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setIpadSubTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                ipadSubTab === 'all'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setIpadSubTab('pro')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                ipadSubTab === 'pro'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              iPad Pro M4
            </button>
            <button
              type="button"
              onClick={() => setIpadSubTab('air')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                ipadSubTab === 'air'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              iPad Air M2
            </button>

            <Link
              to="/ipad"
              className="text-xs font-semibold text-accent hover:underline ml-2 flex items-center gap-0.5 shrink-0"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
          {ipads.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ================= 7. WATCH SHOWCASE ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Hệ Sinh Thái Apple Watch
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-0.5">
              Apple Watch Ultra 2 & Series 10
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setWatchSubTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                watchSubTab === 'all'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setWatchSubTab('ultra')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                watchSubTab === 'ultra'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Apple Watch Ultra
            </button>
            <button
              type="button"
              onClick={() => setWatchSubTab('series')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                watchSubTab === 'series'
                  ? 'bg-primary text-background shadow-sm'
                  : 'bg-surface-subtle text-secondary hover:text-primary'
              }`}
            >
              Series 10 & SE
            </button>

            <Link
              to="/watch"
              className="text-xs font-semibold text-accent hover:underline ml-2 flex items-center gap-0.5 shrink-0"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6">
          {watches.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ================= 8. AURA CARE & AUTHORIZED SERVICE ECOSYSTEM ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#F5F5F7] dark:bg-[#111113] p-8 sm:p-12 border border-black/[0.06] dark:border-white/[0.08] relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: TopCare Description */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-white/10 text-primary text-xs font-bold shadow-2xs border border-black/[0.06] dark:border-white/10">
                <Wrench className="w-3.5 h-3.5 text-accent" />
                <span>Trung Tâm Dịch Vụ Apple Care Ủy Quyền</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary tracking-tight leading-tight">
                An Tâm Tuyệt Đối Với Aura Care
              </h2>

              <p className="text-xs sm:text-sm text-secondary leading-relaxed font-normal">
                Không chỉ bán thiết bị, Aura Studio đồng hành suốt vòng đời sản phẩm với quy trình tiếp nhận và bảo hành chính hãng tiêu chuẩn Apple toàn cầu.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% linh kiện thay thế chính hãng Apple phân phối</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kỹ thuật viên đạt chứng chỉ Apple Certified Macintosh Technician</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bảo hành liên thông toàn bộ trung tâm Apple Authorized Service</span>
                </div>
              </div>
            </div>

            {/* Right Column: 4 Commercial Trust Pillars */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="bg-white dark:bg-[#161618] rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-primary mb-2">
                  <ShieldCheck className="w-5 h-5 text-accent stroke-[1.8]" />
                </div>
                <h3 className="font-bold text-sm text-primary">Chính Hãng Apple 100%</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Nguyên seal hộp, tem ICT phân phối chính thức tại Việt Nam. Bảo hành 12 tháng chuẩn Apple.
                </p>
              </div>

              <div className="bg-white dark:bg-[#161618] rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-primary mb-2">
                  <Truck className="w-5 h-5 text-accent stroke-[1.8]" />
                </div>
                <h3 className="font-bold text-sm text-primary">Giao Hỏa Tốc 2 Giờ</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Giao nhanh nội thành HN & HCM. Miễn phí vận chuyển toàn quốc cho đơn từ 10.000.000₫.
                </p>
              </div>

              <div className="bg-white dark:bg-[#161618] rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-primary mb-2">
                  <RotateCcw className="w-5 h-5 text-accent stroke-[1.8]" />
                </div>
                <h3 className="font-bold text-sm text-primary">30 Ngày 1 Đổi 1</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Đổi ngay máy mới nguyên seal trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng NSX.
                </p>
              </div>

              <div className="bg-white dark:bg-[#161618] rounded-2xl p-5 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-primary mb-2">
                  <CreditCard className="w-5 h-5 text-accent stroke-[1.8]" />
                </div>
                <h3 className="font-bold text-sm text-primary">Trả Góp 0% Lãi Suất</h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Hỗ trợ qua thẻ tín dụng và đối tác tài chính lớn, thủ tục 10 phút, không giữ giấy tờ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. STORE NETWORK LOCATOR STRIP ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-black/[0.06] dark:border-white/[0.08] rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#141416] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle flex items-center justify-center text-accent shrink-0">
              <MapPin className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-primary">
                Trải Nghiệm Trực Tiếp Tại Hệ Thống Cửa Hàng Aura Studio
              </h3>
              <p className="text-xs sm:text-sm text-secondary mt-0.5">
                Không gian thiết kế chuẩn Apple Mono Store tại Hà Nội, Đà Nẵng và TP. Hồ Chí Minh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-secondary">Hotline tư vấn:</span>
            <span className="text-sm font-bold text-primary px-3 py-1.5 rounded-xl bg-surface-subtle border border-border-subtle">
              1900.6868
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

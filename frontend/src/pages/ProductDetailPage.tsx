import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Star,
  ShoppingBag,
  ChevronRight,
  Sparkles,
  ZoomIn,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductColor, ProductVariant } from '../types/product';
import { useCart } from '../store/CartContext';
import { PriceDisplay } from '../components/common/PriceDisplay';
import { Button } from '../components/common/Button';
import { ProductCard } from '../components/product/ProductCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency } from '../utils/formatters';
import { getProductDetailedSpecs } from '../utils/specSheet';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Active configurations
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [addedToast, setAddedToast] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Mobile smart sticky bar observer
  const actionsRef = useRef<HTMLDivElement>(null);
  const [isCtaVisible, setIsCtaVisible] = useState(true);

  // Detailed specifications list (CellphoneS / TGDD style)
  const detailedSpecsList = product ? getProductDetailedSpecs(product) : [];

  // All distinct gallery and color images for balanced thumbnail previews
  const allGalleryImages = product
    ? Array.from(
        new Set([
          product.thumbnail,
          ...(product.gallery || []),
          ...(product.colors?.map((c) => c.image) || []),
        ].filter(Boolean))
      )
    : [];

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      setLoading(true);
      try {
        const item = await productService.getProductBySlug(slug);
        setProduct(item);

        if (item) {
          const defaultColor = item.colors[0];
          const defaultVariant = item.variants[0];
          setSelectedColor(defaultColor);
          setSelectedVariant(defaultVariant);
          setActiveImage(defaultColor?.image || item.thumbnail);

          const related = await productService.getRelatedProducts(item.id, item.category, 4);
          setRelatedProducts(related);
        }
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  // Observe inline actions container to only show mobile sticky bar when CTA is out of view
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCtaVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product || !selectedColor || !selectedVariant) {
    return (
      <EmptyState
        title="Không tìm thấy sản phẩm"
        description="Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh."
        actionLabel="Về trang chủ"
        onAction={() => navigate('/')}
      />
    );
  }

  const handleColorChange = (color: ProductColor) => {
    setSelectedColor(color);
    setActiveImage(color.image);
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, selectedColor, 1);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    addItem(product, selectedVariant, selectedColor, 1);
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 lg:pb-12 space-y-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-secondary font-medium">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3 text-muted" />
        <Link to={`/${product.category}`} className="capitalize hover:text-primary transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="w-3 h-3 text-muted" />
        <span className="text-primary truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main PDP Grid: 55% Gallery / 45% Configurator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Gallery Column (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          {/* Main Large Image (Flagship Stage Canvas) */}
          <div
            onClick={() => setIsZoomModalOpen(true)}
            className="w-full h-[380px] sm:h-[460px] lg:h-[490px] rounded-3xl bg-[#f8f8fa] dark:bg-[#161618] border border-gray-200/80 dark:border-white/10 shadow-sm flex items-center justify-center p-6 sm:p-10 lg:p-12 relative group select-none cursor-zoom-in overflow-hidden transition-colors"
          >
            {/* Ambient Radial Spotlight */}
            <div className="absolute inset-0 bg-radial from-white via-transparent to-transparent dark:from-white/[0.04] pointer-events-none" />

            {/* Main Stage Image - Centered, unclipped, balanced retail ratio */}
            <img
              src={activeImage}
              alt={product.name}
              className="max-w-full max-h-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out group-hover:scale-[1.04] z-10"
            />

            {/* Top Badges */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-black/[0.06] dark:border-white/10 shadow-2xs">
                Trả chậm 0%
              </span>
              {product.badge && (
                <span className="text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Quick Zoom Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomModalOpen(true);
              }}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md border border-black/[0.06] dark:border-white/10 text-[11px] font-semibold text-gray-700 dark:text-gray-300 shadow-2xs opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
            >
              <ZoomIn className="w-3.5 h-3.5 text-accent" />
              <span>Xem kích thước lớn</span>
            </button>
          </div>

          {/* Thumbnails */}
          {allGalleryImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {allGalleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#f8f8fa] dark:bg-[#161618] border p-2 shrink-0 transition-all flex items-center justify-center ${
                    activeImage === img
                      ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-white/[0.04] shadow-sm'
                      : 'border-gray-200/80 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Configurator Column (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-7">
          {/* Title & Reviews */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
              {product.name}
            </h1>
            <p className="text-sm text-secondary leading-relaxed">{product.tagline}</p>

            <div className="flex items-center gap-2 pt-1 text-xs text-secondary">
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{product.rating}</span>
              </div>
              <span className="text-border-subtle">•</span>
              <span>{product.reviewCount} đánh giá</span>
              <span className="text-border-subtle">•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Còn hàng chính hãng
              </span>
            </div>
          </div>

          {/* Pricing Section (Airy, refined) */}
          <div className="py-4 border-y border-border-subtle/80 flex flex-col gap-1.5">
            <PriceDisplay
              price={selectedVariant.price}
              originalPrice={selectedVariant.originalPrice}
              size="xl"
            />
            <div className="flex items-center gap-2 text-[11px] text-secondary">
              <span>Đã bao gồm thuế VAT</span>
              <span>•</span>
              <span>Miễn phí vận chuyển toàn quốc</span>
            </div>
          </div>

          {/* TopZone-style APR Promotion Box */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] dark:bg-rose-500/[0.06] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Khuyến Mãi & Đặc Quyền Mua Hàng</span>
            </div>
            <ul className="space-y-2 text-xs text-secondary">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong className="text-primary font-semibold">Thu cũ đổi mới:</strong> Trợ giá ngay 2.000.000₫ trực tiếp vào giá bán máy.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong className="text-primary font-semibold">Thanh toán qua VNPay-QR / MoMo:</strong> Giảm thêm 500.000₫.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong className="text-primary font-semibold">Trả góp 0% lãi suất:</strong> Xét duyệt nhanh qua thẻ tín dụng và CCCD gắn chip.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span><strong className="text-primary font-semibold">Ưu đãi phụ kiện Apple:</strong> Giảm 20% khi mua kèm Củ sạc 20W & Ốp lưng MagSafe.</span>
              </li>
            </ul>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-primary tracking-wide">
              Màu sắc: <span className="font-normal text-secondary">{selectedColor.name}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {product.colors.map((color) => {
                const isSelected = selectedColor.id === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                      isSelected
                        ? 'border-primary bg-primary/[0.04] text-primary ring-1 ring-primary font-semibold shadow-2xs'
                        : 'border-border-subtle hover:border-border-hover bg-white dark:bg-[#161618] text-secondary hover:text-primary'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant Selection (Storage / Screen Size / Configuration) */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-primary tracking-wide">
              {product.category === 'watch' ? 'Kích thước mặt / Phiên bản:' : 'Dung lượng lưu trữ:'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {product.variants.map((variant) => {
                const isSelected = selectedVariant.id === variant.id;
                const label = variant.storage || variant.screenSize || variant.connectivity || 'Tiêu chuẩn';

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/[0.03] ring-1 ring-primary'
                        : 'border-border-subtle hover:border-border-hover bg-white dark:bg-[#161618]'
                    }`}
                  >
                    <span className="text-xs font-bold text-primary">{label}</span>
                    <span className="text-[11px] font-semibold text-secondary mt-1 tabular-nums">
                      {formatCurrency(variant.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div ref={actionsRef} className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddToCart}
                icon={<ShoppingBag className="w-4 h-4" />}
                className="w-full"
              >
                Thêm vào giỏ
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleBuyNow}
                className="w-full"
              >
                Mua ngay
              </Button>
            </div>

            {/* Added to cart toast feedback */}
            {addedToast && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Đã thêm {product.name} ({selectedColor.name}) vào giỏ hàng!
                </span>
                <Link to="/cart" className="font-bold underline hover:text-emerald-950">
                  Xem giỏ
                </Link>
              </div>
            )}
          </div>

          {/* Service Promises */}
          <div className="border-t border-border-subtle pt-5 space-y-3 text-xs text-secondary">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{product.warrantyInfo}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Giao hàng siêu tốc trong 2 giờ tại Hà Nội & TP. Hồ Chí Minh.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Đổi mới trong 30 ngày nếu phát sinh lỗi từ nhà sản xuất.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Description Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-8 border-t border-border-subtle">
        {/* Description */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-primary tracking-tight">Đặc Điểm Nổi Bật</h2>
          <div className="space-y-3 text-sm text-secondary leading-relaxed">
            {product.description.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Technical Specs Table (TGDD / CellphoneS High-Authority Spec Card) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary tracking-tight">Thông Số Kỹ Thuật</h2>
            <span className="text-[11px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
              Chính hãng Apple VN
            </span>
          </div>

          <div className="border border-border-subtle rounded-2xl overflow-hidden bg-white dark:bg-[#161618] shadow-xs">
            <div className="divide-y divide-border-subtle text-xs">
              {product.keySpecs.map((spec, idx) => (
                <div
                  key={idx}
                  className={`flex items-start p-3.5 transition-colors ${
                    idx % 2 === 0 ? 'bg-surface-subtle/50 dark:bg-white/[0.015]' : 'bg-white dark:bg-[#161618]'
                  }`}
                >
                  <span className="w-2/5 font-semibold text-secondary shrink-0">{spec.label}</span>
                  <span className="w-3/5 font-medium text-primary leading-relaxed">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* View Full Specs Trigger Button */}
            <div className="p-3 border-t border-border-subtle bg-surface-subtle/40 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setIsSpecModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
              >
                <SlidersHorizontal className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Xem cấu hình chi tiết</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-border-subtle">
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight mb-6">
            Sản Phẩm Cùng Hệ Sinh Thái
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Add-to-Cart Bar (Only visible when inline CTA is scrolled out of view) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-black/90 backdrop-blur-md border-t border-border-subtle p-3 flex items-center justify-between gap-3 shadow-lg transition-all duration-300 ${
          !isCtaVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-w-0">
          <div className="text-[11px] text-secondary truncate font-medium">{product.name}</div>
          <div className="text-sm font-bold text-primary tabular-nums">
            {formatCurrency(selectedVariant.price)}
          </div>
        </div>
        <Button size="sm" onClick={handleAddToCart} className="shrink-0 px-5">
          Thêm vào giỏ
        </Button>
      </div>

      {/* Full Detailed Specification Modal (Thế Giới Di Động / CellphoneS Style) */}
      {isSpecModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSpecModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl max-h-[88vh] bg-white dark:bg-[#181a20] rounded-3xl border border-border-subtle shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-subtle/70 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-11 h-11 object-contain rounded-xl bg-white dark:bg-black/20 p-1 border border-border-subtle shadow-2xs"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-primary tracking-tight">
                    Thông số kỹ thuật: {product.name}
                  </h3>
                  <p className="text-xs text-secondary font-medium">
                    Bản tiêu chuẩn chính hãng Apple Việt Nam (VN/A)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSpecModalOpen(false)}
                className="p-2 rounded-full text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Spec Groups */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {detailedSpecsList.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-accent px-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span>{group.groupName}</span>
                  </div>

                  <div className="border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle text-xs bg-white dark:bg-[#141519] shadow-2xs">
                    {group.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className={`flex items-start p-3 sm:p-3.5 transition-colors ${
                          iIdx % 2 === 0 ? 'bg-surface-subtle/40 dark:bg-white/[0.015]' : 'bg-white dark:bg-transparent'
                        }`}
                      >
                        <span className="w-1/3 font-semibold text-secondary shrink-0 pr-3">
                          {item.label}
                        </span>
                        <span className="w-2/3 font-medium text-primary leading-relaxed">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-surface-subtle/50 dark:bg-white/[0.02]">
              <span className="text-xs text-secondary hidden sm:inline">
                Dữ liệu thông số kỹ thuật chính thức từ Apple Inc.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSpecModalOpen(false)}
                className="px-6 ml-auto"
              >
                Đóng thông số
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Zoom Lightbox Modal */}
      {isZoomModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#161618] rounded-3xl border border-gray-200/40 dark:border-white/10 shadow-2xl flex flex-col items-center p-5 sm:p-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedColor?.name} • Ảnh chi tiết độ phân giải cao
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Stage */}
            <div className="w-full flex-1 min-h-[340px] max-h-[540px] flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none">
              <img
                src={activeImage}
                alt={product.name}
                className="max-w-full max-h-[480px] object-contain drop-shadow-xl transition-all duration-300"
              />
            </div>

            {/* Modal Thumbnail Strip */}
            {allGalleryImages.length > 1 && (
              <div className="flex items-center gap-2.5 pt-4 border-t border-gray-100 dark:border-white/10 overflow-x-auto max-w-full scrollbar-none">
                {allGalleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl p-1.5 border transition-all shrink-0 flex items-center justify-center ${
                      activeImage === img
                        ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-white/5'
                        : 'border-gray-200 dark:border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

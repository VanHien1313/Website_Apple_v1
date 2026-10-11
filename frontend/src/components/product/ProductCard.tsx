import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { Product, ProductColor, ProductVariant } from '../../types/product';
import { formatCurrency, calculateDiscountPercent } from '../../utils/formatters';
import { useCart } from '../../store/CartContext';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0]);
  const [hoveredColor, setHoveredColor] = useState<ProductColor | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [isAdded, setIsAdded] = useState(false);

  // Active preview image
  const activeImage = hoveredColor?.image || selectedColor?.image || product.thumbnail;

  // Active pricing based on selected variant
  const currentPrice = selectedVariant?.price || product.basePrice;
  const currentOriginalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const hasDiscount = Boolean(currentOriginalPrice && currentOriginalPrice > currentPrice);
  const discountPercent = hasDiscount && currentOriginalPrice
    ? calculateDiscountPercent(currentPrice, currentOriginalPrice)
    : 0;

  // Dynamic name with selected capacity (e.g. iPhone 16 Pro Max 256GB)
  const variantCapacity = selectedVariant?.storage || selectedVariant?.screenSize || '';
  const displayName = variantCapacity && !product.name.includes(variantCapacity)
    ? `${product.name} ${variantCapacity}`
    : product.name;

  // Extract screen and display specs for TGDD-style tags
  const screenTags = (() => {
    const screenSpec = product.keySpecs.find((s) => s.label.includes('Màn hình'))?.value || '';
    const tags: string[] = [];

    // Screen Technology
    if (screenSpec.includes('Super Retina XDR') || product.category === 'iphone') {
      tags.push('Super Retina XDR');
    } else if (screenSpec.includes('Ultra Retina XDR')) {
      tags.push('Ultra Retina XDR');
    } else if (screenSpec.includes('Liquid Retina XDR')) {
      tags.push('Liquid Retina XDR');
    } else if (screenSpec.includes('Liquid Retina')) {
      tags.push('Liquid Retina');
    } else if (product.category === 'watch') {
      tags.push('Always-On OLED');
    }

    // Screen Size
    const sizeMatch = screenSpec.match(/(\d+(?:\.\d+)?)\s*(?:inch|\")/);
    if (sizeMatch) {
      tags.push(`${sizeMatch[1]}"`);
    } else if (selectedVariant?.screenSize) {
      tags.push(selectedVariant.screenSize);
    }

    return tags.slice(0, 2);
  })();

  // Formatted sales count (TGDD: "Đã bán 25,1k")
  const soldCountFormatted = (() => {
    const count = (product.reviewCount || 100) * 85;
    return count > 1000 ? `${(count / 1000).toFixed(1).replace('.', ',')}k` : count.toString();
  })();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, selectedVariant, selectedColor, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  return (
    <div className="group relative flex flex-col justify-between bg-white dark:bg-[#161618] rounded-2xl border border-gray-200/80 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/25 hover:shadow-card-hover transition-all duration-300 p-3.5 sm:p-4">
      {/* Product Image Canvas (TGDD High-Visibility Large Duo Shot) */}
      <Link
        to={`/product/${product.slug}`}
        className="relative w-full flex items-center justify-center p-1 sm:p-2 pt-2 pb-2 select-none group/canvas"
      >
        <div className="w-full h-[210px] sm:h-[235px] flex items-center justify-center relative">
          <img
            src={activeImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover/canvas:scale-105"
          />
        </div>
      </Link>

      {/* Content Container Below Image */}
      <div className="flex-1 flex flex-col justify-between mt-2">
        <div>
          {/* Badge Tag (TGDD: "Trả chậm 0%") */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded">
              Trả chậm 0%
            </span>
            {product.badge && (
              <span className="text-[10px] sm:text-[11px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                {product.badge}
              </span>
            )}
          </div>

          {/* Product Title */}
          <Link to={`/product/${product.slug}`}>
            <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 dark:text-white mt-1.5 hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
              {displayName}
            </h3>
          </Link>

          {/* Screen / Display Spec Badges */}
          {screenTags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {screenTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/10 px-1.5 py-0.5 rounded font-normal"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Variant Storage Pills */}
          {product.variants.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
              {product.variants.slice(0, 4).map((v) => {
                const label = v.storage || v.screenSize || 'Tiêu chuẩn';
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedVariant(v);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                      isSelected
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-400 bg-white dark:bg-transparent'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Color Circles */}
          {product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {product.colors.map((color) => {
                const isSelected = selectedColor.id === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedColor(color);
                    }}
                    onMouseEnter={() => setHoveredColor(color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    aria-label={color.name}
                    title={color.name}
                    className={`w-3.5 h-3.5 rounded-full transition-transform border border-black/15 dark:border-white/20 ${
                      isSelected
                        ? 'ring-2 ring-blue-500 scale-110'
                        : 'hover:scale-110 opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing, Rating & Action */}
        <div className="mt-3 pt-2">
          {/* Price Row (Red bold price) */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-bold text-red-600 dark:text-red-500 tabular-nums tracking-tight">
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && currentOriginalPrice && (
              <span className="text-xs text-gray-400 dark:text-gray-500 line-through tabular-nums">
                {formatCurrency(currentOriginalPrice)}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Rating & Sales */}
          <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span className="text-amber-500 font-bold text-xs flex items-center gap-0.5">
                ★ {product.rating.toFixed(1)}
              </span>
              <span>•</span>
              <span className="text-[11px]">Đã bán {soldCountFormatted}</span>
            </div>

            <Link
              to={`/product/${product.slug}`}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium flex items-center gap-0.5"
            >
              <span>+ So sánh</span>
            </Link>
          </div>

          {/* Action Row */}
          <div className="mt-2.5 grid grid-cols-5 gap-1.5">
            <Link
              to={`/product/${product.slug}`}
              className="col-span-4 py-1.5 px-2 text-center text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white transition-colors flex items-center justify-center"
            >
              Xem chi tiết
            </Link>

            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label="Thêm vào giỏ hàng"
              title="Thêm nhanh vào giỏ"
              className={`col-span-1 rounded-lg flex items-center justify-center transition-all ${
                isAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white'
              }`}
            >
              {isAdded ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 stroke-[1.8]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

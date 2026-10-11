import React from 'react';
import { formatCurrency, calculateDiscountPercent } from '../../utils/formatters';

export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountBadge?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  size = 'md',
  showDiscountBadge = true,
  className = '',
}) => {
  const hasDiscount = Boolean(originalPrice && originalPrice > price);
  const discountPercent = hasDiscount && originalPrice ? calculateDiscountPercent(price, originalPrice) : 0;

  const sizeClasses = {
    sm: {
      price: 'text-[15px] font-bold text-primary',
      original: 'text-xs text-secondary/70 line-through',
      badge: 'text-[11px] px-1.5 py-0.5',
    },
    md: {
      price: 'text-base font-bold text-primary',
      original: 'text-xs text-secondary/70 line-through',
      badge: 'text-xs px-2 py-0.5',
    },
    lg: {
      price: 'text-xl font-bold text-primary',
      original: 'text-sm text-secondary/70 line-through',
      badge: 'text-xs px-2 py-0.5',
    },
    xl: {
      price: 'text-2xl sm:text-3xl font-bold text-primary tracking-tight',
      original: 'text-base text-secondary/70 line-through',
      badge: 'text-xs font-semibold px-2.5 py-1',
    },
  }[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className={`tabular-nums font-bold tracking-tight text-primary ${sizeClasses.price}`}>
          {formatCurrency(price)}
        </span>
      </div>

      {hasDiscount && originalPrice && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`tabular-nums font-normal ${sizeClasses.original}`}>
            {formatCurrency(originalPrice)}
          </span>
          {showDiscountBadge && discountPercent > 0 && (
            <span
              className={`font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-full ${sizeClasses.badge}`}
            >
              -{discountPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

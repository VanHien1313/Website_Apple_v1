import React from 'react';
import { ProductColor } from '../../types/product';

export interface ColorSwatchesProps {
  colors: ProductColor[];
  selectedColorId?: string;
  onSelectColor?: (color: ProductColor) => void;
  onHoverColor?: (color: ProductColor) => void;
  onHoverEnd?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ColorSwatches: React.FC<ColorSwatchesProps> = ({
  colors,
  selectedColorId,
  onSelectColor,
  onHoverColor,
  onHoverEnd,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="radiogroup" aria-label="Màu sắc sản phẩm">
      {colors.map((color) => {
        const isSelected = selectedColorId === color.id;

        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color.name}
            title={color.name}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor?.(color);
            }}
            onMouseEnter={() => onHoverColor?.(color)}
            onMouseLeave={() => onHoverEnd?.()}
            className={`group relative rounded-full p-0.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSelected
                ? 'ring-2 ring-primary ring-offset-1 scale-110'
                : 'hover:scale-110 ring-1 ring-black/10'
            }`}
          >
            <span
              className={`block rounded-full shadow-inner ${sizeClasses}`}
              style={{ backgroundColor: color.hex }}
            />
          </button>
        );
      })}
    </div>
  );
};

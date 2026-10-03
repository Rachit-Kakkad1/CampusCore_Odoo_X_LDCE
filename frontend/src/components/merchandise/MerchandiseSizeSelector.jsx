// frontend/src/components/merchandise/MerchandiseSizeSelector.jsx
import React from 'react';

/**
 * MerchandiseSizeSelector Component
 * Displays available size variants with real-time stock counters.
 * Prevents selection of out-of-stock sizes.
 *
 * @param {Object} props
 * @param {Array<{ id: number, size: string, stock: number }>} props.sizes
 * @param {Object|null} props.selectedSize
 * @param {Function} props.onSelectSize
 */
export const MerchandiseSizeSelector = ({
  sizes = [],
  selectedSize,
  onSelectSize,
}) => {
  if (!sizes || sizes.length === 0) {
    return (
      <div className="font-mono text-xs text-[#1c1c1c]/50">
        No size variants available.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
          Select Size Variant:
        </span>
        {selectedSize && (
          <span className="font-mono text-[10px] text-[#5F3F56] font-semibold">
            {selectedSize.stock > 0
              ? `${selectedSize.stock} in stock`
              : 'Out of stock'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const isSelected = selectedSize?.id === s.id;
          const isOutOfStock = Number(s.stock) <= 0;
          const isLowStock = Number(s.stock) === 1;

          return (
            <button
              key={s.id || s.size}
              type="button"
              disabled={isOutOfStock}
              onClick={() => onSelectSize(s)}
              className={`min-w-[48px] px-3 py-2 border text-center font-mono text-xs transition-all duration-200 relative ${
                isOutOfStock
                  ? 'border-[#e5e4de] bg-[#f7f6f2] text-[#1c1c1c]/30 cursor-not-allowed line-through'
                  : isSelected
                  ? 'border-[#5F3F56] bg-[#5F3F56] text-white font-bold shadow-none'
                  : 'border-[#e5e4de] bg-white/70 text-[#1c1c1c] hover:border-[#5F3F56]/60 hover:bg-white'
              }`}
              title={
                isOutOfStock
                  ? `Size ${s.size} is out of stock`
                  : `Size ${s.size} (${s.stock} available)`
              }
            >
              <span>{s.size}</span>
              {isLowStock && !isOutOfStock && (
                <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MerchandiseSizeSelector;

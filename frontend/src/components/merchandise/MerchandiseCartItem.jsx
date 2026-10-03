// frontend/src/components/merchandise/MerchandiseCartItem.jsx
import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

export const MerchandiseCartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  isActiveMember = false,
}) => {
  const unitPrice = parseFloat(item.unit_price) || 0;
  const effectiveUnitPrice = isActiveMember ? unitPrice * 0.9 : unitPrice;
  const lineTotal = (effectiveUnitPrice * item.quantity).toFixed(2);

  return (
    <div className="border border-[#e5e4de] bg-[#f7f6f2] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Product Details */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-serif text-lg text-[#1c1c1c]">
            {item.product_name}
          </h4>
          <span className="font-mono text-xs uppercase px-2 py-0.5 border border-[#e5e4de] bg-white text-[#5F3F56] font-semibold">
            Size: {item.size}
          </span>
        </div>
        <div className="font-mono text-xs text-[#1c1c1c]/60">
          Unit Price: ₹{unitPrice.toFixed(2)}
          {isActiveMember && (
            <span className="text-[#5F3F56] ml-2">(10% Member Rate: ₹{(unitPrice * 0.9).toFixed(2)})</span>
          )}
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-6">
        {/* Quantity Stepper */}
        <div className="flex items-center border border-[#e5e4de] bg-white">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_size_id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="px-2 py-1 text-[#1c1c1c] hover:bg-[#f7f6f2] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-3 font-mono text-xs font-semibold text-[#1c1c1c]">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_size_id, item.quantity + 1)}
            disabled={item.max_stock && item.quantity >= item.max_stock}
            className="px-2 py-1 text-[#1c1c1c] hover:bg-[#f7f6f2] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Line Item Total */}
        <div className="text-right min-w-[80px]">
          <span className="font-mono text-sm font-bold text-[#1c1c1c] block">
            ₹{lineTotal}
          </span>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(item.product_size_id)}
          className="text-[#1c1c1c]/40 hover:text-red-700 p-1 transition-colors"
          title="Remove from cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MerchandiseCartItem;

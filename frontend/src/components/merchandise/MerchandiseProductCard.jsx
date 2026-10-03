// frontend/src/components/merchandise/MerchandiseProductCard.jsx
import React, { useState } from 'react';
import MerchandiseSizeSelector from './MerchandiseSizeSelector';
import { ActionButton } from '../dashboard/ActionButton';
import { ShoppingBag, Check, Plus, Minus, Tag } from 'lucide-react';

export const MerchandiseProductCard = ({
  product,
  onAddToCart,
  isActiveMember = false,
}) => {
  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.find((s) => Number(s.stock) > 0) || product.sizes?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const rawPrice = parseFloat(product.price) || 0;
  const memberDiscountRate = 0.10;
  const discountedPrice = (rawPrice * (1 - memberDiscountRate)).toFixed(2);
  const isOutOfStock = !product.sizes || product.sizes.every((s) => Number(s.stock) <= 0);
  const maxStock = selectedSize ? Number(selectedSize.stock) : 0;

  const handleSizeChange = (sizeObj) => {
    setSelectedSize(sizeObj);
    if (quantity > sizeObj.stock) {
      setQuantity(Math.max(1, sizeObj.stock));
    }
  };

  const handleIncrement = () => {
    if (quantity < maxStock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAdd = () => {
    if (!selectedSize || maxStock <= 0) return;
    onAddToCart?.({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      product_size_id: selectedSize.id,
      size: selectedSize.size,
      unit_price: rawPrice,
      quantity: quantity,
      max_stock: maxStock,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  return (
    <div className="border border-[#e5e4de] bg-[#f7f6f2] p-6 flex flex-col justify-between hover:border-[#5F3F56]/40 transition-all duration-300">
      <div className="space-y-4">
        {/* Product Image / Illustration Placeholder */}
        <div className="aspect-[4/3] w-full bg-white/60 border border-[#e5e4de] flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="w-16 h-16 border border-[#e5e4de] flex items-center justify-center font-serif text-2xl text-[#5F3F56]">
            {product.name.charAt(0)}
          </div>
          <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 mt-3 tracking-widest">
            CampusCore Apparel Co.
          </span>

          {isActiveMember && (
            <div className="absolute top-2 right-2 bg-[#5F3F56] text-white px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              <span>10% Member Off</span>
            </div>
          )}
        </div>

        {/* Product Details Header */}
        <div>
          <h3 className="font-serif text-2xl text-[#1c1c1c] tracking-tight">
            {product.name}
          </h3>
          <p className="font-sans text-xs text-[#1c1c1c]/70 mt-1 line-clamp-2 leading-relaxed">
            {product.description || 'Official CampusCore Student Organization merchandise item.'}
          </p>
        </div>

        {/* Pricing */}
        <div className="pt-2 pb-1 border-y border-[#e5e4de]">
          <div className="flex items-baseline gap-2">
            {isActiveMember ? (
              <>
                <span className="font-mono text-2xl font-bold text-[#5F3F56]">
                  ₹{discountedPrice}
                </span>
                <span className="font-mono text-xs line-through text-[#1c1c1c]/40">
                  ₹{rawPrice.toFixed(2)}
                </span>
                <span className="font-mono text-[10px] text-[#5F3F56] uppercase font-semibold">
                  (Member Price)
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-2xl font-bold text-[#1c1c1c]">
                  ₹{rawPrice.toFixed(2)}
                </span>
                <span className="font-mono text-[10px] text-[#1c1c1c]/50 uppercase">
                  Standard Rate
                </span>
              </>
            )}
          </div>
        </div>

        {/* Size Selection */}
        <MerchandiseSizeSelector
          sizes={product.sizes || []}
          selectedSize={selectedSize}
          onSelectSize={handleSizeChange}
        />

        {/* Quantity Controls */}
        {selectedSize && maxStock > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/60">
              Quantity:
            </span>
            <div className="flex items-center border border-[#e5e4de] bg-white/70">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="px-2.5 py-1 text-[#1c1c1c] hover:bg-[#f7f6f2] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-3 font-mono text-xs font-semibold text-[#1c1c1c]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxStock}
                className="px-2.5 py-1 text-[#1c1c1c] hover:bg-[#f7f6f2] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add To Cart CTA */}
      <div className="pt-6">
        <ActionButton
          variant={addedAnimation ? 'secondary' : 'primary'}
          className="w-full justify-center"
          onClick={handleAdd}
          disabled={isOutOfStock || !selectedSize || maxStock <= 0}
        >
          {addedAnimation ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-700" />
              <span>Added to Cart</span>
            </>
          ) : isOutOfStock || maxStock <= 0 ? (
            <span>Sold Out</span>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart (₹{( (isActiveMember ? rawPrice * 0.9 : rawPrice) * quantity).toFixed(2)})</span>
            </>
          )}
        </ActionButton>
      </div>
    </div>
  );
};

export default MerchandiseProductCard;

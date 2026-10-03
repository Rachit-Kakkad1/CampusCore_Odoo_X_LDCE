// frontend/src/components/merchandise/MerchandiseCart.jsx
import React from 'react';
import MerchandiseCartItem from './MerchandiseCartItem';
import { ActionButton } from '../dashboard/ActionButton';
import { DashboardEmptyState } from '../dashboard/DashboardEmptyState';
import { ShoppingBag, ArrowRight, Tag } from 'lucide-react';

export const MerchandiseCart = ({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  isActiveMember = false,
  onContinueShopping,
}) => {
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (parseFloat(item.unit_price) || 0) * item.quantity,
    0
  );

  const memberDiscount = isActiveMember ? subtotal * 0.10 : 0.00;
  const total = Math.max(0, subtotal - memberDiscount);

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardEmptyState
          title="Your Cart is Empty"
          description="You haven't added any official CampusCore merchandise or apparel to your cart yet."
        />
        <div className="text-center">
          <ActionButton variant="primary" onClick={onContinueShopping}>
            Browse Store Catalog
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cart Items List */}
      <div className="space-y-3">
        {cartItems.map((item) => (
          <MerchandiseCartItem
            key={item.product_size_id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveItem}
            isActiveMember={isActiveMember}
          />
        ))}
      </div>

      {/* Cart Summary Card */}
      <div className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-4 max-w-lg ml-auto">
        <div className="flex items-center justify-between border-b border-[#e5e4de] pb-3">
          <span className="font-mono text-xs uppercase tracking-wider text-[#1c1c1c]/70 font-semibold">
            Order Summary
          </span>
          <span className="font-mono text-xs text-[#1c1c1c]/50">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs text-[#1c1c1c]/80">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          {isActiveMember ? (
            <div className="flex justify-between text-[#5F3F56] font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>10% Active Member Discount</span>
              </span>
              <span>-₹{memberDiscount.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-[#1c1c1c]/50 text-[11px]">
              <span>Member Discount</span>
              <span>₹0.00 (Standard rate)</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Estimated Shipping / Campus Pickup</span>
            <span>FREE</span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#e5e4de] flex justify-between items-baseline">
          <span className="font-mono text-sm uppercase font-bold text-[#1c1c1c]">
            Total Estimated:
          </span>
          <span className="font-mono text-2xl font-bold text-[#5F3F56]">
            ₹{total.toFixed(2)}
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <ActionButton
            variant="secondary"
            className="w-full justify-center"
            onClick={onContinueShopping}
          >
            Continue Shopping
          </ActionButton>
          <ActionButton
            variant="primary"
            className="w-full justify-center"
            onClick={onProceedToCheckout}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default MerchandiseCart;

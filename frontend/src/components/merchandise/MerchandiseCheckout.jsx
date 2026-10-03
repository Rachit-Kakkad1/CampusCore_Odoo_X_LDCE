// frontend/src/components/merchandise/MerchandiseCheckout.jsx
import React, { useState } from 'react';
import { ActionButton } from '../dashboard/ActionButton';
import merchandiseService from '../../services/merchandise.service';
import authService from '../../services/auth.service';
import { ShieldCheck, AlertCircle, ArrowLeft, ArrowRight, Lock } from 'lucide-react';

export const MerchandiseCheckout = ({
  cartItems = [],
  isActiveMember = false,
  onCancel,
  onOrderCreated,
}) => {
  const user = authService.getStoredUser();
  const isAuthenticated = authService.isAuthenticated();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkoutSessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (parseFloat(item.unit_price) || 0) * item.quantity,
    0
  );
  const memberDiscount = isActiveMember ? subtotal * 0.10 : 0.00;
  const total = Math.max(0, subtotal - memberDiscount);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      setError('Please sign in with your organization account to place an order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itemsPayload = cartItems.map((item) => ({
        product_size_id: item.product_size_id,
        quantity: item.quantity,
      }));

      // Create the real pending order through the backend API
      const res = await merchandiseService.createOrder({
        items: itemsPayload,
        checkoutSessionId,
      });

      const orderData = res?.data || res;
      onOrderCreated?.(orderData);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to create order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-[#e5e4de] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
            Step 1 of 2 · Review & Order Creation
          </span>
          <h2 className="font-serif text-3xl text-[#1c1c1c]">
            Confirm Order Details
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs text-[#1c1c1c]/60 hover:text-[#1c1c1c] flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer Information */}
      <div className="border border-[#e5e4de] bg-[#f7f6f2] p-5 space-y-2">
        <span className="font-mono text-[10px] uppercase text-[#1c1c1c]/50 tracking-wider block">
          Customer Identity
        </span>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs">
          <span className="font-bold text-[#1c1c1c]">
            {user?.name || 'Guest Customer'} ({user?.email || 'unauthenticated'})
          </span>
          <span className="text-[#5F3F56]">
            Status: {isActiveMember ? 'Active Member (10% Discount Applied)' : 'Non-Member Rate'}
          </span>
        </div>
      </div>

      {/* Itemized Breakdown Table */}
      <div className="border border-[#e5e4de] bg-white/70 overflow-hidden">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#e5e4de] bg-[#f7f6f2] text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
              <th className="p-3">Item</th>
              <th className="p-3">Size</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e4de]">
            {cartItems.map((item, idx) => (
              <tr key={idx}>
                <td className="p-3 font-medium text-[#1c1c1c]">
                  {item.product_name}
                </td>
                <td className="p-3 text-[#1c1c1c]/70">{item.size}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">
                  ₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="border border-[#e5e4de] bg-[#f7f6f2] p-5 space-y-2 font-mono text-xs">
        <div className="flex justify-between text-[#1c1c1c]/70">
          <span>Items Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        {isActiveMember && (
          <div className="flex justify-between text-[#5F3F56] font-semibold">
            <span>Active Member Discount (10%)</span>
            <span>-₹{memberDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-[#e5e4de] flex justify-between items-baseline text-sm font-bold text-[#1c1c1c]">
          <span>Order Total:</span>
          <span className="text-xl text-[#5F3F56]">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notice & CTA */}
      <div className="space-y-4">
        <p className="font-mono text-[11px] text-[#1c1c1c]/60 leading-relaxed">
          * Placing this order logs a pending transaction. In accordance with system inventory rules, inventory is atomically secured upon payment execution in the next step.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <ActionButton variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handlePlaceOrder}
            disabled={loading}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Creating Order...' : 'Generate Pending Order'}</span>
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default MerchandiseCheckout;

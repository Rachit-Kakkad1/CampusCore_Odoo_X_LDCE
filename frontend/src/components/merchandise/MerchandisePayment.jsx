// frontend/src/components/merchandise/MerchandisePayment.jsx
import React, { useState } from 'react';
import { ActionButton } from '../dashboard/ActionButton';
import merchandiseService from '../../services/merchandise.service';
import { CheckCircle2, AlertCircle, CreditCard, ArrowRight, RefreshCw } from 'lucide-react';

export const MerchandisePayment = ({
  order,
  onSuccess,
  onCancel,
}) => {
  const [paymentMode, setPaymentMode] = useState('online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);

  const orderTotal = Number(order?.total || 0).toFixed(2);
  const orderSubtotal = Number(order?.subtotal || 0).toFixed(2);
  const orderDiscount = Number(order?.discount || 0).toFixed(2);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await merchandiseService.payOrder(order.id, paymentMode);
      const paidData = res?.data || res;
      setPaidOrder(paidData);
      onSuccess?.(paidData);
    } catch (err) {
      console.error('Payment error:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Payment execution failed. Please verify stock or try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto border border-[#e5e4de] bg-[#f7f6f2] p-8 space-y-6">
      {/* Success State */}
      {paidOrder ? (
        <div className="text-center space-y-6 py-4">
          <div className="w-14 h-14 bg-green-100 border border-green-300 text-green-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
              Payment Confirmed & Stock Allocated
            </span>
            <h3 className="font-serif text-3xl text-[#1c1c1c]">
              Order #{paidOrder.order_code || order.order_code}
            </h3>
            <p className="font-sans text-sm text-[#1c1c1c]/70 mt-2">
              Thank you! Your payment has been settled and store inventory decremented atomically.
            </p>
          </div>

          <div className="bg-white/80 border border-[#e5e4de] p-4 text-left font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#1c1c1c]/60">PAYMENT STATUS:</span>
              <span className="font-bold text-green-700 uppercase">PAID (COMPLETED)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#1c1c1c]/60">PAYMENT MODE:</span>
              <span className="text-[#1c1c1c] uppercase">{paymentMode}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-[#e5e4de]">
              <span>TOTAL SETTLED:</span>
              <span className="text-[#5F3F56]">₹{orderTotal}</span>
            </div>
          </div>

          <div className="pt-2">
            <ActionButton
              variant="primary"
              className="w-full justify-center"
              onClick={() => onSuccess?.(paidOrder)}
            >
              <span>View in Order History</span>
              <ArrowRight className="w-4 h-4" />
            </ActionButton>
          </div>
        </div>
      ) : (
        /* Pending Payment Screen */
        <div className="space-y-6">
          <div className="border-b border-[#e5e4de] pb-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[#5F3F56] font-semibold block mb-1">
              Step 2 of 2 · Payment Gateway
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#1c1c1c]">
              Settle Pending Order
            </h3>
            <span className="font-mono text-xs text-[#1c1c1c]/60 block mt-1">
              Order Code: {order.order_code}
            </span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-white/70 border border-[#e5e4de] p-4 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-[#1c1c1c]/70">
              <span>Subtotal:</span>
              <span>₹{orderSubtotal}</span>
            </div>
            {Number(orderDiscount) > 0 && (
              <div className="flex justify-between text-[#5F3F56] font-semibold">
                <span>Member Discount Applied:</span>
                <span>-₹{orderDiscount}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#e5e4de] flex justify-between font-bold text-sm text-[#1c1c1c]">
              <span>Amount Due:</span>
              <span className="text-[#5F3F56] text-lg">₹{orderTotal}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block font-mono text-xs uppercase text-[#1c1c1c]/70">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['online', 'upi', 'card', 'cash'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`p-3 border text-left font-mono text-xs uppercase tracking-wider transition-all ${
                    paymentMode === mode
                      ? 'border-[#5F3F56] bg-[#5F3F56]/10 text-[#5F3F56] font-bold'
                      : 'border-[#e5e4de] bg-white/70 text-[#1c1c1c]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#e5e4de] flex justify-end gap-3">
            <ActionButton
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel / Pay Later
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={handlePay}
              disabled={loading}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{loading ? 'Processing Payment...' : `Confirm & Pay ₹${orderTotal}`}</span>
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchandisePayment;

// frontend/src/components/merchandise/MerchandiseOrderCard.jsx
import React from 'react';
import { StatusBadge } from '../dashboard/StatusBadge';
import { ActionButton } from '../dashboard/ActionButton';

export const MerchandiseOrderCard = ({ order, onPayOrder }) => {
  const subtotal = Number(order.subtotal || 0).toFixed(2);
  const discount = Number(order.discount || 0).toFixed(2);
  const total = Number(order.total || 0).toFixed(2);
  const isPending = order.payment_status === 'pending';
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return (
    <div className="border border-[#e5e4de] bg-[#f7f6f2] p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e4de]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#1c1c1c] tracking-wider">
              {order.order_code}
            </span>
            <StatusBadge status={order.payment_status || 'paid'} />
          </div>
          <span className="font-mono text-[11px] text-[#1c1c1c]/50 block mt-0.5">
            Placed on {orderDate}
          </span>
        </div>

        <div className="text-left sm:text-right">
          <span className="font-mono text-lg font-bold text-[#5F3F56]">
            ₹{total}
          </span>
          {Number(discount) > 0 && (
            <span className="font-mono text-[10px] text-green-700 block">
              10% Member discount applied (-₹{discount})
            </span>
          )}
        </div>
      </div>

      {/* Ordered Items Grid */}
      {order.items && order.items.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#1c1c1c]/50 block">
            Item Breakdown ({order.items.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-white/70 border border-[#e5e4de] p-3 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-[#1c1c1c] block">
                    {item.product_name || `Product #${item.product_id}`}
                  </span>
                  <span className="text-[#1c1c1c]/60 text-[11px]">
                    Size: {item.size} · Qty: {item.quantity}
                  </span>
                </div>
                <span className="text-[#1c1c1c] font-semibold">
                  ₹{Number(item.price_at_purchase * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Pending Actions */}
      {isPending && (
        <div className="pt-3 border-t border-[#e5e4de] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-3">
          <span className="font-mono text-xs text-amber-900">
            Payment pending. Stock is reserved upon payment confirmation.
          </span>
          <ActionButton
            variant="primary"
            size="sm"
            onClick={() => onPayOrder?.(order)}
          >
            Pay Now (₹{total})
          </ActionButton>
        </div>
      )}
    </div>
  );
};

export default MerchandiseOrderCard;

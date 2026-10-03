// frontend/src/components/dashboard/member/MemberOrderSection.jsx
import React from 'react';
import { DashboardSection } from '../DashboardSection';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';

export const MemberOrderSection = ({ orders = [], loading = false }) => {
  if (loading) {
    return (
      <DashboardSection
        title="My Merchandise Orders"
        subtitle="Official organization apparel, accessories and gear purchases"
      >
        <div className="h-32 bg-[#f7f6f2] border border-[#e5e4de] animate-pulse"></div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="My Merchandise Orders"
      subtitle="Official organization apparel, accessories and gear purchases"
    >
      {orders.length === 0 ? (
        <DashboardEmptyState
          title="No Merchandise Orders"
          description="You haven't ordered any official CampusCore merchandise yet. Browse the club store to order apparel with member discounts."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const subtotal = Number(order.subtotal || 0).toFixed(2);
            const discount = Number(order.discount || 0).toFixed(2);
            const total = Number(order.total || 0).toFixed(2);
            const orderDate = order.created_at
              ? new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={order.id}
                className="bg-[#f7f6f2] border border-[#e5e4de] p-5 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5e4de]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#1c1c1c] tracking-wider">
                        {order.order_code}
                      </span>
                      <StatusBadge status={order.payment_status || 'paid'} />
                    </div>
                    <span className="font-mono text-xs text-[#1c1c1c]/50 block mt-0.5">
                      Placed on {orderDate}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="font-mono text-base font-bold text-[#5F3F56]">
                      ₹{total}
                    </span>
                    {Number(discount) > 0 && (
                      <span className="font-mono text-[10px] text-green-700 block">
                        Member discount: -₹{discount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Breakdown */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#1c1c1c]/50 block">
                      Ordered Items ({order.items.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white/60 border border-[#e5e4de] p-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-medium text-[#1c1c1c] block">
                              {item.product_name || `Product #${item.product_id}`}
                            </span>
                            <span className="font-mono text-[11px] text-[#1c1c1c]/60">
                              Size: {item.size} · Qty: {item.quantity}
                            </span>
                          </div>
                          <span className="font-mono font-medium text-[#1c1c1c]">
                            ₹{Number(item.price_at_purchase * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardSection>
  );
};

export default MemberOrderSection;

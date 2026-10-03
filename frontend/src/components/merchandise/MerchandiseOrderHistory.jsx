// frontend/src/components/merchandise/MerchandiseOrderHistory.jsx
import React from 'react';
import MerchandiseOrderCard from './MerchandiseOrderCard';
import { DashboardEmptyState } from '../dashboard/DashboardEmptyState';

export const MerchandiseOrderHistory = ({
  orders = [],
  loading = false,
  onPayOrder,
  onBrowseStore,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-40 border border-[#e5e4de] bg-white/50 p-6 animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <DashboardEmptyState
        title="No Orders Found"
        description="You have not placed any merchandise orders yet. Browse the official catalog to purchase club hoodies and apparel."
        actionLabel="Browse Catalog"
        onAction={onBrowseStore}
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <MerchandiseOrderCard
          key={order.id}
          order={order}
          onPayOrder={onPayOrder}
        />
      ))}
    </div>
  );
};

export default MerchandiseOrderHistory;

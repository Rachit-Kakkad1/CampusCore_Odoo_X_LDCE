// frontend/src/components/merchandise/MerchandiseOrderHistory.jsx
import React, { useState } from 'react';
import MerchandiseOrderCard from './MerchandiseOrderCard';
import { DashboardEmptyState } from '../dashboard/DashboardEmptyState';
import Pagination from '../common/Pagination';

export const MerchandiseOrderHistory = ({
  orders = [],
  loading = false,
  onPayOrder,
  onBrowseStore,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {paginatedOrders.map((order) => (
          <MerchandiseOrderCard
            key={order.id}
            order={order}
            onPayOrder={onPayOrder}
          />
        ))}
      </div>

      {orders.length > pageSize && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(orders.length / pageSize)}
          totalItems={orders.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20]}
        />
      )}
    </div>
  );
};

export default MerchandiseOrderHistory;

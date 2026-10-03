// frontend/src/components/merchandise/MerchandiseProductGrid.jsx
import React from 'react';
import MerchandiseProductCard from './MerchandiseProductCard';
import { DashboardEmptyState } from '../dashboard/DashboardEmptyState';

export const MerchandiseProductGrid = ({
  products = [],
  onAddToCart,
  isActiveMember = false,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-96 border border-[#e5e4de] bg-white/50 p-6 animate-pulse space-y-4"
          >
            <div className="aspect-[4/3] bg-[#e5e4de]/60 w-full"></div>
            <div className="h-6 w-3/4 bg-[#e5e4de]"></div>
            <div className="h-4 w-1/2 bg-[#e5e4de]"></div>
            <div className="h-10 w-full bg-[#e5e4de]/40"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <DashboardEmptyState
        title="No Merchandise Available"
        description="The organization store catalog is currently empty. Check back soon for new arrivals."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <MerchandiseProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          isActiveMember={isActiveMember}
        />
      ))}
    </div>
  );
};

export default MerchandiseProductGrid;

// frontend/src/components/dashboard/admin/AdminMerchandiseManagement.jsx
import React, { useState } from 'react';
import AdminProductList from '../../merchandise/AdminProductList';
import AdminProductForm from '../../merchandise/AdminProductForm';
import { StatusBadge } from '../StatusBadge';
import { ActionButton } from '../ActionButton';
import { Plus } from 'lucide-react';

export const AdminMerchandiseManagement = ({
  products = [],
  orders = [],
  loading = false,
  onUpdateStock,
  onProductCreated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl text-[#1c1c1c]">Store Catalog & Live Inventory</h3>
          <span className="font-mono text-xs text-[#1c1c1c]/60">
            {products.length} products with size variants
          </span>
        </div>
        <ActionButton
          variant="primary"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add New Product</span>
        </ActionButton>
      </div>

      {/* Add Product Modal Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8">
            <AdminProductForm
              onProductCreated={(p) => {
                setShowAddForm(false);
                onProductCreated?.(p);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Live Size Inventory Grid */}
      <AdminProductList
        products={products}
        onUpdateStock={onUpdateStock}
        loading={loading}
      />

      {/* Customer Orders Audit Section */}
      <div className="pt-6 border-t border-[#e5e4de] space-y-4">
        <div>
          <h4 className="font-serif text-xl text-[#1c1c1c]">Recent Store Orders</h4>
          <span className="font-mono text-xs text-[#1c1c1c]/60">
            {orders.length} total customer purchases recorded
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
            No customer orders placed yet.
          </div>
        ) : (
          <div className="border border-[#e5e4de] bg-white/70 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e4de] bg-[#f7f6f2] text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
                  <th className="p-3">Order Code</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e4de]">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#f7f6f2]/50">
                    <td className="p-3 font-bold text-[#1c1c1c]">{ord.order_code}</td>
                    <td className="p-3 text-[#1c1c1c]/70">{ord.user_name || `User #${ord.user_id}`}</td>
                    <td className="p-3">₹{Number(ord.subtotal).toFixed(2)}</td>
                    <td className="p-3 text-[#5F3F56]">
                      {Number(ord.discount) > 0 ? `-₹${Number(ord.discount).toFixed(2)}` : '₹0.00'}
                    </td>
                    <td className="p-3 font-bold text-[#1c1c1c]">₹{Number(ord.total).toFixed(2)}</td>
                    <td className="p-3">
                      <StatusBadge status={ord.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMerchandiseManagement;

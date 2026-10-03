// frontend/src/components/dashboard/admin/AdminMerchandiseManagement.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminProductList from '../../merchandise/AdminProductList';
import AdminProductForm from '../../merchandise/AdminProductForm';
import { StatusBadge } from '../StatusBadge';
import { ThreeDCard } from '../charts/ThreeDCharts';
import {
  Plus,
  ShoppingBag,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  Search,
  ShoppingCart,
  Receipt,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const AdminMerchandiseManagement = ({
  products = [],
  orders = [],
  loading = false,
  onUpdateStock,
  onProductCreated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');

  // Computed metrics
  const totalProducts = products.length;
  const totalStockUnits = products.reduce((acc, p) => {
    const pStock = (p.sizes || []).reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0);
    return acc + pStock;
  }, 0);

  const inventoryValuation = products.reduce((acc, p) => {
    const pStock = (p.sizes || []).reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0);
    return acc + pStock * (parseFloat(p.price) || 0);
  }, 0);

  const totalOrdersRevenue = orders.reduce((acc, ord) => acc + (parseFloat(ord.total) || 0), 0);

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name && p.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. TOP 3D TELEMETRY CARDS                                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ThreeDCard
          className="p-6 border-l-4 border-l-primary"
          accentGlow="rgba(95, 63, 86, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Catalog Items
            </span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalProducts}
            </span>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-xs">
              Live Active
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>SKU variants live</span>
            <span className="font-mono text-[11px] text-slate-400">Inventory</span>
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-amber-600"
          accentGlow="rgba(217, 119, 6, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Units In Stock
            </span>
            <div className="w-8 h-8 rounded-sm bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalStockUnits}
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200">
              Physical
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Aggregated across sizes</span>
            <span className="font-mono text-[11px] text-slate-400">Warehouse</span>
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-emerald-600"
          accentGlow="rgba(5, 150, 105, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Catalog Valuation
            </span>
            <div className="w-8 h-8 rounded-sm bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ₹{inventoryValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs border border-emerald-200">
              Asset Value
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Retail value of stock</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </ThreeDCard>

        <ThreeDCard
          className="p-6 border-l-4 border-l-indigo-600"
          accentGlow="rgba(79, 70, 229, 0.2)"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Orders Processed
            </span>
            <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {orders.length}
            </span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-xs border border-indigo-200">
              ₹{totalOrdersRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
            <span>Total customer checkout</span>
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </ThreeDCard>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & ACTION HEADER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 border border-border shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search catalog by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-primary focus:bg-white font-mono transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. ADD PRODUCT MODAL                                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-4xl"
            >
              <AdminProductForm
                onProductCreated={(p) => {
                  setShowAddForm(false);
                  onProductCreated?.(p);
                }}
                onCancel={() => setShowAddForm(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. LIVE INVENTORY SIZE MATRIX GRID                                        */}
      {/* ========================================================================= */}
      <AdminProductList
        products={filteredProducts}
        onUpdateStock={onUpdateStock}
        loading={loading}
      />

      {/* ========================================================================= */}
      {/* 5. CUSTOMER ORDERS AUDIT SECTION                                          */}
      {/* ========================================================================= */}
      <div className="pt-6 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer Store Orders
            </h4>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Verified customer purchases & automated inventory deduction audit
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xs">
            {orders.length} total orders
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 border border-border bg-white text-center font-mono text-xs text-slate-500">
            No customer orders placed yet. As students and members place orders, transactions will register live here.
          </div>
        ) : (
          <div className="border border-border bg-white overflow-x-auto shadow-2xs">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-600">
                  <th className="p-3.5">Order Code</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">Discount</th>
                  <th className="p-3.5">Total Paid</th>
                  <th className="p-3.5">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{ord.order_code}</td>
                    <td className="p-3.5 text-slate-700">
                      {ord.user_name || `User #${ord.user_id}`}
                    </td>
                    <td className="p-3.5">₹{Number(ord.subtotal).toFixed(2)}</td>
                    <td className="p-3.5 text-primary font-semibold">
                      {Number(ord.discount) > 0 ? `-₹${Number(ord.discount).toFixed(2)}` : '₹0.00'}
                    </td>
                    <td className="p-3.5 font-bold text-emerald-700">₹{Number(ord.total).toFixed(2)}</td>
                    <td className="p-3.5">
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

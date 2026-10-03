// frontend/src/pages/dashboard/AdminMerchandisePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardPageHeader from '../../components/dashboard/DashboardPageHeader';
import DashboardStat from '../../components/dashboard/DashboardStat';
import DashboardSection from '../../components/dashboard/DashboardSection';
import { PageTabs } from '../../components/dashboard/PageTabs';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { ActionButton } from '../../components/dashboard/ActionButton';
import AdminProductList from '../../components/merchandise/AdminProductList';
import AdminProductForm from '../../components/merchandise/AdminProductForm';
import merchandiseService from '../../services/merchandise.service';
import { ShoppingBag, Package, AlertTriangle, ListOrdered, Plus } from 'lucide-react';

export const AdminMerchandisePage = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodRes, ordRes] = await Promise.all([
        merchandiseService.getProducts(),
        merchandiseService.getAllOrders().catch(() => ({ data: [] })),
      ]);

      const prodList = prodRes?.data || prodRes || [];
      const ordList = ordRes?.data || ordRes || [];

      setProducts(Array.isArray(prodList) ? prodList : []);
      setAllOrders(Array.isArray(ordList) ? ordList : []);
    } catch (err) {
      console.error('Failed to load admin merchandise data:', err);
      setError(err.message || 'Unable to load store data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStock = async (productId, size, stock) => {
    try {
      await merchandiseService.updateStock(productId, size, stock);
      setNotification({
        type: 'success',
        message: `Updated Size ${size} stock to ${stock} units.`,
      });
      await loadData();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update stock',
      });
    }
  };

  const handleProductCreated = async (newProduct) => {
    setShowAddModal(false);
    setNotification({
      type: 'success',
      message: `Created product "${newProduct.name}" successfully!`,
    });
    await loadData();
  };

  // Compute metrics
  const totalStockUnits = products.reduce((acc, p) => {
    const pStock = p.sizes?.reduce((sAcc, s) => sAcc + Number(s.stock || 0), 0) || 0;
    return acc + pStock;
  }, 0);

  const lowStockItems = products.filter((p) =>
    p.sizes?.some((s) => Number(s.stock) > 0 && Number(s.stock) <= 2)
  ).length;

  const tabs = [
    { id: 'inventory', label: 'Inventory by Size' },
    { id: 'orders', label: `Customer Orders (${allOrders.length})` },
  ];

  return (
    <DashboardShell activeRole="admin">
      <DashboardPageHeader
        title="Store & Merchandise Management"
        subtitle="Maintain catalog products, real-time size inventory, member pricing rules, and customer orders."
        badge="Catalog Operations"
        actionLabel="+ Add New Product"
        onAction={() => setShowAddModal(true)}
      />

      {notification && (
        <div
          className={`p-3.5 border font-mono text-xs mb-6 flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardStat
          label="Catalog Products"
          value={String(products.length)}
          change="Active items in store"
          icon={ShoppingBag}
        />
        <DashboardStat
          label="Total Units In Stock"
          value={String(totalStockUnits)}
          change="Across all size variants"
          icon={Package}
        />
        <DashboardStat
          label="Low Stock Variants"
          value={String(lowStockItems)}
          change="Items with <= 2 units"
          icon={AlertTriangle}
        />
        <DashboardStat
          label="Store Orders"
          value={String(allOrders.length)}
          change="Pending & settled orders"
          icon={ListOrdered}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Main Content Areas */}
      {activeTab === 'inventory' && (
        <DashboardSection
          title="Product Inventory by Size"
          subtitle="Modify and save stock allocations directly per size variant"
        >
          <AdminProductList
            products={products}
            onUpdateStock={handleUpdateStock}
            loading={loading}
          />
        </DashboardSection>
      )}

      {activeTab === 'orders' && (
        <DashboardSection
          title="Organization Store Orders"
          subtitle="Real-time order audit trail from members and guest customers"
        >
          {allOrders.length === 0 ? (
            <div className="p-8 border border-[#e5e4de] text-center font-mono text-xs text-[#1c1c1c]/60">
              No store orders recorded yet.
            </div>
          ) : (
            <div className="border border-[#e5e4de] bg-white/70 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e4de] bg-[#f7f6f2] text-[10px] uppercase tracking-wider text-[#1c1c1c]/60">
                    <th className="p-3">Order Code</th>
                    <th className="p-3">Customer (User ID)</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e4de]">
                  {allOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#f7f6f2]/50">
                      <td className="p-3 font-bold text-[#1c1c1c]">{ord.order_code}</td>
                      <td className="p-3 text-[#1c1c1c]/70">{ord.user_name || `User #${ord.user_id}`}</td>
                      <td className="p-3 text-[#1c1c1c]/70">{ord.items?.length || 0} items</td>
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
        </DashboardSection>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1c1c1c]/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8">
            <AdminProductForm
              onProductCreated={handleProductCreated}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminMerchandisePage;

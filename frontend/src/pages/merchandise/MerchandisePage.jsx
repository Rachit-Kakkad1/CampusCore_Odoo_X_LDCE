// frontend/src/pages/merchandise/MerchandisePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import MerchandiseProductGrid from '../../components/merchandise/MerchandiseProductGrid';
import MerchandiseCart from '../../components/merchandise/MerchandiseCart';
import MerchandiseCheckout from '../../components/merchandise/MerchandiseCheckout';
import MerchandisePayment from '../../components/merchandise/MerchandisePayment';
import MerchandiseOrderHistory from '../../components/merchandise/MerchandiseOrderHistory';
import { PageTabs } from '../../components/dashboard/PageTabs';
import merchandiseService from '../../services/merchandise.service';
import membershipService from '../../services/membership.service';
import authService from '../../services/auth.service';  
import { ShoppingBag, Tag, History, ArrowLeft, ShieldCheck } from 'lucide-react';






export const MerchandisePage = () => {
  const user = authService.getStoredUser();
  const isAuthenticated = authService.isAuthenticated();

  // Navigation State
  // 'catalog' | 'cart' | 'checkout' | 'payment' | 'history'
  const [view, setView] = useState('catalog');
  const [activeTab, setActiveTab] = useState('catalog');

  // Business Data States
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isActiveMember, setIsActiveMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart & Checkout States
  const [cartItems, setCartItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [notification, setNotification] = useState(null);

  // Load products and membership status
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodRes, memRes, ordRes] = await Promise.allSettled([
        merchandiseService.getProducts(),
        isAuthenticated ? membershipService.getMembership() : Promise.resolve(null),
        isAuthenticated ? merchandiseService.getMyOrders() : Promise.resolve({ data: [] }),
      ]);

      if (prodRes.status === 'fulfilled') {
        const pList = prodRes.value?.data || prodRes.value || [];
        setProducts(Array.isArray(pList) ? pList : []);
      }

      if (memRes.status === 'fulfilled' && memRes.value) {
        const memData = memRes.value.data || memRes.value;
        const status = (memData?.computed_status || memData?.membership?.computed_status || '').toUpperCase();
        setIsActiveMember(status === 'ACTIVE' || memData?.is_active === true);
      }

      if (ordRes.status === 'fulfilled' && ordRes.value) {
        const oList = ordRes.value?.data || ordRes.value || [];
        setOrders(Array.isArray(oList) ? oList : []);
      }
    } catch (err) {
      console.error('Error loading store data:', err);
      setError('Unable to load merchandise store.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cart Handlers
  const handleAddToCart = (newItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.product_size_id === newItem.product_size_id
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(
          newItem.max_stock,
          updated[existingIdx].quantity + newItem.quantity
        );
        updated[existingIdx].quantity = newQty;
        return updated;
      }
      return [...prev, newItem];
    });

    setNotification({
      type: 'success',
      message: `Added ${newItem.product_name} (Size ${newItem.size}) to cart.`,
    });
  };

  const handleUpdateQuantity = (productSizeId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productSizeId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) =>
        i.product_size_id === productSizeId
          ? { ...i, quantity: newQty }
          : i
      )
    );
  };

  const handleRemoveItem = (productSizeId) => {
    setCartItems((prev) => prev.filter((i) => i.product_size_id !== productSizeId));
  };

  // Checkout Handlers
  const handleOrderCreated = (order) => {
    setActiveOrder(order);
    setCartItems([]);
    setView('payment');
  };

  const handlePaymentSuccess = async () => {
    await loadData();
    setView('history');
    setActiveTab('history');
  };

  const handlePayPendingOrder = (order) => {
    setActiveOrder(order);
    setView('payment');
  };

  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const tabs = [
    { id: 'catalog', label: 'Store Catalog' },
    { id: 'cart', label: `My Cart (${totalCartCount})` },
    ...(isAuthenticated ? [{ id: 'history', label: `Order History (${orders.length})` }] : []),
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setView(tabId);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#1c1c1c] flex flex-col justify-between selection:bg-[#5F3F56] selection:text-white">
      <Navbar />

      <main className="flex-grow py-12 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="border-b border-[#e5e4de] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#5F3F56] font-semibold">
                  Official Organization Shop
                </span>
                {isActiveMember && (
                  <span className="bg-[#5F3F56] text-white px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                    10% Active Member Rate Applied
                  </span>
                )}
              </div>
              <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#1c1c1c] tracking-tight">
                CampusCore Apparel & Merchandise
              </h1>
              <p className="font-sans text-xs sm:text-sm text-[#1c1c1c]/70 mt-1 max-w-xl">
                Official hoodies, t-shirts, and campus gear. Active members automatically receive 10% discount at checkout.
              </p>
            </div>

            {/* Actions: Back to Workspace & Cart Quick Toggle */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 border border-[#e5e4de] bg-white/70 hover:bg-white flex items-center gap-1.5 text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </Link>
              )}

              <button
                onClick={() => handleTabChange('cart')}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2.5 border border-[#e5e4de] bg-white/70 hover:bg-white flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[#5F3F56]" />
                <span>Cart ({totalCartCount})</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {notification && (
            <div
              className={`p-3.5 border font-mono text-xs flex items-center justify-between ${
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

          {/* Page Tabs */}
          {(view === 'catalog' || view === 'cart' || view === 'history') && (
            <PageTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={handleTabChange}
            />
          )}

          {/* View: Catalog */}
          {view === 'catalog' && (
            <MerchandiseProductGrid
              products={products}
              onAddToCart={handleAddToCart}
              isActiveMember={isActiveMember}
              loading={loading}
            />
          )}

          {/* View: Cart */}
          {view === 'cart' && (
            <MerchandiseCart
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onProceedToCheckout={() => setView('checkout')}
              isActiveMember={isActiveMember}
              onContinueShopping={() => handleTabChange('catalog')}
            />
          )}

          {/* View: Checkout */}
          {view === 'checkout' && (
            <MerchandiseCheckout
              cartItems={cartItems}
              isActiveMember={isActiveMember}
              onCancel={() => setView('cart')}
              onOrderCreated={handleOrderCreated}
            />
          )}

          {/* View: Payment */}
          {view === 'payment' && activeOrder && (
            <MerchandisePayment
              order={activeOrder}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setView('history');
                setActiveTab('history');
              }}
            />
          )}

          {/* View: Order History */}
          {view === 'history' && (
            <MerchandiseOrderHistory
              orders={orders}
              loading={loading}
              onPayOrder={handlePayPendingOrder}
              onBrowseStore={() => handleTabChange('catalog')}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-[#e5e4de] py-8 px-6 bg-[#f7f6f2] font-mono text-xs text-[#1c1c1c]/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>CampusCore Student Organization · Merchandise Division</span>
          <span>CampusCore 2026</span>
        </div>
      </footer>
    </div>
  );
};

export default MerchandisePage;

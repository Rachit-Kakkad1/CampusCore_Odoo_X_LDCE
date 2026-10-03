// frontend/src/components/dashboard/member/MemberDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MemberMembershipCard,
  MemberPassCard,
  MemberEventSection,
  MemberTicketSection,
  MemberOrderSection,
  MemberAnnouncementSection,
} from './index';
import { PageTabs } from '../PageTabs';
import { DashboardStat } from '../DashboardStat';
import { DashboardLoadingState } from '../DashboardLoadingState';
import { DashboardErrorState } from '../DashboardErrorState';
import { ActionButton } from '../ActionButton';
import MerchandiseProductGrid from '../../merchandise/MerchandiseProductGrid';
import MerchandiseCart from '../../merchandise/MerchandiseCart';
import MerchandiseCheckout from '../../merchandise/MerchandiseCheckout';
import MerchandisePayment from '../../merchandise/MerchandisePayment';
import MerchandiseOrderHistory from '../../merchandise/MerchandiseOrderHistory';
import {
  CreditCard,
  Ticket,
  ShoppingBag,
  Bell,
  Calendar,
  MapPin,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import membershipService from '../../../services/membership.service';
import eventsService from '../../../services/events.service';
import merchandiseService from '../../../services/merchandise.service';
import announcementsService from '../../../services/announcements.service';
import authService from '../../../services/auth.service';

export const MemberDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Route-aware tab resolution: 'overview' | 'events' | 'store' | 'tickets' | 'orders' | 'announcements'
  const getTabFromPath = (pathname) => {
    if (pathname.includes('/events')) return 'events';
    if (pathname.includes('/store')) return 'store';
    if (pathname.includes('/tickets')) return 'tickets';
    if (pathname.includes('/orders')) return 'orders';
    if (pathname.includes('/announcements')) return 'announcements';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    setActiveTab(tabFromUrl);
  }, [location.pathname]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'overview') {
      navigate('/dashboard/member');
    } else {
      navigate(`/dashboard/member/${newTab}`);
    }
  };

  // Dynamic Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [membershipData, setMembershipData] = useState(null);
  const [passData, setPassData] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Store & Cart Sub-states
  const [storeView, setStoreView] = useState('catalog'); // 'catalog' | 'cart' | 'checkout' | 'payment'
  const [cartItems, setCartItems] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);

  // Event Booking Sub-states
  const [selectedEventForBooking, setSelectedEventForBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const user = authService.getStoredUser();

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrent fetch using actual backend endpoints
      const [
        membershipRes,
        passRes,
        eventsRes,
        ticketsRes,
        productsRes,
        ordersRes,
        announcementsRes,
      ] = await Promise.allSettled([
        membershipService.getMembership(),
        membershipService.getMemberPass(),
        eventsService.getEvents(),
        eventsService.getMyTickets(),
        merchandiseService.getProducts(),
        merchandiseService.getMyOrders(),
        announcementsService.getAnnouncements(),
      ]);

      // Set Membership
      if (membershipRes.status === 'fulfilled' && membershipRes.value) {
        const m = membershipRes.value.data?.membership || membershipRes.value.membership || membershipRes.value;
        const computedStatus = membershipRes.value.data?.computed_status || membershipRes.value.computed_status;
        setMembershipData(m ? { ...m, computed_status: computedStatus || m.status } : null);
      }

      // Set Pass
      if (passRes.status === 'fulfilled' && passRes.value) {
        const p = passRes.value.data || passRes.value;
        setPassData(p);
      }

      // Set Events
      if (eventsRes.status === 'fulfilled' && eventsRes.value) {
        const evList = eventsRes.value.data || eventsRes.value || [];
        setEvents(Array.isArray(evList) ? evList : []);
      }

      // Set Tickets
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        const tkList = ticketsRes.value.data || ticketsRes.value || [];
        setTickets(Array.isArray(tkList) ? tkList : []);
      }

      // Set Products
      if (productsRes.status === 'fulfilled' && productsRes.value) {
        const prList = productsRes.value.data || productsRes.value || [];
        setProducts(Array.isArray(prList) ? prList : []);
      }

      // Set Orders
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const ordList = ordersRes.value.data || ordersRes.value || [];
        setOrders(Array.isArray(ordList) ? ordList : []);
      }

      // Set Announcements
      if (announcementsRes.status === 'fulfilled' && announcementsRes.value) {
        const annList = announcementsRes.value.data || announcementsRes.value || [];
        setAnnouncements(Array.isArray(annList) ? annList : []);
      }
    } catch (err) {
      console.error('Failed to load member dashboard data:', err);
      setError(err.message || 'Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Payment Handlers
  const handlePayDues = async (membershipId, paymentMode = 'online') => {
    try {
      if (membershipId) {
        await membershipService.payMembership(membershipId, paymentMode);
      } else {
        await membershipService.payDues(paymentMode);
      }
      showNotification('Membership dues paid successfully! Your membership is now ACTIVE.');
      await loadDashboardData();
    } catch (err) {
      showNotification(err.message || 'Payment processing failed. Please try again.', 'error');
    }
  };

  const handleRenew = async (membershipId) => {
    try {
      if (membershipId) {
        await membershipService.renewMembership(membershipId);
      } else {
        await membershipService.createMembership();
      }
      showNotification('Renewal initiated. Please complete payment to activate your renewed cycle.');
      await loadDashboardData();
    } catch (err) {
      showNotification(err.message || 'Renewal initiation failed. Please try again.', 'error');
    }
  };

  // Cart & Store Handlers
  const handleAddToCart = (newItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_size_id === newItem.product_size_id);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = Math.min(newItem.max_stock, updated[existingIdx].quantity + newItem.quantity);
        updated[existingIdx].quantity = newQty;
        return updated;
      }
      return [...prev, newItem];
    });
    showNotification(`Added ${newItem.product_name} (Size ${newItem.size}) to cart.`);
  };

  const handleUpdateQuantity = (productSizeId, newQty) => {
    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.product_size_id !== productSizeId));
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.product_size_id === productSizeId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleRemoveItem = (productSizeId) => {
    setCartItems((prev) => prev.filter((i) => i.product_size_id !== productSizeId));
  };

  const handleOrderCreated = (order) => {
    setActiveOrder(order);
    setCartItems([]);
    setStoreView('payment');
  };

  const handlePaymentSuccess = async () => {
    showNotification('Order placed and paid successfully! Receipt generated.');
    await loadDashboardData();
    setStoreView('catalog');
    handleTabChange('orders');
  };

  // Event Booking Handler
  const handleBookTicket = async (event) => {
    try {
      setBookingLoading(true);
      const paidTicket = await eventsService.purchaseTicket(event.id, {
        name: user?.name,
        email: user?.email,
        paymentMode: 'online',
      });
      showNotification(`Ticket booked successfully for "${event.title}"!`);
      setSelectedEventForBooking(null);
      await loadDashboardData();
      handleTabChange('tickets');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Failed to book ticket.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading && !membershipData) {
    return <DashboardLoadingState message="Loading member credentials & organization workspace..." />;
  }

  if (error && !membershipData) {
    return (
      <DashboardErrorState
        title="Unable to Load Member Workspace"
        description={error}
        onRetry={loadDashboardData}
      />
    );
  }

  const computedStatus = (
    membershipData?.computed_status ||
    membershipData?.status ||
    'PENDING'
  ).toUpperCase();
  const isActive = computedStatus === 'ACTIVE';
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const tabs = [
    { id: 'overview', label: 'Member Overview', icon: CreditCard },
    { id: 'events', label: `Events & Tickets (${events.length})`, icon: Calendar },
    { id: 'store', label: `Merchandise Store ${totalCartCount > 0 ? `(${totalCartCount} in cart)` : ''}`, icon: ShoppingBag },
    { id: 'tickets', label: `My Tickets (${tickets.length})`, icon: Ticket },
    { id: 'orders', label: `Order History (${orders.length})`, icon: ShoppingBag },
    { id: 'announcements', label: `Broadcasts (${announcements.length})`, icon: Bell },
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 border font-mono text-xs flex items-center justify-between transition-all ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="font-bold underline uppercase ml-4 text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Workspace Navigation Tabs */}
      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Statistical Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStat
              label="Membership State"
              value={computedStatus}
              change={
                isActive
                  ? `${membershipData?.days_remaining || 0} days remaining`
                  : computedStatus === 'EXPIRED'
                  ? 'Renewal required'
                  : 'Dues pending'
              }
              icon={CreditCard}
            />
            <DashboardStat
              label="Event Tickets"
              value={String(tickets.length)}
              change={tickets.length > 0 ? 'Confirmed reservations' : 'No bookings yet'}
              icon={Ticket}
            />
            <DashboardStat
              label="Merch Orders"
              value={String(orders.length)}
              change={orders.length > 0 ? 'Store purchase history' : 'No orders placed'}
              icon={ShoppingBag}
            />
            <DashboardStat
              label="Announcements"
              value={String(announcements.length)}
              change="Campus bulletins"
              icon={Bell}
            />
          </div>

          {/* Primary Section: Membership Status & Digital Pass */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <MemberMembershipCard
                membership={membershipData}
                onPayDues={handlePayDues}
                onRenew={handleRenew}
              />
            </div>
            <div className="lg:col-span-5">
              <MemberPassCard
                passData={
                  passData || {
                    ...membershipData,
                    member_name: user?.name,
                    user_email: user?.email,
                    role: user?.role,
                  }
                }
              />
            </div>
          </div>

          {/* Upcoming Events Preview */}
          <MemberEventSection
            events={events.slice(0, 2)}
            isActiveMember={isActive}
            onRegisterEvent={(ev) => {
              setSelectedEventForBooking(ev);
              handleTabChange('events');
            }}
          />

          {/* Event Tickets & Merchandise Orders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MemberTicketSection tickets={tickets.slice(0, 3)} />
            <MemberOrderSection orders={orders.slice(0, 3)} />
          </div>

          {/* Announcements Feed Section */}
          <MemberAnnouncementSection announcements={announcements} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EVENTS & TICKETS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="p-6 border border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-sans font-bold text-xl text-slate-900 tracking-tight">
                Campus Events & Ticket Booking
              </h2>
              <p className="font-mono text-xs text-slate-500 mt-0.5">
                {isActive
                  ? 'Active Membership verified: Automatic member pricing applied to all tickets.'
                  : 'Pay dues to unlock discounted member rates.'}
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {events.length} Scheduled Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => {
              const regularPrice = Number(event.non_member_price || 0).toFixed(2);
              const memberPrice = Number(event.member_price || 0).toFixed(2);
              const savings = (Number(event.non_member_price || 0) - Number(event.member_price || 0)).toFixed(2);
              const seatsRemaining = Number(event.seats_remaining || 0);
              const isSoldOut = seatsRemaining <= 0;
              const effectivePrice = isActive ? memberPrice : regularPrice;

              const eventDateFormatted = event.starts_at
                ? new Date(event.starts_at).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Date TBA';

              return (
                <div
                  key={event.id}
                  className="border border-border bg-white p-6 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-xs space-y-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 border ${
                          isSoldOut
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-slate-50 text-primary border-border'
                        }`}
                      >
                        {isSoldOut ? 'SOLD OUT' : `${seatsRemaining} seats remaining`}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Cap: {event.capacity}
                      </span>
                    </div>

                    <h3 className="font-sans font-bold text-xl text-slate-900 tracking-tight">
                      {event.title}
                    </h3>

                    <p className="font-sans text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {event.description || 'CampusCore official community gathering and event.'}
                    </p>

                    <div className="space-y-1.5 pt-3 border-t border-border font-mono text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{eventDateFormatted}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{event.venue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Booking Action */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="p-3 bg-slate-50 border border-border font-mono text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">
                          Price: {isActive && <span className="line-through mr-1">₹{regularPrice}</span>}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-base font-bold text-slate-900">
                            ₹{effectivePrice}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold text-emerald-800 uppercase px-1.5 py-0.5 bg-emerald-100 border border-emerald-300">
                              Member Rate (Saved ₹{savings})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ActionButton
                      variant={isSoldOut ? 'secondary' : 'primary'}
                      className="w-full justify-center"
                      disabled={isSoldOut || bookingLoading}
                      onClick={() => handleBookTicket(event)}
                    >
                      {isSoldOut ? (
                        <span>Sold Out</span>
                      ) : bookingLoading ? (
                        <span>Reserving Ticket...</span>
                      ) : (
                        <>
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Reserve Ticket (₹{effectivePrice})</span>
                        </>
                      )}
                    </ActionButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MERCHANDISE STORE                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="p-6 border border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
                  Official CampusCore Store
                </span>
                {isActive && (
                  <span className="bg-primary text-white px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                    10% Active Member Rate Applied
                  </span>
                )}
              </div>
              <h2 className="font-sans font-bold text-xl text-slate-900 tracking-tight">
                Apparel & Merchandise Catalog
              </h2>
            </div>

            {/* Cart Quick Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStoreView(storeView === 'cart' ? 'catalog' : 'cart')}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2 border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span>Cart ({totalCartCount})</span>
              </button>
            </div>
          </div>

          {storeView === 'catalog' && (
            <MerchandiseProductGrid
              products={products}
              onAddToCart={handleAddToCart}
              isActiveMember={isActive}
              loading={loading}
            />
          )}

          {storeView === 'cart' && (
            <MerchandiseCart
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onProceedToCheckout={() => setStoreView('checkout')}
              isActiveMember={isActive}
              onContinueShopping={() => setStoreView('catalog')}
            />
          )}

          {storeView === 'checkout' && (
            <MerchandiseCheckout
              cartItems={cartItems}
              isActiveMember={isActive}
              onCancel={() => setStoreView('cart')}
              onOrderCreated={handleOrderCreated}
            />
          )}

          {storeView === 'payment' && activeOrder && (
            <MerchandisePayment
              order={activeOrder}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setStoreView('catalog')}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MY TICKETS                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <MemberTicketSection tickets={tickets} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ORDER HISTORY                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <MerchandiseOrderHistory
            orders={orders}
            loading={loading}
            onBrowseStore={() => handleTabChange('store')}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ANNOUNCEMENTS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <MemberAnnouncementSection announcements={announcements} />
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;

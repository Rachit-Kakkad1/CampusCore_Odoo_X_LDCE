// frontend/src/components/dashboard/admin/AdminTicketManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  CreditCard,
  Eye,
  RefreshCw,
  QrCode,
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import eventsService from '../../../services/events.service';
import Pagination from '../../common/Pagination';
import { DashboardLoadingState } from '../DashboardLoadingState';

export const AdminTicketManagement = () => {
  // State for tickets and pagination
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter and search state
  const [search, setSearch] = useState('');
  const [buyerType, setBuyerType] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [checkinStatus, setCheckinStatus] = useState('ALL');
  const [eventId, setEventId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Available events for dropdown filter
  const [eventsList, setEventsList] = useState([]);

  // Selected ticket for modal detail view
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Load events for filter dropdown
  useEffect(() => {
    eventsService.getEvents()
      .then((data) => {
        const evs = Array.isArray(data) ? data : data?.events || [];
        setEventsList(evs);
      })
      .catch(() => {});
  }, []);

  // Fetch paginated tickets from backend
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        sortBy,
        sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (buyerType !== 'ALL') params.buyerType = buyerType;
      if (paymentStatus !== 'ALL') params.paymentStatus = paymentStatus;
      if (checkinStatus !== 'ALL') params.checkinStatus = checkinStatus;
      if (eventId) params.eventId = eventId;

      const res = await eventsService.getAllTicketsAdmin(params);
      const items = res.items || res.tickets || res.data || [];
      setTickets(Array.isArray(items) ? items : []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          page: res.pagination.page || 1,
          pageSize: res.pagination.pageSize || 10,
          total: res.pagination.total || items.length,
          totalPages: res.pagination.totalPages || 1,
        }));
      } else {
        setPagination((prev) => ({
          ...prev,
          total: items.length,
          totalPages: 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load admin tickets:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, buyerType, paymentStatus, checkinStatus, eventId, sortBy, sortOrder]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Handle opening ticket details modal
  const handleViewDetails = async (id) => {
    setSelectedTicketId(id);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await eventsService.getTicketDetailsAdmin(id);
      setTicketDetails(res.ticket || res.data || res);
    } catch (err) {
      setDetailsError(err.response?.data?.error || 'Failed to load ticket details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount, currency = 'INR') => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 border border-border bg-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Ticket className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-sans font-bold text-slate-900 tracking-tight">
                Complete Ticket Management
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500">
              Real database ledger of all tickets across registered members and guest purchasers.
            </p>
          </div>
          <button
            onClick={() => fetchTickets()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-slate-50 hover:bg-slate-100 text-xs font-mono uppercase tracking-wider text-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, email, phone, ticket ID, event..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-border bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-900 transition-colors"
            />
          </div>

          {/* Buyer Type Filter */}
          <div>
            <select
              value={buyerType}
              onChange={(e) => {
                setBuyerType(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="ALL">Buyer: All Types</option>
              <option value="MEMBER">Member Only</option>
              <option value="GUEST">Guest / Non-Member</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="ALL">Payment: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Check-in Filter */}
          <div>
            <select
              value={checkinStatus}
              onChange={(e) => {
                setCheckinStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900"
            >
              <option value="ALL">Check-in: All</option>
              <option value="checked_in">Checked In</option>
              <option value="not_checked_in">Not Checked In</option>
            </select>
          </div>

          {/* Event Filter */}
          <div>
            <select
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-xs font-mono border border-border bg-white focus:outline-hidden focus:border-slate-900 truncate"
            >
              <option value="">Event: All Events</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-mono text-slate-600">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 text-xs font-mono border border-border bg-white"
            >
              <option value="created_at">Purchase Date</option>
              <option value="amount_paid">Amount Paid</option>
              <option value="event_date">Event Date</option>
              <option value="buyer_name">Buyer Name</option>
              <option value="is_checked_in">Check-in Status</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
              className="px-2 py-1 border border-border bg-slate-50 hover:bg-slate-100 font-mono text-xs"
            >
              {sortOrder === 'ASC' ? '▲ Ascending' : '▼ Descending'}
            </button>
          </div>

          <div className="text-slate-500">
            Total matching records: <span className="font-bold text-slate-900">{pagination.total}</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tickets Table */}
      <div className="border border-border bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <DashboardLoadingState title="Loading Tickets Ledger..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Ticket className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-sans font-bold text-slate-800 text-base">No Tickets Found</h3>
            <p className="font-mono text-xs text-slate-500 max-w-md mx-auto">
              No ticket purchases match the specified filter and search criteria in the database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/80 text-slate-600 font-semibold tracking-wider uppercase">
                  <th className="p-3">Ticket / Code</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Purchaser Details</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const isMember = t.buyer_type === 'MEMBER';
                  const isPaid = (t.payment_status || '').toLowerCase() === 'paid';
                  const isCheckedIn = Boolean(t.is_checked_in);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Ticket Code & ID */}
                      <td className="p-3 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-bold">{t.ticket_code || `TCK-${t.id}`}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ID: #{t.id}
                        </span>
                      </td>

                      {/* Buyer Type Badge */}
                      <td className="p-3">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-primary/30 bg-primary/10 text-primary font-bold text-[10px] uppercase rounded-xs">
                            <ShieldCheck className="w-3 h-3" />
                            <span>MEMBER</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-slate-300 bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded-xs">
                            <User className="w-3 h-3" />
                            <span>GUEST</span>
                          </span>
                        )}
                        {t.membership_tier && (
                          <span className="block text-[10px] text-slate-500 mt-0.5 capitalize">
                            {t.membership_tier} Tier
                          </span>
                        )}
                      </td>

                      {/* Purchaser Information */}
                      <td className="p-3">
                        <div className="font-sans font-semibold text-slate-900 text-xs">
                          {t.buyer_name || 'Anonymous Purchaser'}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[180px]">
                          {t.buyer_email || '—'}
                        </div>
                        {t.buyer_phone && (
                          <div className="text-slate-400 text-[10px]">
                            {t.buyer_phone}
                          </div>
                        )}
                      </td>

                      {/* Event Information */}
                      <td className="p-3">
                        <div className="font-sans font-medium text-slate-900 text-xs line-clamp-1 max-w-[200px]">
                          {t.event_title || `Event #${t.event_id}`}
                        </div>
                        <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{t.event_date ? new Date(t.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                        </div>
                      </td>

                      {/* Amount Paid */}
                      <td className="p-3 font-semibold text-slate-900">
                        {formatCurrency(t.amount_paid, t.currency)}
                      </td>

                      {/* Payment Status */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-bold border rounded-xs ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : t.payment_status === 'failed'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                          <span>{t.payment_status || 'pending'}</span>
                        </span>
                      </td>

                      {/* Check-In Status */}
                      <td className="p-3">
                        {isCheckedIn ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Checked In</span>
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {formatDate(t.checked_in_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Not Checked In
                          </span>
                        )}
                      </td>

                      {/* Purchase Date */}
                      <td className="p-3 text-slate-500 text-[11px]">
                        {formatDate(t.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleViewDetails(t.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-xs uppercase transition-colors"
                          title="View Complete Ticket Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} tickets
            </div>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border bg-white shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold block mb-1">
                  Ticket Verification Audit
                </span>
                <h3 className="font-sans font-bold text-xl text-slate-900">
                  Ticket Details: #{selectedTicketId}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedTicketId(null);
                  setTicketDetails(null);
                }}
                className="px-3 py-1.5 border border-border bg-slate-100 hover:bg-slate-200 text-xs font-mono uppercase font-bold text-slate-700"
              >
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center">
                <DashboardLoadingState title="Loading Full Ticket & Audit Data..." />
              </div>
            ) : detailsError ? (
              <div className="p-4 border border-rose-200 bg-rose-50 text-rose-800 text-xs font-mono">
                {detailsError}
              </div>
            ) : ticketDetails ? (
              <div className="space-y-6 font-mono text-xs">
                {/* 1. Buyer & Account Information */}
                <div className="p-4 border border-border bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span>Purchaser & Identity Profile</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Buyer Type</span>
                      <span className="font-bold text-slate-900">{ticketDetails.buyer_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Name</span>
                      <span className="font-medium text-slate-900">{ticketDetails.buyer_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                      <span className="font-medium text-slate-900">{ticketDetails.buyer_email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
                      <span>{ticketDetails.buyer_phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">User Account ID</span>
                      <span>{ticketDetails.user_id ? `#${ticketDetails.user_id}` : 'Guest (No account)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Membership ID</span>
                      <span>{ticketDetails.membership_id ? `#${ticketDetails.membership_id}` : 'Non-Member'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Event Information */}
                <div className="p-4 border border-border bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Event Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Event Title</span>
                      <span className="font-bold text-slate-900">{ticketDetails.event_title}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Event Date</span>
                      <span>{formatDate(ticketDetails.event_date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Location</span>
                      <span>{ticketDetails.event_location || 'Online / Main Venue'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Event Manager ID</span>
                      <span>{ticketDetails.event_manager_id ? `#${ticketDetails.event_manager_id}` : 'Admin'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Payment & Financial Ledger */}
                <div className="p-4 border border-border bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>Payment & Transaction Record</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Amount Paid</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatCurrency(ticketDetails.amount_paid, ticketDetails.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Payment Status</span>
                      <span className="uppercase font-bold text-emerald-700">{ticketDetails.payment_status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Payment Mode</span>
                      <span className="uppercase">{ticketDetails.payment_mode || 'Online Checkout'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase">Payment Reference</span>
                      <span className="text-slate-900 break-all">{ticketDetails.payment_reference || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Transaction Timestamp</span>
                      <span>{formatDate(ticketDetails.payment_timestamp || ticketDetails.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Check-in & QR Verification */}
                <div className="p-4 border border-border bg-slate-50 space-y-3">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span>Door Verification & Check-in</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Ticket Code</span>
                      <span className="font-bold text-slate-900">{ticketDetails.ticket_code || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Check-In Status</span>
                      <span className={`font-bold ${ticketDetails.is_checked_in ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {ticketDetails.is_checked_in ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Check-in Time</span>
                      <span>{formatDate(ticketDetails.checked_in_at)}</span>
                    </div>
                    {ticketDetails.checked_in_by_name && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Checked In By</span>
                        <span>{ticketDetails.checked_in_by_name} ({ticketDetails.checked_in_by_email})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Audit Log History */}
                {Array.isArray(ticketDetails.audit_logs) && ticketDetails.audit_logs.length > 0 && (
                  <div className="p-4 border border-border bg-slate-50 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>Audit Trail</span>
                    </h4>
                    <div className="divide-y divide-slate-200">
                      {ticketDetails.audit_logs.map((log) => (
                        <div key={log.id} className="py-2 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{log.action}</span>
                            {log.actor_name && (
                              <span className="text-slate-500 ml-2">by {log.actor_name}</span>
                            )}
                          </div>
                          <span className="text-slate-400">{formatDate(log.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTicketManagement;

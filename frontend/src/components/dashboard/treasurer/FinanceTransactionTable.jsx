// frontend/src/components/dashboard/treasurer/FinanceTransactionTable.jsx
import React, { useState } from 'react';
import { DashboardTable } from '../DashboardTable';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { StatusBadge } from '../StatusBadge';
import Pagination from '../../common/Pagination';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Ticket, 
  ShoppingBag, 
  HeartHandshake, 
  Receipt, 
  Filter
} from 'lucide-react';

/**
 * FinanceTransactionTable Component
 * Immutable transaction ledger view acting as the financial source of truth.
 *
 * @param {Object} props
 * @param {Array} props.transactions - Ledger entries directly from backend
 * @param {boolean} props.loading - Loading state
 */
export const FinanceTransactionTable = ({ transactions = [], loading = false }) => {
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSource =
      sourceFilter === 'ALL' ||
      tx.source_type?.toLowerCase() === sourceFilter.toLowerCase();
    const matchesDirection =
      directionFilter === 'ALL' ||
      tx.direction?.toLowerCase() === directionFilter.toLowerCase();
    return matchesSource && matchesDirection;
  });

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getSourceIcon = (sourceType) => {
    switch (sourceType?.toLowerCase()) {
      case 'dues':
        return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
      case 'ticket':
        return <Ticket className="w-3.5 h-3.5 text-purple-600" />;
      case 'merch':
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />;
      case 'fundraiser':
        return <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />;
      case 'expense':
        return <Receipt className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getSourceBadge = (sourceType) => {
    switch (sourceType?.toLowerCase()) {
      case 'dues':
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-blue-100 text-blue-800 border border-blue-200">Dues</span>;
      case 'ticket':
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-purple-100 text-purple-800 border border-purple-200">Ticket</span>;
      case 'merch':
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-100 text-amber-800 border border-amber-200">Merch</span>;
      case 'fundraiser':
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">Fundraiser</span>;
      case 'expense':
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-rose-100 text-rose-800 border border-rose-200">Expense</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-slate-100 text-slate-800 border border-slate-200">{sourceType}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Filter Ledger:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Stream Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-mono bg-slate-50 border border-border px-2.5 py-1.5 focus:outline-none focus:border-primary text-slate-800"
          >
            <option value="ALL">All Sources</option>
            <option value="dues">Membership Dues</option>
            <option value="ticket">Event Tickets</option>
            <option value="merch">Merchandise</option>
            <option value="fundraiser">Fundraisers</option>
            <option value="expense">Reimbursed Expenses</option>
          </select>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-mono bg-slate-50 border border-border px-2.5 py-1.5 focus:outline-none focus:border-primary text-slate-800"
          >
            <option value="ALL">All Flows (In & Out)</option>
            <option value="in">Inflow (+ Income)</option>
            <option value="out">Outflow (- Outgoing)</option>
          </select>

          <span className="text-xs font-mono text-muted pl-2">
            Showing {filteredTransactions.length} of {transactions.length} entries
          </span>
        </div>
      </div>

      {/* Main Ledger Table */}
      {filteredTransactions.length === 0 && !loading ? (
        <DashboardEmptyState
          title="No Ledger Transactions Found"
          description={
            sourceFilter !== 'ALL' || directionFilter !== 'ALL'
              ? 'No transactions matched the active filter criteria.'
              : 'The central ledger currently has no recorded transactions.'
          }
        />
      ) : (
        <div className="space-y-3">
          <DashboardTable
            headers={['TX Code', 'Source Stream', 'Flow & Amount', 'Payment Mode', 'User / Account', 'Timestamp']}
          >
            {paginatedTransactions.map((tx) => {
              const isIncoming = tx.direction?.toLowerCase() === 'in';
              const amountFormatted = Number(tx.amount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const txDate = tx.created_at
                ? new Date(tx.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              return (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors border-b border-border/60">
                  {/* 1. Transaction Code */}
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                    TX-#{String(tx.id).padStart(4, '0')}
                  </td>

                  {/* 2. Source Type */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {getSourceIcon(tx.source_type)}
                      {getSourceBadge(tx.source_type)}
                      <span className="font-mono text-[11px] text-muted">
                        #{tx.source_id}
                      </span>
                    </div>
                  </td>

                  {/* 3. Flow & Amount */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
                      {isIncoming ? (
                        <span className="text-emerald-700 flex items-center">
                          <ArrowUpRight className="w-4 h-4 mr-0.5 inline" />
                          +₹{amountFormatted}
                        </span>
                      ) : (
                        <span className="text-rose-700 flex items-center">
                          <ArrowDownRight className="w-4 h-4 mr-0.5 inline" />
                          -₹{amountFormatted}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 4. Payment Mode */}
                  <td className="px-4 py-3 font-mono text-xs uppercase text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 border border-border text-[11px]">
                      {tx.payment_mode || 'online'}
                    </span>
                  </td>

                  {/* 5. User / Account */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">
                        {tx.user_name || 'System / Direct'}
                      </span>
                      <span className="font-mono text-[10px] text-muted truncate max-w-[180px]">
                        {tx.user_email || `ID: ${tx.user_id || 'N/A'}`}
                      </span>
                    </div>
                  </td>

                  {/* 6. Date / Timestamp */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                    {txDate}
                  </td>
                </tr>
              );
            })}
          </DashboardTable>

          {filteredTransactions.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTransactions.length / pageSize)}
              totalItems={filteredTransactions.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceTransactionTable;

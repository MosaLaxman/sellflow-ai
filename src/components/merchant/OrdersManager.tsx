'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, X, Filter, ArrowUpDown, Check, Copy, ShoppingBag, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface SerializedOrderItem {
  id: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  isUpsell: boolean;
  product: {
    id: string;
    name: string;
    category: string;
    imageUrl?: string | null;
  };
}

export interface SerializedPayment {
  id: string;
  razorpayPaymentId: string | null;
  status: string;
  amountMinor: number;
  method?: string | null;
}

export interface SerializedOrder {
  id: string;
  receipt: string;
  amountMinor: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  createdAt: string;
  isAiAssisted?: boolean;
  hasUpsellItem?: boolean;
  customerSession?: {
    id: string;
    sessionToken: string;
  } | null;
  payments: SerializedPayment[];
  cart?: {
    id: string;
    items: SerializedOrderItem[];
  } | null;
}

export type StatusFilter = 'ALL' | 'PAID' | 'PENDING' | 'FAILED';
export type TypeFilter = 'ALL' | 'AI_ASSISTED' | 'UPSELL';
export type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

interface OrdersManagerProps {
  initialOrders: SerializedOrder[];
  merchantSlug?: string;
  defaultSearchQuery?: string;
  defaultStatusFilter?: StatusFilter;
  defaultTypeFilter?: TypeFilter;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  initialOrders,
  merchantSlug = 'apex-sports',
  defaultSearchQuery = '',
  defaultStatusFilter = 'ALL',
  defaultTypeFilter = 'ALL',
}) => {
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultStatusFilter);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(defaultTypeFilter);
  const [sortOption, setSortOption] = useState<SortOption>('DATE_DESC');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatCurrency = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isOrderFailed = (ord: SerializedOrder) => {
    return (
      ord.status === 'PAYMENT_FAILED' ||
      ord.status === 'FAILED' ||
      ord.status === 'CANCELLED' ||
      ord.payments.some((p) => p.status?.toLowerCase() === 'failed')
    );
  };

  // Precompute counts for status and channel filter pills
  const statusCounts = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let failed = 0;
    for (const ord of initialOrders) {
      if (ord.status === 'PAID') {
        paid++;
      } else if (ord.status === 'PENDING') {
        pending++;
      } else if (isOrderFailed(ord)) {
        failed++;
      }
    }
    return {
      ALL: initialOrders.length,
      PAID: paid,
      PENDING: pending,
      FAILED: failed,
    };
  }, [initialOrders]);

  const typeCounts = useMemo(() => {
    let ai = 0;
    let upsell = 0;
    for (const ord of initialOrders) {
      if (ord.isAiAssisted) ai++;
      if (ord.hasUpsellItem || ord.cart?.items.some((i) => i.isUpsell)) upsell++;
    }
    return {
      ALL: initialOrders.length,
      AI_ASSISTED: ai,
      UPSELL: upsell,
    };
  }, [initialOrders]);

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return initialOrders
      .filter((order) => {
        // Status Filter - robustly matches PAID, PENDING, and FAILED (including PAYMENT_FAILED)
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'PAID') {
            if (order.status !== 'PAID') return false;
          } else if (statusFilter === 'PENDING') {
            if (order.status !== 'PENDING') return false;
          } else if (statusFilter === 'FAILED') {
            if (!isOrderFailed(order)) return false;
          }
        }

        // Type Filter
        if (typeFilter === 'AI_ASSISTED' && !order.isAiAssisted) {
          return false;
        }
        if (typeFilter === 'UPSELL' && !order.hasUpsellItem && !order.cart?.items.some((i) => i.isUpsell)) {
          return false;
        }

        // Search Query Filtering
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase().trim();
        const receiptMatch = order.receipt.toLowerCase().includes(q);
        const idMatch = order.id.toLowerCase().includes(q);
        const rzpOrderMatch = order.razorpayOrderId?.toLowerCase().includes(q) || false;
        const paymentMatch = order.payments.some((p) => p.razorpayPaymentId?.toLowerCase().includes(q));
        const productMatch = order.cart?.items.some((it) =>
          it.product.name.toLowerCase().includes(q) || it.product.category.toLowerCase().includes(q)
        ) || false;
        const amountMatch = (order.amountMinor / 100).toString().includes(q) ||
          formatCurrency(order.amountMinor).toLowerCase().includes(q);
        const sessionMatch = order.customerSession?.sessionToken.toLowerCase().includes(q) || false;

        return (
          receiptMatch ||
          idMatch ||
          rzpOrderMatch ||
          paymentMatch ||
          productMatch ||
          amountMatch ||
          sessionMatch
        );
      })
      .sort((a, b) => {
        if (sortOption === 'DATE_DESC') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortOption === 'DATE_ASC') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortOption === 'AMOUNT_DESC') {
          return b.amountMinor - a.amountMinor;
        }
        if (sortOption === 'AMOUNT_ASC') {
          return a.amountMinor - b.amountMinor;
        }
        return 0;
      });
  }, [initialOrders, searchQuery, statusFilter, typeFilter, sortOption]);

  // Aggregate Metrics for Active Selection
  const stats = useMemo(() => {
    const totalRevenueMinor = filteredOrders
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + o.amountMinor, 0);

    const aiAssistedOrders = filteredOrders.filter((o) => o.isAiAssisted || o.hasUpsellItem);
    const aiRevenueMinor = aiAssistedOrders
      .filter((o) => o.status === 'PAID')
      .reduce((sum, o) => sum + o.amountMinor, 0);

    const aovMinor = filteredOrders.length > 0
      ? Math.round(totalRevenueMinor / (filteredOrders.filter((o) => o.status === 'PAID').length || 1))
      : 0;

    return {
      count: filteredOrders.length,
      totalRevenue: formatCurrency(totalRevenueMinor),
      aiRevenue: formatCurrency(aiRevenueMinor),
      aov: formatCurrency(aovMinor),
    };
  }, [filteredOrders]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setSortOption('DATE_DESC');
  };

  return (
    <div className="space-y-6">
      {/* 1. Search Bar & Primary Controls */}
      <div className="bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-sf-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sf-text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by receipt (rcpt_...), payment ID (pay_...), product name, amount..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-lg bg-[var(--sf-bg)] border border-[var(--sf-border)] text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sf-transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] rounded-full hover:bg-[var(--sf-surface-hover)] sf-transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--sf-bg)] border border-[var(--sf-border)] text-xs text-[var(--sf-text-secondary)]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--sf-text-muted)]" />
              <span className="font-medium">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-[var(--sf-text-primary)] font-medium focus:outline-none cursor-pointer"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
                <option value="AMOUNT_DESC">Amount: High to Low</option>
                <option value="AMOUNT_ASC">Amount: Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Segmented Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--sf-border-light)] text-xs">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[var(--sf-text-muted)] mr-1 font-medium flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {(['ALL', 'PAID', 'PENDING', 'FAILED'] as StatusFilter[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium sf-transition flex items-center gap-1.5 ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-[var(--sf-bg)] text-[var(--sf-text-secondary)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-hover)] hover:text-[var(--sf-text-primary)]'
                }`}
              >
                <span>{st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                    statusFilter === st
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--sf-surface-hover)] text-[var(--sf-text-muted)]'
                  }`}
                >
                  {statusCounts[st]}
                </span>
              </button>
            ))}
          </div>

          {/* Type / AI Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[var(--sf-text-muted)] mr-1 font-medium">Channel:</span>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium sf-transition flex items-center gap-1.5 ${
                typeFilter === 'ALL'
                  ? 'bg-[var(--sf-text-primary)] text-[var(--sf-bg)] shadow-xs'
                  : 'bg-[var(--sf-bg)] text-[var(--sf-text-secondary)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-hover)]'
              }`}
            >
              <span>All Types</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                typeFilter === 'ALL' ? 'bg-black/20 dark:bg-white/20' : 'text-[var(--sf-text-muted)]'
              }`}>
                {typeCounts.ALL}
              </span>
            </button>
            <button
              onClick={() => setTypeFilter('AI_ASSISTED')}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 sf-transition ${
                typeFilter === 'AI_ASSISTED'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[var(--sf-bg)] text-[var(--sf-text-secondary)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-hover)]'
              }`}
            >
              <span>AI Assisted</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                typeFilter === 'AI_ASSISTED' ? 'bg-white/20 text-white' : 'text-[var(--sf-text-muted)]'
              }`}>
                {typeCounts.AI_ASSISTED}
              </span>
            </button>
            <button
              onClick={() => setTypeFilter('UPSELL')}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 sf-transition ${
                typeFilter === 'UPSELL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[var(--sf-bg)] text-[var(--sf-text-secondary)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-hover)]'
              }`}
            >
              <span>Upsell Add-ons</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                typeFilter === 'UPSELL' ? 'bg-white/20 text-white' : 'text-[var(--sf-text-muted)]'
              }`}>
                {typeCounts.UPSELL}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Search / Filter Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-xs text-[var(--sf-text-muted)]">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-[var(--sf-text-primary)] font-semibold">{filteredOrders.length}</strong> of{' '}
            {initialOrders.length} orders
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="ml-2 text-brand-600 hover:text-brand-700 font-medium underline flex items-center gap-1 sf-transition"
            >
              <X className="w-3 h-3" /> Reset all filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span>
            Filtered Volume: <strong className="text-[var(--sf-text-primary)] font-semibold">{stats.totalRevenue}</strong>
          </span>
          {stats.count > 0 && (
            <span className="hidden sm:inline">
              Avg Order: <strong className="text-[var(--sf-text-primary)] font-semibold">{stats.aov}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 3. Orders Results Table */}
      <div className="border border-[var(--sf-border)] rounded-sf-lg overflow-hidden bg-[var(--sf-surface)] shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--sf-bg)] border border-[var(--sf-border)] flex items-center justify-center mx-auto mb-3 text-[var(--sf-text-muted)]">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[var(--sf-text-primary)]">
              {searchQuery ? `No orders matching "${searchQuery}"` : 'No orders found matching selected filters.'}
            </p>
            <p className="mt-1 text-xs text-[var(--sf-text-muted)] max-w-sm mx-auto">
              Try adjusting your search terms, filtering by a different status, or clearing the search query.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-brand-50 dark:bg-rose-500/10 text-brand-600 dark:text-rose-400 hover:bg-brand-100 dark:hover:bg-rose-500/20 sf-transition"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters & View All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/40 text-[var(--sf-text-muted)]">
                  <th className="py-3 px-4 text-label font-medium">Receipt & ID</th>
                  <th className="py-3 px-4 text-label font-medium">Date & Time</th>
                  <th className="py-3 px-4 text-label font-medium">Items Ordered</th>
                  <th className="py-3 px-4 text-label font-medium">Channel / Tags</th>
                  <th className="py-3 px-4 text-label font-medium text-right">Amount</th>
                  <th className="py-3 px-4 text-label font-medium">Status</th>
                  <th className="py-3 px-4 text-label font-medium">Payment ID</th>
                  <th className="py-3 px-4 text-label font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sf-border-light)]">
                {filteredOrders.map((ord) => {
                  const payment = ord.payments[0];
                  return (
                    <tr key={ord.id} className="hover:bg-[var(--sf-surface-hover)] sf-transition group">
                      {/* Receipt & Copy Button */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-[var(--sf-text-primary)]">
                            {ord.receipt}
                          </span>
                          <button
                            onClick={() => copyToClipboard(ord.receipt, `rcpt-${ord.id}`)}
                            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] p-0.5 rounded opacity-0 group-hover:opacity-100 sf-transition"
                            title="Copy receipt number"
                          >
                            {copiedId === `rcpt-${ord.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="block text-[11px] text-[var(--sf-text-muted)] font-mono mt-0.5">
                          {ord.id.substring(0, 14)}…
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[var(--sf-text-secondary)] whitespace-nowrap" suppressHydrationWarning>
                        <div className="text-[12px] font-medium text-[var(--sf-text-primary)]" suppressHydrationWarning>
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-[var(--sf-text-muted)]" suppressHydrationWarning>
                          {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-xs">
                          {ord.cart?.items.map((it) => (
                            <div key={it.id} className="text-[12px] flex items-center justify-between gap-2">
                              <span className="font-medium text-[var(--sf-text-primary)] truncate">
                                {it.product.name}
                              </span>
                              <span className="text-[var(--sf-text-muted)] shrink-0 font-mono text-[11px]">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Channel & AI Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {ord.isAiAssisted && (
                            <StatusBadge variant="info">AI Buyer</StatusBadge>
                          )}
                          {(ord.hasUpsellItem || ord.cart?.items.some((i) => i.isUpsell)) && (
                            <StatusBadge variant="neutral" className="border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              +Upsell
                            </StatusBadge>
                          )}
                          {!ord.isAiAssisted && !ord.hasUpsellItem && (
                            <span className="text-[11px] text-[var(--sf-text-muted)]">Direct</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums text-[var(--sf-text-primary)]">
                        {formatCurrency(ord.amountMinor)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          variant={
                            ord.status === 'PAID'
                              ? 'success'
                              : ord.status === 'PENDING'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {ord.status === 'PAID'
                            ? 'Paid'
                            : ord.status === 'PENDING'
                            ? 'Pending'
                            : 'Failed'}
                        </StatusBadge>
                      </td>

                      {/* Payment ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--sf-text-muted)]">
                        {payment?.razorpayPaymentId ? (
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[110px]">{payment.razorpayPaymentId}</span>
                            <button
                              onClick={() =>
                                copyToClipboard(payment.razorpayPaymentId!, `pay-${ord.id}`)
                              }
                              className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] p-0.5 rounded opacity-0 group-hover:opacity-100 sf-transition"
                              title="Copy Payment ID"
                            >
                              {copiedId === `pay-${ord.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/merchant/orders/${ord.id}`}
                          className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-rose-400 dark:hover:text-rose-300 sf-transition"
                        >
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

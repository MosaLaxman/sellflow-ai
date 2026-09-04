'use client';

import React, { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShoppingBag,
  CreditCard,
  Bot,
  Sparkles,
  ShieldCheck,
  Code2,
  Eye,
  Copy,
  Check,
} from 'lucide-react';

interface OrderDetailViewProps {
  order: any;
  auditLogs: any[];
  merchantSlug: string;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  auditLogs,
  merchantSlug,
}) => {
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'TECHNICAL'>('SIMPLE');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const payment = order.payments?.[0];
  const formatCurrency = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimelineAction = (action: string, reason: string) => {
    if (action.includes('AI Buyer') || reason.includes('AI Buyer')) {
      return 'AI Shopper initiated checkout';
    }
    if (action.includes('PAYMENT_RECOVERY_OFFERED') || action.includes('recovery modal presented')) {
      return 'In-App Payment Recovery modal presented';
    }
    if (action.includes('PAYMENT_RECOVERY_RETRIED') || action.includes('Retry Payment')) {
      return 'Customer retried payment via recovery modal';
    }
    if (action.includes('PAYMENT_FAILED') || reason.includes('declined')) {
      return 'Payment attempt declined by gateway';
    }
    if (action.includes('Payment captured') || action.includes('payment.captured')) {
      return 'Payment verified & captured';
    }
    if (action.includes('Order created') || action.includes('Created')) {
      return 'Order created and confirmed';
    }
    return action;
  };

  return (
    <main className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Bar with View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <a
            href="/merchant/orders"
            className="p-2 rounded-sf border border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
            title="Back to orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--sf-text-primary)] tracking-tight">
                Order #{order.receipt}
              </h1>
              <StatusBadge
                variant={
                  order.status === 'PAID' ? 'success' :
                  order.status === 'PENDING' ? 'warning' : 'error'
                }
              >
                {order.status === 'PAID' ? 'Paid & Completed' :
                 order.status === 'PENDING' ? 'Pending Payment' : 'Payment Failed'}
              </StatusBadge>
            </div>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5" suppressHydrationWarning>
              Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center p-1 rounded-full bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode('SIMPLE')}
            className={`px-3 py-1 rounded-full font-medium sf-transition flex items-center gap-1.5 ${
              viewMode === 'SIMPLE'
                ? 'bg-[var(--sf-surface)] text-[var(--sf-text-primary)] font-semibold shadow-xs text-brand-600 dark:text-rose-400'
                : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Customer & Order View</span>
          </button>
          <button
            onClick={() => setViewMode('TECHNICAL')}
            className={`px-3 py-1 rounded-full font-medium sf-transition flex items-center gap-1.5 ${
              viewMode === 'TECHNICAL'
                ? 'bg-[var(--sf-surface)] text-[var(--sf-text-primary)] font-semibold shadow-xs text-brand-600 dark:text-rose-400'
                : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Technical Gateway IDs</span>
          </button>
        </div>
      </div>

      {/* Hero Order Total */}
      <div className="p-6 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-label block mb-1">Total Paid Amount</span>
          <span className="text-3xl sm:text-4xl font-extrabold text-[var(--sf-text-primary)] tabular-nums">
            {formatCurrency(order.amountMinor)}
          </span>
          <span className="text-xs text-[var(--sf-text-muted)] block mt-1">
            Server-verified pricing calculated in paise
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {order.isAiAssisted && (
            <div className="px-3 py-1.5 rounded-sf bg-brand-50 dark:bg-rose-950/40 border border-brand-200 dark:border-rose-900/50 text-brand-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assisted Sale</span>
            </div>
          )}
          {order.hasUpsellItem && (
            <div className="px-3 py-1.5 rounded-sf bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Includes ₹{(order.upsellAmountMinor / 100).toLocaleString('en-IN')} Add-on</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Items & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchased Items Card */}
          <section className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] overflow-hidden shadow-sf">
            <div className="p-4 border-b border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/50 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
                Purchased Products
              </h2>
              <span className="text-xs text-[var(--sf-text-muted)]">
                {order.cart?.items?.length || 1} {order.cart?.items?.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-[var(--sf-border-light)]">
              {order.cart?.items?.map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-[var(--sf-text-muted)]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-[var(--sf-text-primary)] block truncate">
                        {item.product.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[var(--sf-text-muted)]">
                          Qty: {item.quantity} × {formatCurrency(item.unitPriceMinor)}
                        </span>
                        {item.isUpsell && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-brand-50 dark:bg-rose-950/40 text-brand-700 dark:text-rose-300 border border-brand-200/60 dark:border-rose-900/50">
                            Add-on Item
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-bold text-xs tabular-nums text-[var(--sf-text-primary)] shrink-0">
                    {formatCurrency(item.lineTotalMinor)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[var(--sf-bg-alt)]/30 border-t border-[var(--sf-border)] flex justify-between items-center text-xs">
              <span className="font-semibold text-[var(--sf-text-primary)]">Order Total</span>
              <span className="font-bold text-sm text-[var(--sf-text-primary)] tabular-nums">
                {formatCurrency(order.amountMinor)}
              </span>
            </div>
          </section>

          {/* Payment Status Card */}
          <section className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-5 shadow-sf space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
              Payment & Settlement Status
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-[var(--sf-text-muted)] block">Payment Method</span>
                <span className="font-semibold text-[var(--sf-text-primary)] capitalize">
                  {payment?.method || 'Razorpay Gateway'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[var(--sf-text-muted)] block">Settlement Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{order.status === 'PAID' ? 'Captured & Verified' : order.status}</span>
                </span>
              </div>
            </div>
          </section>

          {/* Technical Gateway IDs (Shown if in Technical mode or expanded) */}
          {viewMode === 'TECHNICAL' && (
            <section className="border border-brand-200 dark:border-rose-900/40 rounded-sf-lg bg-brand-50/30 dark:bg-rose-950/10 p-5 shadow-sf space-y-3 animate-fade-in font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--sf-border)]">
                <span className="font-bold text-[var(--sf-text-primary)] flex items-center gap-1.5 font-sans">
                  <Code2 className="w-4 h-4 text-brand-600 dark:text-rose-400" />
                  <span>Developer & Gateway IDs</span>
                </span>
                <span className="text-[10px] text-[var(--sf-text-muted)] font-mono">HMAC SHA-256 Verified</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--sf-text-muted)]">Razorpay Order ID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--sf-text-primary)] font-bold">{order.razorpayOrderId || '—'}</span>
                    {order.razorpayOrderId && (
                      <button
                        onClick={() => handleCopy(order.razorpayOrderId, 'rzp_order')}
                        className="p-1 hover:bg-[var(--sf-surface)] rounded text-[var(--sf-text-muted)]"
                        title="Copy ID"
                      >
                        {copiedId === 'rzp_order' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {payment && (
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--sf-text-muted)]">Payment ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--sf-text-primary)]">{payment.razorpayPaymentId}</span>
                      <button
                        onClick={() => handleCopy(payment.razorpayPaymentId, 'rzp_pay')}
                        className="p-1 hover:bg-[var(--sf-surface)] rounded text-[var(--sf-text-muted)]"
                        title="Copy ID"
                      >
                        {copiedId === 'rzp_pay' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[var(--sf-text-muted)]">Database Order ID:</span>
                  <span className="text-[var(--sf-text-secondary)] text-[10px]">{order.id}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Order Timeline */}
        <div>
          <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-5 shadow-sf space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--sf-text-muted)]">
              Order Timeline
            </h2>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-[var(--sf-text-muted)]">No timeline events recorded.</p>
            ) : (
              <div className="relative pl-4 border-l border-[var(--sf-border)] space-y-5">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-[var(--sf-bg)]" />
                    <span className="text-[10px] font-mono text-[var(--sf-text-muted)] block" suppressHydrationWarning>
                      {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                    </span>
                    <p className="text-xs font-semibold text-[var(--sf-text-primary)] mt-0.5">
                      {formatTimelineAction(log.action, log.reason)}
                    </p>
                    <p className="text-[11px] text-[var(--sf-text-secondary)] mt-0.5 leading-relaxed">
                      {log.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

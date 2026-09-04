import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowRight, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MerchantDashboardPage() {
  // Find primary merchant
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
    include: { policy: true },
  });

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-[var(--sf-text-secondary)]">
        Merchant record not found. Run <code className="mx-1 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-sm">npm run seed</code> first.
      </div>
    );
  }

  // Authoritative calculations from real database records (Zero synthetic data!)
  const paidOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: 'PAID',
    },
    include: {
      payments: true,
      cart: { include: { items: { include: { product: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCompletedRevenueMinor = paidOrders.reduce((sum, ord) => sum + ord.amountMinor, 0);
  const totalCompletedOrders = paidOrders.length;
  const aovMinor = totalCompletedOrders > 0 ? Math.round(totalCompletedRevenueMinor / totalCompletedOrders) : 0;

  const aiAssistedOrders = paidOrders.filter((ord) => ord.isAiAssisted);
  const aiAssistedRevenueMinor = aiAssistedOrders.reduce((sum, ord) => sum + ord.amountMinor, 0);

  const upsellOrders = paidOrders.filter((ord) => ord.hasUpsellItem);
  const upsellRevenueMinor = upsellOrders.reduce((sum, ord) => sum + ord.upsellAmountMinor, 0);

  const totalSessions = await prisma.customerSession.count({
    where: { merchantId: merchant.id },
  });

  const conversionRate = totalSessions > 0 ? ((totalCompletedOrders / totalSessions) * 100).toFixed(1) : '0.0';

  const pendingOrdersCount = await prisma.order.count({
    where: {
      merchantId: merchant.id,
      status: 'PENDING',
    },
  });

  const failedOrdersCount = await prisma.order.count({
    where: {
      merchantId: merchant.id,
      status: { in: ['PAYMENT_FAILED', 'FAILED'] },
    },
  });

  const blockedDecisionsCount = await prisma.aIAction.count({
    where: {
      merchantId: merchant.id,
      policyResult: 'BLOCKED',
    },
  });

  // Revenue at risk = pending + failed order amounts
  const atRiskOrders = await prisma.order.findMany({
    where: {
      merchantId: merchant.id,
      status: { in: ['PENDING', 'PAYMENT_FAILED', 'FAILED'] },
    },
  });
  const revenueAtRiskMinor = atRiskOrders.reduce((sum, ord) => sum + ord.amountMinor, 0);

  const totalOrders = totalCompletedOrders + pendingOrdersCount + failedOrdersCount;
  const recoveryRate = totalOrders > 0 ? ((totalCompletedOrders / totalOrders) * 100).toFixed(0) : '—';

  const recentOrders = await prisma.order.findMany({
    where: { merchantId: merchant.id },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: { payments: true },
  });

  const formatCurrency = (minor: number) => {
    return `₹${(minor / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={merchant.slug} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[var(--sf-surface)] dark:bg-stone-900/90 border border-[var(--sf-border)] dark:border-stone-800 text-xs shadow-2xs mb-4 sf-transition hover:border-stone-400 dark:hover:border-stone-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-[var(--sf-text-primary)] tracking-tight">{merchant.name}</span>
            <span className="text-[var(--sf-border)] dark:text-stone-700">|</span>
            <span className="text-[11px] text-[var(--sf-text-muted)] font-mono tracking-wide uppercase">Live Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--sf-text-primary)] tracking-tight leading-tight">
            Revenue, recovered.
          </h1>
          <p className="mt-2 text-sm text-[var(--sf-text-muted)] max-w-lg leading-relaxed">
            All metrics computed from verified PostgreSQL ledger & Razorpay transactions.
          </p>
        </section>

        {/* Three Primary Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--sf-border)] rounded-sf-lg overflow-hidden mb-12 border border-[var(--sf-border)] shadow-xs">
          {/* Revenue Recovered */}
          <div className="bg-[var(--sf-surface)] p-6 sm:p-8">
            <p className="sf-label mb-3">Revenue Recovered</p>
            <p className="sf-metric-hero text-[var(--sf-text-primary)]">
              {formatCurrency(totalCompletedRevenueMinor)}
            </p>
            <a
              href="/merchant/orders?status=PAID"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--sf-text-muted)] hover:text-brand-600 dark:hover:text-rose-400 font-medium sf-transition group/link"
              title="View completed orders"
            >
              <span className="group-hover/link:underline">{totalCompletedOrders} completed {totalCompletedOrders === 1 ? 'order' : 'orders'}</span>
              <span className="text-xs transition-transform group-hover/link:translate-x-0.5">→</span>
            </a>
          </div>

          {/* Revenue at Risk */}
          <div className="bg-[var(--sf-surface)] p-6 sm:p-8">
            <p className="sf-label mb-3">Revenue at Risk</p>
            <p className="sf-metric-hero" style={{ color: revenueAtRiskMinor > 0 ? 'var(--sf-warning)' : 'var(--sf-text-primary)' }}>
              {formatCurrency(revenueAtRiskMinor)}
            </p>
            <a
              href="/merchant/orders?status=PENDING"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--sf-text-muted)] hover:text-amber-600 dark:hover:text-amber-400 font-medium sf-transition group/link"
              title="View pending cases"
            >
              <span className="group-hover/link:underline">{pendingOrdersCount + failedOrdersCount} pending {pendingOrdersCount + failedOrdersCount === 1 ? 'case' : 'cases'}</span>
              <span className="text-xs transition-transform group-hover/link:translate-x-0.5">→</span>
            </a>
          </div>

          {/* Recovery Rate */}
          <div className="bg-[var(--sf-surface)] p-6 sm:p-8">
            <p className="sf-label mb-3">Recovery Rate</p>
            <p className="sf-metric-hero text-[var(--sf-text-primary)]">
              {recoveryRate}{recoveryRate !== '—' ? '%' : ''}
            </p>
            <p className="mt-2 text-sm text-[var(--sf-text-muted)]">
              {conversionRate}% session conversion
            </p>
          </div>
        </section>

        {/* Secondary Metrics Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
          <a
            href="/merchant/orders?type=AI_ASSISTED"
            className="p-4 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] sf-card-hover block group/subcard"
            title="View AI-assisted orders"
          >
            <p className="sf-label mb-1 text-brand-600 dark:text-brand-400 font-medium flex items-center justify-between">
              <span>AI Revenue</span>
              <span className="text-[10px] text-[var(--sf-text-muted)] group-hover/subcard:text-brand-600 dark:group-hover/subcard:text-rose-400">→</span>
            </p>
            <p className="sf-metric-default">{formatCurrency(aiAssistedRevenueMinor)}</p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{aiAssistedOrders.length} orders</p>
          </a>

          <a
            href="/merchant/orders?type=UPSELL"
            className="p-4 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] sf-card-hover block group/subcard"
            title="View orders with upsell items"
          >
            <p className="sf-label mb-1 text-brand-600 dark:text-brand-400 font-medium flex items-center justify-between">
              <span>Upsell Revenue</span>
              <span className="text-[10px] text-[var(--sf-text-muted)] group-hover/subcard:text-brand-600 dark:group-hover/subcard:text-rose-400">→</span>
            </p>
            <p className="sf-metric-default">{formatCurrency(upsellRevenueMinor)}</p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{upsellOrders.length} upsells</p>
          </a>

          <a
            href="/merchant/ai-decisions"
            className="p-4 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] sf-card-hover block group/subcard"
            title="View policy protected transactions"
          >
            <p className="sf-label mb-1 text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-between">
              <span>Policy Guarded</span>
              <span className="text-[10px] text-[var(--sf-text-muted)] group-hover/subcard:text-emerald-600 dark:group-hover/subcard:text-emerald-400">→</span>
            </p>
            <p className="sf-metric-default">{blockedDecisionsCount}</p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">Over-limit stopped</p>
          </a>

          <div className="p-4 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] sf-card-hover">
            <p className="sf-label mb-1">Avg. Order Value</p>
            <p className="sf-metric-default">{formatCurrency(aovMinor)}</p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{totalSessions} sessions</p>
          </div>

          <a
            href="/merchant/orders?status=FAILED"
            className="p-4 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] sf-card-hover block group/subcard col-span-2 sm:col-span-1"
            title="View failed payments"
          >
            <p className="sf-label mb-1 flex items-center justify-between">
              <span>Payment Failures</span>
              <span className="text-[10px] text-[var(--sf-text-muted)] group-hover/subcard:text-red-500">→</span>
            </p>
            <p className="sf-metric-default" style={{ color: failedOrdersCount > 0 ? 'var(--sf-error)' : undefined }}>
              {failedOrdersCount}
            </p>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">Carts preserved</p>
          </a>
        </section>

        {/* Recent Orders */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--sf-text-primary)]">Recent transactions</h2>
              <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">Authoritative live orders and customer checkout records</p>
            </div>
            <a
              href="/merchant/orders"
              className="text-xs font-medium text-brand-600 dark:text-rose-400 hover:text-brand-700 dark:hover:text-rose-300 sf-transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--sf-surface)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-hover)]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search & Filter Orders</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>

          <div className="border border-[var(--sf-border)] rounded-sf-lg overflow-hidden bg-[var(--sf-surface)]">
            {recentOrders.length === 0 ? (
              <EmptyState
                title="No transactions yet."
                description="Complete a checkout on the storefront to see real transaction data here."
                action={{ label: 'Open Storefront', href: `/store/${merchant.slug}` }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/40">
                      <th className="py-3 px-4 text-label font-semibold">Order #</th>
                      <th className="py-3 px-4 text-label font-semibold">Date & Time</th>
                      <th className="py-3 px-4 text-label font-semibold">Sales Assistance</th>
                      <th className="py-3 px-4 text-label font-semibold text-right">Total Amount</th>
                      <th className="py-3 px-4 text-label font-semibold">Payment Status</th>
                      <th className="py-3 px-4 text-label font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--sf-border-light)]">
                    {recentOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[var(--sf-surface-hover)] sf-transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[var(--sf-text-primary)]">
                            #{ord.receipt}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--sf-text-secondary)]" suppressHydrationWarning>
                          {new Date(ord.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {ord.isAiAssisted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-rose-950/40 text-brand-700 dark:text-rose-300 border border-brand-200/60 dark:border-rose-900/50">
                                AI Assisted
                              </span>
                            )}
                            {ord.hasUpsellItem && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50">
                                +Add-on Item
                              </span>
                            )}
                            {!ord.isAiAssisted && !ord.hasUpsellItem && (
                              <span className="text-[11px] text-[var(--sf-text-muted)]">Standard Checkout</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-[var(--sf-text-primary)]">
                          {formatCurrency(ord.amountMinor)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            variant={
                              ord.status === 'PAID' ? 'success' :
                              ord.status === 'PENDING' ? 'warning' : 'error'
                            }
                          >
                            {ord.status === 'PAID' ? 'Paid' :
                             ord.status === 'PENDING' ? 'Pending' : 'Failed'}
                          </StatusBadge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`/merchant/orders/${ord.id}`}
                            className="text-xs font-semibold text-brand-600 dark:text-rose-400 hover:underline sf-transition"
                          >
                            Details →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

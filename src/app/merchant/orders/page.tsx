import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { OrdersManager, SerializedOrder, StatusFilter } from '@/components/merchant/OrdersManager';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

interface MerchantOrdersPageProps {
  searchParams?: {
    q?: string;
    status?: string;
    type?: string;
  };
}

export default async function MerchantOrdersPage({ searchParams }: MerchantOrdersPageProps) {
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
  });

  if (!merchant) return null;

  const orders = await prisma.order.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    include: {
      payments: true,
      customerSession: true,
      cart: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  // Serialize orders for client component
  const serializedOrders: SerializedOrder[] = orders.map((ord) => ({
    id: ord.id,
    receipt: ord.receipt,
    amountMinor: ord.amountMinor,
    currency: ord.currency,
    status: ord.status,
    razorpayOrderId: ord.razorpayOrderId,
    createdAt: ord.createdAt.toISOString(),
    isAiAssisted: ord.isAiAssisted,
    hasUpsellItem: ord.cart?.items.some((it) => it.isUpsell) || false,
    customerSession: ord.customerSession
      ? {
          id: ord.customerSession.id,
          sessionToken: ord.customerSession.sessionToken,
        }
      : null,
    payments: ord.payments.map((p) => ({
      id: p.id,
      razorpayPaymentId: p.razorpayPaymentId,
      status: p.status,
      amountMinor: p.amountMinor,
      method: p.method,
    })),
    cart: ord.cart
      ? {
          id: ord.cart.id,
          items: ord.cart.items.map((it) => ({
            id: it.id,
            quantity: it.quantity,
            unitPriceMinor: it.unitPriceMinor,
            lineTotalMinor: it.lineTotalMinor,
            isUpsell: it.isUpsell,
            product: {
              id: it.product.id,
              name: it.product.name,
              category: it.product.category,
              imageUrl: it.product.imageUrl,
            },
          })),
        }
      : null,
  }));

  const rawStatus = searchParams?.status?.toUpperCase();
  const validStatus: StatusFilter =
    rawStatus === 'PAID' || rawStatus === 'PENDING'
      ? rawStatus
      : rawStatus === 'FAILED' || rawStatus === 'PAYMENT_FAILED'
      ? 'FAILED'
      : 'ALL';

  const rawType = searchParams?.type?.toUpperCase();
  const validType =
    rawType === 'AI_ASSISTED' || rawType === 'UPSELL'
      ? rawType
      : 'ALL';

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={merchant.slug} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Orders</h1>
            <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
              {orders.length} {orders.length === 1 ? 'transaction' : 'transactions'} recorded
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/store/${merchant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
            >
              <span>View Storefront</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="border border-[var(--sf-border)] rounded-sf-lg overflow-hidden bg-[var(--sf-surface)]">
            <EmptyState
              title="No orders yet."
              description="Everything starts here. Complete a checkout in your store to see real customer orders."
              action={{ label: 'Open Storefront', href: `/store/${merchant.slug}` }}
            />
          </div>
        ) : (
          <OrdersManager
            initialOrders={serializedOrders}
            merchantSlug={merchant.slug}
            defaultSearchQuery={searchParams?.q || ''}
            defaultStatusFilter={validStatus}
            defaultTypeFilter={validType}
          />
        )}
      </main>
    </div>
  );
}

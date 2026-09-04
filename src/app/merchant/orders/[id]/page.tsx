import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { OrderDetailView } from '@/components/merchant/OrderDetailView';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      merchant: true,
      payments: true,
      cart: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-[var(--sf-text-secondary)]">
        Order not found.
      </div>
    );
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      merchantId: order.merchantId,
      entityId: order.id,
    },
    orderBy: { createdAt: 'asc' },
  });

  const serializedOrder = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    payments: order.payments.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    cart: order.cart ? {
      ...order.cart,
      createdAt: order.cart.createdAt.toISOString(),
      updatedAt: order.cart.updatedAt.toISOString(),
      items: order.cart.items.map((it) => ({
        ...it,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
        product: {
          ...it.product,
          createdAt: it.product.createdAt.toISOString(),
          updatedAt: it.product.updatedAt.toISOString(),
        },
      })),
    } : null,
  };

  const serializedLogs = auditLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={order.merchant.slug} />
      <OrderDetailView
        order={serializedOrder}
        auditLogs={serializedLogs}
        merchantSlug={order.merchant.slug}
      />
    </div>
  );
}

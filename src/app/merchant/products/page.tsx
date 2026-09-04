import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { ProductListTable } from '@/components/merchant/ProductListTable';

export const dynamic = 'force-dynamic';

export default async function MerchantProductsPage() {
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
  });

  const products = merchant
    ? await prisma.product.findMany({
        where: { merchantId: merchant.id },
        orderBy: { priceMinor: 'asc' },
        include: {
          relations: {
            include: { relatedProduct: true },
          },
        },
      })
    : [];

  const serialized = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    priceMinor: p.priceMinor,
    currency: p.currency,
    imageUrl: p.imageUrl,
    stockQuantity: p.stockQuantity,
    status: p.status,
    tags: p.tags,
    attributes: (p.attributes as Record<string, any>) || {},
    relations: p.relations.map((r) => ({
      id: r.id,
      relationType: r.relationType,
      relatedProduct: {
        id: r.relatedProduct.id,
        name: r.relatedProduct.name,
        priceMinor: r.relatedProduct.priceMinor,
      },
    })),
  }));

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug="apex-sports" />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Products</h1>
            <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
              Manage your product catalog, pricing, and inventory.
            </p>
          </div>
          <a
            href="/merchant/products/new"
            className="px-4 py-2 rounded-sf bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm sf-transition"
          >
            Add Product
          </a>
        </div>

        <ProductListTable initialProducts={serialized} />
      </main>
    </div>
  );
}

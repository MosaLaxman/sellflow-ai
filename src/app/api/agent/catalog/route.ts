/**
 * SellFlow AI — AI-Readable Catalog API
 * 
 * Structured JSON endpoint for external AI agents to discover
 * what a merchant sells. Does not expose secrets or internal data.
 * 
 * GET /api/agent/catalog?merchant=apex-sports&category=Footwear&priceMax=5000&inStock=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const merchantSlug = searchParams.get('merchant') || 'apex-sports';
    const query = searchParams.get('query');
    const category = searchParams.get('category');
    const priceMaxStr = searchParams.get('priceMax');
    const inStockOnly = searchParams.get('inStock') !== 'false';

    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantSlug },
      include: { policy: true },
    });

    if (!merchant) {
      return NextResponse.json({ error: `Merchant "${merchantSlug}" not found` }, { status: 404 });
    }

    // Build query filter
    const where: any = {
      merchantId: merchant.id,
      status: 'ACTIVE',
    };

    if (inStockOnly) {
      where.stockQuantity = { gt: 0 };
    }

    if (category) {
      where.category = category;
    }

    if (priceMaxStr) {
      const priceMaxRupees = parseFloat(priceMaxStr);
      if (!isNaN(priceMaxRupees) && priceMaxRupees > 0) {
        where.priceMinor = { lte: Math.round(priceMaxRupees * 100) };
      }
    }

    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q.toLowerCase()] } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { priceMinor: 'asc' },
      include: {
        relations: {
          include: { relatedProduct: { select: { id: true, name: true, category: true, priceMinor: true, imageUrl: true } } },
        },
      },
    });

    // Structured, AI-readable response
    return NextResponse.json({
      protocol: 'SellFlow-Agentic-Commerce/1.0',
      authenticated: Boolean(authHeader?.startsWith('Bearer ')),
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        currency: merchant.currency,
        capabilities: {
          aiDiscovery: true,
          aiRecommendations: true,
          aiUpsell: merchant.policy?.allowUpsell ?? false,
          aiCheckout: true,
          razorpayPayment: true,
          customerConfirmationRequired: merchant.policy?.requireCustomerConfirmation ?? true,
          maxAutonomousOrderRupees: merchant.policy ? merchant.policy.maxAutonomousOrderAmount / 100 : 10000,
          maxUpsellPercentage: merchant.policy?.maxAutomaticUpsellPercentage ?? 50,
        },
      },
      catalog: {
        totalProducts: products.length,
        categories: [...new Set(products.map((p) => p.category))],
        products: products.map((p) => {
          const rawAttributes = (p.attributes as Record<string, any>) || {};
          const mrpRupees = typeof rawAttributes.mrpRupees === 'number' ? rawAttributes.mrpRupees : undefined;

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.priceMinor / 100,
            originalPrice: mrpRupees || Math.round((p.priceMinor / 100) * 1.25),
            currency: p.currency,
            category: p.category,
            imageUrl: p.imageUrl,
            useCases: p.useCases,
            attributes: rawAttributes,
            availability: {
              inStock: p.stockQuantity > 0,
              quantity: p.stockQuantity,
            },
            tags: p.tags,
            relatedProducts: p.relations.map((r) => ({
              id: r.relatedProduct.id,
              name: r.relatedProduct.name,
              category: r.relatedProduct.category,
              price: r.relatedProduct.priceMinor / 100,
              imageUrl: r.relatedProduct.imageUrl,
              relationType: r.relationType,
            })),
          };
        }),
      },
    });
  } catch (error) {
    console.error('[API agent/catalog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

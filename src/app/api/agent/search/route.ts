/**
 * SellFlow AI — AI Agent Search API
 * 
 * POST /api/agent/search
 * Structured search endpoint for AI agents to find products.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { searchCatalog } from '@/lib/catalog/search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant: merchantSlug, query, category, budgetMax, useCase, limit = 10 } = body;

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Missing required field: merchant' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantSlug },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const results = await searchCatalog({
      merchantId: merchant.id,
      query: query || '',
      category,
      budgetMaxRupees: budgetMax,
      useCase,
      limit: Math.min(limit, 20),
    });

    return NextResponse.json({
      merchant: merchantSlug,
      query: query || '',
      totalResults: results.length,
      results: results.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.priceMinor / 100,
        currency: p.currency,
        imageUrl: p.imageUrl,
        availability: {
          inStock: p.stockQuantity > 0,
          quantity: p.stockQuantity,
        },
        tags: p.tags,
        useCases: p.useCases,
        attributes: p.attributes,
        relevanceScore: p.relevanceScore,
      })),
    });
  } catch (error) {
    console.error('[API agent/search] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

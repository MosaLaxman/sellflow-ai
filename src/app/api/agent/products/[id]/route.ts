/**
 * SellFlow AI — AI Agent Product Detail API
 * 
 * GET /api/agent/products/[id]?merchant=apex-sports
 * Returns structured product detail for AI agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const merchantSlug = request.nextUrl.searchParams.get('merchant');

    if (!merchantSlug) {
      return NextResponse.json({ error: 'Missing required parameter: merchant' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantSlug },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        merchantId: merchant.id,
        status: 'ACTIVE',
      },
      include: {
        relations: {
          include: {
            relatedProduct: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                priceMinor: true,
                currency: true,
                stockQuantity: true,
                tags: true,
                useCases: true,
                attributes: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.priceMinor / 100,
        currency: product.currency,
        category: product.category,
        useCases: product.useCases,
        attributes: product.attributes,
        tags: product.tags,
        availability: {
          inStock: product.stockQuantity > 0,
          quantity: product.stockQuantity,
        },
        relatedProducts: product.relations.map((r) => ({
          id: r.relatedProduct.id,
          name: r.relatedProduct.name,
          description: r.relatedProduct.description,
          category: r.relatedProduct.category,
          price: r.relatedProduct.priceMinor / 100,
          currency: r.relatedProduct.currency,
          relationType: r.relationType,
          availability: {
            inStock: r.relatedProduct.stockQuantity > 0,
            quantity: r.relatedProduct.stockQuantity,
          },
        })),
      },
    });
  } catch (error) {
    console.error('[API agent/products] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

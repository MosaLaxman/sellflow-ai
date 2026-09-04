import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { searchCatalog } from '@/lib/catalog/search';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;

    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      include: { policy: true },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    let products: any[] = [];

    if (query.trim() || (category && category !== 'ALL')) {
      products = await searchCatalog({
        merchantId: merchant.id,
        query: query.trim(),
        category: category !== 'ALL' ? category : undefined,
        limit: 50,
      });
    } else {
      products = await prisma.product.findMany({
        where: {
          merchantId: merchant.id,
          status: 'ACTIVE',
        },
        orderBy: { priceMinor: 'asc' },
      });
    }

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        currency: merchant.currency,
        logoUrl: merchant.logoUrl,
        policy: merchant.policy,
      },
      products: products.map((p) => ({
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
        useCases: p.useCases,
        attributes: p.attributes,
      })),
    });
  } catch (error) {
    console.error('[API catalog] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

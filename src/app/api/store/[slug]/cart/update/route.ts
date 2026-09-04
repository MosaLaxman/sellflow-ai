import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { productId, quantity, sessionToken } = body;

    if (!productId || typeof quantity !== 'number') {
      return NextResponse.json({ error: 'ProductId and numeric quantity are required' }, { status: 400 });
    }

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({ where: { slug } });
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const session = await prisma.customerSession.findUnique({ where: { sessionToken } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const cart = await prisma.cart.findFirst({
      where: {
        merchantId: merchant.id,
        customerSessionId: session.id,
        status: 'ACTIVE',
      },
    });

    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
      include: { product: true },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not in cart' }, { status: 404 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: existingItem.id } });
    } else {
      if (existingItem.product.stockQuantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Only ${existingItem.product.stockQuantity} available.` },
          { status: 400 }
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity,
          lineTotalMinor: existingItem.product.priceMinor * quantity,
        },
      });
    }

    // Recalculate total
    const remaining = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    const newTotal = remaining.reduce((sum, it) => sum + it.product.priceMinor * it.quantity, 0);

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        subtotalMinor: newTotal,
        totalMinor: newTotal,
      },
    });

    return NextResponse.json({ success: true, totalMinor: newTotal });
  } catch (error) {
    console.error('[API cart update] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/logger';
import { PolicyEngine } from '@/lib/policy/engine';

async function getCartUpsellProposal(merchantId: string, cartItems: any[]) {
  if (!cartItems || cartItems.length === 0) return null;
  const policy = await prisma.merchantPolicy.findUnique({ where: { merchantId } });
  if (!policy || !policy.allowUpsell) return null;

  const cartProductIds = new Set(cartItems.map((item) => item.productId));

  for (const item of cartItems) {
    const relations = await prisma.productRelation.findMany({
      where: {
        merchantId,
        productId: item.productId,
        relationType: 'COMPATIBLE_ACCESSORY',
      },
      include: { relatedProduct: true },
      orderBy: { confidence: 'desc' },
    });

    for (const rel of relations) {
      if (
        !cartProductIds.has(rel.relatedProduct.id) &&
        rel.relatedProduct.status === 'ACTIVE' &&
        rel.relatedProduct.stockQuantity > 0
      ) {
        const baseProduct = item.product || (await prisma.product.findUnique({ where: { id: item.productId } }));
        if (baseProduct) {
          const verdict = PolicyEngine.evaluateUpsell(policy, baseProduct, rel.relatedProduct);
          if (verdict.verdict === 'ALLOWED') {
            return {
              product: {
                id: rel.relatedProduct.id,
                name: rel.relatedProduct.name,
                description: rel.relatedProduct.description,
                category: rel.relatedProduct.category,
                priceMinor: rel.relatedProduct.priceMinor,
                currency: rel.relatedProduct.currency,
                imageUrl: rel.relatedProduct.imageUrl,
                stockQuantity: rel.relatedProduct.stockQuantity,
                tags: rel.relatedProduct.tags,
                useCases: rel.relatedProduct.useCases,
              },
              baseProductName: baseProduct.name,
              reason: `Frequently paired with ${baseProduct.name}. Within merchant policy.`,
            };
          }
        }
      }
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const sessionToken = request.nextUrl.searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json({ items: [], subtotalMinor: 0, totalMinor: 0, upsellProposal: null });
    }

    const merchant = await prisma.merchant.findUnique({ where: { slug } });
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const session = await prisma.customerSession.findUnique({ where: { sessionToken } });
    if (!session) return NextResponse.json({ items: [], subtotalMinor: 0, totalMinor: 0, upsellProposal: null });

    const cart = await prisma.cart.findFirst({
      where: {
        merchantId: merchant.id,
        customerSessionId: session.id,
        status: 'ACTIVE',
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ items: [], subtotalMinor: 0, totalMinor: 0, upsellProposal: null });
    }

    // Dynamic price recalculation from authoritative catalog
    let calculatedTotal = 0;
    const formattedItems = cart.items.map((item) => {
      const unitPrice = item.product.priceMinor;
      const lineTotal = unitPrice * item.quantity;
      calculatedTotal += lineTotal;

      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        priceMinor: unitPrice,
        quantity: item.quantity,
        lineTotalMinor: lineTotal,
        imageUrl: item.product.imageUrl,
        isUpsell: item.isUpsell,
      };
    });

    // Update cart total if different
    if (cart.totalMinor !== calculatedTotal) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          subtotalMinor: calculatedTotal,
          totalMinor: calculatedTotal,
        },
      });
    }

    const upsellProposal = await getCartUpsellProposal(merchant.id, cart.items);

    return NextResponse.json({
      id: cart.id,
      items: formattedItems,
      subtotalMinor: calculatedTotal,
      totalMinor: calculatedTotal,
      currency: cart.currency,
      upsellProposal,
    });
  } catch (error) {
    console.error('[API cart GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { productId, quantity = 1, isUpsell = false, sessionToken: clientToken } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({ where: { slug } });
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    // Validate product exists, belongs to merchant, and has stock
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        merchantId: merchant.id,
        status: 'ACTIVE',
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 });
    }

    if (product.stockQuantity < quantity) {
      const isSoldOut = product.stockQuantity <= 0;
      const errorMsg = isSoldOut
        ? `"${product.name}" is currently sold out. It will be back in stock soon — please check back in a few days!`
        : `Insufficient stock. Only ${product.stockQuantity} items available in store.`;
      return NextResponse.json(
        { error: errorMsg, isSoldOut },
        { status: 400 }
      );
    }

    // Ensure session exists
    let sessionToken = clientToken;
    let session = null;
    if (sessionToken) {
      session = await prisma.customerSession.findUnique({ where: { sessionToken } });
    }

    if (!session) {
      sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      session = await prisma.customerSession.create({
        data: {
          merchantId: merchant.id,
          sessionToken,
        },
      });
    }

    // Find or create active cart
    let cart = await prisma.cart.findFirst({
      where: {
        merchantId: merchant.id,
        customerSessionId: session.id,
        status: 'ACTIVE',
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          merchantId: merchant.id,
          customerSessionId: session.id,
          status: 'ACTIVE',
          currency: 'INR',
        },
      });
    }

    // Upsert CartItem
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQty,
          unitPriceMinor: product.priceMinor,
          lineTotalMinor: product.priceMinor * newQty,
          isUpsell: isUpsell || existingItem.isUpsell,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity,
          unitPriceMinor: product.priceMinor,
          lineTotalMinor: product.priceMinor * quantity,
          isUpsell,
        },
      });
    }

    // Recalculate cart totals
    const allItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    const newTotal = allItems.reduce((acc, it) => acc + it.product.priceMinor * it.quantity, 0);

    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        subtotalMinor: newTotal,
        totalMinor: newTotal,
      },
    });

    // Write Audit Log
    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'CUSTOMER',
      actorId: session.id,
      eventType: isUpsell ? 'UPSELL_ACCEPTED' : 'CART_UPDATED',
      entityType: 'Cart',
      entityId: cart.id,
      action: isUpsell ? 'Customer accepted complementary upsell' : 'Item added to cart',
      reason: `Added ${quantity}x "${product.name}" at authoritative price ₹${(product.priceMinor / 100).toLocaleString('en-IN')}`,
      metadata: {
        productId: product.id,
        quantity,
        unitPriceMinor: product.priceMinor,
        newTotalMinor: newTotal,
        isUpsell,
      },
    });

    const upsellProposal = await getCartUpsellProposal(merchant.id, allItems);

    return NextResponse.json({
      cartId: updatedCart.id,
      sessionToken,
      subtotalMinor: newTotal,
      totalMinor: newTotal,
      itemCount: allItems.reduce((acc, it) => acc + it.quantity, 0),
      upsellProposal,
    });
  } catch (error) {
    console.error('[API cart POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

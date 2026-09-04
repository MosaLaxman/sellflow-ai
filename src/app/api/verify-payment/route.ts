import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      return NextResponse.json(
        { error: 'Server configuration error: RAZORPAY_KEY_SECRET is missing.' },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Accept all naming conventions (snake_case, camelCase, generic):
    const order_id =
      body.razorpay_order_id ||
      body.razorpayOrderId ||
      (typeof body.order_id === 'string' && body.order_id.startsWith('order_') ? body.order_id : null) ||
      (typeof body.orderId === 'string' && body.orderId.startsWith('order_') ? body.orderId : null) ||
      body.order_id ||
      body.orderId;

    const payment_id =
      body.razorpay_payment_id ||
      body.razorpayPaymentId ||
      body.payment_id ||
      body.paymentId;

    const razorpay_signature =
      body.razorpay_signature ||
      body.razorpaySignature ||
      body.signature;

    // Validate missing fields
    if (!order_id || !payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: order_id, payment_id, and razorpay_signature are required.',
          received: {
            order_id: Boolean(order_id),
            payment_id: Boolean(payment_id),
            razorpay_signature: Boolean(razorpay_signature),
          },
        },
        { status: 400 }
      );
    }

    // Compute expected signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    // Constant-time buffer comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(razorpay_signature, 'utf8');

    const isSignatureValid =
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    const orderWhereConditions: any[] = [{ razorpayOrderId: order_id }];
    if (body.internalOrderId) {
      orderWhereConditions.push({ id: body.internalOrderId });
    }
    if (body.orderId && typeof body.orderId === 'string' && !body.orderId.startsWith('order_')) {
      orderWhereConditions.push({ id: body.orderId });
    }

    if (!isSignatureValid) {
      console.warn(`[Verify Payment] Signature mismatch for order ${order_id}`);

      // If an internal order exists, mark payment failed and log audit event
      const internalOrder = await prisma.order.findFirst({
        where: { OR: orderWhereConditions },
      });

      if (internalOrder) {
        await prisma.order.update({
          where: { id: internalOrder.id },
          data: { status: 'PAYMENT_FAILED' },
        });

        await AuditLogger.log({
          merchantId: internalOrder.merchantId,
          actorType: 'SYSTEM',
          eventType: 'PAYMENT_FAILED',
          entityType: 'Order',
          entityId: internalOrder.id,
          action: 'Razorpay signature verification rejected',
          reason: 'HMAC-SHA256 signature comparison failed',
          metadata: { order_id, payment_id },
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment signature. Verification failed.',
        },
        { status: 400 }
      );
    }

    // Signature matches!
    // Check if there is an associated internal Order in PostgreSQL to update
    const internalOrder = await prisma.order.findFirst({
      where: { OR: orderWhereConditions },
      include: {
        cart: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (internalOrder) {
      // Transactionally update Order, Payment, Cart, and deduct stock
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: internalOrder.id },
          data: { status: 'PAID' },
        });

        if (internalOrder.cartId) {
          await tx.cart.update({
            where: { id: internalOrder.cartId },
            data: { status: 'CONVERTED' },
          });
        }

        // Deduct inventory
        if (internalOrder.cart?.items) {
          for (const item of internalOrder.cart.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        // Create or update payment entity
        await tx.payment.upsert({
          where: { razorpayPaymentId: payment_id },
          update: {
            status: 'captured',
            captured: true,
            amountMinor: internalOrder.amountMinor,
            method: 'razorpay_standard_checkout',
          },
          create: {
            orderId: internalOrder.id,
            razorpayPaymentId: payment_id,
            status: 'captured',
            captured: true,
            amountMinor: internalOrder.amountMinor,
            method: 'razorpay_standard_checkout',
          },
        });
      });

      // Audit Log
      await AuditLogger.log({
        merchantId: internalOrder.merchantId,
        actorType: 'SYSTEM',
        eventType: 'PAYMENT_VERIFIED',
        entityType: 'Order',
        entityId: internalOrder.id,
        action: 'Payment signature verified successfully',
        reason: `Cryptographic HMAC-SHA256 signature verified for order ${order_id}. Payment ${payment_id} captured.`,
        metadata: {
          order_id,
          payment_id,
          amountMinor: internalOrder.amountMinor,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment signature verified successfully.',
      order_id,
      payment_id,
      status: 'PAID',
    });
  } catch (error: any) {
    console.error('[API /api/verify-payment] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error during verification' },
      { status: 500 }
    );
  }
}

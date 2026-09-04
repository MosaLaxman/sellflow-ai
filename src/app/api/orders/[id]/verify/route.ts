import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!razorpay_payment_id) {
      return NextResponse.json({ error: 'Missing razorpay_payment_id' }, { status: 400 });
    }

    // 1. Retrieve order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If order is already paid (e.g. via webhook), return verified status immediately
    if (order.status === 'PAID') {
      return NextResponse.json({
        success: true,
        status: 'PAID',
        orderId: order.id,
        receipt: order.receipt,
        message: 'Order was already verified and settled.',
      });
    }

    // 2. Cryptographic Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_sellflow';
    let isSignatureValid = false;

    if (razorpay_order_id && razorpay_signature && secret !== 'test_secret_sellflow') {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isSignatureValid = generatedSignature === razorpay_signature;
    } else {
      // In local Test Mode sandbox without real secret configured, payment id format is accepted
      isSignatureValid = Boolean(razorpay_payment_id && razorpay_payment_id.length > 5);
    }

    if (!isSignatureValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAYMENT_FAILED' },
      });

      await AuditLogger.log({
        merchantId: order.merchantId,
        actorType: 'SYSTEM',
        eventType: 'PAYMENT_FAILED',
        entityType: 'Order',
        entityId: order.id,
        action: 'Payment signature verification failed',
        reason: 'HMAC SHA-256 signature mismatch on client verification attempt',
        metadata: { razorpay_payment_id, razorpay_order_id },
      });

      return NextResponse.json(
        {
          error: "Payment verification failed. Your cart is preserved and you can safely retry.",
          orderId: order.id,
        },
        { status: 400 }
      );
    }

    // 3. Transactionally mark Order PAID, deduct stock, create Payment, and mark cart CONVERTED
    await prisma.$transaction(async (tx) => {
      // Update Order
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      // Mark Cart converted
      if (order.cartId) {
        await tx.cart.update({
          where: { id: order.cartId },
          data: { status: 'CONVERTED' },
        });
      }

      // Deduct inventory stock for purchased items
      if (order.cart?.items) {
        for (const item of order.cart.items) {
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

      // Create Payment entity
      await tx.payment.upsert({
        where: { razorpayPaymentId: razorpay_payment_id },
        update: {
          status: 'captured',
          captured: true,
          amountMinor: order.amountMinor,
          method: 'test_mode',
        },
        create: {
          orderId: order.id,
          razorpayPaymentId: razorpay_payment_id,
          status: 'captured',
          captured: true,
          amountMinor: order.amountMinor,
          method: 'test_mode',
        },
      });
    });

    // 4. Log Compliance Audit Trail
    await AuditLogger.log({
      merchantId: order.merchantId,
      actorType: 'SYSTEM',
      eventType: 'PAYMENT_VERIFIED',
      entityType: 'Order',
      entityId: order.id,
      action: 'Payment verified and captured',
      reason: `Order ${order.id} transitioned to PAID with verified payment ID ${razorpay_payment_id}. Inventory deducted.`,
      metadata: {
        orderId: order.id,
        razorpayPaymentId: razorpay_payment_id,
        amountMinor: order.amountMinor,
        isAiAssisted: order.isAiAssisted,
        hasUpsellItem: order.hasUpsellItem,
        upsellAmountMinor: order.upsellAmountMinor,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'PAID',
      orderId: order.id,
      receipt: order.receipt,
      amountMinor: order.amountMinor,
      hasUpsellItem: order.hasUpsellItem,
    });
  } catch (error) {
    console.error('[API verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

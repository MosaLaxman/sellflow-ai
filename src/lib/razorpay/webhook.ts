import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { AuditLogger } from '../audit/logger';

export interface WebhookProcessingResult {
  status: 'PROCESSED' | 'DUPLICATE_SKIPPED' | 'FAILED' | 'UNHANDLED';
  message: string;
  orderId?: string;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[Webhook] Signature verification error:', err);
    return false;
  }
}

export async function processRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
): Promise<WebhookProcessingResult> {
  const isValid = verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    return {
      status: 'FAILED',
      message: 'Invalid webhook signature',
    };
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      status: 'FAILED',
      message: 'Invalid JSON payload',
    };
  }

  const eventType = payload.event;
  const eventId = payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Idempotency check in WebhookEvent table
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { razorpayEventId: eventId },
  });

  if (existingEvent && existingEvent.processingStatus === 'PROCESSED') {
    return {
      status: 'DUPLICATE_SKIPPED',
      message: `Event ${eventId} has already been processed. Duplicate delivery ignored.`,
    };
  }

  // 2. Extract entities
  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;
  const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

  let merchantId: string | null = null;
  let orderRecord = null;

  if (razorpayOrderId) {
    orderRecord = await prisma.order.findFirst({
      where: { razorpayOrderId },
      include: { merchant: true, cart: true },
    });
    if (orderRecord) {
      merchantId = orderRecord.merchantId;
    }
  }

  // 3. Record webhook entry in ledger
  await prisma.webhookEvent.upsert({
    where: { razorpayEventId: eventId },
    update: {
      processingStatus: 'PROCESSED',
      signatureValid: true,
      processedAt: new Date(),
    },
    create: {
      razorpayEventId: eventId,
      merchantId,
      eventType,
      payload,
      signatureValid: true,
      processingStatus: 'PROCESSED',
      processedAt: new Date(),
    },
  });

  // 4. Handle event types
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    if (orderRecord) {
      // Transactionally update Order and Payment
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderRecord.id },
          data: { status: 'PAID' },
        });

        // Mark cart converted
        if (orderRecord.cartId) {
          await tx.cart.update({
            where: { id: orderRecord.cartId },
            data: { status: 'CONVERTED' },
          });
        }

        if (paymentEntity?.id) {
          await tx.payment.upsert({
            where: { razorpayPaymentId: paymentEntity.id },
            update: {
              status: 'captured',
              captured: true,
              amountMinor: paymentEntity.amount,
              method: paymentEntity.method,
              rawStatus: paymentEntity,
            },
            create: {
              orderId: orderRecord.id,
              razorpayPaymentId: paymentEntity.id,
              status: 'captured',
              captured: true,
              amountMinor: paymentEntity.amount,
              method: paymentEntity.method,
              rawStatus: paymentEntity,
            },
          });
        }
      });

      // Write Audit Log
      await AuditLogger.log({
        merchantId: orderRecord.merchantId,
        actorType: 'SYSTEM',
        eventType: 'WEBHOOK_PAYMENT_CAPTURED',
        entityType: 'Order',
        entityId: orderRecord.id,
        action: 'Payment captured via Razorpay Webhook',
        reason: `Cryptographically verified webhook (${eventType}) transitioned order to PAID.`,
        metadata: {
          razorpayEventId: eventId,
          razorpayOrderId,
          razorpayPaymentId: paymentEntity?.id,
          amountMinor: paymentEntity?.amount || orderRecord.amountMinor,
        },
      });

      return {
        status: 'PROCESSED',
        message: `Order ${orderRecord.id} marked as PAID.`,
        orderId: orderRecord.id,
      };
    }
  } else if (eventType === 'payment.failed') {
    if (orderRecord) {
      // Payment state machine guard: Never downgrade a PAID order
      if (orderRecord.status === 'PAID') {
        return {
          status: 'PROCESSED',
          message: `Order ${orderRecord.id} is already PAID. Ignoring subsequent payment.failed event.`,
          orderId: orderRecord.id,
        };
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderRecord.id },
          data: { status: 'PAYMENT_FAILED' },
        });

        if (paymentEntity?.id) {
          await tx.payment.upsert({
            where: { razorpayPaymentId: paymentEntity.id },
            update: {
              status: 'failed',
              captured: false,
              amountMinor: paymentEntity.amount || orderRecord.amountMinor,
              method: paymentEntity.method,
              rawStatus: paymentEntity,
            },
            create: {
              orderId: orderRecord.id,
              razorpayPaymentId: paymentEntity.id,
              status: 'failed',
              captured: false,
              amountMinor: paymentEntity.amount || orderRecord.amountMinor,
              method: paymentEntity.method,
              rawStatus: paymentEntity,
            },
          });
        }
      });

      await AuditLogger.log({
        merchantId: orderRecord.merchantId,
        actorType: 'SYSTEM',
        eventType: 'WEBHOOK_PAYMENT_FAILED',
        entityType: 'Order',
        entityId: orderRecord.id,
        action: 'Payment failed reported by Razorpay Webhook',
        reason: `Gateway reported failure: ${paymentEntity?.error_description || 'Payment rejected by bank'}`,
        metadata: {
          razorpayEventId: eventId,
          errorCode: paymentEntity?.error_code,
          errorDesc: paymentEntity?.error_description,
        },
      });

      return {
        status: 'PROCESSED',
        message: `Order ${orderRecord.id} marked as PAYMENT_FAILED. Cart preserved.`,
        orderId: orderRecord.id,
      };
    }
  }

  return {
    status: 'PROCESSED',
    message: `Event ${eventType} recorded in idempotency ledger.`,
  };
}

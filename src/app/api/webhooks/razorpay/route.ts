import { NextRequest, NextResponse } from 'next/server';
import { processRazorpayWebhook } from '@/lib/razorpay/webhook';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_sellflow';

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    const result = await processRazorpayWebhook(rawBody, signature, secret);

    if (result.status === 'FAILED') {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      status: result.status,
      message: result.message,
      orderId: result.orderId,
    });
  } catch (error) {
    console.error('[API Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

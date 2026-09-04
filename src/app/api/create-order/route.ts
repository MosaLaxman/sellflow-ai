import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: 'Razorpay API credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { amount, currency = 'INR', receipt, notes } = body;

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      return NextResponse.json({ error: 'Amount is required and must be a valid number in paise.' }, { status: 400 });
    }

    // Minimum amount validation: 100 paise (₹1.00)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Call Razorpay API: POST https://api.razorpay.com/v1/orders
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: receiptId,
      notes: notes || {},
    });

    // Return required format: { order_id, amount, currency }
    return NextResponse.json({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
    });
  } catch (error: any) {
    console.error('[API /api/create-order] Razorpay order creation failed:', error);

    // Handle authentication failures with 401
    if (error?.statusCode === 401 || error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.includes('auth')) {
      return NextResponse.json(
        { error: 'Razorpay authentication failed. Verify API Key ID and Secret.' },
        { status: 401 }
      );
    }

    // Return 500 with descriptive error
    return NextResponse.json(
      {
        error: error?.error?.description || error?.message || 'Failed to create Razorpay order.',
      },
      { status: 500 }
    );
  }
}

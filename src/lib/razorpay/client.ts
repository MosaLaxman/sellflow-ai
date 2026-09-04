export interface CreateOrderParams {
  amountMinor: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
  keyId?: string;
  keySecret?: string;
}

export async function createRazorpayOrder(params: CreateOrderParams) {
  const key_id = params.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_sellflow';
  const key_secret = params.keySecret || process.env.RAZORPAY_KEY_SECRET || 'test_secret_sellflow';

  const authHeader = 'Basic ' + Buffer.from(`${key_id}:${key_secret}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(params.amountMinor),
      currency: (params.currency || 'INR').toUpperCase(),
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errorMsg = errData?.error?.description || errData?.error?.message || `Razorpay order creation failed with HTTP ${res.status}`;
    console.error('[Razorpay Client] Order creation failed:', errorMsg, errData);
    throw new Error(errorMsg);
  }

  const order = await res.json();
  return order;
}

export async function fetchRazorpayPayment(paymentId: string, customKeyId?: string, customKeySecret?: string) {
  const key_id = customKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_sellflow';
  const key_secret = customKeySecret || process.env.RAZORPAY_KEY_SECRET || 'test_secret_sellflow';

  const authHeader = 'Basic ' + Buffer.from(`${key_id}:${key_secret}`).toString('base64');

  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.description || `Failed to fetch payment ${paymentId}`);
  }

  return res.json();
}

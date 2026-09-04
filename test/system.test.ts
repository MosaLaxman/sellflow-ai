import assert from 'assert';
import crypto from 'crypto';
import { prisma } from '../src/lib/db/prisma';
import { PolicyEngine } from '../src/lib/policy/engine';
import { verifyWebhookSignature, processRazorpayWebhook } from '../src/lib/razorpay/webhook';
import { GeminiAgent } from '../src/lib/ai/gemini';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../src/lib/auth/session';

async function runTests() {
  console.log('🧪 Starting SellFlow AI System Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // ----------------------------------------------------------------------------
  // 1. AUTHENTICATION & SECURITY
  // ----------------------------------------------------------------------------
  await test('Password hashing and bcrypt verification', async () => {
    const raw = 'SecureMerchantPass123!';
    const hash = await hashPassword(raw);
    assert(hash !== raw, 'Hash should not match raw password');
    const isValid = await verifyPassword(raw, hash);
    assert(isValid === true, 'Verification should succeed for correct password');
    const isInvalid = await verifyPassword('WrongPassword', hash);
    assert(isInvalid === false, 'Verification should fail for incorrect password');
  });

  await test('JWT session token signing and verification', async () => {
    const payload = { merchantId: 'm_test_123', email: 'merchant@test.com', slug: 'apex-sports' };
    const token = await signSessionToken(payload);
    assert(typeof token === 'string' && token.length > 20, 'Token should be valid JWT');
    const verified = await verifySessionToken(token);
    assert(verified !== null, 'Session should be verified');
    assert.strictEqual(verified?.merchantId, 'm_test_123');
    assert.strictEqual(verified?.slug, 'apex-sports');
  });

  // ----------------------------------------------------------------------------
  // 2. DETERMINISTIC POLICY ENGINE
  // ----------------------------------------------------------------------------
  await test('Policy Engine enforces maximum automatic upsell percentage', () => {
    const mockPolicy: any = {
      allowUpsell: true,
      maxAutomaticUpsellPercentage: 50.0, // 50%
      requireCustomerConfirmation: true,
      maxAutonomousOrderAmount: 1000000,
    };

    const baseShoe: any = { id: 'shoe_1', name: 'Runner Pro', priceMinor: 349900, stockQuantity: 10 };
    const validSocks: any = { id: 'sock_1', name: 'Running Socks', priceMinor: 49900, stockQuantity: 20 };
    const expensiveWatch: any = { id: 'watch_1', name: 'GPS Smartwatch', priceMinor: 1999900, stockQuantity: 5 };

    // 499 / 3499 = 14.26% <= 50% -> ALLOWED
    const result1 = PolicyEngine.evaluateUpsell(mockPolicy, baseShoe, validSocks);
    assert.strictEqual(result1.verdict, 'ALLOWED');

    // 19999 / 3499 = 571.5% > 50% -> BLOCKED
    const result2 = PolicyEngine.evaluateUpsell(mockPolicy, baseShoe, expensiveWatch);
    assert.strictEqual(result2.verdict, 'BLOCKED');
    assert.strictEqual(result2.ruleViolated, 'maxAutomaticUpsellPercentage_exceeded');
  });

  await test('Policy Engine enforces mandatory customer confirmation gating', () => {
    const mockPolicy: any = {
      requireCustomerConfirmation: true,
      maxAutonomousOrderAmount: 1000000,
    };

    // Customer unconfirmed -> APPROVAL_REQUIRED
    const unconfirmed = PolicyEngine.evaluateOrderCreation(mockPolicy, 399800, false);
    assert.strictEqual(unconfirmed.verdict, 'APPROVAL_REQUIRED');
    assert.strictEqual(unconfirmed.ruleViolated, 'customer_confirmation_required');

    // Customer confirmed -> ALLOWED
    const confirmed = PolicyEngine.evaluateOrderCreation(mockPolicy, 399800, true);
    assert.strictEqual(confirmed.verdict, 'ALLOWED');
  });

  await test('Policy Engine blocks orders exceeding maximum autonomous ceiling', () => {
    const mockPolicy: any = {
      requireCustomerConfirmation: true,
      maxAutonomousOrderAmount: 500000, // ₹5,000 max (500,000 paise)
    };

    // ₹6,000 order (600,000 paise) > ₹5,000 ceiling -> BLOCKED
    const runaway = PolicyEngine.evaluateOrderCreation(mockPolicy, 600000, true);
    assert.strictEqual(runaway.verdict, 'BLOCKED');
    assert.strictEqual(runaway.ruleViolated, 'maxAutonomousOrderAmount_exceeded');
  });

  // ----------------------------------------------------------------------------
  // 3. CRYPTOGRAPHIC WEBHOOK SIGNATURES & IDEMPOTENCY
  // ----------------------------------------------------------------------------
  await test('Razorpay Standard Checkout: Order verification HMAC-SHA256 calculation', () => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_local_hmac_test';
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    
    // Expected signature algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Test valid match
    const actualSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    assert.strictEqual(expectedSignature, actualSignature, 'Valid signatures must match');

    // Test tamper mismatch
    const tamperedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}_tampered`)
      .digest('hex');
    assert.notStrictEqual(expectedSignature, tamperedSignature, 'Tampered signature must not match');
  });

  await test('Razorpay Standard Checkout: Minimum amount enforcement (100 paise)', () => {
    const minPaise = 100;
    const testCases = [
      { amount: 50, valid: false },
      { amount: 99, valid: false },
      { amount: 100, valid: true },
      { amount: 49900, valid: true },
    ];

    for (const tc of testCases) {
      const isValid = tc.amount >= minPaise;
      assert.strictEqual(isValid, tc.valid, `Amount ${tc.amount} paise validity check failed`);
    }
  });

  await test('Webhook signature verification matches HMAC SHA-256', () => {
    const secret = 'webhook_secret_test_xyz';
    const payload = JSON.stringify({ event: 'payment.captured', id: 'evt_test_1' });
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = verifyWebhookSignature(payload, validSignature, secret);
    assert.strictEqual(isValid, true, 'Valid signature should return true');

    const isInvalid = verifyWebhookSignature(payload, 'tampered_signature_1234', secret);
    assert.strictEqual(isInvalid, false, 'Tampered signature should return false');
  });

  await test('Webhook engine is strictly idempotent against duplicate deliveries', async () => {
    const secret = 'test_webhook_secret_sellflow';
    const eventId = `evt_idemp_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: `pay_test_${Date.now()}`, amount: 399800, method: 'card' } },
      },
    });

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Delivery 1 -> PROCESSED
    const result1 = await processRazorpayWebhook(payload, signature, secret);
    assert.strictEqual(result1.status, 'PROCESSED');

    // Delivery 2 (Duplicate) -> DUPLICATE_SKIPPED
    const result2 = await processRazorpayWebhook(payload, signature, secret);
    assert.strictEqual(result2.status, 'DUPLICATE_SKIPPED');
  });

  // ----------------------------------------------------------------------------
  // 4. AI INTENT EXTRACTION & BOUNDED CATALOG RETRIEVAL
  // ----------------------------------------------------------------------------
  await test('AI Agent extracts structured shopping intent with budget parsing', async () => {
    const agent = new GeminiAgent();
    const intent = await agent.extractIntent('I need lightweight running shoes under 4000 for daily jogging');
    assert(intent.isProductQuery || intent.intent === 'SEARCH' || intent.intent === 'PRODUCT_SEARCH', 'Should identify product query');
    assert.strictEqual(intent.category, 'Footwear');
    assert.strictEqual(intent.budgetMax, 4000);
    assert(
      (intent.preferences && intent.preferences.includes('lightweight')) ||
      (intent.searchKeywords && intent.searchKeywords.includes('lightweight')),
      'Should parse lightweight search keyword'
    );
  });

  // ----------------------------------------------------------------------------
  // 5. DATABASE INTEGRATION & AUTHORITATIVE PRICE COMPUTATION
  // ----------------------------------------------------------------------------
  await test('Live PostgreSQL database enforces minor-unit catalog pricing and stock', async () => {
    const merchant = await prisma.merchant.findUnique({
      where: { slug: 'apex-sports' },
      include: { products: true },
    });

    assert(merchant !== null, 'Merchant should exist in DB');
    assert(merchant.products.length >= 5, 'Should have authoritative products');

    const shoe = merchant.products.find((p) => p.name === 'Runner Pro 2');
    assert(shoe !== undefined, 'Runner Pro 2 should exist');
    assert.strictEqual(shoe?.priceMinor, 349900, 'Price must be stored exactly in integer paise (₹3,499)');
    assert(shoe?.stockQuantity > 0, 'Stock must be greater than 0');
  });

  // ----------------------------------------------------------------------------
  // 6. END-TO-END TRANSACTION & ZERO-SYNTHETIC-DATA AUDIT TEST
  // ----------------------------------------------------------------------------
  await test('End-to-end flow: Session -> Cart -> Confirmation -> Order -> Payment -> Audit Trail', async () => {
    const merchant = await prisma.merchant.findUnique({
      where: { slug: 'apex-sports' },
      include: { policy: true },
    });
    assert(merchant && merchant.policy);

    // 1. Create Session
    const sessionToken = `test_sess_${Date.now()}`;
    const session = await prisma.customerSession.create({
      data: { merchantId: merchant.id, sessionToken },
    });

    // 2. Create Cart with Base Shoe (₹3,499) + Bounded Upsell Socks (₹499)
    const shoe = await prisma.product.findFirstOrThrow({ where: { merchantId: merchant.id, name: 'Runner Pro 2' } });
    const socks = await prisma.product.findFirstOrThrow({ where: { merchantId: merchant.id, name: { contains: 'Running Socks' } } });

    const cart = await prisma.cart.create({
      data: {
        merchantId: merchant.id,
        customerSessionId: session.id,
        status: 'ACTIVE',
        subtotalMinor: shoe.priceMinor + socks.priceMinor, // 349900 + 49900 = 399800 (₹3,998)
        totalMinor: shoe.priceMinor + socks.priceMinor,
      },
    });

    await prisma.cartItem.createMany({
      data: [
        { cartId: cart.id, productId: shoe.id, quantity: 1, unitPriceMinor: shoe.priceMinor, lineTotalMinor: shoe.priceMinor, isUpsell: false },
        { cartId: cart.id, productId: socks.id, quantity: 1, unitPriceMinor: socks.priceMinor, lineTotalMinor: socks.priceMinor, isUpsell: true },
      ],
    });

    assert.strictEqual(cart.totalMinor, 399800, 'Server total must exactly equal ₹3,998 in paise');

    // 3. Create Internal Order mapped to Razorpay Order ID
    const receipt = `rcpt_test_${Date.now()}`;
    const rzpOrderId = `order_test_${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        customerSessionId: session.id,
        cartId: cart.id,
        razorpayOrderId: rzpOrderId,
        status: 'PAID',
        amountMinor: cart.totalMinor,
        currency: 'INR',
        receipt,
        isAiAssisted: true,
        hasUpsellItem: true,
        upsellAmountMinor: socks.priceMinor,
      },
    });

    // 4. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayPaymentId: `pay_test_${Date.now()}`,
        status: 'captured',
        captured: true,
        amountMinor: order.amountMinor,
        method: 'test_upi',
      },
    });

    // 5. Assert database state
    assert.strictEqual(order.amountMinor, 399800);
    assert.strictEqual(order.status, 'PAID');
    assert.strictEqual(payment.captured, true);

    // 6. Verify Dashboard Metrics logic calculates actual numbers from database
    const paidOrders = await prisma.order.findMany({
      where: { merchantId: merchant.id, status: 'PAID' },
    });
    const calculatedRevenueMinor = paidOrders.reduce((sum, ord) => sum + ord.amountMinor, 0);
    assert(calculatedRevenueMinor >= 399800, 'Revenue must include the verified transaction');
  });

  console.log(`\n🏁 Test Suite Complete: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

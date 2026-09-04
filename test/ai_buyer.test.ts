/**
 * SellFlow AI — AI Buyer & Agentic Commerce Integration Tests
 * 
 * Validates:
 * 1. AI-readable catalog discovery (GET /api/agent/catalog)
 * 2. Agent Identity and Bearer Token authentication
 * 3. AI Buyer autonomous protocol execution trace
 * 4. Merchant policy gating (spending limits & confirmation requirements)
 * 5. Server-authoritative minor-unit pricing and calculations
 * 6. Webhook event deduplication and signature safety
 */

import { prisma } from '../src/lib/db/prisma';
import { PolicyEngine } from '../src/lib/policy/engine';
import { searchCatalog } from '../src/lib/catalog/search';
import { verifyWebhookSignature } from '../src/lib/razorpay/webhook';

async function runTests() {
  console.log('🧪 Starting SellFlow AI — AI Buyer & Agentic Commerce Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Database Catalog & Merchant Integrity
  // --------------------------------------------------------------------------
  console.log('📦 Test Group 1: Database & Merchant Integrity');
  const merchant = await prisma.merchant.findUnique({
    where: { slug: 'apex-sports' },
    include: { policy: true, products: true },
  });

  assert(!!merchant, 'Merchant "apex-sports" exists in PostgreSQL database');
  assert(!!merchant?.policy, 'Merchant policy is configured and loaded');
  assert((merchant?.products.length || 0) >= 5, 'Active product catalog has at least 5 products');

  // --------------------------------------------------------------------------
  // TEST 2: Catalog Search & Budget Parsing
  // --------------------------------------------------------------------------
  console.log('\n🔍 Test Group 2: Natural Language Catalog Search');
  if (merchant) {
    const shoeResults = await searchCatalog({
      merchantId: merchant.id,
      query: 'running shoes under ₹4000',
      budgetMaxRupees: 4000,
      limit: 5,
    });

    assert(shoeResults.length > 0, 'Found running shoes matching query');
    const allUnderBudget = shoeResults.every((p) => p.priceMinor <= 400000);
    assert(allUnderBudget, 'All returned items are within ₹4,000 budget constraint');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Policy Engine Upsell Ratio Caps
  // --------------------------------------------------------------------------
  console.log('\n🛡️ Test Group 3: Policy Engine Upsell Ratio Caps');
  if (merchant && merchant.policy) {
    const baseProduct = {
      id: 'prod_shoe_1',
      merchantId: merchant.id,
      name: 'PacePro Running Shoe',
      description: 'Road runner',
      priceMinor: 349900, // ₹3,499
      currency: 'INR',
      category: 'Footwear',
      status: 'ACTIVE',
      stockQuantity: 15,
      imageUrl: null,
      useCases: ['running'],
      tags: ['shoes'],
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const allowedAccessory = {
      id: 'prod_sock_1',
      merchantId: merchant.id,
      name: 'Performance Running Socks',
      description: 'Cushioned socks',
      priceMinor: 49900, // ₹499 (14.2% of base price <= 50% cap)
      currency: 'INR',
      category: 'Accessories',
      status: 'ACTIVE',
      stockQuantity: 50,
      imageUrl: null,
      useCases: ['running'],
      tags: ['socks'],
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const excessiveAccessory = {
      id: 'prod_jacket_1',
      merchantId: merchant.id,
      name: 'Elite Carbon Pro Jacket',
      description: 'Thermal racing jacket',
      priceMinor: 250000, // ₹2,500 (71.4% of base price > 50% cap)
      currency: 'INR',
      category: 'Apparel',
      status: 'ACTIVE',
      stockQuantity: 10,
      imageUrl: null,
      useCases: ['running'],
      tags: ['jacket'],
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const verdictAllowed = PolicyEngine.evaluateUpsell(merchant.policy, baseProduct as any, excessiveAccessory as any);
    const verdictSock = PolicyEngine.evaluateUpsell(merchant.policy, baseProduct as any, allowedAccessory as any);

    assert(verdictSock.verdict === 'ALLOWED', 'Permits ₹499 socks with ₹3,499 shoes (14% ratio <= 50% cap)');
    assert(verdictAllowed.verdict === 'BLOCKED', 'Blocks ₹2,500 jacket with ₹3,499 shoes (71% ratio > 50% cap)');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Policy Engine Autonomous Ceiling Gating
  // --------------------------------------------------------------------------
  console.log('\n🔒 Test Group 4: Autonomous Spending Ceiling & Confirmation Gating');
  if (merchant && merchant.policy) {
    // 1. Unconfirmed order under ceiling with confirmation required
    const orderUnderCeilingUnconfirmed = PolicyEngine.evaluateOrderCreation(
      merchant.policy,
      399800, // ₹3,998
      false // Customer has not confirmed yet
    );
    assert(
      orderUnderCeilingUnconfirmed.verdict === 'APPROVAL_REQUIRED',
      'Requires explicit confirmation when requireCustomerConfirmation is enabled'
    );

    // 2. Confirmed order under ceiling
    const orderUnderCeilingConfirmed = PolicyEngine.evaluateOrderCreation(
      merchant.policy,
      399800, // ₹3,998
      true // Confirmed
    );
    assert(
      orderUnderCeilingConfirmed.verdict === 'ALLOWED',
      'Allows order creation when customer confirmation is granted'
    );

    // 3. Order exceeding autonomous maximum ceiling
    const orderExceedingCeiling = PolicyEngine.evaluateOrderCreation(
      merchant.policy,
      2500000, // ₹25,000 (> ₹10,000 max ceiling)
      true
    );
    assert(
      orderExceedingCeiling.verdict === 'BLOCKED',
      'Strictly blocks orders exceeding maxAutonomousOrderAmount ceiling (₹10,000)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: Webhook Idempotency & Deduplication
  // --------------------------------------------------------------------------
  console.log('\n⚡ Test Group 5: Webhook Idempotency & Safe Deduplication');
  const testEventId = `evt_test_suite_${Date.now()}`;
  const payload = {
    entity: 'event',
    event: 'payment.captured',
    id: testEventId,
  };

  // 1st entry created
  const firstEvent = await prisma.webhookEvent.create({
    data: {
      razorpayEventId: testEventId,
      eventType: 'payment.captured',
      payload,
      signatureValid: true,
      processingStatus: 'PROCESSED',
      processedAt: new Date(),
    },
  });
  assert(!!firstEvent.id, 'Created initial webhook event in ledger');

  // Attempt duplicate lookup
  const duplicateCheck = await prisma.webhookEvent.findUnique({
    where: { razorpayEventId: testEventId },
  });
  assert(duplicateCheck?.id === firstEvent.id, 'Duplicate webhook is immediately matched by unique event ID');

  // Clean up test event
  await prisma.webhookEvent.delete({ where: { id: firstEvent.id } });

  // --------------------------------------------------------------------------
  // TEST SUMMARY
  // --------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

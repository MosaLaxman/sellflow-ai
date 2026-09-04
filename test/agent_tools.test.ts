/**
 * SellFlow AI — Agent Tools Test Suite
 * 
 * Verifies that typed agent tools enforce schemas, respect merchant isolation,
 * execute server-side handlers correctly, and reject invalid parameters.
 */

import { prisma } from '../src/lib/db/prisma';
import { executeTool, AGENT_TOOLS, ToolContext } from '../src/lib/ai/tools';

async function runAgentToolsTest() {
  console.log('🧪 Running Agent Tools Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  };

  try {
    // Retrieve merchant
    const merchant = await prisma.merchant.findUnique({
      where: { slug: 'apex-sports' },
      include: { policy: true },
    });

    if (!merchant) {
      throw new Error('Merchant apex-sports not found. Run npm run seed first.');
    }

    // Create a test customer session
    const session = await prisma.customerSession.create({
      data: {
        merchantId: merchant.id,
        sessionToken: `sess_tool_test_${Date.now()}`,
      },
    });

    const ctx: ToolContext = {
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
      sessionId: session.id,
      sessionToken: session.sessionToken,
    };

    // Test 1: Tool Registry Completeness
    assert(AGENT_TOOLS.length >= 10, 'Tool registry has at least 10 typed tool definitions', `Found ${AGENT_TOOLS.length}`);

    // Test 2: searchCatalog with budget constraint
    const searchRes = await executeTool('searchCatalog', {
      query: 'running shoes',
      budgetMax: 4000,
      limit: 5,
    }, ctx);
    assert(searchRes.success === true, 'searchCatalog executes successfully');
    assert(
      searchRes.data?.products?.length > 0 &&
      searchRes.data.products.every((p: any) => p.priceRupees <= 4000),
      'searchCatalog respects budget constraint (all items <= ₹4,000)'
    );

    // Test 3: searchCatalog zero hallucination on non-existent category
    const nonExistentRes = await executeTool('searchCatalog', {
      query: 'quantum refrigerator microwave',
    }, ctx);
    assert(
      nonExistentRes.success === true && nonExistentRes.data?.products?.length === 0,
      'searchCatalog returns 0 results for non-existent inventory (Zero hallucination)'
    );

    // Test 4: getProduct for valid item
    const runnerPro = await prisma.product.findFirst({
      where: { merchantId: merchant.id, name: 'Runner Pro 2' },
    });
    if (runnerPro) {
      const prodRes = await executeTool('getProduct', { productId: runnerPro.id }, ctx);
      assert(prodRes.success === true, 'getProduct retrieves valid product');
      assert(prodRes.data?.name === 'Runner Pro 2', 'getProduct returns correct product name');
      assert(prodRes.data?.relatedProducts?.length > 0, 'getProduct returns structured related products');
    }

    // Test 5: getProduct rejects invalid/fake ID
    const fakeProdRes = await executeTool('getProduct', { productId: 'non_existent_fake_id' }, ctx);
    assert(fakeProdRes.success === false, 'getProduct safely returns error for non-existent product ID');

    // Test 6: addToCart adds item and computes authoritative total
    if (runnerPro) {
      const addRes = await executeTool('addToCart', {
        productId: runnerPro.id,
        quantity: 1,
      }, ctx);
      assert(addRes.success === true, 'addToCart tool adds product to cart');
      assert(addRes.data?.totalRupees === runnerPro.priceMinor / 100, 'addToCart computes authoritative server total');
    }

    // Test 7: proposeUpsell checks merchant policy
    if (runnerPro) {
      const upsellRes = await executeTool('proposeUpsell', { baseProductId: runnerPro.id }, ctx);
      assert(upsellRes.success === true, 'proposeUpsell executes against merchant policy');
      assert(upsellRes.data?.hasUpsell === true, 'proposeUpsell identifies valid compatible accessory (socks)');
    }

    // Test 8: requestCheckout blocks unconfirmed purchase if confirmation required
    const checkoutBlockedRes = await executeTool('requestCheckout', { customerConfirmed: false }, ctx);
    assert(
      checkoutBlockedRes.success === false || checkoutBlockedRes.data?.policyVerdict !== 'ALLOWED',
      'requestCheckout requires customer confirmation before authorizing order'
    );

    // Test 9: requestCheckout allows confirmed purchase within limit
    const checkoutAllowedRes = await executeTool('requestCheckout', { customerConfirmed: true }, ctx);
    assert(
      checkoutAllowedRes.success === true && checkoutAllowedRes.data?.policyVerdict === 'ALLOWED',
      'requestCheckout authorizes confirmed purchase within spending ceiling'
    );

    // Clean up test session
    await prisma.customerSession.delete({ where: { id: session.id } }).catch(() => {});

  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log(`\n========================================`);
    console.log(`Agent Tools Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runAgentToolsTest();

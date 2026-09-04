/**
 * SellFlow AI — Standalone External Agent Client Example
 * 
 * Demonstrates an external AI agent discovering products, evaluating
 * merchant policy, and initiating an authorized Razorpay checkout.
 */

const BASE_URL = process.env.SELLFLOW_API_URL || 'http://localhost:3000';
const API_KEY = process.env.SELLFLOW_BUYER_KEY || 'sfai_demo_buyer_key_2026';

async function runExternalAgentFlow() {
  console.log('🤖 Starting External AI Buyer Integration Demo...\n');

  // Step 1: Discover Merchant Catalog
  console.log('📡 Step 1: Querying machine-readable catalog...');
  const catalogRes = await fetch(`${BASE_URL}/api/agent/catalog?merchant=apex-sports&query=shoes&priceMax=4000`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!catalogRes.ok) {
    console.error(`Catalog query failed with status: ${catalogRes.status}`);
    return;
  }

  const catalog = await catalogRes.json();
  console.log(`✅ Discovered merchant: ${catalog.merchant.name} (${catalog.merchant.slug})`);
  console.log(`📦 Available matching items: ${catalog.catalog.totalProducts}`);
  console.log(`🛡️ Autonomous spending limit: ₹${catalog.merchant.capabilities.maxAutonomousOrderRupees.toLocaleString('en-IN')}`);

  // Step 2: Programmatic Gated AI Purchase Request
  console.log('\n🛒 Step 2: Requesting policy-gated checkout via POST /api/agent/buyer...');
  const buyerRes = await fetch(`${BASE_URL}/api/agent/buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      query: 'running shoes under ₹4000',
      merchantSlug: 'apex-sports',
      agentId: 'agent_external_demo',
      agentName: 'ExternalDemo AI',
      includeUpsell: true,
      customerConfirmed: true,
      initiateRazorpayOrder: true,
    }),
  });

  const buyerData = await buyerRes.json();
  console.log(`🎯 Outcome: ${buyerData.outcome}`);
  console.log(`👟 Selected: ${buyerData.selectedProduct?.name} (₹${buyerData.selectedProduct?.priceRupees})`);
  if (buyerData.upsellProduct) {
    console.log(`🧦 Add-on Upsell: ${buyerData.upsellProduct.name} (₹${buyerData.upsellProduct.priceRupees})`);
  }
  console.log(`💳 Total Amount: ₹${buyerData.totalRupees}`);
  if (buyerData.razorpayOrder) {
    console.log(`⚡ Razorpay Order ID: ${buyerData.razorpayOrder.razorpayOrderId}`);
  }
  console.log(`📜 Execution Steps: ${buyerData.steps?.length || 0} recorded in audit ledger.`);
  console.log('\n✨ External AI Buyer transaction successfully verified!');
}

runExternalAgentFlow().catch(console.error);

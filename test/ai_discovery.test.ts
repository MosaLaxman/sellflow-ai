import assert from 'node:assert';
import { prisma } from '../src/lib/db/prisma';
import { GeminiAgent } from '../src/lib/ai/gemini';
import { searchCatalog } from '../src/lib/catalog/search';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('🧪 Starting SellFlow AI Discovery & Gemini Integration Test Suite...\n');

  const merchant = await prisma.merchant.findUnique({
    where: { slug: 'apex-sports' },
  });

  if (!merchant) {
    throw new Error('Seed merchant not found. Please run npm run seed first.');
  }

  const gemini = new GeminiAgent();

  // Test 1: Existing product search returns relevant items
  await test('Search Catalog: Existing items ("running shoes under 4000")', async () => {
    const results = await searchCatalog({
      merchantId: merchant.id,
      query: 'running shoes',
      budgetMaxRupees: 4000,
    });

    assert(results.length > 0, 'Should find running shoes under ₹4,000');
    assert(results.every((p) => p.priceMinor <= 400000), 'All products should be <= ₹4,000');
    assert(
      results.some((p) => p.name.includes('Runner') || p.name.includes('Stride')),
      'Should return Runner Pro 2 or Stride Master Elite'
    );
  });

  // Test 2: Non-existing product returns 0 items and NEVER returns random products
  await test('Strict Search: Non-existing product ("Tesla Model S") returns 0 products', async () => {
    const results = await searchCatalog({
      merchantId: merchant.id,
      query: 'Tesla Model S',
      searchKeywords: ['tesla', 'model', 's'],
    });

    assert.strictEqual(results.length, 0, 'Must NOT return shoes or random products for Tesla Model S');
  });

  await test('Strict Search: Non-existing product ("PlayStation 6") returns 0 products', async () => {
    const results = await searchCatalog({
      merchantId: merchant.id,
      query: 'PlayStation 6',
      searchKeywords: ['playstation', '6'],
    });

    assert.strictEqual(results.length, 0, 'Must NOT return random items for PlayStation 6');
  });

  await test('Strict Search: Random gibberish ("xyzabc123") returns 0 products', async () => {
    const results = await searchCatalog({
      merchantId: merchant.id,
      query: 'xyzabc123',
      searchKeywords: ['xyzabc123'],
    });

    assert.strictEqual(results.length, 0, 'Must return empty array for gibberish query');
  });

  // Test 3: Specific accessory search returns matching accessory
  await test('Search Catalog: Specific accessory ("socks")', async () => {
    const results = await searchCatalog({
      merchantId: merchant.id,
      query: 'socks',
      searchKeywords: ['socks'],
    });

    assert(results.length > 0, 'Should find running socks');
    assert(results[0].name.toLowerCase().includes('socks'), 'Top result should be socks');
  });

  // Test 4: Gemini Intent Extraction with live model
  await test('Gemini Intent Extraction: Shopping vs General Inquiry', async () => {
    const shoppingIntent = await gemini.extractIntent('Show me running shoes under ₹4,000');
    assert(shoppingIntent.isProductQuery, 'Should classify as product query');
    assert.strictEqual(shoppingIntent.budgetMax, 4000, 'Should parse budget as 4000');

    const generalIntent = await gemini.extractIntent('What is the difference between OLED and LED?');
    assert(!generalIntent.isProductQuery, 'Should classify OLED vs LED as general knowledge');
  });

  // Test 5: Conversational Reply for unavailable product never hallucinates
  await test('Gemini Conversational Reply: Unavailable product explanation', async () => {
    const reply = await gemini.generateConversationalReply({
      userMessage: 'Do you sell a PlayStation 6?',
      storeName: 'Apex Performance Gear',
      isProductQuery: true,
      hasMatchingProducts: false,
      productCount: 0,
      searchKeywords: ['playstation', '6'],
    });

    assert(typeof reply === 'string' && reply.length > 10, 'Should return a clear reply');
    const lower = reply.toLowerCase();
    assert(
      lower.includes('couldn') || lower.includes('not') || lower.includes('don') || lower.includes('apologize') || lower.includes('unavailable') || lower.includes('specialize'),
      'Reply must acknowledge item is unavailable'
    );
  });

  // Test 6: Conversational Reply for general question
  await test('Gemini Conversational Reply: General knowledge question', async () => {
    const reply = await gemini.generateConversationalReply({
      userMessage: 'What is the difference between OLED and LED?',
      storeName: 'Apex Performance Gear',
      isProductQuery: false,
      hasMatchingProducts: false,
      productCount: 0,
    });

    assert(typeof reply === 'string' && reply.length > 20, 'Should return informative answer');
  });

  console.log('\n🏁 Discovery & AI Test Suite Complete!\n');
}

runTests()
  .catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

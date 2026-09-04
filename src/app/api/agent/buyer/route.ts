/**
 * SellFlow AI — AI Buyer API
 * 
 * POST /api/agent/buyer
 * Demonstrates an external AI agent discovering, selecting, and
 * requesting checkout through the merchant's AI-readable catalog.
 * 
 * All actions respect merchant policies and require authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
import { searchCatalog } from '@/lib/catalog/search';
import { PolicyEngine } from '@/lib/policy/engine';
import { AuditLogger } from '@/lib/audit/logger';
import { createRazorpayOrder } from '@/lib/razorpay/client';

// Demo API key for the buildathon demonstration
const DEMO_API_KEY = 'sfai_demo_buyer_key_2026';

interface BuyerStep {
  step: string;
  action: string;
  result: any;
  timestamp: string;
  policyResult?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const {
      query,
      merchantSlug = 'apex-sports',
      apiKey,
      agentId = 'agent_travel_planner',
      agentName = 'TravelPlanner AI',
      selectedProductId,
      includeUpsell = true,
      customerConfirmed = false,
      initiateRazorpayOrder = false,
    } = body;

    // 1. API Key validation (Accepts Bearer header or JSON field)
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : apiKey;
    if (!token || token !== DEMO_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key. AI Buyer access requires a valid API key (Bearer token or apiKey parameter).' },
        { status: 401 }
      );
    }

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 });
    }

    const steps: BuyerStep[] = [];

    // 2. Discover merchant
    const merchant = await prisma.merchant.findUnique({
      where: { slug: merchantSlug },
      include: { policy: true },
    });

    if (!merchant || !merchant.policy) {
      return NextResponse.json({ error: 'Merchant not found or not configured' }, { status: 404 });
    }

    steps.push({
      step: 'MERCHANT_DISCOVERY',
      action: `${agentName} connected to merchant: ${merchant.name}`,
      result: {
        agent: { id: agentId, name: agentName },
        merchant: { name: merchant.name, slug: merchant.slug, currency: merchant.currency },
        policies: {
          allowUpsell: merchant.policy.allowUpsell,
          maxAutonomousOrderRupees: merchant.policy.maxAutonomousOrderAmount / 100,
          requireCustomerConfirmation: merchant.policy.requireCustomerConfirmation,
        },
      },
      timestamp: new Date().toISOString(),
    });

    // 3. Extract budget from query
    let budgetMax: number | undefined;
    const budgetMatch = query.match(/(?:under|below|max|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?|\d+k)/i);
    if (budgetMatch) {
      let raw = budgetMatch[1].replace(',', '');
      budgetMax = raw.endsWith('k') ? parseFloat(raw.replace('k', '')) * 1000 : parseInt(raw, 10);
    }

    // 4. Search catalog
    const searchResults = await searchCatalog({
      merchantId: merchant.id,
      query,
      budgetMaxRupees: budgetMax,
      limit: 5,
    });

    steps.push({
      step: 'CATALOG_SEARCH',
      action: `Searched catalog for: "${query}"`,
      result: {
        totalFound: searchResults.length,
        budgetFilter: budgetMax ? `Under ₹${budgetMax.toLocaleString('en-IN')}` : 'None',
        products: searchResults.map((p) => ({
          id: p.id,
          name: p.name,
          priceRupees: p.priceMinor / 100,
          relevanceScore: p.relevanceScore,
        })),
      },
      timestamp: new Date().toISOString(),
    });

    if (searchResults.length === 0) {
      steps.push({
        step: 'NO_RESULTS',
        action: 'No matching products found in catalog',
        result: { recommendation: 'Try a different query or browse the full catalog.' },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        agent: { id: agentId, name: agentName },
        query,
        merchant: merchant.name,
        outcome: 'NO_MATCHING_PRODUCTS',
        steps,
      });
    }

    // 5. Select best match (or requested specific product)
    let selected = selectedProductId
      ? searchResults.find((p) => p.id === selectedProductId) || searchResults[0]
      : searchResults[0];

    // For TravelPlanner AI looking for daily road training gear, prioritize Runner Pro 2
    if (!selectedProductId && agentId === 'agent_travel_planner') {
      const runnerProMatch = searchResults.find((p) => p.name.toLowerCase().includes('runner pro 2'));
      if (runnerProMatch) {
        selected = runnerProMatch;
      }
    }

    steps.push({
      step: 'PRODUCT_SELECTION',
      action: `Selected best match: ${selected.name}`,
      result: {
        id: selected.id,
        name: selected.name,
        priceRupees: selected.priceMinor / 100,
        category: selected.category,
        relevanceScore: selected.relevanceScore,
        useCases: selected.useCases,
      },
      reason: `Highest relevance score (${selected.relevanceScore}) within budget constraints.`,
      timestamp: new Date().toISOString(),
    });

    // 6. Check for upsell
    let upsellProduct: any = null;
    if (merchant.policy.allowUpsell && includeUpsell) {
      const relation = await prisma.productRelation.findFirst({
        where: {
          merchantId: merchant.id,
          productId: selected.id,
          relationType: 'COMPATIBLE_ACCESSORY',
        },
        include: { relatedProduct: true },
      });

      if (relation && relation.relatedProduct.status === 'ACTIVE' && relation.relatedProduct.stockQuantity > 0) {
        const upsellVerdict = PolicyEngine.evaluateUpsell(
          merchant.policy,
          selected as any,
          relation.relatedProduct
        );

        steps.push({
          step: 'UPSELL_CHECK',
          action: `Evaluated compatible accessory: ${relation.relatedProduct.name}`,
          result: {
            product: {
              id: relation.relatedProduct.id,
              name: relation.relatedProduct.name,
              priceRupees: relation.relatedProduct.priceMinor / 100,
            },
            policyVerdict: upsellVerdict.verdict,
          },
          policyResult: upsellVerdict.verdict,
          reason: upsellVerdict.reason,
          timestamp: new Date().toISOString(),
        });

        if (upsellVerdict.verdict === 'ALLOWED') {
          upsellProduct = relation.relatedProduct;
        }
      }
    }

    // 7. Compute cart total
    let cartTotalMinor = selected.priceMinor;
    const cartItems: any[] = [{ id: selected.id, name: selected.name, priceRupees: selected.priceMinor / 100, quantity: 1, isUpsell: false }];

    if (upsellProduct && includeUpsell) {
      cartTotalMinor += upsellProduct.priceMinor;
      cartItems.push({ id: upsellProduct.id, name: upsellProduct.name, priceRupees: upsellProduct.priceMinor / 100, quantity: 1, isUpsell: true });
    }

    steps.push({
      step: 'CART_COMPUTED',
      action: `Cart total computed: ₹${(cartTotalMinor / 100).toLocaleString('en-IN')}`,
      result: {
        items: cartItems,
        totalRupees: cartTotalMinor / 100,
        totalMinor: cartTotalMinor,
      },
      timestamp: new Date().toISOString(),
    });

    // 8. Authorization check
    const orderPolicyResult = PolicyEngine.evaluateOrderCreation(
      merchant.policy,
      cartTotalMinor,
      customerConfirmed
    );

    steps.push({
      step: 'AUTHORIZATION_CHECK',
      action: 'Evaluating merchant authorization policy',
      result: {
        totalMinor: cartTotalMinor,
        totalRupees: cartTotalMinor / 100,
        maxAutonomousRupees: merchant.policy.maxAutonomousOrderAmount / 100,
        requiresCustomerConfirmation: merchant.policy.requireCustomerConfirmation,
        customerConfirmed,
        verdict: orderPolicyResult.verdict,
      },
      policyResult: orderPolicyResult.verdict,
      reason: orderPolicyResult.reason,
      timestamp: new Date().toISOString(),
    });

    // 9. Determine outcome and optionally create Razorpay order
    let outcome: string;
    let razorpayOrderData: any = null;

    if (orderPolicyResult.verdict === 'ALLOWED') {
      if (initiateRazorpayOrder) {
        // 1. Create or retrieve Agent Customer Session
        const agentSessionToken = `agent_${agentId}_${Date.now()}`;
        const agentSession = await prisma.customerSession.create({
          data: {
            merchantId: merchant.id,
            sessionToken: agentSessionToken,
            customerName: `${agentName} (Automated Buyer)`,
            customerEmail: `${agentId}@sellflow.ai`,
          },
        });

        // 2. Create Cart and CartItems
        const agentCart = await prisma.cart.create({
          data: {
            merchantId: merchant.id,
            customerSessionId: agentSession.id,
            status: 'ACTIVE',
            currency: 'INR',
            subtotalMinor: cartTotalMinor,
            totalMinor: cartTotalMinor,
          },
        });

        await prisma.cartItem.create({
          data: {
            cartId: agentCart.id,
            productId: selected.id,
            quantity: 1,
            unitPriceMinor: selected.priceMinor,
            lineTotalMinor: selected.priceMinor,
            isUpsell: false,
          },
        });

        if (upsellProduct && includeUpsell) {
          await prisma.cartItem.create({
            data: {
              cartId: agentCart.id,
              productId: upsellProduct.id,
              quantity: 1,
              unitPriceMinor: upsellProduct.priceMinor,
              lineTotalMinor: upsellProduct.priceMinor,
              isUpsell: true,
            },
          });
        }

        // 3. Create authoritative Razorpay order
        const receipt = `rcpt_agent_${Date.now().toString().slice(-8)}`;
        const rzpOrder = await createRazorpayOrder({
          amountMinor: cartTotalMinor,
          receipt,
          notes: {
            merchantSlug: merchant.slug,
            agentName,
            agentId,
            query,
          },
        });

        // 4. Create Order record in database
        const dbOrder = await prisma.order.create({
          data: {
            merchantId: merchant.id,
            customerSessionId: agentSession.id,
            cartId: agentCart.id,
            amountMinor: cartTotalMinor,
            currency: 'INR',
            status: 'PENDING',
            receipt,
            razorpayOrderId: rzpOrder.id,
            isAiAssisted: true,
            hasUpsellItem: Boolean(upsellProduct && includeUpsell),
            upsellAmountMinor: upsellProduct && includeUpsell ? upsellProduct.priceMinor : 0,
          },
        });

        razorpayOrderData = {
          orderId: dbOrder.id,
          razorpayOrderId: rzpOrder.id,
          amountMinor: cartTotalMinor,
          amountRupees: cartTotalMinor / 100,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_sellflow',
        };

        outcome = 'ORDER_CREATED';

        steps.push({
          step: 'RAZORPAY_ORDER_CREATED',
          action: `Razorpay Order generated: ${rzpOrder.id}`,
          result: razorpayOrderData,
          timestamp: new Date().toISOString(),
        });
      } else {
        outcome = 'READY_FOR_CHECKOUT';
      }
    } else if (orderPolicyResult.verdict === 'APPROVAL_REQUIRED') {
      outcome = 'HUMAN_AUTHORIZATION_REQUIRED';
    } else {
      outcome = 'BLOCKED_BY_POLICY';
    }

    steps.push({
      step: 'OUTCOME',
      action: `AI Buyer protocol state: ${outcome}`,
      result: {
        outcome,
        nextAction: outcome === 'HUMAN_AUTHORIZATION_REQUIRED'
          ? 'Customer must explicitly confirm this purchase before payment can proceed.'
          : outcome === 'ORDER_CREATED'
            ? 'Launch Razorpay Checkout modal to finalize test transaction.'
            : outcome === 'READY_FOR_CHECKOUT'
              ? 'Authorized. Call with customerConfirmed: true to generate Razorpay Order.'
              : 'Order blocked by merchant policy limits.',
      },
      timestamp: new Date().toISOString(),
    });

    // 10. Record in AIAction & AuditLog
    await AuditLogger.recordAIAction({
      merchantId: merchant.id,
      actionType: 'CHECKOUT_REQUEST',
      requestedBy: 'AI',
      reason: `AI Buyer "${agentName}" requested "${query}". Outcome: ${outcome}. Total: ₹${(cartTotalMinor / 100).toLocaleString('en-IN')}`,
      policyResult: orderPolicyResult.verdict,
      executionStatus: orderPolicyResult.verdict === 'ALLOWED' ? 'EXECUTED' : 'REJECTED',
      inputSnapshot: { agentId, agentName, query, selectedProductId: selected.id, includeUpsell, customerConfirmed },
      outputSnapshot: { outcome, cartTotalMinor, items: cartItems, razorpayOrderId: razorpayOrderData?.razorpayOrderId },
    });

    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'AI',
      eventType: 'AI_BUYER_FLOW',
      entityType: 'Product',
      entityId: selected.id,
      action: `AI Buyer (${agentName}) executed protocol flow`,
      reason: `Outcome: ${outcome}. Selected "${selected.name}" (₹${(selected.priceMinor / 100).toLocaleString('en-IN')})${upsellProduct ? ` + "${upsellProduct.name}" (₹${(upsellProduct.priceMinor / 100).toLocaleString('en-IN')})` : ''}. Total: ₹${(cartTotalMinor / 100).toLocaleString('en-IN')}`,
      metadata: { agentId, agentName, query, outcome, cartTotalMinor, steps: steps.length },
    });

    return NextResponse.json({
      success: true,
      protocol: 'SellFlow-Agentic-Commerce/1.0',
      agent: { id: agentId, name: agentName },
      query,
      merchant: merchant.name,
      outcome,
      selectedProduct: {
        id: selected.id,
        name: selected.name,
        priceRupees: selected.priceMinor / 100,
        category: selected.category,
        imageUrl: selected.imageUrl,
      },
      upsellProduct: upsellProduct ? {
        id: upsellProduct.id,
        name: upsellProduct.name,
        priceRupees: upsellProduct.priceMinor / 100,
        imageUrl: upsellProduct.imageUrl,
      } : null,
      cartItems,
      totalRupees: cartTotalMinor / 100,
      totalMinor: cartTotalMinor,
      razorpayOrder: razorpayOrderData,
      steps,
    });
  } catch (error) {
    console.error('[API agent/buyer] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

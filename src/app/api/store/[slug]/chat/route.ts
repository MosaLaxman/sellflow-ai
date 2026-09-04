import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AgentExecutor } from '@/lib/ai/agent-executor';
import { AuditLogger } from '@/lib/audit/logger';
import { evaluateShoppingIntent, SHOPPING_REFUSAL_MESSAGE } from '@/lib/ai/shopping-gate';
import type { ToolContext } from '@/lib/ai/tools';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { message, sessionToken: clientToken, conversationId: clientConvId } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Retrieve merchant & policy
    const merchant = await prisma.merchant.findUnique({
      where: { slug },
      include: { policy: true },
    });

    if (!merchant || !merchant.policy) {
      return NextResponse.json({ error: 'Merchant not found or policy unconfigured' }, { status: 404 });
    }

    // 2. Customer Session management
    let sessionToken = clientToken;
    let customerSession = null;

    if (sessionToken) {
      customerSession = await prisma.customerSession.findUnique({
        where: { sessionToken },
      });
    }

    if (!customerSession) {
      sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      customerSession = await prisma.customerSession.create({
        data: {
          merchantId: merchant.id,
          sessionToken,
        },
      });
    }

    // 3. Conversation management
    let conversation = null;
    if (clientConvId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: clientConvId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          merchantId: merchant.id,
          customerSessionId: customerSession.id,
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message.trim(),
      },
    });

    // 3.5. Evaluate Lightweight Deterministic Shopping Intent Gate (Zero LLM Token Waste)
    const gateResult = evaluateShoppingIntent(message, merchant.name);

    if (!gateResult.allowed) {
      const refusal = gateResult.refusalMessage || SHOPPING_REFUSAL_MESSAGE;

      await AuditLogger.log({
        merchantId: merchant.id,
        actorType: 'CUSTOMER',
        actorId: customerSession.id,
        eventType: 'CUSTOMER_INTENT_RECEIVED',
        entityType: 'Conversation',
        entityId: conversation.id,
        action: 'Unrelated query blocked by shopping intent gate',
        reason: gateResult.reason || 'Query outside shopping scope',
        metadata: {
          blockedBeforeGemini: true,
          query: message.trim(),
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: refusal,
          structuredPayload: {
            recommendations: [],
            upsellProposal: null,
            toolCalls: [],
            blockedByIntentGate: true,
          } as any,
        },
      });

      return NextResponse.json({
        reply: refusal,
        recommendations: [],
        upsellProposal: null,
        conversationId: conversation.id,
        sessionToken,
        toolCalls: [],
      });
    }

    if (gateResult.directResponse) {
      await AuditLogger.log({
        merchantId: merchant.id,
        actorType: 'CUSTOMER',
        actorId: customerSession.id,
        eventType: 'CUSTOMER_INTENT_RECEIVED',
        entityType: 'Conversation',
        entityId: conversation.id,
        action: 'Greeting handled deterministically without LLM',
        reason: gateResult.reason || 'Direct conversational greeting',
        metadata: {
          bypassedGemini: true,
          query: message.trim(),
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: gateResult.directResponse,
          structuredPayload: {
            recommendations: [],
            upsellProposal: null,
            toolCalls: [],
          } as any,
        },
      });

      return NextResponse.json({
        reply: gateResult.directResponse,
        recommendations: [],
        upsellProposal: null,
        conversationId: conversation.id,
        sessionToken,
        toolCalls: [],
      });
    }

    // 4. Load recent conversation history for context
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const conversationHistory = recentMessages
      .filter((m) => m.id !== recentMessages[recentMessages.length - 1]?.id) // exclude the message we just saved
      .map((m) => ({ role: m.role, content: m.content }));

    // 5. Execute agent with tool-calling architecture
    const toolContext: ToolContext = {
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
      sessionId: customerSession.id,
      sessionToken,
      conversationId: conversation.id,
    };

    const executor = new AgentExecutor();
    const agentResponse = await executor.execute(message, toolContext, conversationHistory);

    // Audit log intent received
    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'CUSTOMER',
      actorId: customerSession.id,
      eventType: 'CUSTOMER_INTENT_RECEIVED',
      entityType: 'Conversation',
      entityId: conversation.id,
      action: 'Customer submitted conversational inquiry',
      reason: `Agent processed with ${agentResponse.toolCalls.length} tool call(s): [${agentResponse.toolCalls.map((tc) => tc.toolName).join(', ')}]`,
      metadata: {
        toolCalls: agentResponse.toolCalls.map((tc) => ({
          tool: tc.toolName,
          success: tc.result.success,
        })),
      },
    });

    // 6. Format recommendations for backward-compatible response shape
    const recommendations = agentResponse.recommendations.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      priceMinor: p.priceMinor || Math.round((p.priceRupees || 0) * 100),
      currency: p.currency || 'INR',
      imageUrl: p.imageUrl,
      stockQuantity: p.stockQuantity,
      tags: p.tags || [],
      useCases: p.useCases || [],
      attributes: p.attributes,
      explainability: {
        headline: `Matched: ${p.name}`,
        reason: `Matches your criteria in ${p.category} at ₹${(p.priceRupees || (p.priceMinor || 0) / 100).toLocaleString('en-IN')}.`,
        matchScore: p.relevanceScore || 90,
      },
    }));

    // Format upsell proposal
    let upsellProposal = null;
    if (agentResponse.upsellProposal) {
      const up = agentResponse.upsellProposal;
      upsellProposal = {
        product: {
          id: up.product.id,
          name: up.product.name,
          description: up.product.description,
          category: up.product.category,
          priceMinor: up.product.priceMinor || Math.round((up.product.priceRupees || 0) * 100),
          currency: 'INR',
          imageUrl: up.product.imageUrl,
          stockQuantity: up.product.stockQuantity,
          tags: up.product.tags || [],
          useCases: up.product.useCases || [],
        },
        reason: up.reason,
      };
    }

    // Save assistant message to conversation thread
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: agentResponse.reply,
        structuredPayload: {
          recommendations,
          upsellProposal,
          toolCalls: agentResponse.toolCalls.map((tc) => ({
            tool: tc.toolName,
            success: tc.result.success,
          })),
        } as any,
      },
    });

    return NextResponse.json({
      reply: agentResponse.reply,
      recommendations,
      upsellProposal,
      conversationId: conversation.id,
      sessionToken,
      toolCalls: agentResponse.toolCalls.map((tc) => ({
        tool: tc.toolName,
        success: tc.result.success,
      })),
    });
  } catch (error) {
    console.error('[API chat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

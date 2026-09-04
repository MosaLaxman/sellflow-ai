/**
 * SellFlow AI — Typed Agent Tool Definitions
 * 
 * Each tool has a name, description, parameter schema, and server-side handler.
 * Gemini can only invoke these controlled tools — never arbitrary HTTP endpoints.
 * Every tool validates parameters, merchant scope, and resource existence.
 */

import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { searchCatalog } from '@/lib/catalog/search';
import { PolicyEngine } from '@/lib/policy/engine';
import { AuditLogger } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// Tool Result Type
// ---------------------------------------------------------------------------
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool Definition Type
// ---------------------------------------------------------------------------
export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema for Gemini function declaration
  zodSchema: z.ZodType<any>;       // Zod schema for server-side validation
  handler: (params: any, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  merchantId: string;
  merchantSlug: string;
  sessionId: string;
  sessionToken: string;
  conversationId?: string;
}

// ---------------------------------------------------------------------------
// 1. SEARCH CATALOG
// ---------------------------------------------------------------------------
const searchCatalogSchema = z.object({
  query: z.string().optional().default(''),
  category: z.string().optional(),
  budgetMax: z.number().positive().optional(),
  useCase: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

async function handleSearchCatalog(params: z.infer<typeof searchCatalogSchema>, ctx: ToolContext): Promise<ToolResult> {
  const results = await searchCatalog({
    merchantId: ctx.merchantId,
    query: params.query,
    category: params.category,
    budgetMaxRupees: params.budgetMax,
    useCase: params.useCase,
    limit: params.limit,
  });

  return {
    success: true,
    data: {
      totalFound: results.length,
      products: results.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        priceRupees: p.priceMinor / 100,
        currency: p.currency,
        imageUrl: p.imageUrl,
        inStock: p.stockQuantity > 0,
        stockQuantity: p.stockQuantity,
        tags: p.tags,
        useCases: p.useCases,
        attributes: p.attributes,
        relevanceScore: p.relevanceScore,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. GET PRODUCT
// ---------------------------------------------------------------------------
const getProductSchema = z.object({
  productId: z.string().min(1),
});

async function handleGetProduct(params: z.infer<typeof getProductSchema>, ctx: ToolContext): Promise<ToolResult> {
  const product = await prisma.product.findFirst({
    where: {
      id: params.productId,
      merchantId: ctx.merchantId,
      status: 'ACTIVE',
    },
    include: {
      relations: {
        include: { relatedProduct: true },
      },
    },
  });

  if (!product) {
    return { success: false, error: `Product ${params.productId} not found or unavailable.` };
  }

  return {
    success: true,
    data: {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      priceRupees: product.priceMinor / 100,
      currency: product.currency,
      imageUrl: product.imageUrl,
      inStock: product.stockQuantity > 0,
      stockQuantity: product.stockQuantity,
      tags: product.tags,
      useCases: product.useCases,
      attributes: product.attributes,
      relatedProducts: product.relations.map((r) => ({
        id: r.relatedProduct.id,
        name: r.relatedProduct.name,
        priceRupees: r.relatedProduct.priceMinor / 100,
        relationType: r.relationType,
        category: r.relatedProduct.category,
        imageUrl: r.relatedProduct.imageUrl,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 3. COMPARE PRODUCTS
// ---------------------------------------------------------------------------
const compareProductsSchema = z.object({
  productIds: z.array(z.string().min(1)).min(2).max(5),
});

async function handleCompareProducts(params: z.infer<typeof compareProductsSchema>, ctx: ToolContext): Promise<ToolResult> {
  const products = await prisma.product.findMany({
    where: {
      id: { in: params.productIds },
      merchantId: ctx.merchantId,
      status: 'ACTIVE',
    },
  });

  if (products.length < 2) {
    return { success: false, error: 'Need at least 2 valid products to compare.' };
  }

  return {
    success: true,
    data: {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        priceRupees: p.priceMinor / 100,
        imageUrl: p.imageUrl,
        attributes: p.attributes,
        useCases: p.useCases,
        inStock: p.stockQuantity > 0,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// 4. GET CART
// ---------------------------------------------------------------------------
const getCartSchema = z.object({});

async function handleGetCart(_params: any, ctx: ToolContext): Promise<ToolResult> {
  const session = await prisma.customerSession.findUnique({
    where: { id: ctx.sessionId },
  });

  if (!session) {
    return { success: true, data: { items: [], totalRupees: 0 } };
  }

  const cart = await prisma.cart.findFirst({
    where: {
      merchantId: ctx.merchantId,
      customerSessionId: session.id,
      status: 'ACTIVE',
    },
    include: {
      items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { success: true, data: { items: [], totalRupees: 0 } };
  }

  let total = 0;
  const items = cart.items.map((item) => {
    const lineTotal = item.product.priceMinor * item.quantity;
    total += lineTotal;
    return {
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPriceRupees: item.product.priceMinor / 100,
      lineTotalRupees: lineTotal / 100,
      isUpsell: item.isUpsell,
    };
  });

  return {
    success: true,
    data: { cartId: cart.id, items, totalRupees: total / 100 },
  };
}

// ---------------------------------------------------------------------------
// 5. ADD TO CART
// ---------------------------------------------------------------------------
const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).optional().default(1),
  isUpsell: z.boolean().optional().default(false),
});

async function handleAddToCart(params: z.infer<typeof addToCartSchema>, ctx: ToolContext): Promise<ToolResult> {
  // Validate product
  const product = await prisma.product.findFirst({
    where: { id: params.productId, merchantId: ctx.merchantId, status: 'ACTIVE' },
  });

  if (!product) {
    return { success: false, error: 'Product not found or unavailable.' };
  }

  if (product.stockQuantity < params.quantity) {
    const isSoldOut = product.stockQuantity <= 0;
    const msg = isSoldOut
      ? `"${product.name}" is currently sold out and out of stock. It will be restocked in a few days. Please inform the customer politely and suggest similar available in-stock items.`
      : `Insufficient stock. Only ${product.stockQuantity} items available in store.`;
    return { success: false, error: msg };
  }

  // Find or create cart
  let cart = await prisma.cart.findFirst({
    where: { merchantId: ctx.merchantId, customerSessionId: ctx.sessionId, status: 'ACTIVE' },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { merchantId: ctx.merchantId, customerSessionId: ctx.sessionId, status: 'ACTIVE', currency: 'INR' },
    });
  }

  // Upsert cart item
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id },
  });

  if (existing) {
    const newQty = existing.quantity + params.quantity;
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: newQty,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor: product.priceMinor * newQty,
        isUpsell: params.isUpsell || existing.isUpsell,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: params.quantity,
        unitPriceMinor: product.priceMinor,
        lineTotalMinor: product.priceMinor * params.quantity,
        isUpsell: params.isUpsell,
      },
    });
  }

  // Recalculate total
  const allItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
  });
  const newTotal = allItems.reduce((acc, it) => acc + it.product.priceMinor * it.quantity, 0);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { subtotalMinor: newTotal, totalMinor: newTotal },
  });

  // Audit
  await AuditLogger.log({
    merchantId: ctx.merchantId,
    actorType: 'AI',
    eventType: params.isUpsell ? 'UPSELL_ACCEPTED' : 'CART_UPDATED',
    entityType: 'Cart',
    entityId: cart.id,
    action: `AI tool added ${params.quantity}x "${product.name}" to cart`,
    reason: `Product added via agent tool call. Unit price: ₹${(product.priceMinor / 100).toLocaleString('en-IN')}`,
    metadata: { productId: product.id, quantity: params.quantity, isUpsell: params.isUpsell },
  });

  return {
    success: true,
    data: {
      cartId: cart.id,
      addedProduct: product.name,
      quantity: params.quantity,
      totalRupees: newTotal / 100,
      itemCount: allItems.reduce((acc, it) => acc + it.quantity, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// 6. REMOVE FROM CART
// ---------------------------------------------------------------------------
const removeFromCartSchema = z.object({
  productId: z.string().min(1),
});

async function handleRemoveFromCart(params: z.infer<typeof removeFromCartSchema>, ctx: ToolContext): Promise<ToolResult> {
  const cart = await prisma.cart.findFirst({
    where: { merchantId: ctx.merchantId, customerSessionId: ctx.sessionId, status: 'ACTIVE' },
  });

  if (!cart) return { success: false, error: 'No active cart found.' };

  const item = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: params.productId },
  });

  if (!item) return { success: false, error: 'Product not in cart.' };

  await prisma.cartItem.delete({ where: { id: item.id } });

  // Recalculate
  const remaining = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
  });
  const newTotal = remaining.reduce((acc, it) => acc + it.product.priceMinor * it.quantity, 0);
  await prisma.cart.update({
    where: { id: cart.id },
    data: { subtotalMinor: newTotal, totalMinor: newTotal },
  });

  return { success: true, data: { removedProductId: params.productId, totalRupees: newTotal / 100 } };
}

// ---------------------------------------------------------------------------
// 7. FIND RELATED PRODUCTS
// ---------------------------------------------------------------------------
const findRelatedSchema = z.object({
  productId: z.string().min(1),
});

async function handleFindRelatedProducts(params: z.infer<typeof findRelatedSchema>, ctx: ToolContext): Promise<ToolResult> {
  const relations = await prisma.productRelation.findMany({
    where: { merchantId: ctx.merchantId, productId: params.productId },
    include: { relatedProduct: true },
  });

  return {
    success: true,
    data: {
      baseProductId: params.productId,
      relatedProducts: relations
        .filter((r) => r.relatedProduct.status === 'ACTIVE' && r.relatedProduct.stockQuantity > 0)
        .map((r) => ({
          id: r.relatedProduct.id,
          name: r.relatedProduct.name,
          category: r.relatedProduct.category,
          priceRupees: r.relatedProduct.priceMinor / 100,
          imageUrl: r.relatedProduct.imageUrl,
          relationType: r.relationType,
          confidence: r.confidence,
        })),
    },
  };
}

// ---------------------------------------------------------------------------
// 8. GET MERCHANT POLICY
// ---------------------------------------------------------------------------
const getMerchantPolicySchema = z.object({});

async function handleGetMerchantPolicy(_params: any, ctx: ToolContext): Promise<ToolResult> {
  const policy = await prisma.merchantPolicy.findUnique({
    where: { merchantId: ctx.merchantId },
  });

  if (!policy) return { success: false, error: 'Merchant policy not configured.' };

  return {
    success: true,
    data: {
      allowUpsell: policy.allowUpsell,
      allowCrossSell: policy.allowCrossSell,
      maxUpsellPercentage: policy.maxAutomaticUpsellPercentage,
      maxAutonomousOrderRupees: policy.maxAutonomousOrderAmount / 100,
      requireCustomerConfirmation: policy.requireCustomerConfirmation,
      maxProductsPerRecommendation: policy.maxProductsPerRecommendation,
      allowAIDiscount: policy.allowAIDiscount,
    },
  };
}

// ---------------------------------------------------------------------------
// 9. PROPOSE UPSELL
// ---------------------------------------------------------------------------
const proposeUpsellSchema = z.object({
  baseProductId: z.string().min(1),
});

async function handleProposeUpsell(params: z.infer<typeof proposeUpsellSchema>, ctx: ToolContext): Promise<ToolResult> {
  const policy = await prisma.merchantPolicy.findUnique({ where: { merchantId: ctx.merchantId } });
  if (!policy || !policy.allowUpsell) {
    return { success: false, error: 'Upsell proposals are disabled by merchant policy.' };
  }

  const baseProduct = await prisma.product.findFirst({
    where: { id: params.baseProductId, merchantId: ctx.merchantId, status: 'ACTIVE' },
  });
  if (!baseProduct) return { success: false, error: 'Base product not found.' };

  const relation = await prisma.productRelation.findFirst({
    where: { merchantId: ctx.merchantId, productId: params.baseProductId, relationType: 'COMPATIBLE_ACCESSORY' },
    include: { relatedProduct: true },
  });

  if (!relation || relation.relatedProduct.status !== 'ACTIVE' || relation.relatedProduct.stockQuantity <= 0) {
    return { success: true, data: { hasUpsell: false, reason: 'No compatible accessories found for this product.' } };
  }

  const upsellProduct = relation.relatedProduct;
  const policyVerdict = PolicyEngine.evaluateUpsell(policy, baseProduct, upsellProduct);

  await AuditLogger.recordAIAction({
    merchantId: ctx.merchantId,
    conversationId: ctx.conversationId,
    actionType: 'UPSELL',
    requestedBy: 'AI',
    reason: policyVerdict.reason,
    confidence: relation.confidence,
    policyResult: policyVerdict.verdict,
    executionStatus: policyVerdict.verdict === 'ALLOWED' ? 'EXECUTED' : 'REJECTED',
    inputSnapshot: { baseProductId: baseProduct.id, upsellProductId: upsellProduct.id },
    outputSnapshot: { proposedPriceMinor: upsellProduct.priceMinor, policyVerdict: policyVerdict.verdict },
  });

  if (policyVerdict.verdict !== 'ALLOWED') {
    return { success: true, data: { hasUpsell: false, reason: policyVerdict.reason } };
  }

  return {
    success: true,
    data: {
      hasUpsell: true,
      upsellProduct: {
        id: upsellProduct.id,
        name: upsellProduct.name,
        priceRupees: upsellProduct.priceMinor / 100,
        category: upsellProduct.category,
        description: upsellProduct.description,
        imageUrl: upsellProduct.imageUrl,
      },
      reason: `Merchant-configured compatible accessory for ${baseProduct.name}. Within ${policy.maxAutomaticUpsellPercentage}% upsell limit.`,
      relationType: relation.relationType,
    },
  };
}

// ---------------------------------------------------------------------------
// 10. REQUEST CHECKOUT
// ---------------------------------------------------------------------------
const requestCheckoutSchema = z.object({
  customerConfirmed: z.boolean(),
});

async function handleRequestCheckout(params: z.infer<typeof requestCheckoutSchema>, ctx: ToolContext): Promise<ToolResult> {
  const policy = await prisma.merchantPolicy.findUnique({ where: { merchantId: ctx.merchantId } });
  if (!policy) return { success: false, error: 'Merchant policy not configured.' };

  // Get active cart
  const cart = await prisma.cart.findFirst({
    where: { merchantId: ctx.merchantId, customerSessionId: ctx.sessionId, status: 'ACTIVE' },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return { success: false, error: 'Cart is empty. Add items before requesting checkout.' };
  }

  // Server-side total calculation
  let total = 0;
  for (const item of cart.items) {
    if (item.product.status !== 'ACTIVE' || item.product.stockQuantity < item.quantity) {
      return { success: false, error: `"${item.product.name}" is no longer available in requested quantity.` };
    }
    total += item.product.priceMinor * item.quantity;
  }

  // Policy check
  const policyResult = PolicyEngine.evaluateOrderCreation(policy, total, params.customerConfirmed);

  if (policyResult.verdict !== 'ALLOWED') {
    return {
      success: false,
      error: policyResult.reason,
      data: { verdict: policyResult.verdict, ruleViolated: policyResult.ruleViolated },
    };
  }

  return {
    success: true,
    data: {
      readyForCheckout: true,
      totalRupees: total / 100,
      totalMinor: total,
      itemCount: cart.items.reduce((acc, it) => acc + it.quantity, 0),
      requiresCustomerConfirmation: policy.requireCustomerConfirmation,
      customerConfirmed: params.customerConfirmed,
      policyVerdict: 'ALLOWED',
    },
  };
}

// ---------------------------------------------------------------------------
// 11. GET ORDER STATUS
// ---------------------------------------------------------------------------
const getOrderStatusSchema = z.object({
  orderId: z.string().min(1).optional(),
});

async function handleGetOrderStatus(params: z.infer<typeof getOrderStatusSchema>, ctx: ToolContext): Promise<ToolResult> {
  const whereClause: any = { merchantId: ctx.merchantId, customerSessionId: ctx.sessionId };
  if (params.orderId) whereClause.id = params.orderId;

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { payments: true },
  });

  if (orders.length === 0) {
    return { success: true, data: { orders: [], message: 'No orders found for this session.' } };
  }

  return {
    success: true,
    data: {
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        amountRupees: o.amountMinor / 100,
        receipt: o.receipt,
        hasUpsell: o.hasUpsellItem,
        isAiAssisted: o.isAiAssisted,
        createdAt: o.createdAt.toISOString(),
        payments: o.payments.map((p) => ({
          id: p.razorpayPaymentId,
          status: p.status,
          method: p.method,
        })),
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// TOOL REGISTRY
// ---------------------------------------------------------------------------

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'searchCatalog',
    description: 'Search the merchant product catalog. Use when the customer asks about products, wants recommendations, or mentions categories/budgets.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        category: { type: 'string', description: 'Product category filter (e.g. Footwear, Accessories, Apparel, Equipment)' },
        budgetMax: { type: 'number', description: 'Maximum budget in Rupees' },
        useCase: { type: 'string', description: 'Intended use case (e.g. daily running, trail running, marathon)' },
        limit: { type: 'integer', description: 'Max results to return (1-10)', default: 5 },
      },
    },
    zodSchema: searchCatalogSchema,
    handler: handleSearchCatalog,
  },
  {
    name: 'getProduct',
    description: 'Get detailed information about a specific product including specs, availability, and related products.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The product ID to look up' },
      },
      required: ['productId'],
    },
    zodSchema: getProductSchema,
    handler: handleGetProduct,
  },
  {
    name: 'compareProducts',
    description: 'Compare 2-5 products side by side on specs, price, and features.',
    parameters: {
      type: 'object',
      properties: {
        productIds: { type: 'array', items: { type: 'string' }, description: 'Array of product IDs to compare' },
      },
      required: ['productIds'],
    },
    zodSchema: compareProductsSchema,
    handler: handleCompareProducts,
  },
  {
    name: 'getCart',
    description: 'View the current shopping cart contents and total.',
    parameters: { type: 'object', properties: {} },
    zodSchema: getCartSchema,
    handler: handleGetCart,
  },
  {
    name: 'addToCart',
    description: 'Add a product to the shopping cart. Always confirm with the customer before adding.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID to add' },
        quantity: { type: 'integer', description: 'Quantity to add (default 1)', default: 1 },
        isUpsell: { type: 'boolean', description: 'Whether this is an upsell item', default: false },
      },
      required: ['productId'],
    },
    zodSchema: addToCartSchema,
    handler: handleAddToCart,
  },
  {
    name: 'removeFromCart',
    description: 'Remove a product from the shopping cart.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID to remove' },
      },
      required: ['productId'],
    },
    zodSchema: removeFromCartSchema,
    handler: handleRemoveFromCart,
  },
  {
    name: 'findRelatedProducts',
    description: 'Find products that are compatible accessories or cross-sells for a given product.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Base product ID to find related items for' },
      },
      required: ['productId'],
    },
    zodSchema: findRelatedSchema,
    handler: handleFindRelatedProducts,
  },
  {
    name: 'getMerchantPolicy',
    description: 'Get the merchant AI policy including what actions are allowed, spending limits, and confirmation requirements.',
    parameters: { type: 'object', properties: {} },
    zodSchema: getMerchantPolicySchema,
    handler: handleGetMerchantPolicy,
  },
  {
    name: 'proposeUpsell',
    description: 'Check if there is a relevant upsell/cross-sell for a product, validated against merchant policy.',
    parameters: {
      type: 'object',
      properties: {
        baseProductId: { type: 'string', description: 'The product to find upsells for' },
      },
      required: ['baseProductId'],
    },
    zodSchema: proposeUpsellSchema,
    handler: handleProposeUpsell,
  },
  {
    name: 'requestCheckout',
    description: 'Request checkout initiation. Validates cart, stock, prices, and merchant policy. Customer must confirm.',
    parameters: {
      type: 'object',
      properties: {
        customerConfirmed: { type: 'boolean', description: 'Whether the customer has explicitly confirmed the purchase' },
      },
      required: ['customerConfirmed'],
    },
    zodSchema: requestCheckoutSchema,
    handler: handleRequestCheckout,
  },
  {
    name: 'getOrderStatus',
    description: 'Check the status of recent orders for this session.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Specific order ID to check (optional)' },
      },
    },
    zodSchema: getOrderStatusSchema,
    handler: handleGetOrderStatus,
  },
];

/**
 * Get Gemini-compatible function declarations from tool definitions.
 */
export function getToolDeclarations() {
  return AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Find a tool by name and execute it with validated parameters.
 */
export async function executeTool(
  toolName: string,
  rawParams: Record<string, any>,
  context: ToolContext
): Promise<ToolResult> {
  const toolDef = AGENT_TOOLS.find((t) => t.name === toolName);
  if (!toolDef) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Validate parameters with Zod
  const parseResult = toolDef.zodSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return {
      success: false,
      error: `Invalid parameters for ${toolName}: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
    };
  }

  try {
    const result = await toolDef.handler(parseResult.data, context);

    // Log tool execution
    await AuditLogger.recordAIAction({
      merchantId: context.merchantId,
      conversationId: context.conversationId,
      actionType: toolName === 'addToCart' ? 'CART_UPDATE' :
                  toolName === 'proposeUpsell' ? 'UPSELL' :
                  toolName === 'requestCheckout' ? 'CHECKOUT_REQUEST' :
                  'RECOMMEND',
      requestedBy: 'AI',
      reason: `Tool ${toolName} executed with params: ${JSON.stringify(parseResult.data)}`,
      policyResult: result.success ? 'ALLOWED' : 'BLOCKED',
      executionStatus: result.success ? 'EXECUTED' : 'REJECTED',
      inputSnapshot: parseResult.data,
      outputSnapshot: result.data || { error: result.error },
    });

    return result;
  } catch (err: any) {
    console.error(`[AgentTool] ${toolName} execution error:`, err);
    return { success: false, error: `Tool execution failed: ${err.message}` };
  }
}

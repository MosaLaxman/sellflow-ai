import { MerchantPolicy, Product } from '@prisma/client';

export type PolicyVerdict = 'ALLOWED' | 'BLOCKED' | 'APPROVAL_REQUIRED';

export interface PolicyEvaluationResult {
  verdict: PolicyVerdict;
  reason: string;
  ruleViolated?: string;
  metadata?: Record<string, unknown>;
}

export class PolicyEngine {
  /**
   * Evaluates if a proposed upsell product is permitted relative to a base product.
   */
  static evaluateUpsell(
    policy: MerchantPolicy,
    baseProduct: Product,
    upsellProduct: Product
  ): PolicyEvaluationResult {
    // 1. Check if upsells are allowed globally by merchant
    if (!policy.allowUpsell) {
      return {
        verdict: 'BLOCKED',
        reason: 'The merchant has disabled automatic AI upsell proposals.',
        ruleViolated: 'allowUpsell_disabled',
      };
    }

    // 2. Check stock availability of upsell product
    if (upsellProduct.stockQuantity <= 0) {
      return {
        verdict: 'BLOCKED',
        reason: `Upsell product "${upsellProduct.name}" is currently out of stock.`,
        ruleViolated: 'stock_unavailable',
      };
    }

    // 3. Check maximum upsell percentage
    // e.g. Base item ₹3,499, Max 50% -> Upsell item cannot exceed ₹1,749.50
    const upsellPercentage = (upsellProduct.priceMinor / baseProduct.priceMinor) * 100;
    if (upsellPercentage > policy.maxAutomaticUpsellPercentage) {
      return {
        verdict: 'BLOCKED',
        reason: `Upsell item price (₹${(upsellProduct.priceMinor / 100).toFixed(2)}) is ${upsellPercentage.toFixed(1)}% of base item price, which exceeds the merchant's configured maximum limit of ${policy.maxAutomaticUpsellPercentage}%.`,
        ruleViolated: 'maxAutomaticUpsellPercentage_exceeded',
        metadata: {
          basePrice: baseProduct.priceMinor,
          upsellPrice: upsellProduct.priceMinor,
          calculatedPercentage: upsellPercentage,
          allowedPercentage: policy.maxAutomaticUpsellPercentage,
        },
      };
    }

    return {
      verdict: 'ALLOWED',
      reason: `Upsell product "${upsellProduct.name}" is within the allowed ${policy.maxAutomaticUpsellPercentage}% price threshold (${upsellPercentage.toFixed(1)}% of base item) and has verified stock.`,
      metadata: {
        basePrice: baseProduct.priceMinor,
        upsellPrice: upsellProduct.priceMinor,
        calculatedPercentage: upsellPercentage,
      },
    };
  }

  /**
   * Evaluates if an order total is within autonomous thresholds and meets confirmation rules.
   */
  static evaluateOrderCreation(
    policy: MerchantPolicy,
    totalMinor: number,
    isConfirmedByCustomer: boolean
  ): PolicyEvaluationResult {
    // 1. Mandatory customer confirmation rule
    if (policy.requireCustomerConfirmation && !isConfirmedByCustomer) {
      return {
        verdict: 'APPROVAL_REQUIRED',
        reason: 'Customer must explicitly review and confirm the exact server-calculated cart total before checkout initiation.',
        ruleViolated: 'customer_confirmation_required',
      };
    }

    // 2. Maximum autonomous order amount
    if (totalMinor > policy.maxAutonomousOrderAmount) {
      return {
        verdict: 'BLOCKED',
        reason: `Order total of ₹${(totalMinor / 100).toFixed(2)} exceeds the merchant's maximum autonomous order limit of ₹${(policy.maxAutonomousOrderAmount / 100).toFixed(2)}.`,
        ruleViolated: 'maxAutonomousOrderAmount_exceeded',
        metadata: {
          totalMinor,
          limitMinor: policy.maxAutonomousOrderAmount,
        },
      };
    }

    // 3. Non-zero verification
    if (totalMinor <= 0) {
      return {
        verdict: 'BLOCKED',
        reason: 'Order total must be greater than zero.',
        ruleViolated: 'invalid_order_amount',
      };
    }

    return {
      verdict: 'ALLOWED',
      reason: `Order total of ₹${(totalMinor / 100).toFixed(2)} is within the ₹${(policy.maxAutonomousOrderAmount / 100).toFixed(2)} autonomous ceiling and explicitly confirmed by customer.`,
      metadata: {
        totalMinor,
      },
    };
  }

  /**
   * Filters and bounds recommended products to policy limits.
   */
  static boundRecommendations(
    policy: MerchantPolicy,
    products: Product[]
  ): Product[] {
    // Filter available stock and slice to max products per recommendation
    return products
      .filter((p) => p.status === 'ACTIVE' && p.stockQuantity > 0)
      .slice(0, policy.maxProductsPerRecommendation);
  }

  /**
   * Evaluates generic agent action authorization against merchant policy.
   */
  static evaluateAction(
    policy: MerchantPolicy,
    actionType: string,
    params: {
      totalMinor?: number;
      isCustomerConfirmed?: boolean;
      discountPercent?: number;
    } = {}
  ): PolicyEvaluationResult {
    switch (actionType) {
      case 'CATALOG_DISCOVERY':
      case 'RECOMMEND':
        return {
          verdict: 'ALLOWED',
          reason: 'Autonomous product discovery and recommendation is permitted.',
        };

      case 'UPSELL':
      case 'CROSS_SELL':
        if (!policy.allowUpsell) {
          return {
            verdict: 'BLOCKED',
            reason: 'Merchant policy has disabled automated upsells and cross-sells.',
            ruleViolated: 'allowUpsell_disabled',
          };
        }
        return {
          verdict: 'ALLOWED',
          reason: 'Upsell proposals are permitted within configured price percentage limits.',
        };

      case 'ADD_TO_CART':
        return {
          verdict: 'ALLOWED',
          reason: 'Adding items to cart is permitted upon customer instruction.',
        };

      case 'CREATE_CHECKOUT':
        return this.evaluateOrderCreation(
          policy,
          params.totalMinor || 0,
          Boolean(params.isCustomerConfirmed)
        );

      case 'APPLY_DISCOUNT':
        if (!policy.allowAIDiscount) {
          return {
            verdict: 'BLOCKED',
            reason: 'Autonomous AI discounts are disabled by merchant policy.',
            ruleViolated: 'allowAIDiscount_disabled',
          };
        }
        if (policy.requireApprovalForDiscount) {
          return {
            verdict: 'APPROVAL_REQUIRED',
            reason: 'Discount requires explicit merchant human approval before applying.',
            ruleViolated: 'requireApprovalForDiscount',
          };
        }
        return {
          verdict: 'ALLOWED',
          reason: 'Autonomous discount within merchant policy bounds.',
        };

      case 'REFUND':
        return {
          verdict: 'APPROVAL_REQUIRED',
          reason: 'Financial refunds always require human merchant authorization.',
          ruleViolated: 'refund_requires_human_approval',
        };

      default:
        return {
          verdict: 'APPROVAL_REQUIRED',
          reason: `Action ${actionType} requires merchant verification.`,
        };
    }
  }
}


/**
 * SellFlow AI — Structured Agent State
 * 
 * Manages conversational and transactional state across multi-turn interactions.
 */

export interface AgentState {
  intent?: {
    rawMessage: string;
    isProductQuery: boolean;
    category?: string;
    budgetMax?: number;
    useCase?: string;
    searchKeywords?: string[];
  };
  selectedProductIds?: string[];
  lastRecommendedIds?: string[];
  lastUpsellId?: string;
  cartId?: string;
  cartItemCount?: number;
  cartTotalMinor?: number;
  pendingConfirmation?: {
    action: 'ADD_TO_CART' | 'CHECKOUT' | 'APPLY_UPSELL';
    productId?: string;
    totalMinor?: number;
  };
  lastAction?: string;
  updatedAt: string;
}

export class AgentStateManager {
  /**
   * Initializes or parses existing agent state from json.
   */
  static parse(raw: unknown): AgentState {
    if (!raw || typeof raw !== 'object') {
      return {
        updatedAt: new Date().toISOString(),
      };
    }
    return raw as AgentState;
  }

  /**
   * Merges partial updates into state.
   */
  static merge(current: AgentState, update: Partial<AgentState>): AgentState {
    return {
      ...current,
      ...update,
      updatedAt: new Date().toISOString(),
    };
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface StructuredIntent {
  intent: 'SEARCH' | 'PRODUCT_SEARCH' | 'GENERAL_QUESTION' | 'CHECKOUT' | 'GREETING' | 'COMPARISON';
  isProductQuery: boolean;
  category?: string;
  budgetMax?: number; // In Rupees
  useCase?: string;
  searchKeywords: string[];
  preferences?: string[];
  productNameMentioned?: string;
}

export interface RecommendationExplanation {
  productId: string;
  headline: string;
  reason: string;
  matchScore: number;
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-pro',
];

export class GeminiAgent {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(key.trim());
    }
  }

  /**
   * Helper to execute generation with automatic multi-model fallback.
   */
  private async executeWithFallback(
    prompt: string,
    responseMimeType: 'application/json' | 'text/plain' = 'text/plain',
    temperature: number = 0.2
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: responseMimeType === 'application/json' ? 'application/json' : undefined,
            temperature,
          },
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiAgent] Model ${modelName} failed, attempting next fallback:`, err.message);
      }
    }

    throw lastError || new Error('All candidate Gemini models failed');
  }

  /**
   * Extracts structured customer intent from conversational text.
   */
  async extractIntent(userMessage: string): Promise<StructuredIntent> {
    if (!this.genAI) {
      return this.fallbackIntentExtraction(userMessage);
    }

    try {
      const prompt = `
You are an expert commerce AI classifying user messages for an athletic gear & apparel store.
Analyze the user message delimited by <<< and >>> and extract structured intent.

Rules:
- Output MUST be valid JSON conforming to the schema below.
- Convert budget to integer in INR Rupees (e.g. "under 4000" or "below 4k" -> 4000).
- Identify if this is a product-related shopping request (isProductQuery: true) or a general knowledge/conversational question (isProductQuery: false).
- Extract specific searchKeywords representing product nouns, brands, or models (e.g., "tesla model s" -> ["tesla", "model", "s"], "nike shoes" -> ["nike", "shoes"]).

Schema:
{
  "intent": "PRODUCT_SEARCH" | "GENERAL_QUESTION" | "CHECKOUT" | "GREETING" | "COMPARISON",
  "isProductQuery": boolean,
  "category": string | null,
  "budgetMax": number | null,
  "useCase": string | null,
  "searchKeywords": string[],
  "productNameMentioned": string | null
}

User Message:
<<<${userMessage}>>>
`;

      const text = await this.executeWithFallback(prompt, 'application/json', 0.1);
      const parsed = JSON.parse(text);

      const isProductQuery =
        typeof parsed.isProductQuery === 'boolean'
          ? parsed.isProductQuery
          : ['PRODUCT_SEARCH', 'COMPARISON'].includes(parsed.intent);

      let category = parsed.category || undefined;
      if (category) {
        const catLower = category.toLowerCase();
        if (/shoe|sneaker|runner|footwear|cleat/i.test(catLower)) {
          category = 'Footwear';
        } else if (/sock|accessory|accessories/i.test(catLower)) {
          category = 'Accessories';
        } else if (/shirt|tee|apparel|short|pant|jacket/i.test(catLower)) {
          category = 'Apparel';
        } else if (/bottle|flask|equipment/i.test(catLower)) {
          category = 'Equipment';
        }
      }

      return {
        intent: parsed.intent || (isProductQuery ? 'PRODUCT_SEARCH' : 'GENERAL_QUESTION'),
        isProductQuery,
        category,
        budgetMax: parsed.budgetMax ? Number(parsed.budgetMax) : undefined,
        useCase: parsed.useCase || undefined,
        searchKeywords: Array.isArray(parsed.searchKeywords)
          ? parsed.searchKeywords.map((k: string) => String(k).toLowerCase().trim())
          : [],
        preferences: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : [],
        productNameMentioned: parsed.productNameMentioned || undefined,
      };
    } catch (err) {
      console.warn('[GeminiAgent] Intent extraction fallback triggered:', err);
      return this.fallbackIntentExtraction(userMessage);
    }
  }

  /**
   * Generates natural conversational response for out-of-catalog items, general questions, or mixed queries.
   */
  async generateConversationalReply(params: {
    userMessage: string;
    storeName?: string;
    isProductQuery: boolean;
    hasMatchingProducts: boolean;
    productCount: number;
    searchKeywords?: string[];
  }): Promise<string> {
    const {
      userMessage,
      storeName = 'Apex Performance Gear',
      isProductQuery,
      hasMatchingProducts,
      productCount,
      searchKeywords = [],
    } = params;

    // Fast path: if matching products exist, standard concise affirmative response
    if (hasMatchingProducts && productCount > 0) {
      return `I searched our catalog and found ${productCount} item${productCount > 1 ? 's' : ''} in stock that match your request.`;
    }

    if (!this.genAI) {
      if (isProductQuery) {
        const itemMention = searchKeywords.join(' ') || 'that item';
        return `I couldn't find "${itemMention}" in our catalog right now. We currently specialize in performance athletic footwear, running shoes, and sportswear.`;
      }
      return `I'm here to help with your shopping inquiries, running gear recommendations, and store questions. Let me know what you're looking for!`;
    }

    try {
      const prompt = `
You are the helpful AI assistant for ${storeName}, an athletic footwear, apparel, and running equipment store.

Context:
- User Message: "${userMessage}"
- User Shopping Intent: ${isProductQuery ? 'Looking for a product' : 'General conversational / educational inquiry'}
- Catalog Search Result: ${hasMatchingProducts ? `${productCount} matching items found` : '0 matching items found in the store database'}

Guidelines:
1. If the user asked for a product that was NOT found (e.g. Tesla, PlayStation, MacBook, or unstocked shoes):
   - Politely state that we do not currently have that item in our catalog.
   - Mention what ${storeName} does specialize in (performance athletic footwear, running shoes, and apparel).
   - NEVER invent or pretend that an unstocked item is available.
2. If the user asked a general question (e.g. difference between OLED and LED, or advice on marathon training):
   - Answer the question accurately, concisely, and helpfully in 2-3 sentences.
3. Keep the tone calm, professional, and Apple-like in brevity and clarity (maximum 3 sentences).

Reply directly as the assistant:
`;

      const reply = await this.executeWithFallback(prompt, 'text/plain', 0.3);
      return reply.trim();
    } catch (err) {
      console.warn('[GeminiAgent] Conversational reply fallback triggered:', err);
      if (isProductQuery) {
        const itemMention = searchKeywords.join(' ') || 'that product';
        return `I couldn't find "${itemMention}" in our catalog right now. We currently specialize in performance athletic footwear, apparel, and running equipment.`;
      }
      return `I'm happy to help. Let me know if you need recommendations for running shoes, athletic apparel, or gear.`;
    }
  }

  /**
   * Generates explainable match justifications for candidate products from the database.
   */
  async rankAndExplain(
    userMessage: string,
    candidates: Array<{
      id: string;
      name: string;
      category: string;
      priceRupees: number;
      description: string;
      useCases: string[];
      tags: string[];
    }>
  ): Promise<RecommendationExplanation[]> {
    if (candidates.length === 0) return [];

    if (!this.genAI) {
      return this.fallbackExplain(userMessage, candidates);
    }

    try {
      const prompt = `
You are a transparent, professional sales assistant.
Explain why each candidate product matches the customer's request.

User query: "${userMessage}"

Candidate Products (from merchant's authoritative database):
${JSON.stringify(candidates, null, 2)}

Requirements:
- NEVER invent specifications or prices.
- Explain matches based on the candidate's actual price, category, use cases, and tags.
- Output MUST be valid JSON array conforming to:
[
  {
    "productId": "string",
    "headline": "Short punchy match summary (max 6 words)",
    "reason": "Detailed explainability explanation citing actual price and use case (1-2 sentences)",
    "matchScore": number (1 to 100)
  }
]
`;

      const text = await this.executeWithFallback(prompt, 'application/json', 0.2);
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return this.fallbackExplain(userMessage, candidates);
    } catch (err) {
      console.warn('[GeminiAgent] Ranking fallback triggered:', err);
      return this.fallbackExplain(userMessage, candidates);
    }
  }

  /**
   * Deterministic intent extraction fallback.
   */
  private fallbackIntentExtraction(text: string): StructuredIntent {
    const lower = text.toLowerCase();

    // Check for checkout keywords
    if (/pay|checkout|buy now|place order|confirm order|proceed/i.test(lower)) {
      return {
        intent: 'CHECKOUT',
        isProductQuery: true,
        searchKeywords: [],
      };
    }

    // General knowledge questions
    const isGeneralQuestion = /^(what is|what are|explain|difference between|how does|why is|tell me about|help me understand)/i.test(lower);

    // Extract budget e.g. "under 4000", "under ₹4,000", "below 5000", "4k"
    let budgetMax: number | undefined;
    const budgetMatch = lower.match(/(?:under|below|max|budget|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)?|\d+k)/i);
    if (budgetMatch) {
      let raw = budgetMatch[1].replace(',', '');
      if (raw.endsWith('k')) {
        budgetMax = parseFloat(raw.replace('k', '')) * 1000;
      } else {
        budgetMax = parseInt(raw, 10);
      }
    }

    // Extract category
    let category: string | undefined;
    if (/shoe|sneaker|runner|cleat|footwear/i.test(lower)) {
      category = 'Footwear';
    } else if (/sock/i.test(lower)) {
      category = 'Accessories';
    } else if (/shirt|tee|apparel|short|pant|jacket/i.test(lower)) {
      category = 'Apparel';
    } else if (/flask|bottle|equipment/i.test(lower)) {
      category = 'Equipment';
    }

    // Extract use cases
    let useCase: string | undefined;
    if (/running|jogging|marathon/i.test(lower)) {
      useCase = 'daily running';
    } else if (/trail|hiking|outdoor/i.test(lower)) {
      useCase = 'trail running';
    } else if (/gym|training|workout|cross/i.test(lower)) {
      useCase = 'training';
    }

    // Extract search keywords
    const keywords = lower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['show', 'find', 'want', 'need', 'give', 'under', 'below', 'shoes', 'shoe'].includes(w));

    return {
      intent: isGeneralQuestion ? 'GENERAL_QUESTION' : 'PRODUCT_SEARCH',
      isProductQuery: !isGeneralQuestion,
      category,
      budgetMax,
      useCase,
      searchKeywords: keywords,
      preferences: keywords,
    };
  }

  /**
   * Deterministic explanation fallback.
   */
  private fallbackExplain(
    userMessage: string,
    candidates: Array<{
      id: string;
      name: string;
      category: string;
      priceRupees: number;
      useCases: string[];
      tags: string[];
    }>
  ): RecommendationExplanation[] {
    return candidates.map((item, idx) => ({
      productId: item.id,
      headline: `Top match: ${item.name}`,
      reason: `Matches your criteria: in the ${item.category} category, priced at ₹${item.priceRupees.toLocaleString('en-IN')}, and tagged for ${item.useCases.join(', ') || 'athletic use'}.`,
      matchScore: 95 - idx * 5,
    }));
  }
}

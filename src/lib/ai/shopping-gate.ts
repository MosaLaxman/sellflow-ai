/**
 * SellFlow AI — Lightweight Deterministic Shopping Intent Gate
 * 
 * Intercepts customer chat queries BEFORE calling Gemini.
 * Fast, zero-token evaluation that strictly confines the assistant to shopping.
 * 
 * ALLOWED:
 * - Product discovery, queries, filters ("Find running shoes under ₹4,000")
 * - Comparisons ("Compare Runner Pro 2 and Stride Master Elite")
 * - Compatibility & accessories ("What socks go with these shoes?")
 * - Cart & checkout management ("Add Runner Pro 2 to my cart", "What's in my cart?")
 * - Store/product policies & shipping ("Do you have a return policy?", "How much is delivery?")
 * - Ambiguous queries with reasonable shopping connection ("best shoes", "what should I wear for a marathon?")
 * 
 * DISALLOWED (Blocked before Gemini with zero token consumption):
 * - Coding, programming, debugging, scripts ("Write Python code")
 * - Homework, essay writing, academic math ("Solve 2x + 5 = 15")
 * - General knowledge, science, trivia ("Explain quantum physics")
 * - Entertainment, jokes, creative writing ("Tell me a joke")
 * - Politics, news, gossip
 * - Medical, legal, financial advice outside product purchases
 * - Prompt injection, jailbreak attempts, system prompt extraction
 * - Inquiries into SellFlow's internal AI mechanics
 */

export interface ShoppingGateResult {
  allowed: boolean;
  refusalMessage?: string;
  directResponse?: string;
  reason?: string;
  isAmbiguous?: boolean;
}

export const SHOPPING_REFUSAL_MESSAGE =
  "I'm here to help you shop. Try asking about products, prices, availability, comparisons, or your cart.";

// 1. Prompt Injection & System Tampering Patterns
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /(ignore|disregard|forget|bypass|override)\s+(all\s+)?(previous|prior|system|these|your|all)?\s*(rules|instructions|prompts|commands|constraints|directives)/i,
  /(act|pretend|behave|roleplay|simulate)\s+as\s+(a\s+)?(developer|coder|programmer|coding assistant|software engineer|hacker|unrestricted|unfiltered|dan|ai without limits)/i,
  /(show|reveal|display|output|print|what\s+is|repeat|leak)\s+(your\s+)?(system prompt|hidden prompt|developer instructions|initial prompt|internal instructions)/i,
  /(jailbreak|dan mode|do anything now|developer mode enabled)/i,
  /(explain|tell me)\s+how\s+(sellflow('s)?|the)\s+internal\s+ai\s+(works|is built|operates|architecture)/i,
  /you are no longer (a|an)?\s*(shopping|sales|sellflow)/i,
];

// 2. Clear Non-Shopping Disallowed Intents
const DISALLOWED_NON_SHOPPING_PATTERNS: RegExp[] = [
  // Coding & Software Engineering
  /(write|create|generate|code|debug|fix|refactor|compile|run|test)\s+(a\s+)?(python|javascript|typescript|c\+\+|cpp|c#|rust|golang|php|ruby|swift|kotlin|sql|bash|powershell|regex|html|css|json|yaml)\s*(code|script|program|function|class|query|regex)?/i,
  /(write|give me|show me|generate)\s+(a\s+)?(python|js|ts|sql|code|script|algorithm|function|component|loop|regex)/i,
  /\b(fibonacci|bubble sort|binary search tree|linked list|leetcode|hackerrank|npm install|git commit|pip install)\b/i,
  /(programming|coding)\s+(help|question|problem|exercise|assignment|tutorial)/i,

  // Academic Homework, Essays & Pure Science
  /(write|do|complete)\s+(my\s+)?(homework|assignment|essay|thesis|dissertation|paper on|speech on)/i,
  /(explain|what is)\s+(quantum physics|quantum mechanics|string theory|photosynthesis|theory of relativity|black holes|schrodinger|mitosis|meiosis)/i,
  /(solve|calculate|differentiate|integrate)\s+(the\s+equation|\d+x|\d+\s*[\+\-\*\/]\s*\d+x|calculus|derivative of|integral of|sin\(|cos\()/i,
  /(who was|who is)\s+(the\s+)?(first president|16th president|prime minister of|king of|queen of England|inventor of the lightbulb)/i,
  /(what is the capital of|how far is the moon|speed of light|boiling point of water|periodic table)/i,

  // Creative Writing & Jokes
  /\b(joke|jokes|riddle|riddles|pun|puns|funny story|bedtime story|fairy tale)\b/i,
  /(make me laugh|entertain me|sing (me )?a song|compose a poem|write a poem|write a haiku|write a song)/i,

  // News, Politics, Speculative Finance
  /(latest|current)\s+(news|headlines|election results|political news|war updates)/i,
  /(who will win the election|democrats vs republicans|parliament election)/i,
  /(crypto|cryptocurrency|bitcoin|ethereum|stock market)\s+(prediction|tips|investment advice|should i buy)/i,

  // Medical / Legal Advice Unrelated to Shopping
  /(medical advice|what medicine should i take|cure for headache|symptoms of covid|prescribe me|legal advice|how to file a lawsuit|sue someone)/i,
];

// 3. Product Availability & Store Inventory Inquiries (e.g. "Do you have condoms?", "Do you sell protein?")
const PRODUCT_AVAILABILITY_PATTERNS: RegExp[] = [
  /\b(do\s+you\s+(have|sell|carry|stock|offer|provide|keep)|does\s+(this\s+|the\s+)?(store|shop|merchant)\s+(have|sell|carry|stock))\b/i,
  /\b(whether\s+(you|it|the\s+store|this\s+store)\s+(has|have|sells|carries|stocks|offers))\b/i,
  /\b(have\s+you\s+got|got\s+any|is\s+there\s+any|are\s+there\s+(any)?)\b/i,
  /\b(can\s+i\s+(buy|get|purchase|order|find))\b/i,
  /\b(where\s+can\s+i\s+(buy|get|find|order))\b/i,
  /\b(is\s+.+\s+(in\s+stock|available|sold|for\s+sale))\b/i,
  /\b(what\s+do\s+you\s+(have|sell|carry|stock|offer))\b/i,
  /\b(what\s+kind\s+of\s+.+\s+do\s+you\s+have)\b/i,
];

// 4. Product Discovery & Commercial Transactions
const SHOPPING_INTENT_INDICATORS: RegExp[] = [
  // Commercial verbs & transactional keywords
  /\b(buy|order|cart|bag|checkout|pay|purchase|price|pricing|cost|costing|rupees?|rs\.?|₹|mrp)\b/i,
  /\b(discount|discounts|offer|offers|deal|deals|coupon|sale|promo|affordable|budget|cheap|expensive)\b/i,
  /\b(under|below|less than|above|more than|between)\s*(₹|rs\.?)?\s*\d+/i,
  /\b(in\s+stock|out\s+of\s+stock|available|availability|restock|restocking)\b/i,
  /\b(size|sizes|sizing|fit|fits|fitting|color|colors|colour|colours|weight|material|fabric)\b/i,
  /\b(shipping|delivery|dispatch|arrive|return|returns|refund|refunds|exchange|warranty|guarantee)\b/i,
  /\b(add\s+to\s+cart|add\s+this|remove\s+from\s+cart|clear\s+cart|view\s+cart|show\s+cart|my\s+cart|in\s+my\s+cart)\b/i,
  
  // Comparison & Recommendation inquiries
  /\b(compare|comparison|versus|vs\.?|difference\s+between)\b/i,
  /\b(recommend|recommendation|suggestions?|suggest|advice\s+for|looking\s+for|searching\s+for|need\s+something\s+for)\b/i,
  /\b(show\s+(me|us)?|find\s+(me|us)?|search(\s+for)?|i('m|\s+am)\s+looking\s+for)\b/i,
  /\b(i\s+(want|need|would\s+like)\s+(to\s+buy|to\s+order|to\s+get|a|an|some|new))\b/i,
  /\b(compatible|compatibility|go\s+with|match\s+with|pair\s+with|pairs\s+with|accessory|accessories)\b/i,
  /\b(best|top|lightweight|heavy|cushion|cushioned|cushioning|plate|carbon|foam|waterproof|breathable|durable)\b/i,
  
  // Athletic & Running contexts that map to catalog
  /\b(marathon|half marathon|race|racing|jog|jogging|daily run|running|trail run|sprint|gym|workout|athletics|exercise|cardio|blisters?)\b/i,
  
  // Specific Catalog Brand / Product Names
  /\b(pacepro|runner pro|stride master|terraclimb|pace aero|aerovent|pro-dry|endurospeed|thermalshield|aerofit|pro cushion|aerohydrate|pulsegrip|nightlume|aerobelt|ultrafoam|apex velocity)\b/i,
];

// 5. Broad Commerce Product Terminology (Health, personal care, apparel, footwear, accessories, nutrition)
const COMMERCE_PRODUCT_NOUNS: RegExp[] = [
  // Footwear & Apparel
  /\b(shoe|shoes|runner|runners|sneaker|sneakers|footwear|kicks|boots?|sandals?|cleats?)\b/i,
  /\b(tee|tees|t-shirt|tshirt|shirt|shirts|top|tops|jersey|jerseys|hoodie|hoodies)\b/i,
  /\b(short|shorts|pant|pants|tights|leggings|jacket|jackets|windbreaker|bra|sports bra)\b/i,
  /\b(gear|apparel|clothing|clothes|product|products|item|items|merchandise|catalog|inventory|stock)\b/i,

  // Accessories & Equipment
  /\b(sock|socks|flask|bottle|hydration|headband|wristband|armband|belt|waist pack|pack|roller|foam roller|mat|bands?|straps?)\b/i,
  /\b(cap|caps|hat|hats|visor|beanie|gloves|sunglasses|glasses|watch|smartwatch|towel|towels|bag|bags|backpack|duffel)\b/i,

  // Health, Personal Care, Protection & Wellness
  /\b(condom|condoms|contraception|protection|bandage|bandages|tape|balm|cream|lotion|sunscreen|lip balm|antiperspirant|deodorant)\b/i,

  // Nutrition, Fuel & Supplements
  /\b(protein|powder|creatine|electrolyte|electrolytes|gel|gels|energy bar|bars|snack|snacks|vitamins|nutrition|supplement|supplements)\b/i,
];

// 6. Conversational Greetings that should not consume Gemini tokens
const PURE_GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening|day))[\s\.\!\?]*$/i,
  /^(howdy|hola|namaste)[\s\.\!\?]*$/i,
];

const PURE_GRATITUDE_PATTERNS = [
  /^(thanks|thank you|thankyou|thx|ty|many thanks|much appreciated)[\s\.\!\?]*$/i,
];

/**
 * Evaluates whether a customer message is valid shopping-related intent.
 * Runs in < 1ms synchronously before any LLM invocation.
 */
export function evaluateShoppingIntent(
  rawMessage: string,
  merchantName: string = 'Apex Performance Gear'
): ShoppingGateResult {
  const message = rawMessage.trim();
  if (!message) {
    return {
      allowed: false,
      refusalMessage: SHOPPING_REFUSAL_MESSAGE,
      reason: 'EMPTY_MESSAGE',
    };
  }

  // 1. Check for prompt-injection / system instructions tampering
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: false,
        refusalMessage: SHOPPING_REFUSAL_MESSAGE,
        reason: 'PROMPT_INJECTION_OR_SYSTEM_TAMPERING',
      };
    }
  }

  // 2. Check for pure non-shopping requests (coding, homework, trivia, jokes, etc.)
  for (const pattern of DISALLOWED_NON_SHOPPING_PATTERNS) {
    if (pattern.test(message)) {
      // If someone says "write Python code to search your catalog", it has "catalog"
      // but is unmistakably a coding request -> reject!
      const isCodingAttempt = /(python|javascript|typescript|c\+\+|code|script|algorithm|function|sql|loop)/i.test(message);
      if (isCodingAttempt) {
        return {
          allowed: false,
          refusalMessage: SHOPPING_REFUSAL_MESSAGE,
          reason: 'CODING_OR_DEVELOPMENT_REQUEST',
        };
      }

      // Check if there is strong, undeniable shopping intent to prevent false positives
      const hasShoppingMatch = SHOPPING_INTENT_INDICATORS.some((p) => p.test(message));
      if (!hasShoppingMatch) {
        return {
          allowed: false,
          refusalMessage: SHOPPING_REFUSAL_MESSAGE,
          reason: 'NON_SHOPPING_DISALLOWED_TOPIC',
        };
      }
    }
  }

  // 3. Check for pure polite greetings (Token Saver: handle immediately without LLM)
  for (const pattern of PURE_GREETING_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: true,
        directResponse: `Hello! Welcome to ${merchantName}. I'm your SellFlow shopping assistant. How can I help you discover gear, compare products, or manage your cart today?`,
        reason: 'POLITE_GREETING_DETERMINISTIC',
      };
    }
  }

  // 4. Check for pure gratitude (Token Saver: handle immediately without LLM)
  for (const pattern of PURE_GRATITUDE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        allowed: true,
        directResponse: "You're welcome! Let me know if you need help finding anything else, checking sizes, or completing your checkout.",
        reason: 'GRATITUDE_DETERMINISTIC',
      };
    }
  }

  // 5. Check for assistant capability inquiries ("who are you", "what can you do")
  if (/^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do)[\s\.\!\?]*$/i.test(message)) {
    return {
      allowed: true,
      directResponse: `I'm SellFlow AI, your dedicated shopping assistant for ${merchantName}. You can ask me to find products, compare specs, check prices and stock, or add items to your cart.`,
      reason: 'ASSISTANT_CAPABILITY_EXPLANATION',
    };
  }

  // 6. Product Availability & Store Stock Inquiries (e.g. "Do you have condoms?", "whether it has condoms")
  const hasAvailabilityQuery = PRODUCT_AVAILABILITY_PATTERNS.some((pattern) => pattern.test(message));
  if (hasAvailabilityQuery) {
    return {
      allowed: true,
      reason: 'PRODUCT_AVAILABILITY_INQUIRY',
    };
  }

  // 7. General Commercial Intent & Transactional Indicators
  const hasShoppingSignal = SHOPPING_INTENT_INDICATORS.some((pattern) => pattern.test(message));
  if (hasShoppingSignal) {
    return {
      allowed: true,
      reason: 'MATCHED_SHOPPING_INDICATOR',
    };
  }

  // 8. Broad Commerce Product Nouns (e.g. "condoms", "protein bars", "sunglasses")
  const hasCommerceNoun = COMMERCE_PRODUCT_NOUNS.some((pattern) => pattern.test(message));
  if (hasCommerceNoun) {
    return {
      allowed: true,
      reason: 'MATCHED_COMMERCE_PRODUCT_NOUN',
    };
  }

  // 9. Short Direct Keyword Searches (1 to 5 words) that contain no disallowed intents
  // Customers in store chats frequently type just a product name (e.g. "condoms", "knee sleeve", "energy gel")
  const words = message.split(/\s+/).filter(Boolean);
  if (words.length <= 5 && !/[<>{}\[\]\(\)=\+\*\/]/.test(message)) {
    // If it's not a question like "why is the sky blue" or "who was...", allow as search query
    const isTriviaQuestion = /^(why|who|how\s+come|when\s+was|where\s+is\s+the\s+city)\b/i.test(message);
    if (!isTriviaQuestion) {
      return {
        allowed: true,
        reason: 'SHORT_PRODUCT_SEARCH_KEYWORD',
      };
    }
  }

  // 10. Ambiguous Queries with reasonable connection to commerce or store
  const hasCommerceContext =
    /\b(wear|outfit|gear|item|product|stock|store|catalog|order|buy|cost|price|budget|marathon|running|jogging|training|workout|gym|fitness)\b/i.test(message);

  if (hasCommerceContext) {
    return {
      allowed: true,
      isAmbiguous: true,
      reason: 'AMBIGUOUS_WITH_REASONABLE_SHOPPING_CONNECTION',
    };
  }

  // Fallback: If no shopping indicator and no reasonable connection, reject immediately
  return {
    allowed: false,
    refusalMessage: SHOPPING_REFUSAL_MESSAGE,
    reason: 'NO_SHOPPING_CONNECTION',
  };
}

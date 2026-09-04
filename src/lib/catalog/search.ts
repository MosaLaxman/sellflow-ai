import { prisma } from '../db/prisma';

export interface ProductSearchParams {
  merchantId: string;
  query?: string;
  category?: string;
  budgetMaxRupees?: number;
  useCase?: string;
  searchKeywords?: string[];
  limit?: number;
  includeOutOfStock?: boolean;
}

export interface ScoredProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  currency: string;
  imageUrl: string | null;
  stockQuantity: number;
  status: string;
  tags: string[];
  useCases: string[];
  attributes: any;
  relevanceScore: number;
}

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'show', 'find', 'give',
  'want', 'need', 'looking', 'look', 'buy', 'sell', 'price', 'cost', 'get', 'please',
  'tell', 'recommend', 'suggest', 'available', 'have', 'got', 'store', 'shop', 'item',
  'items', 'product', 'products', 'good', 'best', 'any'
]);

const ACTIVITY_MODIFIERS = new Set([
  'running', 'run', 'road', 'trail', 'marathon', 'tempo', 'sprint', 'jogging', 'jog',
  'training', 'workout', 'fitness', 'gym', 'crossfit', 'exercise', 'cardio', 'athletics', 'athletic',
  'speed', 'cushion', 'cushioned', 'comfort', 'lightweight', 'breathable', 'waterproof', 'windproof',
  'outdoor', 'hiking', 'climbing', 'badminton', 'tennis', 'yoga', 'high-impact', 'seamless',
  'mens', 'womens', 'unisex', 'black', 'white', 'blue', 'red', 'green', 'lime'
]);

interface TaxonomyEntry {
  type: string;
  category: string;
  primaryNouns: string[];
  competingCategories?: string[];
}

const PRODUCT_TAXONOMY: TaxonomyEntry[] = [
  {
    type: 'footwear',
    category: 'Footwear',
    primaryNouns: ['shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'trainer', 'trainers', 'kicks', 'boot', 'boots'],
    competingCategories: ['Apparel', 'Accessories', 'Equipment'],
  },
  {
    type: 'shorts',
    category: 'Apparel',
    primaryNouns: ['short', 'shorts', 'trunks'],
    competingCategories: ['Footwear', 'Accessories', 'Equipment'],
  },
  {
    type: 'tops',
    category: 'Apparel',
    primaryNouns: ['shirt', 'shirts', 'tshirt', 't-shirt', 'tee', 'tees', 'top', 'tops', 'jersey', 'jerseys', 'tank', 'tanktop', 'tank top'],
    competingCategories: ['Footwear', 'Accessories', 'Equipment'],
  },
  {
    type: 'jackets',
    category: 'Apparel',
    primaryNouns: ['jacket', 'jackets', 'windbreaker', 'windbreakers', 'hoodie', 'hoodies', 'outerwear', 'coat', 'sweatshirt'],
    competingCategories: ['Footwear', 'Accessories', 'Equipment'],
  },
  {
    type: 'socks',
    category: 'Accessories',
    primaryNouns: ['sock', 'socks', 'hosiery'],
    competingCategories: ['Footwear', 'Equipment'],
  },
  {
    type: 'hydration',
    category: 'Equipment',
    primaryNouns: ['bottle', 'bottles', 'flask', 'flasks', 'hydration', 'waterbottle', 'water bottle'],
    competingCategories: ['Footwear', 'Apparel'],
  },
  {
    type: 'recovery',
    category: 'Equipment',
    primaryNouns: ['roller', 'rollers', 'foam roller', 'foamroller', 'massage roller'],
    competingCategories: ['Footwear', 'Apparel'],
  },
  {
    type: 'bands',
    category: 'Accessories',
    primaryNouns: ['headband', 'wristband', 'armband', 'sweatband', 'band', 'bands'],
    competingCategories: ['Footwear'],
  },
  {
    type: 'waistpack',
    category: 'Equipment',
    primaryNouns: ['waistpack', 'waist pack', 'belt', 'pouch'],
    competingCategories: ['Footwear'],
  },
  {
    type: 'sportsbra',
    category: 'Apparel',
    primaryNouns: ['bra', 'bras', 'sports bra', 'sportsbra'],
    competingCategories: ['Footwear', 'Equipment'],
  },
];

const SYNONYM_GROUPS: string[][] = [
  ['run', 'running', 'runner', 'runners', 'jog', 'jogging', 'jogger'],
  ['tshirt', 't-shirt', 'tee', 'tees', 'shirt', 'shirts', 'top', 'tops', 'jersey', 'jerseys'],
  ['shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'trainer', 'trainers', 'kicks'],
  ['short', 'shorts', 'bottom', 'bottoms', 'trunks'],
  ['pant', 'pants', 'tights', 'legging', 'leggings', 'trackpant', 'trackpants', 'jogger', 'joggers'],
  ['jacket', 'jackets', 'windbreaker', 'windbreakers', 'hoodie', 'hoodies', 'outerwear', 'coat', 'sweatshirt'],
  ['sock', 'socks', 'hosiery'],
  ['bottle', 'bottles', 'flask', 'flasks', 'hydration', 'waterbottle', 'water bottle'],
  ['band', 'bands', 'headband', 'wristband', 'armband'],
  ['roller', 'rollers', 'massage', 'recovery', 'foam roller', 'foamroller'],
  ['belt', 'pouch', 'waistpack', 'waist pack', 'bag', 'armband pouch'],
  ['bra', 'sports bra', 'sportsbra', 'tank', 'tank top'],
];

/**
 * Normalizes text by removing non-alphanumeric characters.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Helper to test whole word, prefix, or normalized substring match.
 */
function matchesWord(target: string, token: string): boolean {
  if (!target || !token) return false;
  const t = target.toLowerCase();
  const k = token.toLowerCase();

  // 1. Direct word boundary / prefix match
  const escaped = k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  if (k.length >= 3) {
    const regex = new RegExp(`\\b${escaped}`, 'i');
    if (regex.test(t)) return true;
  } else {
    const exactRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (exactRegex.test(t)) return true;
  }

  // 2. Normalized alphanumeric match (handling hyphens, spaces, e.g. "t-shirt" <-> "tshirt")
  const targetNorm = normalizeText(target);
  const tokenNorm = normalizeText(token);
  if (tokenNorm.length >= 3 && targetNorm.includes(tokenNorm)) {
    return true;
  }
  if (tokenNorm.length < 3 && targetNorm === tokenNorm) {
    return true;
  }

  return false;
}

/**
 * Detects if the search keywords specify a core product type (e.g. shoes, shorts, jacket, socks).
 */
function detectTargetTaxonomy(rawKeywords: string[]): TaxonomyEntry | null {
  // Exclude general activity modifiers (like "running", "workout") so they don't overshadow core nouns
  const nounKeywords = rawKeywords.filter((kw) => !ACTIVITY_MODIFIERS.has(kw.toLowerCase()));

  for (const kw of nounKeywords) {
    const norm = normalizeText(kw);
    for (const tax of PRODUCT_TAXONOMY) {
      if (tax.primaryNouns.some((noun) => normalizeText(noun) === norm || matchesWord(noun, kw) || matchesWord(kw, noun))) {
        return tax;
      }
    }
  }
  return null;
}

/**
 * Checks if a catalog product matches a specific taxonomy entry.
 */
function productMatchesTaxonomy(product: any, taxonomy: TaxonomyEntry): boolean {
  const prodName = product.name.toLowerCase();
  const prodCat = product.category.toLowerCase();
  const prodTags = product.tags.map((t: string) => t.toLowerCase());

  if (taxonomy.category.toLowerCase() === 'footwear' && prodCat === 'footwear') {
    return true;
  }

  if (prodCat === taxonomy.category.toLowerCase()) {
    return taxonomy.primaryNouns.some((n) =>
      matchesWord(prodName, n) || prodTags.some((t: string) => matchesWord(t, n))
    );
  }

  return taxonomy.primaryNouns.some((n) =>
    matchesWord(prodName, n) || prodTags.some((t: string) => matchesWord(t, n))
  );
}

/**
 * Expands a token list with synonyms and singular/plural variations.
 */
function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();

  for (const raw of tokens) {
    const t = raw.toLowerCase().trim();
    if (!t || t.length < 2) continue;
    expanded.add(t);

    // Singular / plural derivation
    if (t.endsWith('s') && t.length > 3) {
      expanded.add(t.slice(0, -1));
    } else if (!t.endsWith('s')) {
      expanded.add(`${t}s`);
    }

    // Synonym group lookup
    const norm = normalizeText(t);
    for (const group of SYNONYM_GROUPS) {
      const match = group.some((syn) => normalizeText(syn) === norm || syn === t);
      if (match) {
        for (const syn of group) {
          expanded.add(syn);
        }
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Tokenizes text into distinct lowercase search keywords (min length 2, ignoring stop words).
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  return Array.from(new Set(words));
}

/**
 * Strict, relevance-scored catalog search against PostgreSQL database.
 * Filters out cross-category pollution and prioritizes exact product type matches.
 */
export async function searchCatalog(params: ProductSearchParams): Promise<ScoredProduct[]> {
  const {
    merchantId,
    query = '',
    category,
    budgetMaxRupees,
    useCase,
    searchKeywords = [],
    limit = 10,
    includeOutOfStock = true,
  } = params;

  // 1. Base query: active inventory
  const whereClause: any = {
    merchantId,
    status: 'ACTIVE',
  };

  if (!includeOutOfStock) {
    whereClause.stockQuantity = { gt: 0 };
  }

  if (budgetMaxRupees && budgetMaxRupees > 0) {
    whereClause.priceMinor = { lte: Math.round(budgetMaxRupees * 100) };
  }

  if (category && category.trim().length > 0) {
    whereClause.category = { equals: category.trim(), mode: 'insensitive' };
  }

  // Fetch candidate pool
  const rawProducts = await prisma.product.findMany({
    where: whereClause,
  });

  if (rawProducts.length === 0) {
    return [];
  }

  // Extract raw search keywords
  const rawTokens = Array.from(
    new Set([
      ...extractKeywords(query),
      ...searchKeywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 2 && !STOP_WORDS.has(k) && !/^\d+$/.test(k)),
    ])
  );

  const queryTokens = expandTokens(rawTokens);
  const targetCategory = category?.toLowerCase().trim();
  const targetUseCase = useCase?.toLowerCase().trim();

  // If there are no search tokens, category, or use case, return all available products
  if (queryTokens.length === 0 && !targetCategory && !targetUseCase) {
    return rawProducts.slice(0, limit).map((p) => ({
      ...p,
      relevanceScore: 100,
    }));
  }

  // Detect core product type taxonomy intent from the query (e.g. "shoes", "shorts", "jacket", "socks")
  const targetTaxonomy = detectTargetTaxonomy(rawTokens);

  // 2. Score each candidate product
  const scoredList: ScoredProduct[] = [];

  for (const prod of rawProducts) {
    const prodName = prod.name.toLowerCase();
    const prodDesc = prod.description.toLowerCase();
    const prodCat = prod.category.toLowerCase();
    const prodTags = prod.tags.map((t) => t.toLowerCase());
    const prodUseCases = prod.useCases.map((u) => u.toLowerCase());

    // CROSS-CATEGORY GUARDRAIL:
    // If the user explicitly requested a specific product type (like shoes/footwear),
    // eliminate products from competing categories that only match incidental modifier words (like "running shorts" for "running shoes")
    if (targetTaxonomy) {
      const isTaxonomyMatch = productMatchesTaxonomy(prod, targetTaxonomy);
      if (!isTaxonomyMatch) {
        // Exclude products that don't match the target product type
        continue;
      }
    }

    let score = 0;
    let matchedRawTokenCount = 0;

    // Taxonomy Intent Bonus
    if (targetTaxonomy && productMatchesTaxonomy(prod, targetTaxonomy)) {
      score += 300;
    }

    // Check category constraint
    if (targetCategory) {
      if (prodCat === targetCategory || prodCat.includes(targetCategory) || targetCategory.includes(prodCat)) {
        score += 50;
      }
    }

    // Check use case constraint
    if (targetUseCase) {
      const match = prodUseCases.some((u) => u.includes(targetUseCase) || targetUseCase.includes(u));
      if (match) {
        score += 40;
      }
    }

    // Check raw tokens coverage
    for (const rawKw of rawTokens) {
      const isMatched =
        matchesWord(prodName, rawKw) ||
        prodTags.some((t) => matchesWord(t, rawKw)) ||
        matchesWord(prodCat, rawKw) ||
        prodUseCases.some((u) => matchesWord(u, rawKw)) ||
        matchesWord(prodDesc, rawKw);

      if (isMatched) {
        matchedRawTokenCount++;
      }
    }

    // Check query tokens
    for (const token of queryTokens) {
      // 1. Name match (Highest weight: 60)
      if (matchesWord(prodName, token)) {
        score += 60;
      }

      // 2. Tag match (Weight: 35)
      if (prodTags.some((t) => matchesWord(t, token))) {
        score += 35;
      }

      // 3. Category match (Weight: 30)
      if (matchesWord(prodCat, token)) {
        score += 30;
      }

      // 4. Use Case match (Weight: 25)
      if (prodUseCases.some((u) => matchesWord(u, token))) {
        score += 25;
      }

      // 5. Description match (Weight: 15)
      if (matchesWord(prodDesc, token)) {
        score += 15;
      }
    }

    // Bonus for matching multiple raw query keywords (e.g. both 'running' AND 'shoes')
    if (rawTokens.length > 1 && matchedRawTokenCount >= rawTokens.length) {
      score += 100;
    }

    const passesRelevanceGate =
      rawTokens.length === 0
        ? score > 0
        : (targetTaxonomy ? true : matchedRawTokenCount > 0);

    if (passesRelevanceGate && score >= 15) {
      scoredList.push({
        ...prod,
        relevanceScore: score,
      });
    }
  }

  // 3. Sort by relevance descending, then price ascending
  scoredList.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.priceMinor - b.priceMinor;
  });

  return scoredList.slice(0, limit);
}

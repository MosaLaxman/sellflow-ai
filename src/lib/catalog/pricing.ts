/**
 * SellFlow AI — Pricing Utility
 * 
 * Computes standard retail original MRP (Compare At Price), discounted selling price,
 * and calculated discount percentage for clean, minimal storefront presentation.
 */

export interface ProductPricing {
  sellingPriceMinor: number;
  originalPriceMinor: number;
  sellingPriceFormatted: string;
  originalPriceFormatted: string;
  discountPercentage: number;
}

/**
 * Derives the original MRP price and calculates the discount percentage.
 * If attributes contain custom MRP (e.g. mrpRupees / originalPriceRupees / compareAtPriceMinor),
 * uses it; otherwise derives a clean, realistic retail MSRP benchmark.
 */
export function getProductPricing(
  priceMinor: number,
  attributes?: Record<string, any> | null
): ProductPricing {
  const sellingRupees = Math.round(priceMinor / 100);

  let originalRupees: number;

  if (attributes?.compareAtPriceMinor) {
    originalRupees = Math.round(Number(attributes.compareAtPriceMinor) / 100);
  } else if (attributes?.originalPriceRupees) {
    originalRupees = Math.round(Number(attributes.originalPriceRupees));
  } else if (attributes?.mrpRupees) {
    originalRupees = Math.round(Number(attributes.mrpRupees));
  } else {
    // Generate realistic standard retail MSRP rounded to 99 / 499 / 999
    if (sellingRupees < 1000) {
      originalRupees = Math.ceil((sellingRupees * 1.35) / 100) * 100 - 1; // e.g. 499 -> 799
    } else if (sellingRupees < 3000) {
      originalRupees = Math.ceil((sellingRupees * 1.3) / 100) * 100 - 1; // e.g. 1899 -> 2499
    } else if (sellingRupees < 6000) {
      originalRupees = Math.ceil((sellingRupees * 1.28) / 500) * 500 - 1; // e.g. 3499 -> 4499
    } else {
      originalRupees = Math.ceil((sellingRupees * 1.25) / 1000) * 1000 - 1; // e.g. 7499 -> 9999
    }
  }

  // Ensure original price is always strictly greater than discounted selling price
  if (originalRupees <= sellingRupees) {
    originalRupees = Math.round(sellingRupees * 1.25);
  }

  const originalPriceMinor = originalRupees * 100;
  const discountPercentage = Math.round(
    ((originalPriceMinor - priceMinor) / originalPriceMinor) * 100
  );

  return {
    sellingPriceMinor: priceMinor,
    originalPriceMinor,
    sellingPriceFormatted: `₹${sellingRupees.toLocaleString('en-IN')}`,
    originalPriceFormatted: `₹${originalRupees.toLocaleString('en-IN')}`,
    discountPercentage,
  };
}

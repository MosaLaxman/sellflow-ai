'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Check, ShieldCheck, Zap, Plus, Minus, Clock } from 'lucide-react';
import { ProductCardData } from './ProductCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getProductPricing } from '@/lib/catalog/pricing';

interface ProductDetailModalProps {
  product: ProductCardData | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: ProductCardData, quantity?: number) => void;
  onBuyNow: (product: ProductCardData, quantity?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  if (!isOpen || !product) return null;

  const pricing = getProductPricing(product.priceMinor, product.attributes);
  const priceRupees = product.priceMinor / 100;
  const isOutOfStock = product.stockQuantity <= 0;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    if (!isOutOfStock) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleDirectBuy = () => {
    onBuyNow(product, quantity);
    if (!isOutOfStock) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[var(--sf-surface)] rounded-sf-xl border border-[var(--sf-border)] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--sf-border)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--sf-text-muted)]">
              {product.category}
            </span>
            <span className="text-[var(--sf-border)]">•</span>
            <StatusBadge variant={isOutOfStock ? 'warning' : 'neutral'}>
              {isOutOfStock ? 'Sold Out' : `${product.stockQuantity} in stock`}
            </StatusBadge>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sf text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image */}
            <div className="relative aspect-4/3 rounded-sf-lg bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] overflow-hidden">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--sf-text-muted)] text-sm">
                  {product.name}
                </div>
              )}
            </div>

            {/* Product Meta */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 id="product-detail-title" className="text-xl font-bold text-[var(--sf-text-primary)] tracking-tight">
                  {product.name}
                </h2>

                <div className="mt-2 flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-2xl font-bold tabular-nums text-[var(--sf-text-primary)]">
                    {pricing.sellingPriceFormatted}
                  </span>
                  <span className="text-sm text-[var(--sf-text-muted)] line-through tabular-nums">
                    {pricing.originalPriceFormatted}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded leading-tight">
                    {pricing.discountPercentage}% off
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[var(--sf-text-secondary)]">
                  {product.description}
                </p>
              </div>

              {/* Sold Out Restock Notice Banner */}
              {isOutOfStock && (
                <div className="p-3 rounded-sf bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs flex items-start gap-2.5 animate-fade-in">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      Currently Sold Out
                    </span>
                    <p className="text-amber-800/90 dark:text-amber-300 text-[11px] mt-0.5 leading-relaxed">
                      This item is temporarily out of stock. It will be back in stock soon — please check back in a few days!
                    </p>
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="pt-2">
                  <span className="text-label block mb-1.5">Quantity</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)]">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] disabled:opacity-30 sf-transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-semibold text-[var(--sf-text-primary)]">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                        disabled={quantity >= product.stockQuantity}
                        className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] disabled:opacity-30 sf-transition"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[11px] text-[var(--sf-text-muted)]">
                      Total: <strong className="text-[var(--sf-text-primary)] font-mono">₹{(priceRupees * quantity).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technical Specs / Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="pt-4 border-t border-[var(--sf-border-light)]">
              <h3 className="text-label block mb-2.5">Specifications & Features</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {Object.entries(product.attributes)
                  .filter(([key]) => {
                    // Avoid duplicate pricing tiles: if both mrpRupees and originalPriceRupees exist, keep only mrpRupees
                    if (key === 'originalPriceRupees' && (product.attributes as any)?.mrpRupees) {
                      return false;
                    }
                    return true;
                  })
                  .map(([key, val]) => {
                    // Clean label: format "mrpRupees" to "MRP", "originalPriceRupees" to "Original Price", remove raw "Rupees" suffixes
                    let displayKey = key;
                    if (key.toLowerCase() === 'mrprupees' || key.toLowerCase() === 'mrp') {
                      displayKey = 'MRP';
                    } else if (key.toLowerCase() === 'originalpricerupees') {
                      displayKey = 'Original Price';
                    } else {
                      displayKey = key
                        .replace(/rupees$/i, '')
                        .replace(/minor$/i, '')
                        .replace(/([A-Z])/g, ' $1')
                        .trim();
                    }

                    // Value formatting: if it's a price/rupee field, use the Indian Rupee symbol (₹)
                    const isCurrency =
                      key.toLowerCase().includes('rupee') ||
                      key.toLowerCase().includes('price') ||
                      key.toLowerCase().includes('mrp');

                    let displayVal = String(val);
                    if (isCurrency && !isNaN(Number(val))) {
                      displayVal = `₹${Number(val).toLocaleString('en-IN')}`;
                    }

                    return (
                      <div key={key} className="p-2.5 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)]">
                        <span className="text-[10px] text-[var(--sf-text-muted)] uppercase tracking-wider block">
                          {displayKey}
                        </span>
                        <span className="font-medium text-[var(--sf-text-primary)] mt-0.5 block truncate">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Use Cases & Tags */}
          {product.useCases && product.useCases.length > 0 && (
            <div className="pt-3 border-t border-[var(--sf-border-light)]">
              <span className="text-label block mb-2">Ideal For</span>
              <div className="flex flex-wrap gap-1.5">
                {product.useCases.map((uc, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-xs text-[var(--sf-text-secondary)]"
                  >
                    {uc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="p-3 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] flex items-center justify-between text-[11px] text-[var(--sf-text-muted)]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Authentic Merchant Inventory</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-brand-600" />
              <span>Razorpay Instant Settlement</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:px-6 border-t border-[var(--sf-border)] dark:border-stone-800 bg-[var(--sf-surface)] flex items-center justify-end gap-3">
          <button
            onClick={handleAdd}
            className={`px-4 py-2.5 rounded-sf border font-medium text-xs flex items-center gap-2 sf-transition ${
              isOutOfStock
                ? 'border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                : 'border-[var(--sf-border)] dark:border-stone-800 hover:border-brand-500/40 text-[var(--sf-text-primary)] hover:text-brand-600 hover:bg-[var(--sf-surface-hover)]'
            }`}
          >
            {isOutOfStock ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Sold Out · Restocking Soon</span>
              </>
            ) : isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          {!isOutOfStock && (
            <button
              onClick={handleDirectBuy}
              className="px-5 py-2.5 rounded-sf bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 hover:from-brand-500 hover:to-rose-500 dark:hover:from-rose-400 dark:hover:to-red-500 text-white font-semibold text-xs shadow-xs shadow-brand-600/25 dark:shadow-[0_0_20px_rgba(244,63,94,0.45)] dark:border dark:border-rose-400/40 flex items-center gap-1.5 sf-transition active:scale-97"
            >
              <span>Buy Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

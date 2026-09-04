import React from 'react';
import { ShoppingCart, Clock, Plus, Minus, Check, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getProductPricing } from '@/lib/catalog/pricing';

export interface ProductCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number; // in paise
  imageUrl?: string | null;
  stockQuantity: number;
  tags: string[];
  useCases: string[];
  attributes?: Record<string, string> | null;
  // Explainability metadata from AI
  explainability?: {
    headline: string;
    reason: string;
    matchScore: number;
  };
}

export interface ProductCardProps {
  product: ProductCardData;
  onAddToCart: (product: ProductCardData) => void;
  isAdding?: boolean;
  cartQuantity?: number;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemoveItem?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isAdding = false,
  cartQuantity = 0,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const pricing = getProductPricing(product.priceMinor, product.attributes);
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className={`rounded-sf-lg border sf-card-hover flex flex-col overflow-hidden group shadow-xs transition-all ${
      isOutOfStock
        ? 'border-dashed border-amber-300/80 dark:border-amber-800/60 bg-stone-50/60 dark:bg-stone-900/40 opacity-90'
        : 'border-[var(--sf-border)] bg-[var(--sf-surface)]'
    }`}>
      {/* Image container */}
      <div className="relative aspect-4/3 w-full bg-[var(--sf-bg-alt)] overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover group-hover:scale-103 sf-transition ${
              isOutOfStock ? 'grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-95' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--sf-text-muted)] font-medium text-xs">
            {product.name}
          </div>
        )}

        {/* Centered Sold Out Watermark Badge */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2">
            <div className="px-3 py-1 rounded-full bg-black/80 dark:bg-stone-950/90 backdrop-blur-sm border border-amber-400/60 text-white text-[11px] font-bold flex items-center gap-1.5 tracking-wide uppercase shadow-md">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sold Out</span>
            </div>
          </div>
        )}

        {/* Category badge */}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-sf bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide">
          {product.category}
        </span>

        {/* Stock pill */}
        <span className="absolute top-2.5 right-2.5">
          <StatusBadge variant={isOutOfStock ? 'warning' : 'neutral'}>
            {isOutOfStock ? 'Sold Out' : `${product.stockQuantity} in stock`}
          </StatusBadge>
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm text-[var(--sf-text-primary)] group-hover:text-brand-600 dark:group-hover:text-rose-400 sf-transition">
            {product.name}
          </h3>

          <p className="mt-1 text-xs text-[var(--sf-text-muted)] line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Sold Out Restock Alert */}
          {isOutOfStock && (
            <div className="mt-2.5 p-2 rounded-sf bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Restocking soon · Check back in a few days!</span>
            </div>
          )}

          {/* Use Cases */}
          {product.useCases && product.useCases.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.useCases.slice(0, 3).map((uc, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-[var(--sf-bg-alt)] dark:bg-stone-800 text-[var(--sf-text-secondary)] dark:text-stone-300 text-[10px]"
                >
                  {uc}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price and Add button */}
        <div className="mt-4 pt-3 border-t border-[var(--sf-border-light)] dark:border-stone-800/80 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-bold tabular-nums text-[var(--sf-text-primary)]">
                {pricing.sellingPriceFormatted}
              </span>
              <span className="text-xs text-[var(--sf-text-muted)] line-through tabular-nums">
                {pricing.originalPriceFormatted}
              </span>
            </div>
            <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded leading-tight">
              {pricing.discountPercentage}% off
            </span>
          </div>

          {isOutOfStock ? (
            <button
              onClick={() => onAddToCart(product)}
              id={`add-to-cart-${product.id}`}
              aria-label={`${product.name} is Sold Out`}
              className="px-3 py-1.5 rounded-sf text-xs font-semibold flex items-center gap-1.5 sf-transition bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
            >
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Sold Out</span>
            </button>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center rounded-sf border border-emerald-500/40 dark:border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/50 shadow-xs overflow-hidden sf-transition animate-fade-in">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (cartQuantity <= 1) {
                    onRemoveItem?.(product.id);
                  } else {
                    onUpdateQuantity?.(product.id, cartQuantity - 1);
                  }
                }}
                disabled={isAdding}
                className="px-2 py-1.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition disabled:opacity-40 flex items-center justify-center cursor-pointer"
                aria-label={`Decrease quantity of ${product.name}`}
                title={cartQuantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
              >
                {cartQuantity === 1 ? (
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-600" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </button>

              <span className="px-2 py-1 text-xs font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 flex items-center gap-1 border-x border-emerald-300/40 dark:border-emerald-800/40 select-none">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{cartQuantity} in cart</span>
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (cartQuantity < product.stockQuantity) {
                    onUpdateQuantity?.(product.id, cartQuantity + 1);
                  }
                }}
                disabled={isAdding || cartQuantity >= product.stockQuantity}
                className="px-2 py-1.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition disabled:opacity-30 flex items-center justify-center cursor-pointer"
                aria-label={`Increase quantity of ${product.name}`}
                title={cartQuantity >= product.stockQuantity ? 'Maximum available stock reached' : 'Increase quantity'}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              id={`add-to-cart-${product.id}`}
              aria-label={`Add ${product.name} to Cart`}
              className="px-3 py-1.5 rounded-sf text-xs font-semibold flex items-center gap-1.5 sf-transition bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 hover:from-brand-500 hover:to-rose-500 dark:hover:from-rose-400 dark:hover:to-red-500 text-white shadow-xs shadow-brand-600/20 dark:shadow-[0_0_14px_rgba(244,63,94,0.35)] dark:border dark:border-rose-400/30 active:scale-97 cursor-pointer"
            >
              <ShoppingCart className="w-3 h-3" />
              <span>{isAdding ? 'Adding...' : 'Add to Cart'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

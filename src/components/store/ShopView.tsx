'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, ShoppingBag, Eye, Plus, Sparkles, Filter, Bot, MessageSquare, Clock, Minus, Check, Trash2 } from 'lucide-react';
import { ProductCardData } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { getProductPricing } from '@/lib/catalog/pricing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface ShopViewProps {
  products: ProductCardData[];
  isLoading: boolean;
  onAddToCart: (product: ProductCardData, quantity?: number) => void;
  onBuyNow: (product: ProductCardData, quantity?: number) => void;
  onSwitchToChat: (prefillPrompt?: string) => void;
  cartQuantities?: Record<string, number>;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemoveItem?: (productId: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  products,
  isLoading,
  onAddToCart,
  onBuyNow,
  onSwitchToChat,
  cartQuantities = {},
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeDetailProduct, setActiveDetailProduct] = useState<ProductCardData | null>(null);

  // Extract unique categories from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Client-side strict filter
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      // Query match against name, category, tags, use cases, description
      const nameMatch = p.name.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
      const useCaseMatch = p.useCases?.some((u) => u.toLowerCase().includes(q));

      return nameMatch || catMatch || descMatch || tagMatch || useCaseMatch;
    });
  }, [products, searchQuery, selectedCategory]);

  const formatPrice = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--sf-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, footwear, gear..."
            className="w-full pl-9 pr-9 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-surface)] text-xs text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-sf text-xs font-medium shrink-0 sf-transition ${selectedCategory === cat
                  ? 'bg-brand-600 dark:bg-gradient-to-r dark:from-rose-500 dark:to-red-600 text-white font-semibold shadow-xs dark:shadow-[0_0_16px_rgba(244,63,94,0.45)] dark:border dark:border-rose-400/40'
                  : 'bg-[var(--sf-surface)] border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-secondary)] dark:text-stone-300 hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800/80'
                }`}
            >
              {cat === 'ALL' ? 'All Products' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Result Count and AI Assistant Help Bar */}
      <div className="flex items-center justify-between text-xs text-[var(--sf-text-muted)] px-0.5">
        <span>
          Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}
        </span>

        <button
          onClick={() => onSwitchToChat('Help me choose the best running gear for my needs')}
          className="inline-flex items-center gap-1 text-brand-600 dark:text-rose-400 hover:text-brand-500 dark:hover:text-rose-300 hover:underline text-xs font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI to recommend</span>
        </button>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-sf-lg border border-[var(--sf-border)] dark:border-stone-800 bg-[var(--sf-surface)] p-4 space-y-3 animate-pulse"
            >
              <div className="aspect-4/3 rounded-sf bg-[var(--sf-bg-alt)]" />
              <div className="h-4 bg-[var(--sf-bg-alt)] rounded w-3/4" />
              <div className="h-3 bg-[var(--sf-bg-alt)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-12 bg-[var(--sf-surface)] rounded-sf-lg border border-[var(--sf-border)] dark:border-stone-800 text-center p-8">
          <EmptyState
            title="No products found"
            description={
              searchQuery
                ? `We couldn't find any products matching "${searchQuery}".`
                : 'No products in this category currently.'
            }
            action={{
              label: 'Clear filters',
              onClick: () => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              },
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stockQuantity <= 0;
            const pricing = getProductPricing(product.priceMinor, product.attributes);

            return (
              <div
                key={product.id}
                className={`group relative rounded-sf-lg border sf-card-hover flex flex-col overflow-hidden shadow-xs transition-all ${
                  isOutOfStock
                    ? 'border-dashed border-amber-300/80 dark:border-amber-800/60 bg-stone-50/60 dark:bg-stone-900/40 opacity-90'
                    : 'border-[var(--sf-border)] dark:border-stone-800 bg-[var(--sf-surface)]'
                }`}
              >
                {/* Image & Badges */}
                <div
                  onClick={() => setActiveDetailProduct(product)}
                  className="relative aspect-4/3 w-full bg-[var(--sf-bg-alt)] overflow-hidden cursor-pointer"
                >
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
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--sf-text-muted)]">
                      {product.name}
                    </div>
                  )}

                  {/* Centered Sold Out Overlay Badge for Instant Differentiation */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2">
                      <div className="px-3 py-1 rounded-full bg-black/80 dark:bg-stone-950/90 backdrop-blur-sm border border-amber-400/60 text-white text-[11px] font-bold flex items-center gap-1.5 tracking-wide uppercase shadow-md">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sold Out</span>
                      </div>
                    </div>
                  )}

                  {/* Category Chip */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-sf bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide">
                    {product.category}
                  </span>

                  {/* Stock Pill */}
                  <span className="absolute top-2 right-2">
                    <StatusBadge variant={isOutOfStock ? 'warning' : 'neutral'}>
                      {isOutOfStock ? 'Sold Out' : `${product.stockQuantity} left`}
                    </StatusBadge>
                  </span>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div
                    onClick={() => setActiveDetailProduct(product)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-semibold text-sm text-[var(--sf-text-primary)] group-hover:text-brand-600 dark:group-hover:text-rose-400 sf-transition line-clamp-1">
                        {product.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-[var(--sf-text-muted)] line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Restock Note for Sold Out */}
                    {isOutOfStock && (
                      <div className="mt-2 p-1.5 rounded bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[10.5px] text-amber-800 dark:text-amber-300 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Restocking soon · Check back in a few days</span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="pt-2 border-t border-[var(--sf-border-light)] dark:border-stone-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-bold text-sm tabular-nums text-[var(--sf-text-primary)]">
                        {pricing.sellingPriceFormatted}
                      </span>
                      <span className="text-[11px] text-[var(--sf-text-muted)] line-through tabular-nums">
                        {pricing.originalPriceFormatted}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded leading-tight">
                        {pricing.discountPercentage}% off
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setActiveDetailProduct(product)}
                        title="View details"
                        className="p-1.5 rounded-sf border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-secondary)] dark:text-stone-300 hover:text-brand-600 dark:hover:text-rose-300 hover:border-brand-500/40 dark:hover:border-rose-500/40 hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800 sf-transition"
                        aria-label={`View details for ${product.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isOutOfStock ? (
                        <button
                          disabled
                          title="Sold Out · Restocking Soon"
                          className="px-2.5 py-1.5 rounded-sf text-xs font-semibold flex items-center gap-1 bg-amber-100/90 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60"
                        >
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Sold Out</span>
                        </button>
                      ) : cartQuantities && cartQuantities[product.id] > 0 ? (
                        <div className="flex items-center rounded-sf border border-emerald-500/40 dark:border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/50 shadow-xs overflow-hidden sf-transition animate-fade-in">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cur = cartQuantities[product.id];
                              if (cur <= 1) {
                                onRemoveItem?.(product.id);
                              } else {
                                onUpdateQuantity?.(product.id, cur - 1);
                              }
                            }}
                            className="px-1.5 py-1 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition cursor-pointer"
                            title={cartQuantities[product.id] === 1 ? 'Remove from cart' : 'Decrease quantity'}
                          >
                            {cartQuantities[product.id] === 1 ? (
                              <Trash2 className="w-3 h-3 text-rose-500" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                          </button>
                          <span className="px-1.5 py-1 text-xs font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 border-x border-emerald-300/40 dark:border-emerald-800/40 select-none">
                            {cartQuantities[product.id]}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const cur = cartQuantities[product.id];
                              if (cur < product.stockQuantity) {
                                onUpdateQuantity?.(product.id, cur + 1);
                              }
                            }}
                            disabled={cartQuantities[product.id] >= product.stockQuantity}
                            className="px-1.5 py-1 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition disabled:opacity-30 cursor-pointer"
                            title={cartQuantities[product.id] >= product.stockQuantity ? 'Max stock reached' : 'Increase quantity'}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart(product, 1)}
                          title="Add to cart"
                          className="px-2.5 py-1.5 rounded-sf text-xs font-semibold flex items-center gap-1 sf-transition active:scale-97 bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 hover:from-brand-500 hover:to-rose-500 dark:hover:from-rose-400 dark:hover:to-red-500 text-white shadow-xs shadow-brand-600/20 dark:shadow-[0_0_14px_rgba(244,63,94,0.35)] dark:border dark:border-rose-400/30 cursor-pointer"
                          aria-label={`Add ${product.name} to cart`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeDetailProduct}
        isOpen={Boolean(activeDetailProduct)}
        onClose={() => setActiveDetailProduct(null)}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
      />

      {/* Floating Animated Expandable AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 sf-float-subtle">
        <button
          onClick={() => onSwitchToChat('Help me choose the best products from this store')}
          className="group relative flex items-center h-12 rounded-full bg-[var(--sf-surface)] dark:bg-stone-900 border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-primary)] shadow-lg hover:shadow-xl dark:shadow-black/40 hover:border-brand-500/40 dark:hover:border-rose-500/50 active:scale-97 transition-all duration-300 ease-out px-3.5"
          aria-label="Open AI Assistant Chat"
          title="Chat with AI Sales Assistant"
        >
          {/* Subtle Ambient Breathing Aura */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-red-500/20 via-rose-500/20 to-amber-500/20 dark:from-rose-500/25 dark:via-red-500/25 dark:to-rose-600/25 blur-xs opacity-40 group-hover:opacity-80 transition duration-500 animate-pulse pointer-events-none" />

          {/* Icon with Live Indicator Dot */}
          <div className="relative flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-brand-600 dark:text-rose-400 group-hover:rotate-12 group-hover:scale-110 sf-transition" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--sf-surface)] dark:ring-stone-900 group-hover:opacity-0 transition-opacity duration-200" />
          </div>

          {/* Smooth Expanding Text Pill on Hover */}
          <div className="overflow-hidden max-w-0 group-hover:max-w-[130px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out whitespace-nowrap flex items-center">
            <span className="pl-2 text-xs font-semibold tracking-tight">
              Ask AI Assistant
            </span>
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          </div>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { getProductPricing } from '@/lib/catalog/pricing';

export interface CartItemData {
  id: string;
  productId: string;
  name: string;
  priceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  imageUrl?: string | null;
  isUpsell?: boolean;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemData[];
  totalMinor: number;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  isLoading?: boolean;
  upsellProposal?: {
    product: {
      id: string;
      name: string;
      description?: string;
      category?: string;
      priceMinor: number;
      imageUrl?: string | null;
    };
    reason?: string;
  } | null;
  onAddUpsell?: (product: any) => void;
  onSkipUpsell?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  totalMinor,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  isLoading = false,
  upsellProposal,
  onAddUpsell,
  onSkipUpsell,
}) => {
  if (!isOpen) return null;

  const totalRupees = totalMinor / 100;

  // Calculate total original MRP across all items
  const totalOriginalMinor = items.reduce((sum, it) => {
    const pricing = getProductPricing(it.priceMinor);
    return sum + pricing.originalPriceMinor * it.quantity;
  }, 0);
  const totalOriginalRupees = Math.round(totalOriginalMinor / 100);
  const totalSavingsRupees = Math.max(0, totalOriginalRupees - totalRupees);
  const overallDiscountPercent = totalOriginalMinor > 0
    ? Math.round(((totalOriginalMinor - totalMinor) / totalOriginalMinor) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[var(--sf-surface)] border-l border-[var(--sf-border)] shadow-2xl flex flex-col animate-slide-left">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[var(--sf-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-600 dark:text-rose-400" />
              <h3 className="font-semibold text-sm text-[var(--sf-text-primary)] tracking-tight">Your Cart</h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] font-medium tabular-nums">
                {items.reduce((acc, it) => acc + it.quantity, 0)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-sf text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] flex items-center justify-center mx-auto text-[var(--sf-text-muted)]">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-[var(--sf-text-primary)]">Your cart is empty</p>
                <p className="text-xs text-[var(--sf-text-muted)] max-w-xs mx-auto">
                  Browse the store or ask our AI sales assistant for tailored gear recommendations.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const pricing = getProductPricing(item.priceMinor);
                const itemTotalOffering = item.lineTotalMinor / 100;
                const itemTotalOriginal = (pricing.originalPriceMinor * item.quantity) / 100;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] flex gap-3 items-center group sf-transition"
                  >
                    {/* Item Image */}
                    <div className="w-14 h-14 rounded-sf bg-[var(--sf-surface)] overflow-hidden shrink-0 border border-[var(--sf-border)] flex items-center justify-center">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[var(--sf-text-muted)]">Product</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-xs text-[var(--sf-text-primary)] truncate">
                            {item.name}
                          </h4>
                          {item.isUpsell && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 font-medium">
                              Upsell Add-on
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-[var(--sf-text-muted)] hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-[var(--sf-surface-hover)] sf-transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity and Dual Price */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded border border-[var(--sf-border)] bg-[var(--sf-surface)]">
                          <button
                            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium tabular-nums text-[var(--sf-text-primary)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className="text-xs font-bold tabular-nums text-[var(--sf-text-primary)]">
                              ₹{itemTotalOffering.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-[var(--sf-text-muted)] line-through tabular-nums">
                              ₹{itemTotalOriginal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Autonomous Complementary Upsell Proposal */}
            {items.length > 0 && upsellProposal && upsellProposal.product && (() => {
              const upsellPricing = getProductPricing(upsellProposal.product.priceMinor);
              return (
                <div className="pt-3">
                  <div className="p-3.5 rounded-sf border border-brand-200/70 dark:border-rose-900/50 bg-brand-50/40 dark:bg-rose-950/20 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-600 dark:text-rose-400">
                        Frequently Paired Add-on
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-brand-600 dark:text-rose-400">
                          +{upsellPricing.sellingPriceFormatted}
                        </span>
                        <span className="text-[10px] text-[var(--sf-text-muted)] line-through">
                          {upsellPricing.originalPriceFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-sf bg-[var(--sf-bg-alt)] overflow-hidden shrink-0 border border-[var(--sf-border)]">
                        {upsellProposal.product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={upsellProposal.product.imageUrl}
                            alt={upsellProposal.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--sf-text-muted)] text-[10px]">
                            Add-on
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-semibold text-[var(--sf-text-primary)] truncate">
                          {upsellProposal.product.name}
                        </h5>
                        <p className="text-[11px] text-[var(--sf-text-muted)] line-clamp-1">
                          {upsellProposal.reason || 'Recommended complementary accessory.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onSkipUpsell && onSkipUpsell()}
                          className="px-2.5 py-1.5 rounded-full border border-[var(--sf-border)] text-xs text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
                        >
                          Skip
                        </button>

                        <button
                          onClick={() => onAddUpsell && onAddUpsell(upsellProposal.product)}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 border-t border-[var(--sf-border)] bg-[var(--sf-surface)] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[var(--sf-text-muted)]">
                  <span>Total MRP</span>
                  <span className="line-through tabular-nums">₹{totalOriginalRupees.toLocaleString('en-IN')}</span>
                </div>
                {totalSavingsRupees > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Discounted Savings ({overallDiscountPercent}% off)</span>
                    <span className="tabular-nums">-₹{totalSavingsRupees.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[var(--sf-text-secondary)]">
                  <span>Estimated Tax</span>
                  <span className="text-[var(--sf-text-muted)]">Included</span>
                </div>
                <div className="pt-2 border-t border-[var(--sf-border-light)] flex items-center justify-between text-sm font-bold text-[var(--sf-text-primary)]">
                  <div>
                    <span>Authoritative Total</span>
                    <span className="block text-[10px] text-[var(--sf-text-muted)] font-normal">Offering Price</span>
                  </div>
                  <span className="text-base font-extrabold tabular-nums text-brand-600 dark:text-rose-400">
                    ₹{totalRupees.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                onClick={onProceedToCheckout}
                disabled={isLoading}
                id="proceed-checkout-btn"
                className="w-full py-2.5 rounded-sf bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm flex items-center justify-center gap-1.5 sf-transition disabled:opacity-50"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

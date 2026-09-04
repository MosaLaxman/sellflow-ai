'use client';

import React from 'react';
import { X, Loader2, ArrowRight, ShoppingBag, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { CartItemData } from './CartDrawer';
import { getProductPricing } from '@/lib/catalog/pricing';

export type PaymentRecoveryType = 'FAILED' | 'CANCELLED' | 'RETRY_FAILED' | 'EXPIRED';

interface PaymentRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: PaymentRecoveryType;
  items: CartItemData[];
  totalMinor: number;
  onRetry: () => Promise<void>;
  isRetrying: boolean;
  failureReason?: string | null;
}

export const PaymentRecoveryModal: React.FC<PaymentRecoveryModalProps> = ({
  isOpen,
  onClose,
  type = 'FAILED',
  items,
  totalMinor,
  onRetry,
  isRetrying,
  failureReason,
}) => {
  if (!isOpen) return null;

  const totalRupees = totalMinor / 100;

  // Title and subtitle variations based on state
  let heading = 'Almost there.';
  let supportingText = "Your payment couldn't be completed, but your order is still ready.";
  let primaryCtaText = 'Retry Payment';
  let showRetryButton = true;

  if (type === 'CANCELLED') {
    heading = 'Your order is still waiting.';
    supportingText = "No payment was made. You can continue whenever you're ready.";
    primaryCtaText = 'Try Payment Again';
  } else if (type === 'RETRY_FAILED') {
    heading = 'Still not through.';
    supportingText = "Your order is safe. You can try again when you're ready.";
    primaryCtaText = 'Retry Payment';
  } else if (type === 'EXPIRED') {
    heading = 'Order updated.';
    supportingText = 'This order is no longer available. Please start a new checkout.';
    primaryCtaText = 'Back to Store';
    showRetryButton = false;
  }

  // Calculate total original MRP across items
  const totalOriginalMinor = items.reduce((sum, it) => {
    const pricing = getProductPricing(it.priceMinor);
    return sum + pricing.originalPriceMinor * it.quantity;
  }, 0);
  const totalOriginalRupees = Math.round(totalOriginalMinor / 100);
  const totalSavingsRupees = Math.max(0, totalOriginalRupees - totalRupees);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Soft Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={isRetrying ? undefined : onClose}
      />

      {/* Centered Premium Recovery Card */}
      <div className="relative w-full max-w-md bg-[var(--sf-surface)] rounded-2xl shadow-2xl border border-[var(--sf-border)] dark:border-stone-800 overflow-hidden z-10 animate-scale-up sf-transition">
        {/* Header with Close */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[var(--sf-text-primary)] shrink-0 shadow-2xs">
              <ShoppingBag className="w-5 h-5 text-brand-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--sf-text-primary)] tracking-tight">
                {heading}
              </h3>
              <p className="text-xs text-[var(--sf-text-secondary)] mt-0.5 leading-relaxed">
                {supportingText}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRetrying}
            className="p-1.5 rounded-full text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition disabled:opacity-40 cursor-pointer"
            aria-label="Close recovery popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Compact Order Summary */}
        <div className="px-6 py-3">
          <div className="p-4 rounded-xl bg-[var(--sf-bg-alt)]/70 border border-[var(--sf-border)] dark:border-stone-800 space-y-3">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-xs text-[var(--sf-text-muted)] py-2 text-center">
                  Order details preserved
                </div>
              ) : (
                items.map((item) => {
                  const pricing = getProductPricing(item.priceMinor);
                  const itemTotalOffering = item.lineTotalMinor / 100;
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[var(--sf-text-primary)] truncate block">
                          {item.name}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[11px] text-[var(--sf-text-muted)]">
                            Qty: {item.quantity}
                          </span>
                        )}
                      </div>
                      <span className="font-bold tabular-nums text-[var(--sf-text-primary)] shrink-0">
                        ₹{itemTotalOffering.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Divider */}
            <div className="pt-2.5 border-t border-[var(--sf-border)] dark:border-stone-800 flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--sf-text-secondary)]">Total</span>
              <span className="font-extrabold text-base text-[var(--sf-text-primary)] tabular-nums">
                ₹{totalRupees.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-3 space-y-2.5">
          {showRetryButton ? (
            <>
              <button
                onClick={onRetry}
                disabled={isRetrying}
                id="retry-payment-button"
                className="w-full py-3 rounded-full bg-brand-600 hover:bg-brand-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 dark:shadow-[0_0_16px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2 sf-transition disabled:opacity-60 active:scale-98 cursor-pointer"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Retrying payment...</span>
                  </>
                ) : (
                  <>
                    <span>{primaryCtaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isRetrying}
                id="payment-recovery-dismiss-button"
                className="w-full py-2.5 rounded-full border border-[var(--sf-border)] bg-[var(--sf-surface)] hover:bg-[var(--sf-surface-hover)] text-[var(--sf-text-primary)] font-semibold text-xs shadow-2xs flex items-center justify-center sf-transition active:scale-98 cursor-pointer disabled:opacity-40"
              >
                Not now
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-full bg-[var(--sf-text-primary)] text-[var(--sf-bg)] font-bold text-xs shadow-sm flex items-center justify-center gap-2 sf-transition active:scale-98 cursor-pointer"
            >
              <span>Back to Store</span>
            </button>
          )}

          <div className="flex items-center justify-center text-[11px] text-[var(--sf-text-muted)] pt-1 gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Your cart is safely waiting for you.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

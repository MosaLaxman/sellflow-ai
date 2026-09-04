import React from 'react';
import { X, Lock, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { CartItemData } from './CartDrawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getProductPricing } from '@/lib/catalog/pricing';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemData[];
  totalMinor: number;
  currency?: string;
  merchantName: string;
  onConfirmAndPay: () => Promise<void>;
  isProcessing: boolean;
  errorMessage?: string | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  totalMinor,
  onConfirmAndPay,
  isProcessing,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const totalRupees = totalMinor / 100;

  // Calculate total original MRP across items
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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[var(--sf-surface)] rounded-sf-lg shadow-sf border border-[var(--sf-border)] overflow-hidden z-10 sf-transition">
        {/* Header */}
        <div className="p-5 border-b border-[var(--sf-border)] flex items-center justify-between">
          <div>
            <span className="text-label block mb-1">
              Razorpay Checkout
            </span>
            <h3 className="text-base font-bold text-[var(--sf-text-primary)] tracking-tight">Review & Confirm Purchase</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sf text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Explicit Gating Notice */}
          <div className="p-3 rounded-sf bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Explicit Customer Confirmation Required</span>
              <span className="text-[11px] leading-relaxed">
                As part of our agentic commerce safety policy, no payment is initiated until you
                explicitly confirm the exact calculated total below.
              </span>
            </div>
          </div>

          {/* Line items review */}
          <div className="border border-[var(--sf-border)] rounded-sf bg-[var(--sf-bg-alt)] p-3 divide-y divide-[var(--sf-border-light)]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-label">
                Order Breakdown
              </h4>
              {overallDiscountPercent > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  {overallDiscountPercent}% TOTAL SAVINGS
                </span>
              )}
            </div>

            {items.map((item) => {
              const pricing = getProductPricing(item.priceMinor);
              const itemTotalOffering = item.lineTotalMinor / 100;
              const itemTotalOriginal = (pricing.originalPriceMinor * item.quantity) / 100;

              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-[var(--sf-text-primary)] truncate">{item.name}</span>
                      <span className="text-[var(--sf-text-muted)] shrink-0">× {item.quantity}</span>
                      {item.isUpsell && (
                        <StatusBadge variant="neutral" className="shrink-0 text-[10px]">Upsell</StatusBadge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="font-bold tabular-nums text-[var(--sf-text-primary)]">
                        ₹{itemTotalOffering.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[var(--sf-text-muted)] line-through tabular-nums">
                        ₹{itemTotalOriginal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Price Calculations */}
            <div className="pt-2.5 space-y-1.5 border-t border-[var(--sf-border-light)] text-xs">
              <div className="flex items-center justify-between text-[var(--sf-text-muted)]">
                <span>Total MRP (Original Price)</span>
                <span className="line-through tabular-nums">₹{totalOriginalRupees.toLocaleString('en-IN')}</span>
              </div>
              {totalSavingsRupees > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discounted Savings</span>
                  <span className="tabular-nums">-₹{totalSavingsRupees.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[var(--sf-border-light)] flex items-center justify-between text-sm font-bold text-[var(--sf-text-primary)]">
                <div>
                  <span>Authoritative Total</span>
                  <span className="block text-[10px] text-[var(--sf-text-muted)] font-normal">Offering Price (Incl. of all taxes)</span>
                </div>
                <span className="text-base font-extrabold tabular-nums text-brand-600 dark:text-rose-400">
                  ₹{totalRupees.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment gateway badge */}
          <div className="flex items-center justify-between p-2.5 rounded-sf bg-[var(--sf-bg-alt)] text-[var(--sf-text-secondary)] text-xs border border-[var(--sf-border)]">
            <span className="font-medium">Gateway: Razorpay Test Mode</span>
            <StatusBadge variant="warning">Sandbox Active</StatusBadge>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            <button
              onClick={onConfirmAndPay}
              disabled={isProcessing}
              id="confirm-pay-razorpay-btn"
              className="w-full py-3 rounded-sf bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm flex items-center justify-center gap-1.5 sf-transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Launch Razorpay (₹{totalRupees.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>

            <p className="mt-2 text-center text-[11px] text-[var(--sf-text-muted)]">
              Test mode only. No real money will be charged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

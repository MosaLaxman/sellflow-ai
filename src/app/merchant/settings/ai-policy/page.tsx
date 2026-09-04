'use client';

import React, { useState, useEffect } from 'react';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { Save, CheckCircle2 } from 'lucide-react';

export default function AIPolicySettingsPage() {
  const [formData, setFormData] = useState({
    maxAutomaticUpsellPercentage: 50,
    maxAutonomousOrderAmountRupees: 10000,
    allowUpsell: true,
    allowCrossSell: true,
    requireCustomerConfirmation: true,
    maxProductsPerRecommendation: 3,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/store/apex-sports/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.merchant?.policy) {
          const p = data.merchant.policy;
          setFormData({
            maxAutomaticUpsellPercentage: p.maxAutomaticUpsellPercentage,
            maxAutonomousOrderAmountRupees: p.maxAutonomousOrderAmount / 100,
            allowUpsell: p.allowUpsell,
            allowCrossSell: p.allowCrossSell,
            requireCustomerConfirmation: p.requireCustomerConfirmation,
            maxProductsPerRecommendation: p.maxProductsPerRecommendation,
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/merchant/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug="apex-sports" />

      <main className="max-w-screen-sm mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Recovery Boundaries</h1>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
            SellFlow can act independently when the risk is low.
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-3 rounded-sf bg-[var(--sf-success-light)] text-[var(--sf-success)] text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Policy saved and active.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Recovery Caps */}
          <section className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-6 space-y-4 shadow-sf">
            <div>
              <h2 className="text-sm font-semibold text-[var(--sf-text-primary)]">Autonomous Spending Limits</h2>
              <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                Caps for automatic discounts and upsell proposals without human signoff.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-label">
                    Max Upsell Relative to Base Price
                  </label>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium tabular-nums text-[var(--sf-text-primary)] dark:text-stone-200 bg-[var(--sf-bg-alt)] dark:bg-stone-800 border border-[var(--sf-border)] dark:border-stone-700 shadow-2xs">
                    {formData.maxAutomaticUpsellPercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={formData.maxAutomaticUpsellPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAutomaticUpsellPercentage: Number(e.target.value) })
                  }
                  style={{
                    background: `linear-gradient(to right, #EF4444 0%, #DC2626 ${((formData.maxAutomaticUpsellPercentage - 10) / 90) * 100}%, var(--sf-bg-alt) ${((formData.maxAutomaticUpsellPercentage - 10) / 90) * 100}%, var(--sf-bg-alt) 100%)`
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-red-600 dark:accent-rose-500 border border-[var(--sf-border)] dark:border-stone-800 shadow-inner-xs sf-transition"
                />
                <span className="text-[11px] text-[var(--sf-text-muted)] mt-1.5 block">
                  e.g., For a ₹3,499 shoe, a 50% cap limits upsells to ₹1,749.50 (allows ₹499 socks).
                </span>
              </div>

              <div className="pt-4 border-t border-[var(--sf-border-light)] dark:border-stone-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-label">
                    Max Autonomous Order Ceiling
                  </label>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium tabular-nums text-[var(--sf-text-primary)] dark:text-stone-200 bg-[var(--sf-bg-alt)] dark:bg-stone-800 border border-[var(--sf-border)] dark:border-stone-700 shadow-2xs">
                    ₹{formData.maxAutonomousOrderAmountRupees.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={formData.maxAutonomousOrderAmountRupees}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAutonomousOrderAmountRupees: Number(e.target.value) })
                  }
                  style={{
                    background: `linear-gradient(to right, #EF4444 0%, #DC2626 ${((formData.maxAutonomousOrderAmountRupees - 1000) / 49000) * 100}%, var(--sf-bg-alt) ${((formData.maxAutonomousOrderAmountRupees - 1000) / 49000) * 100}%, var(--sf-bg-alt) 100%)`
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-red-600 dark:accent-rose-500 border border-[var(--sf-border)] dark:border-stone-800 shadow-inner-xs sf-transition"
                />
                <span className="text-[11px] text-[var(--sf-text-muted)] mt-1.5 block">
                  Orders exceeding this amount require explicit customer checkout approval.
                </span>
              </div>
            </div>
          </section>

          {/* Gating & Safeguards */}
          <section className="border border-[var(--sf-border)] dark:border-stone-800 rounded-sf-lg bg-[var(--sf-surface)] overflow-hidden shadow-sf">
            <div className="p-6 border-b border-[var(--sf-border)] dark:border-stone-800">
              <h2 className="text-sm font-semibold text-[var(--sf-text-primary)]">AI Buyer Commerce Permissions</h2>
              <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                Deterministic permission flags governing external AI buyer agents and conversational sales tools.
              </p>
            </div>

            <div className="divide-y divide-[var(--sf-border-light)] dark:divide-stone-800">
              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800/60 sf-transition">
                <div className="pr-4">
                  <span className="text-[13px] font-medium text-[var(--sf-text-primary)] block">
                    Require explicit customer confirmation
                  </span>
                  <span className="text-[12px] text-[var(--sf-text-muted)] mt-0.5 block">
                    Customer or shopper must explicitly confirm the exact total before any Razorpay order is initiated.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.requireCustomerConfirmation}
                  onChange={(e) =>
                    setFormData({ ...formData, requireCustomerConfirmation: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-brand-600 dark:text-rose-500 accent-red-600 dark:accent-rose-500 focus:ring-brand-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800/60 sf-transition">
                <div className="pr-4">
                  <span className="text-[13px] font-medium text-[var(--sf-text-primary)] block">
                    Enable AI upsell proposals
                  </span>
                  <span className="text-[12px] text-[var(--sf-text-muted)] mt-0.5 block">
                    AI agents can evaluate and propose complementary accessories from verified database relations.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowUpsell}
                  onChange={(e) => setFormData({ ...formData, allowUpsell: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 dark:text-rose-500 accent-red-600 dark:accent-rose-500 focus:ring-brand-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800/60 sf-transition">
                <div className="pr-4">
                  <span className="text-[13px] font-medium text-[var(--sf-text-primary)] block">
                    Enable cross-sell & catalog discovery
                  </span>
                  <span className="text-[12px] text-[var(--sf-text-muted)] mt-0.5 block">
                    Expose machine-readable product catalog via GET /api/agent/catalog to external AI buyers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allowCrossSell}
                  onChange={(e) => setFormData({ ...formData, allowCrossSell: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 dark:text-rose-500 accent-red-600 dark:accent-rose-500 focus:ring-brand-500 shrink-0"
                />
              </label>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full sf-btn-primary font-semibold text-xs shadow-xs flex items-center gap-2"
            >
              {isSaving ? 'Saving…' : 'Save Policy'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

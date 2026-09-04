'use client';

import React, { useState } from 'react';
import {
  Zap,
  Check,
  Edit2,
  X,
  Save,
  Loader2,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface MerchantCapabilityCardProps {
  initialPolicy: {
    allowUpsell: boolean;
    requireCustomerConfirmation: boolean;
    maxAutonomousOrderAmount: number;
    maxAutomaticUpsellPercentage: number;
    maxProductsPerRecommendation: number;
  } | null;
  merchantSlug: string;
}

export const MerchantCapabilityCard: React.FC<MerchantCapabilityCardProps> = ({
  initialPolicy,
  merchantSlug,
}) => {
  const [ceilingRupees, setCeilingRupees] = useState<number>(
    initialPolicy ? Math.round(initialPolicy.maxAutonomousOrderAmount / 100) : 10000
  );
  const [isEditingCeiling, setIsEditingCeiling] = useState(false);
  const [newCeilingInput, setNewCeilingInput] = useState<number>(ceilingRupees);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleOpenEdit = () => {
    setNewCeilingInput(ceilingRupees);
    setIsEditingCeiling(true);
  };

  const handleSaveCeiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCeilingInput <= 0) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/merchant/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxAutonomousOrderAmountRupees: Number(newCeilingInput),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update ceiling');
      }

      setCeilingRupees(newCeilingInput);
      setIsEditingCeiling(false);
      setSuccessToast(`Autonomous spending ceiling updated to ₹${newCeilingInput.toLocaleString('en-IN')}`);

      setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating spending ceiling');
    } finally {
      setIsSaving(false);
    }
  };

  const quickPresets = [5000, 10000, 15000, 25000, 50000];

  return (
    <div className="p-6 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf space-y-4">
      {/* Toast */}
      {successToast && (
        <div className="flex items-center gap-2 p-2.5 rounded-sf bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--sf-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sf bg-brand-50 dark:bg-rose-950/40 border border-brand-200 dark:border-rose-900/50 flex items-center justify-center text-brand-600 dark:text-rose-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--sf-text-primary)]">
              Live Merchant AI Commerce Capabilities
            </h2>
            <p className="text-xs text-[var(--sf-text-muted)]">
              Exposed to external AI buyers via machine-readable protocol API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/merchant/settings/ai-policy"
            className="px-2.5 py-1 rounded-sf bg-[var(--sf-bg-alt)] hover:bg-[var(--sf-surface-hover)] border border-[var(--sf-border)] text-xs text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition flex items-center gap-1.5"
            title="Configure all AI risk policies"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--sf-text-muted)]" />
            <span>All Risk Policies</span>
          </a>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI-Ready Transactable Merchant</span>
          </span>
        </div>
      </div>

      {/* 4 Capabilities Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
        <div className="space-y-1">
          <span className="text-[11px] text-[var(--sf-text-muted)] block">AI Catalog Discovery</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Enabled (Public)
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-[var(--sf-text-muted)] block">AI Upsells & Add-ons</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> {initialPolicy?.allowUpsell !== false ? 'Enabled (≤50% Cap)' : 'Disabled'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-[var(--sf-text-muted)] block">Customer Confirmation</span>
          <span className="font-semibold text-[var(--sf-text-primary)]">
            {initialPolicy?.requireCustomerConfirmation !== false ? 'MANDATORY GATING' : 'OPTIONAL'}
          </span>
        </div>

        {/* Autonomous Spending Ceiling with Direct Edit Button */}
        <div className="space-y-1 bg-[var(--sf-bg-alt)]/60 p-2.5 rounded-sf border border-[var(--sf-border)] -my-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--sf-text-muted)] block">Autonomous Ceiling</span>
            <button
              onClick={handleOpenEdit}
              className="text-[11px] font-semibold text-brand-600 dark:text-rose-400 hover:text-brand-700 dark:hover:text-rose-300 sf-transition inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-rose-950/40 border border-brand-200/60 dark:border-rose-900/50 cursor-pointer"
              title="Edit Autonomous Spending Ceiling"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
          <span className="font-bold text-sm text-[var(--sf-text-primary)] tabular-nums block">
            ₹{ceilingRupees.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Edit Ceiling Modal Dialog */}
      {isEditingCeiling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--sf-surface)] rounded-sf-lg max-w-md w-full p-6 shadow-sf border border-[var(--sf-border)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sf-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--sf-text-primary)]">
                  Edit Autonomous Spending Ceiling
                </h3>
                <p className="text-xs text-[var(--sf-text-muted)]">
                  AI buyer transactions exceeding this limit are strictly blocked by policy.
                </p>
              </div>
              <button
                onClick={() => setIsEditingCeiling(false)}
                className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] p-1 rounded hover:bg-[var(--sf-bg-alt)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCeiling} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--sf-text-primary)] mb-1.5">
                  Maximum Order Amount (₹ Rupees)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--sf-text-muted)]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={newCeilingInput}
                    onChange={(e) => setNewCeilingInput(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm font-bold text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-[var(--sf-text-muted)] block mb-1.5 font-medium">
                  Quick Select Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewCeilingInput(preset)}
                      className={`px-2.5 py-1 rounded-sf text-[11px] font-medium border sf-transition ${
                        newCeilingInput === preset
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs dark:bg-rose-500 dark:border-rose-500'
                          : 'bg-[var(--sf-bg-alt)] border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:border-brand-400 hover:text-brand-600 dark:hover:text-rose-400'
                      }`}
                    >
                      ₹{(preset / 1000)}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--sf-border)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCeiling(false)}
                  className="px-3 py-1.5 rounded-sf border border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-sf sf-btn-primary font-semibold flex items-center gap-1.5 sf-transition disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : 'Save Ceiling'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

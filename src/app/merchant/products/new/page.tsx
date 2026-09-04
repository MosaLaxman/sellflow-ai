'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Footwear',
    mrpRupees: 3999,
    priceRupees: 2999,
    stockQuantity: 20,
    imageUrl: '',
    tags: 'running, lightweight, athletic',
    useCases: 'daily running, gym, workout',
    relatedProductId: '',
  });

  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/store/apex-sports/catalog')
      .then((res) => res.json())
      .then((data) => setExistingProducts(data.products || []))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/merchant/products');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create product');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug="apex-sports" />

      <main className="max-w-screen-sm mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a
            href="/merchant/products"
            className="p-1.5 rounded-md text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Add Product</h1>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
              Saved directly to the database and immediately queryable by the AI.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-5 space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Velocity Carbon Racer"
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Description *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed specifications, materials, and benefits..."
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
              >
                <option value="Footwear">Footwear</option>
                <option value="Accessories">Accessories</option>
                <option value="Apparel">Apparel</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            {/* Dual Pricing Section: Real Price / MRP & Offering Price */}
            <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--sf-text-primary)]">Product Pricing</span>
                <span className="text-[11px] text-[var(--sf-text-muted)]">Shown with discount badge on storefront</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--sf-text-secondary)] mb-1">
                    Real Price / MRP (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--sf-text-muted)]">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.mrpRupees}
                      onChange={(e) => setFormData({ ...formData, mrpRupees: Number(e.target.value) })}
                      placeholder="e.g. 3999"
                      className="w-full pl-7 pr-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-surface)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                  <span className="text-[11px] text-[var(--sf-text-muted)] mt-1 block">Original retail (crossed with strikethrough)</span>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-brand-600 dark:text-rose-400 mb-1">
                    Offering Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--sf-text-muted)]">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.priceRupees}
                      onChange={(e) => setFormData({ ...formData, priceRupees: Number(e.target.value) })}
                      placeholder="e.g. 2999"
                      className="w-full pl-7 pr-3 py-2 rounded-sf border border-brand-500/40 bg-[var(--sf-surface)] text-sm font-semibold text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">Actual customer checkout price</span>
                </div>
              </div>

              {/* Live Discount Calculator Preview */}
              {formData.mrpRupees > formData.priceRupees && formData.priceRupees > 0 && (
                <div className="p-2.5 rounded-sf bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center justify-between text-xs">
                  <span className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Storefront Display Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {Math.round(((formData.mrpRupees - formData.priceRupees) / formData.mrpRupees) * 100)}% OFF
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-500 text-[11px]">
                      (Save ₹{(formData.mrpRupees - formData.priceRupees).toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Search Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="running, lightweight, athletic"
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Target Use Cases (comma-separated)
              </label>
              <input
                type="text"
                value={formData.useCases}
                onChange={(e) => setFormData({ ...formData, useCases: e.target.value })}
                placeholder="daily running, gym, workout"
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
              />
            </div>

            <div className="pt-4 border-t border-[var(--sf-border-light)]">
              <label className="block text-[13px] font-medium text-[var(--sf-text-primary)] mb-1.5">
                Upsell Accessory (Optional)
              </label>
              <select
                value={formData.relatedProductId}
                onChange={(e) => setFormData({ ...formData, relatedProductId: e.target.value })}
                className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
              >
                <option value="">None (no automatic upsell)</option>
                {existingProducts.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name} (₹{(ep.priceMinor / 100).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-[var(--sf-text-muted)] mt-1.5">
                When a customer buys this item, the AI can propose this accessory within the configured policy ceiling.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <a
              href="/merchant/products"
              className="px-4 py-2.5 rounded-sf border border-[var(--sf-border)] text-sm font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-sf bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm sf-transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Product</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

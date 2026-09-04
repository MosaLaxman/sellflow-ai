'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Search,
  CheckCircle2,
  X,
  Loader2,
  Package,
  Edit,
  Save,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  category: string;
  priceMinor: number;
  currency: string;
  imageUrl: string | null;
  stockQuantity: number;
  status: string;
  tags: string[];
  attributes?: Record<string, any>;
  relations?: Array<{
    id: string;
    relationType: string;
    relatedProduct: {
      id: string;
      name: string;
      priceMinor: number;
    };
  }>;
}

interface ProductListTableProps {
  initialProducts?: ProductItem[];
}

export function ProductListTable({ initialProducts = [] }: ProductListTableProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(initialProducts.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: 'Footwear',
    mrpRupees: 0,
    priceRupees: 0,
    stockQuantity: 0,
    imageUrl: '',
    tags: '',
    status: 'ACTIVE',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/store/apex-sports/catalog');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      setIsLoading(false);
    } else {
      fetchCatalog();
    }
  }, []); // Run once on component mount to avoid flickering!

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleOpenEdit = (product: ProductItem) => {
    const rawAttrs = (product.attributes as Record<string, any>) || {};
    const mrp = typeof rawAttrs.mrpRupees === 'number' 
      ? rawAttrs.mrpRupees 
      : Math.round((product.priceMinor / 100) * 1.25);

    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      mrpRupees: mrp,
      priceRupees: product.priceMinor / 100,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl || '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      status: product.status || 'ACTIVE',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/merchant/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editFormData.name,
          description: editFormData.description,
          category: editFormData.category,
          mrpRupees: Number(editFormData.mrpRupees),
          priceRupees: Number(editFormData.priceRupees),
          stockQuantity: Number(editFormData.stockQuantity),
          imageUrl: editFormData.imageUrl,
          tags: editFormData.tags,
          status: editFormData.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setNotification({
        type: 'success',
        message: `Successfully updated "${editFormData.name}".`,
      });
      setEditingProduct(null);
      fetchCatalog();

      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error updating product.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (product: ProductItem) => {
    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/merchant/products?id=${encodeURIComponent(product.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setConfirmDeleteProduct(null);
      setNotification({
        type: 'success',
        message: `Successfully removed "${product.name}" from catalog.`,
      });

      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'An error occurred while deleting the product.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-sf text-xs font-medium sf-transition ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--sf-surface)] p-2.5 rounded-sf border border-[var(--sf-border)]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--sf-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or tag..."
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] rounded-sf text-xs text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-sf text-[11px] font-medium whitespace-nowrap sf-transition ${
                selectedCategory === cat
                  ? 'bg-[var(--sf-text-primary)] text-[var(--sf-bg)]'
                  : 'bg-[var(--sf-bg-alt)] text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--sf-border)] rounded-sf-lg overflow-hidden bg-[var(--sf-surface)]">
        {isLoading ? (
          <div className="py-16 text-center text-[var(--sf-text-muted)] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found."
            description={
              searchQuery || selectedCategory !== 'ALL'
                ? 'Try adjusting your search query or category filter.'
                : 'No products in the catalog yet.'
            }
            action={
              !searchQuery && selectedCategory === 'ALL'
                ? { label: 'Add First Product', href: '/merchant/products/new' }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/40">
                  <th className="py-3 px-4 text-label font-medium">Product</th>
                  <th className="py-3 px-4 text-label font-medium">Category</th>
                  <th className="py-3 px-4 text-label font-medium text-right">Selling Price</th>
                  <th className="py-3 px-4 text-label font-medium">Stock</th>
                  <th className="py-3 px-4 text-label font-medium">Status</th>
                  <th className="py-3 px-4 text-label font-medium">Upsell Link</th>
                  <th className="py-3 px-4 text-label font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sf-border-light)]">
                {filteredProducts.map((p) => {
                  const rawAttrs = (p.attributes as Record<string, any>) || {};
                  const mrp = typeof rawAttrs.mrpRupees === 'number' ? rawAttrs.mrpRupees : undefined;

                  return (
                    <tr key={p.id} className="hover:bg-[var(--sf-surface-hover)] sf-transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-sf bg-[var(--sf-bg-alt)] overflow-hidden shrink-0 border border-[var(--sf-border)] flex items-center justify-center text-[10px] text-[var(--sf-text-muted)]">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-[var(--sf-text-muted)]" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--sf-text-primary)] block">{p.name}</span>
                            <span className="text-[11px] text-[var(--sf-text-muted)] line-clamp-1 max-w-xs block">
                              {p.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--sf-text-secondary)]">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold tabular-nums text-[var(--sf-text-primary)]">
                          {formatCurrency(p.priceMinor)}
                        </div>
                        {mrp && mrp > (p.priceMinor / 100) && (
                          <div className="text-[10px] text-[var(--sf-text-muted)] line-through tabular-nums">
                            MRP ₹{mrp.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`tabular-nums text-xs ${
                            p.stockQuantity > 0 ? 'text-[var(--sf-text-primary)] font-medium' : 'text-red-600 dark:text-red-400 font-bold'
                          }`}
                        >
                          {p.stockQuantity} units
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge variant={p.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {p.status === 'ACTIVE' ? 'Active' : p.status}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4">
                        {p.relations && p.relations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.relations.map((rel) => (
                              <span
                                key={rel.id}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--sf-bg-alt)] text-[var(--sf-text-secondary)] border border-[var(--sf-border)]"
                              >
                                <span className="truncate max-w-[120px]">{rel.relatedProduct.name}</span>
                                <span className="text-[var(--sf-text-muted)]">
                                  ({formatCurrency(rel.relatedProduct.priceMinor)})
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--sf-text-muted)] text-[12px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="text-[12px] font-medium text-brand-600 dark:text-rose-400 hover:text-brand-700 dark:hover:text-rose-300 sf-transition inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50/60 dark:bg-rose-950/30 border border-brand-200/50 dark:border-rose-900/40"
                            title="Edit product"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => setConfirmDeleteProduct(p)}
                            disabled={deletingId === p.id}
                            aria-label={`Delete ${p.name}`}
                            className="text-[12px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 sf-transition disabled:opacity-50 inline-flex items-center gap-1 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete product"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--sf-surface)] rounded-sf-lg max-w-lg w-full p-6 shadow-sf border border-[var(--sf-border)] space-y-4 my-8 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sf-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--sf-text-primary)]">Edit Product</h3>
                <p className="text-xs text-[var(--sf-text-muted)]">Changes are saved directly to PostgreSQL and update the AI catalog.</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] p-1 rounded hover:bg-[var(--sf-bg-alt)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Category *</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                  >
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                  >
                    <option value="ACTIVE">Active (In Store)</option>
                    <option value="INACTIVE">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Dual Pricing: Original / MRP vs Offering Price */}
              <div className="p-3.5 rounded-sf bg-[var(--sf-bg-alt)]/60 border border-[var(--sf-border)] space-y-2.5">
                <span className="font-semibold text-[var(--sf-text-primary)] block">Dual Pricing (Rupees)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[var(--sf-text-muted)] block mb-1">Original Price / MRP (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.mrpRupees}
                      onChange={(e) => setEditFormData({ ...editFormData, mrpRupees: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-surface)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--sf-text-muted)] block mb-1">Offering Price (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editFormData.priceRupees}
                      onChange={(e) => setEditFormData({ ...editFormData, priceRupees: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-surface)] text-xs font-semibold text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.stockQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Image URL</label>
                  <input
                    type="text"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--sf-text-primary)] mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  placeholder="running, athletic, shoes"
                  className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--sf-border)]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-sf border border-[var(--sf-border)] text-xs font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-bg-alt)] sf-transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-sf bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold sf-transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[var(--sf-surface)] rounded-sf-lg max-w-md w-full p-6 shadow-sf border border-[var(--sf-border)] space-y-4 sf-transition">
            <div>
              <h3 className="text-base font-bold text-[var(--sf-text-primary)]">Remove Product from Catalog?</h3>
              <p className="text-xs text-[var(--sf-text-secondary)] mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[var(--sf-text-primary)]">&quot;{confirmDeleteProduct.name}&quot;</span>?
                This will remove it from the catalog and delete configured upsell relationships.
              </p>
            </div>

            <div className="p-3 bg-[var(--sf-bg-alt)] rounded-sf border border-[var(--sf-border)] text-xs flex items-center justify-between">
              <div>
                <span className="text-[var(--sf-text-muted)] block text-[11px]">Price & Category</span>
                <span className="font-semibold text-[var(--sf-text-primary)]">
                  {formatCurrency(confirmDeleteProduct.priceMinor)} • {confirmDeleteProduct.category}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[var(--sf-text-muted)] block text-[11px]">Stock</span>
                <span className="font-semibold text-[var(--sf-text-primary)]">{confirmDeleteProduct.stockQuantity} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-sf border border-[var(--sf-border)] text-xs font-medium text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteProduct)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-sf bg-red-600 hover:bg-red-700 text-white text-xs font-medium sf-transition flex items-center gap-1.5"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove Product</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

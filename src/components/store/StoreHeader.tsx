'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Sparkles, LayoutDashboard, Store } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ContextSwitchToggle } from '@/components/nav/ContextSwitchToggle';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface StoreHeaderProps {
  merchantName: string;
  merchantSlug: string;
  cartItemCount: number;
  onOpenCart: () => void;
  activeMode: 'chat' | 'shop';
  onModeChange: (mode: 'chat' | 'shop') => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  merchantName,
  merchantSlug,
  cartItemCount,
  onOpenCart,
  activeMode,
  onModeChange,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--sf-border)] bg-[var(--sf-surface)]/95 backdrop-blur-md sf-transition">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand & Left Section */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="p-1.5 rounded-full border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800 sf-transition"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h1 className="font-bold text-sm text-[var(--sf-text-primary)] tracking-tight truncate max-w-[130px] sm:max-w-none">
              {merchantName}
            </h1>
            <StatusBadge variant="neutral" className="hidden lg:inline-flex rounded-full text-[10px] py-0.5">
              Verified
            </StatusBadge>
          </div>
        </div>

        {/* Center: Mode Switcher [ AI Chat | Shop ] with Liquid Sliding Glider */}
        <nav className="relative flex items-center p-1 rounded-full bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 shadow-inner-2xs">
          {/* Animated Liquid Glider */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white dark:bg-stone-800 shadow-xs dark:shadow-[0_0_12px_rgba(244,63,94,0.25)] border border-brand-200/50 dark:border-rose-500/30 transition-all duration-300 ease-out pointer-events-none ${
              activeMode === 'chat' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          <button
            onClick={() => onModeChange('chat')}
            aria-label="Switch to AI Chat shopping"
            className={`relative z-10 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'chat'
                ? 'text-brand-600 dark:text-rose-300 font-semibold'
                : 'text-[var(--sf-text-secondary)] dark:text-stone-400 hover:text-[var(--sf-text-primary)]'
            }`}
          >
            <Sparkles className={`w-3 h-3 ${activeMode === 'chat' ? 'text-brand-600 dark:text-rose-400' : 'text-[var(--sf-text-muted)]'}`} />
            <span>AI Chat</span>
          </button>

          <button
            onClick={() => onModeChange('shop')}
            aria-label="Switch to Catalog browsing"
            className={`relative z-10 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeMode === 'shop'
                ? 'text-brand-600 dark:text-rose-300 font-semibold'
                : 'text-[var(--sf-text-secondary)] dark:text-stone-400 hover:text-[var(--sf-text-primary)]'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Shop</span>
          </button>
        </nav>

        {/* Right Section: Console/Store Toggle Pill (Upper Right Side) + Liquid Glass Theme Pill + Premium Cart */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Context Toggle: Console <-> Store (Upper Right Side) */}
          <ContextSwitchToggle merchantSlug={merchantSlug} className="hidden sm:inline-flex" />

          {/* Liquid Glass Theme Switcher */}
          <ThemeToggle />

          {/* Mobile-only Console Icon */}
          <Link
            href="/merchant/dashboard"
            className="sm:hidden p-1.5 text-xs font-medium text-brand-600 dark:text-rose-300 bg-brand-50/70 dark:bg-rose-500/15 border border-brand-200/70 dark:border-rose-500/30 rounded-full hover:bg-brand-100 sf-transition"
            title="Merchant Console"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
          </Link>

          {/* Premium Cart Button */}
          <button
            onClick={onOpenCart}
            id="cart-drawer-trigger"
            aria-label="Open Shopping Cart"
            className="group relative flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-stone-900 dark:bg-stone-800 text-white hover:bg-stone-800 dark:hover:bg-stone-700 shadow-sm dark:shadow-[0_0_16px_rgba(244,63,94,0.25)] border border-stone-700/70 dark:border-rose-500/40 sf-transition active:scale-97 font-semibold text-xs cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400 dark:text-rose-400 group-hover:scale-110 sf-transition" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <span className="tracking-wide">Cart</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
              cartItemCount > 0
                ? 'bg-gradient-to-r from-brand-500 to-rose-600 text-white shadow-xs dark:shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : 'bg-white/10 text-stone-400'
            }`}>
              {cartItemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

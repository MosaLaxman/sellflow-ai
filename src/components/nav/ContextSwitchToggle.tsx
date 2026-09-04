'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store } from 'lucide-react';

interface ContextSwitchToggleProps {
  merchantSlug?: string;
  className?: string;
}

export function ContextSwitchToggle({
  merchantSlug = 'apex-sports',
  className = '',
}: ContextSwitchToggleProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isStoreActive = pathname?.startsWith('/store') || false;
  // Local state for instantaneous optimistic gliding animation on click
  const [activeTab, setActiveTab] = useState<'console' | 'store'>(
    isStoreActive ? 'store' : 'console'
  );

  useEffect(() => {
    setActiveTab(isStoreActive ? 'store' : 'console');
  }, [isStoreActive, pathname]);

  const handleToggle = () => {
    if (activeTab === 'console') {
      setActiveTab('store');
      router.push(`/store/${merchantSlug}`);
    } else {
      setActiveTab('console');
      router.push('/merchant/dashboard');
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      aria-label={`Switch context (Currently ${activeTab === 'console' ? 'Console' : 'Store'})`}
      title={`Switch to ${activeTab === 'console' ? 'Storefront' : 'Merchant Console'}`}
      className={`relative inline-grid grid-cols-2 p-0.5 w-[156px] h-8 rounded-full bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800 shadow-inner-2xs cursor-pointer select-none sf-transition hover:border-stone-300 dark:hover:border-stone-700 active:scale-97 ${className}`}
    >
      {/* Liquid Glass Sliding Glider - Perfectly Symmetrical */}
      <div
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-1px)] rounded-full transition-all duration-300 ease-out shadow-xs pointer-events-none bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-950 border border-brand-200/80 dark:border-rose-500/40 shadow-sm dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]"
        style={{
          left: activeTab === 'console' ? '2px' : 'calc(50% - 1px)',
        }}
      />

      {/* Console (Left Column) */}
      <Link
        href="/merchant/dashboard"
        onClick={(e) => {
          e.stopPropagation();
          setActiveTab('console');
        }}
        className={`relative z-10 w-full h-full rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 ${
          activeTab === 'console'
            ? 'text-brand-600 dark:text-rose-300 font-bold'
            : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-medium'
        }`}
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span className="text-[11px] tracking-tight">Console</span>
      </Link>

      {/* Store (Right Column) */}
      <Link
        href={`/store/${merchantSlug}`}
        onClick={(e) => {
          e.stopPropagation();
          setActiveTab('store');
        }}
        className={`relative z-10 w-full h-full rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 ${
          activeTab === 'store'
            ? 'text-brand-600 dark:text-rose-300 font-bold'
            : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-medium'
        }`}
      >
        <Store className="w-3.5 h-3.5" />
        <span className="text-[11px] tracking-tight">Store</span>
      </Link>
    </div>
  );
}

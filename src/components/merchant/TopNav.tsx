'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, ExternalLink, LogOut, LayoutDashboard, Store } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ContextSwitchToggle } from '@/components/nav/ContextSwitchToggle';

const PRIMARY_NAV = [
  { href: '/merchant/dashboard', label: 'Overview' },
  { href: '/merchant/orders', label: 'Orders' },
  { href: '/merchant/products', label: 'Products' },
  { href: '/merchant/ai-decisions', label: 'Activity' },
  { href: '/ai-buyer', label: 'AI Buyer' },
];

const SETTINGS_NAV = [
  { href: '/merchant/settings/ai-policy', label: 'Recovery Boundaries' },
  { href: '/merchant/settings/razorpay', label: 'Razorpay' },
  { href: '/merchant/audit-log', label: 'Audit Trail' },
  { href: '/merchant/test-center', label: 'Diagnostics' },
];

export const TopNav: React.FC<{ merchantSlug?: string }> = ({ merchantSlug = 'apex-sports' }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Smooth liquid glider measurements for primary nav
  const [gliderStyle, setGliderStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (href: string) => {
    if (href === '/merchant/dashboard') return pathname === href;
    return pathname?.startsWith(href) || false;
  };

  const isSettingsActive = SETTINGS_NAV.some((item) => pathname?.startsWith(item.href));

  // Move glider immediately to target element
  const moveGliderToKey = (key: string) => {
    if (itemRefs.current[key] && navRef.current) {
      const targetEl = itemRefs.current[key]!;
      const navRect = navRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      setGliderStyle({
        left: targetRect.left - navRect.left,
        width: targetRect.width,
        opacity: 1,
      });
    }
  };

  // Recalculate position based on active item
  const updateGlider = () => {
    let activeKey = PRIMARY_NAV.find((i) => isActive(i.href))?.href;
    if (!activeKey && (isSettingsActive || settingsOpen)) {
      activeKey = 'settings';
    }
    if (activeKey) {
      moveGliderToKey(activeKey);
    }
  };

  useLayoutEffect(() => {
    updateGlider();
    // Enable smooth animations right after initial placement
    const frame = requestAnimationFrame(() => {
      setIsReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, isSettingsActive, settingsOpen]);

  useEffect(() => {
    window.addEventListener('resize', updateGlider);
    return () => window.removeEventListener('resize', updateGlider);
  }, [pathname, isSettingsActive, settingsOpen]);

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--sf-surface)]/95 backdrop-blur-md border-[var(--sf-border)]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/merchant/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 opacity-40 dark:opacity-60 blur-xs group-hover:opacity-90 transition duration-300 animate-pulse" />
                <div className="relative w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 dark:from-rose-500 dark:via-red-600 dark:to-rose-800 shadow-sm shadow-brand-500/30 dark:shadow-[0_0_16px_rgba(244,63,94,0.45)] dark:border dark:border-rose-400/40 flex items-center justify-center group-hover:scale-105 sf-transition">
                  <span className="text-white text-xs font-bold tracking-tight">SF</span>
                </div>
              </div>
              <span className="font-semibold text-sm text-[var(--sf-text-primary)] tracking-tight group-hover:text-brand-600 dark:group-hover:text-rose-400 sf-transition">
                SellFlow AI
              </span>
            </Link>
          </div>

          {/* Desktop Unified Segmented Glider Nav */}
          <nav
            ref={navRef}
            className="relative hidden md:flex items-center p-1 rounded-full bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-800 shadow-inner-2xs"
            role="navigation"
            aria-label="Primary"
          >
            {/* Liquid Glider Indicator Pill */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-white dark:bg-stone-800 shadow-xs dark:shadow-[0_0_14px_rgba(244,63,94,0.25)] border border-brand-200/50 dark:border-rose-500/30 pointer-events-none"
              style={{
                left: `${gliderStyle.left}px`,
                width: `${gliderStyle.width}px`,
                opacity: gliderStyle.opacity,
                transition: isReady ? 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            />

            {PRIMARY_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => moveGliderToKey(item.href)}
                  ref={(el) => {
                    itemRefs.current[item.href] = el;
                  }}
                  className={`relative z-10 px-3.5 py-1.5 text-xs rounded-full transition-colors duration-200 cursor-pointer ${
                    active
                      ? 'font-semibold text-brand-600 dark:text-rose-300'
                      : 'text-[var(--sf-text-secondary)] dark:text-stone-400 hover:text-[var(--sf-text-primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Settings Dropdown inside unified pill */}
            <div className="relative z-10" ref={settingsRef}>
              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  moveGliderToKey('settings');
                }}
                ref={(el) => {
                  itemRefs.current['settings'] = el;
                }}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-colors duration-200 cursor-pointer ${
                  isSettingsActive || settingsOpen
                    ? 'font-semibold text-brand-600 dark:text-rose-300'
                    : 'text-[var(--sf-text-secondary)] dark:text-stone-400 hover:text-[var(--sf-text-primary)]'
                }`}
                aria-expanded={settingsOpen}
                aria-haspopup="true"
              >
                <span>Settings</span>
                <ChevronDown className={`w-3 h-3 sf-transition ${settingsOpen ? 'rotate-180 text-brand-600 dark:text-rose-400' : ''}`} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[var(--sf-surface)] border border-[var(--sf-border)] dark:border-stone-800 shadow-sf py-1.5 animate-slide-down z-50">
                  {SETTINGS_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSettingsOpen(false)}
                      className={`block px-3.5 py-2 text-xs sf-transition ${
                        isActive(item.href)
                          ? 'text-brand-600 dark:text-rose-300 font-semibold bg-brand-50/60 dark:bg-rose-500/15'
                          : 'text-[var(--sf-text-secondary)] dark:text-stone-300 hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800/80'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Actions: Segmented Toggle Pill (Console <-> Store) + Theme Switcher + Exit */}
          <div className="flex items-center gap-2.5">
            {/* Context Toggle: Console <-> Store (Upper Right Side) */}
            <ContextSwitchToggle merchantSlug={merchantSlug} className="hidden sm:inline-flex" />

            {/* Liquid Glass Theme Switcher */}
            <ThemeToggle />

            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 p-2 text-[13px] text-[var(--sf-text-muted)] hover:text-brand-600 rounded-full hover:bg-[var(--sf-surface-hover)] sf-transition"
              title="Exit Console"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-full text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[var(--sf-border)] dark:border-stone-800 space-y-3 animate-slide-down">
            <div className="space-y-1">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-sf text-xs font-medium sf-transition ${
                    isActive(item.href)
                      ? 'text-brand-600 dark:text-rose-300 bg-brand-50/70 dark:bg-rose-500/15 font-semibold'
                      : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--sf-border)] dark:border-stone-800">
              <span className="px-3 text-[11px] font-semibold text-[var(--sf-text-muted)] uppercase tracking-wider block mb-1">
                Settings & Safety
              </span>
              {SETTINGS_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-sf text-xs font-medium sf-transition ${
                    isActive(item.href)
                      ? 'text-brand-600 dark:text-rose-300 bg-brand-50/70 dark:bg-rose-500/15 font-semibold'
                      : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--sf-border)] dark:border-stone-800 flex items-center justify-between px-3">
              <a
                href={`/store/${merchantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-brand-600 dark:text-rose-400 flex items-center gap-1"
              >
                <span>Open Storefront</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <Link
                href="/"
                className="text-xs text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit Console</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

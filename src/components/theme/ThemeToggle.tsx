'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'button' | 'pill' | 'dropdown' | string;
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-[140px] rounded-full bg-stone-200/60 dark:bg-stone-800/60 animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const handleToggle = () => {
    toggleTheme();
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
      aria-label={`Toggle theme (Currently ${isDark ? 'Dark' : 'Light'})`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`relative inline-grid grid-cols-2 p-0.5 w-[140px] h-8 rounded-full bg-stone-100/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800 shadow-inner-2xs cursor-pointer select-none sf-transition hover:border-stone-300 dark:hover:border-stone-700 active:scale-97 ${className}`}
    >
      {/* Liquid Glass Sliding Glider - Perfectly Symmetrical */}
      <div
        className="absolute top-0.5 bottom-0.5 w-[calc(50%-1px)] rounded-full transition-all duration-300 ease-out shadow-xs pointer-events-none bg-gradient-to-br from-white to-stone-50 dark:from-stone-800 dark:to-stone-950 border border-amber-200/80 dark:border-rose-500/40 shadow-sm dark:shadow-[0_0_12px_rgba(244,63,94,0.3)]"
        style={{
          left: !isDark ? '2px' : 'calc(50% - 1px)',
        }}
      />

      {/* Light Option (Left Column) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (isDark) setTheme('light');
        }}
        className={`relative z-10 w-full h-full rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 ${
          !isDark
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-medium'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 transition-transform duration-300 ${!isDark ? 'rotate-0 text-amber-500' : '-rotate-45 opacity-60'}`} />
        <span className="text-[11px] tracking-tight">Light</span>
      </div>

      {/* Dark Option (Right Column) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!isDark) setTheme('dark');
        }}
        className={`relative z-10 w-full h-full rounded-full flex items-center justify-center gap-1.5 transition-colors duration-200 ${
          isDark
            ? 'text-rose-400 dark:text-rose-300 font-bold'
            : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-medium'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 transition-transform duration-300 ${isDark ? 'rotate-0 text-rose-400' : 'rotate-45 opacity-60'}`} />
        <span className="text-[11px] tracking-tight">Dark</span>
      </div>
    </div>
  );
}

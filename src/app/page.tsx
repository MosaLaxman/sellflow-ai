import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--sf-bg)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--sf-border)] bg-[var(--sf-surface)] sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 opacity-40 dark:opacity-60 blur-xs transition duration-300 animate-pulse" />
              <div className="relative w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 dark:from-rose-500 dark:via-red-600 dark:to-rose-800 shadow-sm shadow-brand-500/30 dark:shadow-[0_0_16px_rgba(244,63,94,0.45)] dark:border dark:border-rose-400/40 flex items-center justify-center">
                <span className="text-white text-xs font-bold tracking-tight">SF</span>
              </div>
            </div>
            <span className="font-semibold text-sm text-[var(--sf-text-primary)] tracking-tight">
              SellFlow AI
            </span>
            <StatusBadge variant="neutral" className="ml-1 hidden sm:inline-flex rounded-full">
              Razorpay Buildathon Track 01
            </StatusBadge>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="button" className="border-[var(--sf-border)] bg-transparent text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]" />

            <Link
              href="/store/apex-sports"
              className="hidden sm:inline-flex text-xs font-medium text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition"
            >
              Storefront
            </Link>

            <Link
              href="/checkout-demo"
              className="hidden md:inline-flex text-xs font-medium text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition"
            >
              Checkout Demo
            </Link>

            <Link
              href="/merchant/dashboard"
              className="text-xs font-semibold px-4 py-1.5 rounded-full sf-btn-primary flex items-center gap-1"
            >
              <span>Merchant Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-screen-md mx-auto px-4 sm:px-6 py-16 sm:py-24 text-left">
        <div className="mb-4">
          <span className="sf-label">Autonomous Revenue Recovery</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--sf-text-primary)] leading-[1.08]">
          Revenue, recovered.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[var(--sf-text-secondary)] max-w-xl font-normal leading-relaxed">
          An AI sales employee operating directly over your PostgreSQL catalog and Razorpay. Zero hallucinations, zero synthetic numbers, strict financial boundaries.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/merchant/dashboard"
            className="px-5 py-2.5 rounded-full sf-btn-primary font-semibold text-xs inline-flex items-center gap-2"
          >
            <span>Open Merchant Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/store/apex-sports"
            className="px-5 py-2.5 rounded-full bg-[var(--sf-surface)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800 border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-primary)] font-medium text-xs sf-transition inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>Customer Experience</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--sf-text-muted)]" />
          </Link>

          <Link
            href="/checkout-demo"
            className="px-5 py-2.5 rounded-full bg-[var(--sf-surface)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800 border border-[var(--sf-border)] dark:border-stone-800 text-[var(--sf-text-primary)] font-medium text-xs sf-transition inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>Checkout Demo</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--sf-text-muted)]" />
          </Link>
        </div>

        {/* 4 Architectural Pillars */}
        <div className="mt-20 pt-12 border-t border-[var(--sf-border)] grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <span className="text-label text-[var(--sf-text-primary)] font-semibold block mb-1">01. Explainable</span>
            <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
              Every recommendation and upsell proposal produces structured, auditable rationale tied to verified catalog attributes.
            </p>
          </div>

          <div>
            <span className="text-label text-[var(--sf-text-primary)] font-semibold block mb-1">02. Bounded</span>
            <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
              Deterministic policy ceilings enforce maximum order amounts and upsell percentages. The AI cannot override merchant rules.
            </p>
          </div>

          <div>
            <span className="text-label text-[var(--sf-text-primary)] font-semibold block mb-1">03. Gated</span>
            <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
              Zero autonomous charges. The customer explicitly confirms the exact server-calculated total before checkout opens.
            </p>
          </div>

          <div>
            <span className="text-label text-[var(--sf-text-primary)] font-semibold block mb-1">04. Auditable</span>
            <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
              Cryptographically verified Razorpay Webhooks and an immutable PostgreSQL audit ledger. Zero synthetic metrics.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--sf-border)] bg-[var(--sf-surface)] py-6 text-center text-xs text-[var(--sf-text-muted)]">
        SellFlow AI • Razorpay Buildathon Track 01 • Built with Next.js, Prisma, PostgreSQL & Google Gemini
      </footer>
    </div>
  );
}

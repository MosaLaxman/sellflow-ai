'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('merchant@apexperformance.com');
  const [password, setPassword] = useState('MerchantPassword123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/merchant/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('A connection error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] flex flex-col justify-center items-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="button" className="border-[var(--sf-border)] bg-transparent text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]" />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
              SF
            </div>
          </Link>
          <span className="sf-label block mb-1">SellFlow AI</span>
          <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Revenue, recovered.</h1>
          <p className="text-xs text-[var(--sf-text-muted)] mt-1">
            Sign in to access your merchant console
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-6 space-y-4 shadow-sf">
          <div>
            <label className="block text-label mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@apexperformance.com"
                className="w-full pl-9 pr-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
              />
              <Mail className="w-3.5 h-3.5 text-[var(--sf-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-label mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
              />
              <Lock className="w-3.5 h-3.5 text-[var(--sf-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-sf bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm flex items-center justify-center gap-2 sf-transition disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in to Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--sf-text-muted)]">
          Demo credentials pre-filled from authoritative database seed.
        </div>
      </div>
    </div>
  );
}

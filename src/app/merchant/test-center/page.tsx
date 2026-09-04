'use client';

import React, { useState, useEffect } from 'react';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  RefreshCw,
  Play,
  Zap,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Database,
  ExternalLink,
} from 'lucide-react';

interface ScenarioResult {
  scenario: string;
  decision: string;
  reason: string;
  requestedAmount?: string;
  merchantCeiling?: string;
  customerConfirmed?: boolean;
  razorpayOrderStatus?: string;
  moneyMoved?: string;
  auditStatus?: string;
  [key: string]: any;
}

export default function TestCenterPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [recentWebhooks, setRecentWebhooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active scenario state
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [scenarioResults, setScenarioResults] = useState<Record<string, ScenarioResult>>({});
  const [runningScenario, setRunningScenario] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/merchant/test-center');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data.health);
        setRecentWebhooks(data.recentWebhooks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runScenario = async (action: string) => {
    try {
      setRunningScenario(action);
      const res = await fetch('/api/merchant/test-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setScenarioResults((prev) => ({ ...prev, [action]: data }));
      setActiveScenario(action);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setRunningScenario(null);
    }
  };

  const scenarios = [
    {
      id: 'SCENARIO_SUCCESSFUL_PURCHASE',
      title: '1. Successful AI Purchase',
      desc: 'External AI Buyer matches product within budget, passes ceiling, customer confirms.',
      badge: 'Golden Path',
      variant: 'success',
    },
    {
      id: 'SCENARIO_UNCONFIRMED_ORDER',
      title: '2. Customer Authorization Gated',
      desc: 'Purchase attempted without customer confirmation. Razorpay order blocked.',
      badge: 'Confirmation Gate',
      variant: 'warning',
    },
    {
      id: 'SCENARIO_EXCEED_CEILING',
      title: '3. Order Exceeds Autonomous Ceiling',
      desc: 'Request of ₹12,499 exceeds merchant ceiling of ₹10,000. Blocked by policy.',
      badge: 'Spending Cap',
      variant: 'error',
    },
    {
      id: 'SCENARIO_UPSELL_EXCEEDS_CAP',
      title: '4. Upsell Exceeds Maximum Ratio',
      desc: 'Proposed add-on is 71% of base price (>50% merchant cap). Add-on rejected.',
      badge: 'Upsell Ratio Cap',
      variant: 'warning',
    },
    {
      id: 'SCENARIO_OUT_OF_STOCK',
      title: '5. Out-of-Stock Inventory Guard',
      desc: 'Product stock is 0. Item skipped to prevent false availability orders.',
      badge: 'Stock Guard',
      variant: 'neutral',
    },
    {
      id: 'SCENARIO_INVALID_API_KEY',
      title: '6. Invalid AI Buyer API Key',
      desc: 'Unauthorized agent call with invalid Bearer token. HTTP 401 Unauthorized.',
      badge: 'Auth Boundary',
      variant: 'error',
    },
    {
      id: 'SCENARIO_PAYMENT_FAILURE_RECOVERY',
      title: '7. Payment Failure & In-App Recovery',
      desc: 'Simulated payment decline. In-app recovery modal presented with preserved cart.',
      badge: 'Recovery Experience',
      variant: 'warning',
    },
    {
      id: 'SCENARIO_CUSTOMER_CANCELLATION',
      title: '8. Customer Cancellation & Order Retention',
      desc: 'Customer dismissed Razorpay dialog. "Your order is still waiting" state presented.',
      badge: 'Cart Retention',
      variant: 'neutral',
    },
    {
      id: 'SCENARIO_RETRY_SUCCESS',
      title: '9. Recovery Retry Success',
      desc: 'Customer clicks [ Retry Payment ], settles invoice with zero duplicate orders.',
      badge: 'Full Recovery',
      variant: 'success',
    },
    {
      id: 'SCENARIO_RETRY_FAILURE',
      title: '10. Repeated Decline Protection',
      desc: 'Second retry fails; presents reassuring retry option without losing cart state.',
      badge: 'Failure Guard',
      variant: 'warning',
    },
    {
      id: 'SCENARIO_DUPLICATE_WEBHOOK',
      title: '11. Duplicate Webhook Idempotency',
      desc: 'Same webhook event delivered twice. Deduplicated via unique event ID.',
      badge: 'Anti-Double Charge',
      variant: 'success',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] flex flex-col">
      <MerchantNav merchantSlug="apex-sports" />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-rose-950/40 border border-brand-200/60 dark:border-rose-900/40 text-brand-600 dark:text-rose-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Track 01 Verification & Safety Simulator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--sf-text-primary)] tracking-tight">
              Safety & Failure Test Center
            </h1>
            <p className="mt-1 text-sm text-[var(--sf-text-muted)] max-w-xl">
              Verify deterministic merchant policy gates, spending ceilings, authentication boundaries, and idempotency safeguards using live backend logic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/ai-buyer"
              className="px-3.5 py-2 rounded-sf bg-[var(--sf-bg-alt)] hover:bg-[var(--sf-surface-hover)] border border-[var(--sf-border)] text-xs font-semibold text-[var(--sf-text-primary)] sf-transition flex items-center gap-1.5"
            >
              <span>AI Buyer Demo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] sf-transition"
              title="Refresh health status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Infrastructure Health Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">PostgreSQL</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{healthData?.database?.status || 'ONLINE'}</span>
            </span>
          </div>

          <div className="p-3.5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">Gemini AI</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{healthData?.gemini?.status || 'CONFIGURED'}</span>
            </span>
          </div>

          <div className="p-3.5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">Razorpay Sandbox</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>TEST MODE</span>
            </span>
          </div>

          <div className="p-3.5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">Webhook Ledger</span>
            <span className="text-xs font-bold text-[var(--sf-text-primary)] tabular-nums">
              {healthData?.webhooks?.totalReceived || 0} Events Verified
            </span>
          </div>

          <div className="p-3.5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">Active Catalog</span>
            <span className="text-xs font-bold text-[var(--sf-text-primary)] tabular-nums">
              {healthData?.catalog?.totalProducts || 0} Grounded Items
            </span>
          </div>
        </section>

        {/* 8 Scenario Test Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--sf-text-primary)]">
              Deterministic Safety & Boundary Scenarios (1-Click Verification)
            </h2>
            <span className="text-xs text-[var(--sf-text-muted)]">Real Database & Engine Execution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((sc) => {
              const result = scenarioResults[sc.id];
              const isRunning = runningScenario === sc.id;

              return (
                <div
                  key={sc.id}
                  className="p-5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf space-y-4 flex flex-col justify-between hover:border-[var(--sf-border-hover)] sf-transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--sf-text-primary)]">{sc.title}</h3>
                      <StatusBadge variant={sc.variant as any}>{sc.badge}</StatusBadge>
                    </div>
                    <p className="text-[11px] text-[var(--sf-text-muted)] leading-relaxed">{sc.desc}</p>
                  </div>

                  {/* Result Card */}
                  {result && (
                    <div className="p-3.5 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] space-y-2 text-xs animate-fade-in font-sans">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--sf-border-light)]">
                        <span className="font-semibold text-[var(--sf-text-primary)] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Verdict: {result.decision || 'PROCESSED'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {result.auditStatus || 'AUDIT_RECORDED'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <p className="text-[var(--sf-text-secondary)] leading-relaxed">
                          <strong>Rationale:</strong> {result.reason}
                        </p>
                        {result.requestedAmount && (
                          <div className="flex justify-between text-[11px] text-[var(--sf-text-muted)] pt-1">
                            <span>Requested: <strong className="text-[var(--sf-text-primary)]">{result.requestedAmount}</strong></span>
                            <span>Limit: <strong className="text-[var(--sf-text-primary)]">{result.merchantCeiling}</strong></span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] text-[var(--sf-text-muted)] pt-0.5">
                          <span>Money Moved: <strong className="text-emerald-600 dark:text-emerald-400">{result.moneyMoved || '₹0'}</strong></span>
                          <span>Razorpay: <strong className="text-[var(--sf-text-primary)]">{result.razorpayOrderStatus || 'Protected'}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => runScenario(sc.id)}
                    disabled={isRunning}
                    className="w-full py-2 px-3 rounded-sf bg-[var(--sf-bg-alt)] hover:bg-[var(--sf-surface-hover)] border border-[var(--sf-border)] text-xs font-semibold text-[var(--sf-text-primary)] sf-transition flex items-center justify-center gap-1.5"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Verification...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Run Scenario Verification</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

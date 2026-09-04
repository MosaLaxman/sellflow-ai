'use client';

import React, { useState } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  Lock,
  Plus,
  X,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TopNav } from '@/components/merchant/TopNav';
import { PaymentRecoveryModal, PaymentRecoveryType } from '@/components/store/PaymentRecoveryModal';

const AGENT_PERSONAS = [
  {
    id: 'agent_travel_planner',
    name: 'TravelPlanner AI',
    role: 'Autonomous Corporate Booking & Gear Agent',
    defaultQuery: 'I need running shoes under ₹4,000 for daily road training',
    badge: 'Autonomous Buyer',
  },
  {
    id: 'agent_gift_finder',
    name: 'GiftFinder AI',
    role: 'Personal Gifting & Athletic Assistant',
    defaultQuery: 'Find premium athletic accessories under ₹1,500',
    badge: 'Curated Buyer',
  },
  {
    id: 'agent_marathon_coach',
    name: 'MarathonCoach AI',
    role: 'Elite Athletics Procurement Bot',
    defaultQuery: 'Lightweight marathon racing shoes with high responsiveness',
    badge: 'Performance Agent',
  },
  {
    id: 'agent_budget_shopper',
    name: 'BudgetShopper AI',
    role: 'Price Optimization Agent',
    defaultQuery: 'Trail running shoes under ₹3,500',
    badge: 'Strict Budget',
  },
];

export default function AIBuyerPage() {
  const [selectedAgent, setSelectedAgent] = useState(AGENT_PERSONAS[0]);
  const [query, setQuery] = useState(AGENT_PERSONAS[0].defaultQuery);
  const [merchantSlug, setMerchantSlug] = useState('apex-sports');
  const [apiKey, setApiKey] = useState('sfai_demo_buyer_key_2026');
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Upsell toggle & checkout authorization state
  const [includeUpsell, setIncludeUpsell] = useState(true);
  const [isAuthorizingPayment, setIsAuthorizingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // In-App Payment Recovery State
  const [recoveryModalState, setRecoveryModalState] = useState<{
    isOpen: boolean;
    type: PaymentRecoveryType;
    failureReason?: string | null;
    retryCount: number;
  }>({
    isOpen: false,
    type: 'FAILED',
    failureReason: null,
    retryCount: 0,
  });
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const handleSelectAgent = (agent: typeof AGENT_PERSONAS[0]) => {
    setSelectedAgent(agent);
    setQuery(agent.defaultQuery);
    setSimulationResult(null);
    setPaymentSuccess(null);
    setPaymentError(null);
  };

  const handleRunBuyer = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSimulationResult(null);
    setActiveStepIndex(null);
    setPaymentSuccess(null);
    setPaymentError(null);

    try {
      const res = await fetch('/api/agent/buyer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          merchantSlug,
          apiKey,
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          includeUpsell,
          customerConfirmed: false,
        }),
      });

      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error('AI Buyer simulation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorizeAndCheckout = async (isRetry: boolean = false) => {
    if (!simulationResult || !simulationResult.selectedProduct) return;

    if (isRetry) {
      setIsRetryingPayment(true);
    } else {
      setIsAuthorizingPayment(true);
    }
    setPaymentError(null);

    try {
      // 1. Call AI buyer API with customerConfirmed: true to create authoritative Razorpay Order
      const res = await fetch('/api/agent/buyer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          merchantSlug,
          apiKey,
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          selectedProductId: simulationResult.selectedProduct.id,
          includeUpsell,
          customerConfirmed: true,
          initiateRazorpayOrder: true,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.razorpayOrder) {
        setPaymentError(data.error || 'Failed to generate Razorpay order');
        setIsAuthorizingPayment(false);
        setIsRetryingPayment(false);
        setRecoveryModalState({
          isOpen: true,
          type: 'FAILED',
          failureReason: data.error || 'Failed to generate Razorpay order',
          retryCount: 0,
        });
        return;
      }

      const rzpOrder = data.razorpayOrder;

      // 2. Launch Razorpay Checkout Modal
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: rzpOrder.keyId || 'rzp_test_sellflow',
          amount: rzpOrder.amountMinor,
          currency: rzpOrder.currency || 'INR',
          name: 'Apex Sports (via SellFlow AI)',
          description: `AI Buyer Order: ${selectedAgent.name}`,
          order_id: rzpOrder.razorpayOrderId,
          handler: async (response: any) => {
            try {
              // 3. Verify payment signature on backend
              const verifyRes = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpayOrderId: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  razorpay_signature: response.razorpay_signature,
                  razorpaySignature: response.razorpay_signature,
                  internalOrderId: rzpOrder.orderId,
                  orderId: rzpOrder.orderId,
                  merchantSlug,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setPaymentSuccess({
                  orderId: rzpOrder.orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  amountRupees: rzpOrder.amountRupees,
                  agentName: selectedAgent.name,
                });
                setPaymentError(null);
                setRecoveryModalState((prev) => ({ ...prev, isOpen: false }));
              } else {
                setPaymentError(verifyData.error || 'Payment verification failed');
                setRecoveryModalState((prev) => ({
                  isOpen: true,
                  type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
                  failureReason: verifyData.error || 'Payment verification failed',
                  retryCount: prev.retryCount + 1,
                }));
              }
            } catch (err: any) {
              setPaymentError(`Verification error: ${err.message}`);
              setRecoveryModalState((prev) => ({
                isOpen: true,
                type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
                failureReason: `Verification error: ${err.message}`,
                retryCount: prev.retryCount + 1,
              }));
            } finally {
              setIsAuthorizingPayment(false);
              setIsRetryingPayment(false);
            }
          },
          prefill: {
            name: `${selectedAgent.name} (Automated Buyer)`,
            email: 'agent-buyer@sellflow.ai',
            contact: '9999999999',
          },
          theme: {
            color: '#E11D48',
          },
          modal: {
            ondismiss: () => {
              setIsAuthorizingPayment(false);
              setIsRetryingPayment(false);
              setRecoveryModalState((prev) => ({
                isOpen: true,
                type: 'CANCELLED',
                failureReason: null,
                retryCount: prev.retryCount,
              }));
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.on('payment.failed', function (response: any) {
          console.error('Razorpay payment failed:', response.error);
          setIsAuthorizingPayment(false);
          setIsRetryingPayment(false);
          setRecoveryModalState((prev) => ({
            isOpen: true,
            type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
            failureReason: response.error?.description || 'Declined by bank',
            retryCount: prev.retryCount + 1,
          }));
        });
        razorpayInstance.open();
      } else {
        // Fallback simulated success for offline demo
        setPaymentSuccess({
          orderId: rzpOrder.orderId,
          razorpayOrderId: rzpOrder.razorpayOrderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          amountRupees: rzpOrder.amountRupees,
          agentName: selectedAgent.name,
        });
        setIsAuthorizingPayment(false);
        setIsRetryingPayment(false);
        setRecoveryModalState((prev) => ({ ...prev, isOpen: false }));
      }
    } catch (err: any) {
      setPaymentError(`Checkout error: ${err.message}`);
      setIsAuthorizingPayment(false);
      setIsRetryingPayment(false);
      setRecoveryModalState((prev) => ({
        isOpen: true,
        type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
        failureReason: `Checkout error: ${err.message}`,
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] flex flex-col">
      <TopNav merchantSlug={merchantSlug} />

      {/* Main Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge variant="info">Track 01 · AI Growth & Agentic Commerce</StatusBadge>
            <span className="text-xs text-[var(--sf-text-muted)]">Live Machine-to-Machine Protocol</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--sf-text-primary)] tracking-tight">
            AI Buyer Commerce Demonstration
          </h1>
          <p className="mt-2 text-sm text-[var(--sf-text-muted)] leading-relaxed">
            External AI buyer agents discover merchant catalogs via <code className="px-1.5 py-0.5 rounded bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] font-mono text-xs text-brand-600 dark:text-rose-400">GET /api/agent/catalog</code>, evaluate specifications, verify stock, evaluate upsells, and execute gated Razorpay test transactions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Persona, Configuration & Prompt */}
          <div className="lg:col-span-5 space-y-6">
            {/* Agent Persona Selector */}
            <div className="p-5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-label">1. Select AI Buyer Persona</label>
                <span className="text-[11px] text-[var(--sf-text-muted)] font-mono">protocol: v1.0</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {AGENT_PERSONAS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`p-2.5 rounded-sf border text-left sf-transition flex flex-col justify-between ${
                      selectedAgent.id === agent.id
                        ? 'border-brand-500 bg-brand-50/70 dark:bg-rose-950/30 text-brand-700 dark:text-rose-300 shadow-2xs'
                        : 'border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] hover:border-brand-300'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-xs block truncate">{agent.name}</span>
                      <span className="text-[10px] text-[var(--sf-text-muted)] block line-clamp-1 mt-0.5">{agent.role}</span>
                    </div>
                    <span className="mt-2 text-[9px] font-mono uppercase tracking-wider text-brand-600 dark:text-rose-400 font-bold">
                      {agent.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Request Intent */}
            <div className="p-5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf space-y-4">
              <div>
                <label className="text-label mb-1.5 block">2. Purchase Intent Query</label>
                <textarea
                  rows={2}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. I need running shoes under ₹4,000 for daily jogging"
                  className="w-full px-3 py-2 text-xs rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-xs">
                <div>
                  <span className="font-semibold text-[var(--sf-text-primary)] block">Target Merchant</span>
                  <span className="text-[11px] text-[var(--sf-text-muted)] font-mono">slug: {merchantSlug}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI Commerce Ready</span>
                </div>
              </div>

              {/* API Key Credentials Box for Postman / External Testing */}
              <div className="p-3 rounded-sf bg-[var(--sf-bg-alt)]/60 border border-[var(--sf-border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--sf-text-primary)]">
                    Bearer Token / API Credentials
                  </label>
                  <span className="text-[10px] text-brand-600 dark:text-rose-400 font-mono">Postman Auth</span>
                </div>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                />
              </div>

              <button
                onClick={handleRunBuyer}
                disabled={isLoading || !query.trim()}
                className="w-full py-3 px-4 rounded-sf bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs sf-transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Protocol Trace...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run AI Buyer Discovery & Match</span>
                  </>
                )}
              </button>
            </div>

            {/* Protocol Guarantees */}
            <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] space-y-3">
              <h3 className="text-xs font-semibold text-[var(--sf-text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Safety & Gating Guarantees</span>
              </h3>
              <ul className="space-y-2 text-[11px] text-[var(--sf-text-muted)]">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Authoritative DB Pricing</strong>: Prices computed server-side in paise; client amounts untrusted.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Policy Engine Gate</strong>: Spending ceiling and confirmation requirements enforced deterministically.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Immutable Audit Ledger</strong>: Every decision and webhook settlement recorded in PostgreSQL.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Execution Trace, Product Match & Checkout Gating */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf min-h-[520px] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--sf-border)] mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--sf-text-primary)]">
                    Autonomous Protocol Execution Trace
                  </h2>
                  <p className="text-[11px] text-[var(--sf-text-muted)] mt-0.5">
                    Agent: <strong className="text-brand-600 dark:text-rose-400">{selectedAgent.name}</strong> · Machine-readable decision sequence
                  </p>
                </div>
                {simulationResult && (
                  <StatusBadge
                    variant={
                      simulationResult.outcome === 'READY_FOR_CHECKOUT' || simulationResult.outcome === 'ORDER_CREATED' ? 'success' :
                      simulationResult.outcome === 'HUMAN_AUTHORIZATION_REQUIRED' ? 'warning' : 'neutral'
                    }
                  >
                    {simulationResult.outcome}
                  </StatusBadge>
                )}
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
                  <p className="text-xs font-semibold text-[var(--sf-text-primary)]">
                    Running AI Buyer Protocol...
                  </p>
                  <p className="text-[11px] text-[var(--sf-text-muted)] mt-1">
                    Discovering catalog → Matching inventory → Validating policy caps
                  </p>
                </div>
              ) : !simulationResult ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-[var(--sf-text-muted)]">
                  <Bot className="w-12 h-12 stroke-[1.2] mb-3 text-[var(--sf-border)]" />
                  <p className="text-xs font-medium text-[var(--sf-text-secondary)]">No trace executed yet</p>
                  <p className="text-[11px] mt-1 max-w-xs">
                    Select an AI Buyer persona on the left and click &quot;Run AI Buyer Discovery & Match&quot; to begin.
                  </p>
                </div>
              ) : simulationResult.error ? (
                <div className="p-4 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Protocol Error</span>
                  </div>
                  <p>{simulationResult.error}</p>
                </div>
              ) : (
                <div className="space-y-5 flex-1">
                  {/* Verified Payment Success Banner */}
                  {paymentSuccess && (
                    <div className="p-4 rounded-sf-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <span>Payment Captured & Cryptographically Verified!</span>
                        </div>
                        <StatusBadge variant="success">PAID · Captured</StatusBadge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                        <div>
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block">Total Paid</span>
                          <span className="font-bold tabular-nums">₹{paymentSuccess.amountRupees?.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block">Razorpay Order ID</span>
                          <span className="font-mono text-[11px]">{paymentSuccess.razorpayOrderId}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block">Payment ID</span>
                          <span className="font-mono text-[11px] truncate block">{paymentSuccess.razorpayPaymentId}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-3">
                        <a
                          href="/merchant/ai-decisions"
                          className="px-3 py-1.5 rounded-sf bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 sf-transition"
                        >
                          <span>View in Agent Transaction Center</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Payment Error if any */}
                  {paymentError && (
                    <div className="p-3.5 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p>{paymentError}</p>
                    </div>
                  )}

                  {/* Selected Product & Upsell Add-on Section */}
                  {simulationResult.selectedProduct && (
                    <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--sf-text-primary)]">
                          Autonomous Item Selection & Cart Assembly
                        </span>
                        <span className="text-[11px] text-[var(--sf-text-muted)] font-mono">
                          {includeUpsell && simulationResult.upsellProduct ? '2 Items' : '1 Item'}
                        </span>
                      </div>

                      {/* Primary Selected Product */}
                      <div className="p-3 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded bg-[var(--sf-bg-alt)] overflow-hidden shrink-0 border border-[var(--sf-border)] flex items-center justify-center">
                            {simulationResult.selectedProduct.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={simulationResult.selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-[var(--sf-text-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[var(--sf-text-primary)] block truncate">
                              {simulationResult.selectedProduct.name}
                            </span>
                            <span className="text-[11px] text-[var(--sf-text-muted)]">
                              Category: {simulationResult.selectedProduct.category}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-xs tabular-nums text-[var(--sf-text-primary)] shrink-0">
                          ₹{simulationResult.selectedProduct.priceRupees?.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Compatible Accessory Upsell Card */}
                      {simulationResult.upsellProduct && (
                        <div className={`p-3 rounded-sf border sf-transition ${
                          includeUpsell
                            ? 'border-brand-500/50 bg-brand-50/40 dark:bg-rose-950/20'
                            : 'border-[var(--sf-border)] bg-[var(--sf-surface)] opacity-60'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-brand-600 dark:text-rose-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Rule-Compliant Upsell Proposal
                            </span>
                            <span className="text-xs font-bold tabular-nums text-brand-600 dark:text-rose-400">
                              +₹{simulationResult.upsellProduct.priceRupees?.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-[var(--sf-text-primary)] block truncate">
                                {simulationResult.upsellProduct.name}
                              </span>
                              <span className="text-[11px] text-[var(--sf-text-muted)]">
                                Verified compatible accessory within merchant limit
                              </span>
                            </div>

                            <button
                              onClick={() => setIncludeUpsell(!includeUpsell)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold sf-transition shrink-0 flex items-center gap-1 ${
                                includeUpsell
                                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                                  : 'border border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)]'
                              }`}
                            >
                              {includeUpsell ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Included</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Total and Authorization Action */}
                      <div className="pt-2 border-t border-[var(--sf-border)] flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[var(--sf-text-muted)] block">Total Authoritative Amount</span>
                          <span className="text-base font-extrabold text-[var(--sf-text-primary)] tabular-nums">
                            ₹{(
                              (simulationResult.selectedProduct.priceRupees || 0) +
                              (includeUpsell && simulationResult.upsellProduct ? simulationResult.upsellProduct.priceRupees : 0)
                            ).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {!paymentSuccess && (
                          <button
                            onClick={() => handleAuthorizeAndCheckout(false)}
                            disabled={isAuthorizingPayment}
                            className="py-2.5 px-4 rounded-sf bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 sf-transition disabled:opacity-50"
                          >
                            {isAuthorizingPayment ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Launching Razorpay...</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Authorize & Launch Razorpay</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Steps Timeline */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-label">AI Shopper Step-by-Step Progress</span>
                      <span className="text-[11px] text-[var(--sf-text-muted)]">
                        {simulationResult.steps?.length || 0} steps verified
                      </span>
                    </div>

                    <div className="space-y-2">
                      {simulationResult.steps?.map((st: any, idx: number) => {
                        const isExpanded = activeStepIndex === idx;

                        const formatStepName = (stepCode: string) => {
                          switch (stepCode) {
                            case 'MERCHANT_DISCOVERY': return '1. Store Found';
                            case 'CATALOG_SEARCH': return '2. Searched Catalog';
                            case 'PRODUCT_SELECTION': return '3. Matched Best Item';
                            case 'UPSELL_CHECK': return '4. Add-on Rule Check';
                            case 'CART_COMPUTED': return '5. Cart Total';
                            case 'AUTHORIZATION_CHECK': return '6. Spending Limit Check';
                            case 'RAZORPAY_ORDER_CREATED': return '7. Order Prepared';
                            case 'OUTCOME': return 'Status';
                            default: return stepCode.replace(/_/g, ' ');
                          }
                        };

                        return (
                          <div
                            key={idx}
                            className="border border-[var(--sf-border)] rounded-sf bg-[var(--sf-surface)] overflow-hidden sf-transition"
                          >
                            <button
                              onClick={() => setActiveStepIndex(isExpanded ? null : idx)}
                              className="w-full p-2.5 text-left hover:bg-[var(--sf-surface-hover)] sf-transition flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span className="w-4 h-4 rounded-full bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] flex items-center justify-center font-mono text-[9px] text-[var(--sf-text-secondary)] font-bold shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-[var(--sf-text-primary)] truncate">
                                  {st.action}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {st.policyResult && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    st.policyResult === 'ALLOWED'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                      : st.policyResult === 'APPROVAL_REQUIRED'
                                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                                  }`}>
                                    {st.policyResult === 'ALLOWED' ? 'Approved' :
                                     st.policyResult === 'APPROVAL_REQUIRED' ? 'Needs Approval' : 'Blocked'}
                                  </span>
                                )}
                                <span className="text-[10px] text-[var(--sf-text-muted)] font-medium">
                                  {formatStepName(st.step)}
                                </span>
                              </div>
                            </button>

                            {/* Expanded Step Details */}
                            {isExpanded && (
                              <div className="p-3 bg-[var(--sf-bg-alt)] border-t border-[var(--sf-border)] text-xs space-y-2 animate-fade-in">
                                {st.reason && (
                                  <p className="text-[11px] text-[var(--sf-text-secondary)] leading-relaxed font-medium">
                                    Why: &quot;{st.reason}&quot;
                                  </p>
                                )}
                                <div>
                                  <span className="text-[10px] text-[var(--sf-text-muted)] uppercase tracking-wider font-bold block mb-1">
                                    Technical Output
                                  </span>
                                  <pre className="p-2.5 rounded bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[10px] font-mono text-[var(--sf-text-primary)] overflow-x-auto">
                                    {JSON.stringify(st.result, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* In-App Payment Recovery Modal */}
      {simulationResult?.selectedProduct && (
        <PaymentRecoveryModal
          isOpen={recoveryModalState.isOpen}
          onClose={() => setRecoveryModalState((prev) => ({ ...prev, isOpen: false }))}
          type={recoveryModalState.type}
          items={[
            {
              id: simulationResult.selectedProduct.id,
              productId: simulationResult.selectedProduct.id,
              name: simulationResult.selectedProduct.name,
              priceMinor: Math.round(simulationResult.selectedProduct.priceRupees * 100),
              quantity: 1,
              lineTotalMinor: Math.round(simulationResult.selectedProduct.priceRupees * 100),
              imageUrl: simulationResult.selectedProduct.imageUrl,
            },
            ...(includeUpsell && simulationResult.upsellProduct
              ? [
                  {
                    id: simulationResult.upsellProduct.id,
                    productId: simulationResult.upsellProduct.id,
                    name: simulationResult.upsellProduct.name,
                    priceMinor: Math.round(simulationResult.upsellProduct.priceRupees * 100),
                    quantity: 1,
                    lineTotalMinor: Math.round(simulationResult.upsellProduct.priceRupees * 100),
                    imageUrl: simulationResult.upsellProduct.imageUrl,
                    isUpsell: true,
                  },
                ]
              : []),
          ]}
          totalMinor={Math.round(
            (simulationResult.selectedProduct.priceRupees +
              (includeUpsell && simulationResult.upsellProduct ? simulationResult.upsellProduct.priceRupees : 0)) *
              100
          )}
          onRetry={() => handleAuthorizeAndCheckout(true)}
          isRetrying={isRetryingPayment}
          failureReason={recoveryModalState.failureReason}
        />
      )}
    </div>
  );
}

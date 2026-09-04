'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Database,
  Cpu,
  User,
  Bot,
  Search,
  Check,
  Code2,
  Eye,
  ShoppingBag,
  CreditCard,
  HelpCircle,
  Lock,
  Zap,
} from 'lucide-react';

interface AIActionItem {
  id: string;
  actionType: string;
  requestedBy: string;
  reason: string;
  confidence: number | null;
  policyResult: string;
  executionStatus: string;
  inputSnapshot: any;
  outputSnapshot: any;
  createdAt: string;
}

interface AgentDecisionsManagerProps {
  initialActions: AIActionItem[];
  merchantSlug: string;
}

export const AgentDecisionsManager: React.FC<AgentDecisionsManagerProps> = ({
  initialActions,
  merchantSlug,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'AI_BUYER' | 'STOREFRONT' | 'BLOCKED'>('ALL');
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'TECHNICAL'>('SIMPLE');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredActions = useMemo(() => {
    return initialActions.filter((act) => {
      // Tab filter
      if (filterTab === 'AI_BUYER') {
        const isAgent = act.reason.toLowerCase().includes('ai buyer') ||
          (act.inputSnapshot && typeof act.inputSnapshot === 'object' && 'agentName' in act.inputSnapshot);
        if (!isAgent) return false;
      } else if (filterTab === 'STOREFRONT') {
        const isAgent = act.reason.toLowerCase().includes('ai buyer') ||
          (act.inputSnapshot && typeof act.inputSnapshot === 'object' && 'agentName' in act.inputSnapshot);
        if (isAgent) return false;
      } else if (filterTab === 'BLOCKED') {
        if (act.policyResult !== 'BLOCKED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReason = act.reason.toLowerCase().includes(q);
        const matchesType = act.actionType.toLowerCase().includes(q);
        const matchesActor = act.requestedBy.toLowerCase().includes(q);
        const matchesId = act.id.toLowerCase().includes(q);
        return matchesReason || matchesType || matchesActor || matchesId;
      }

      return true;
    });
  }, [initialActions, filterTab, searchQuery]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    if (!mounted) {
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getAgentName = (act: AIActionItem) => {
    if (act.inputSnapshot && typeof act.inputSnapshot === 'object' && act.inputSnapshot.agentName) {
      return act.inputSnapshot.agentName;
    }
    const match = act.reason.match(/AI Buyer "(.*?)"/i) || act.reason.match(/AI Buyer \((.*?)\)/i);
    if (match) return match[1];
    return null;
  };

  // Human-friendly title
  const getHumanTitle = (act: AIActionItem) => {
    const agentName = getAgentName(act);
    if (agentName) {
      if (act.actionType === 'CHECKOUT_REQUEST') {
        return `${agentName} created a checkout transaction`;
      }
      return `${agentName} evaluated merchant catalog`;
    }

    switch (act.actionType) {
      case 'UPSELL':
        return 'Suggested a complementary add-on item';
      case 'RECOMMEND':
        return 'Recommended products matching shopper request';
      case 'CHECKOUT_REQUEST':
        return 'Calculated cart total and prepared checkout';
      case 'CART_UPDATE':
        return 'Added selected item to customer cart';
      case 'PAYMENT_RECOVERY_OFFERED':
        return 'Presented In-App Payment Recovery Modal';
      case 'PAYMENT_RECOVERY_RETRIED':
        return 'Customer Retried Payment via Recovery Modal';
      default:
        return 'AI Sales Assistant Decision';
    }
  };

  // Structured "Why did the AI do this?" breakdown
  const getWhyExplanation = (act: AIActionItem) => {
    const isBlocked = act.policyResult === 'BLOCKED';
    const isUpsell = act.actionType === 'UPSELL' || act.reason.toLowerCase().includes('upsell');
    const isAgent = Boolean(getAgentName(act));

    if (isBlocked) {
      return {
        title: 'Why was this blocked by policy?',
        points: [
          'The order or proposed item exceeded the merchant\'s configured spending or ratio limits.',
          'Zero money was moved. No Razorpay order was generated.',
          'An immutable audit event was recorded in PostgreSQL.',
        ],
        badge: 'Protected by Policy',
        variant: 'blocked',
      };
    }

    if (isAgent) {
      return {
        title: 'Why this AI Buyer Transaction?',
        points: [
          'The autonomous buyer matched catalog products strictly within the customer\'s budget.',
          'Merchant spending ceiling and customer confirmation gates were deterministically verified.',
          'Server-authoritative cart and Razorpay test order were generated with zero price spoofing.',
        ],
        badge: 'Verified Protocol',
        variant: 'agent',
      };
    }

    if (isUpsell) {
      return {
        title: 'Why this complementary add-on?',
        points: [
          'Item is a verified compatible accessory with confirmed stock in inventory.',
          'Price is strictly within the merchant\'s maximum automatic upsell cap (≤50% of base item).',
          'Customer retained full choice to accept or decline the add-on before checkout.',
        ],
        badge: 'Policy Compliant',
        variant: 'upsell',
      };
    }

    return {
      title: 'Why this recommendation?',
      points: [
        'Matched natural language query intent and budget constraints from active PostgreSQL catalog.',
        'Filtered for in-stock active inventory only.',
      ],
      badge: 'Grounded in DB',
      variant: 'general',
    };
  };

  return (
    <div className="space-y-6">
      {/* Agent Identity & Permission Boundary Matrix Banner */}
      <div className="p-5 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)] shadow-sf">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--sf-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot className="w-4 h-4 text-brand-600 dark:text-rose-400" />
              <h2 className="text-sm font-bold text-[var(--sf-text-primary)]">
                AI Buyer Agent Permissions & Boundary Matrix
              </h2>
            </div>
            <p className="text-xs text-[var(--sf-text-muted)]">
              External AI buyers transact strictly within deterministic merchant guardrails.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gated & Non-Custodial</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
          {/* What AI Agents CAN DO */}
          <div className="p-3 rounded-sf bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>What AI Buyers CAN Do (Machine Protocol)</span>
            </span>
            <ul className="space-y-1.5 text-[11px] text-emerald-900/90 dark:text-emerald-300/80">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Discover catalog via authenticated <code className="font-mono">GET /api/agent/catalog</code></span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Search products using natural language and budget limits</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Select best-matching products and request policy-checked upsells</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Construct authoritative database carts and request Razorpay orders</span>
              </li>
            </ul>
          </div>

          {/* What AI Agents CANNOT DO */}
          <div className="p-3 rounded-sf bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
            <span className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>What AI Buyers CANNOT Do (Enforced Security)</span>
            </span>
            <ul className="space-y-1.5 text-[11px] text-rose-900/90 dark:text-rose-300/80">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Cannot alter merchant policies or autonomous spending ceilings</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Cannot access Razorpay secret keys or internal merchant credentials</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Cannot modify product catalog prices (server recomputes in paise)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Cannot mark transactions as paid without server cryptographic proof</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Controls: Search, Tabs, and View Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-full bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-xs overflow-x-auto">
          {[
            { id: 'ALL', label: `All Activity (${initialActions.length})` },
            {
              id: 'AI_BUYER',
              label: `AI Shoppers (${initialActions.filter((a) => a.reason.toLowerCase().includes('ai buyer') || (a.inputSnapshot?.agentName)).length})`,
            },
            {
              id: 'STOREFRONT',
              label: `Storefront Chat`,
            },
            {
              id: 'BLOCKED',
              label: `Policy Protected (${initialActions.filter((a) => a.policyResult === 'BLOCKED').length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full font-medium sf-transition shrink-0 ${
                filterTab === tab.id
                  ? 'bg-[var(--sf-surface)] text-[var(--sf-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Simple vs Technical View Toggle */}
          <div className="flex items-center p-1 rounded-full bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-xs shrink-0">
            <button
              onClick={() => setViewMode('SIMPLE')}
              className={`px-3 py-1 rounded-full font-medium sf-transition flex items-center gap-1.5 ${
                viewMode === 'SIMPLE'
                  ? 'bg-[var(--sf-surface)] text-[var(--sf-text-primary)] font-semibold shadow-xs text-brand-600 dark:text-rose-400'
                  : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simple View</span>
            </button>
            <button
              onClick={() => setViewMode('TECHNICAL')}
              className={`px-3 py-1 rounded-full font-medium sf-transition flex items-center gap-1.5 ${
                viewMode === 'TECHNICAL'
                  ? 'bg-[var(--sf-surface)] text-[var(--sf-text-primary)] font-semibold shadow-xs text-brand-600 dark:text-rose-400'
                  : 'text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer / API</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activity..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-[var(--sf-surface)] border border-[var(--sf-border)] text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 sf-transition"
            />
          </div>
        </div>
      </div>

      {/* Decisions List */}
      {filteredActions.length === 0 ? (
        <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-8 text-center space-y-3 shadow-sf">
          <Bot className="w-10 h-10 stroke-[1.2] mx-auto text-[var(--sf-text-muted)]" />
          <p className="text-sm font-medium text-[var(--sf-text-primary)]">No activity matching your search</p>
          <p className="text-xs text-[var(--sf-text-muted)] max-w-sm mx-auto">
            Try a different filter or run a test query on the storefront chat or AI buyer demo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((act) => {
            const isAllowed = act.policyResult === 'ALLOWED';
            const isBlocked = act.policyResult === 'BLOCKED';
            const agentName = getAgentName(act);
            const isExpanded = expandedId === act.id;
            const why = getWhyExplanation(act);

            return (
              <div
                key={act.id}
                className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-5 hover:border-[var(--sf-border-hover)] sf-transition shadow-sf space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Persona / Title */}
                    {agentName ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-rose-950/40 text-brand-700 dark:text-rose-300 border border-brand-200/70 dark:border-rose-900/50">
                        <Bot className="w-3.5 h-3.5" />
                        <span>{agentName}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-[var(--sf-text-primary)] border border-[var(--sf-border)]">
                        <Sparkles className="w-3 h-3 text-brand-600 dark:text-rose-400" />
                        <span>{viewMode === 'SIMPLE' ? 'Store Assistant' : act.actionType}</span>
                      </span>
                    )}

                    {/* Policy Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isAllowed
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : isBlocked
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isAllowed ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{viewMode === 'SIMPLE' ? 'Within Store Rules' : 'ALLOWED'}</span>
                        </>
                      ) : isBlocked ? (
                        <>
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>{viewMode === 'SIMPLE' ? 'Blocked by Policy' : 'BLOCKED'}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>{viewMode === 'SIMPLE' ? 'Awaiting Customer Confirmation' : 'APPROVAL_REQUIRED'}</span>
                        </>
                      )}
                    </span>

                    {/* Technical details in tech mode */}
                    {viewMode === 'TECHNICAL' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--sf-text-muted)] font-mono">
                        {act.requestedBy === 'AI' ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>actor: {act.requestedBy}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--sf-text-muted)] shrink-0">
                    <Clock className="w-3 h-3" />
                    <span suppressHydrationWarning>{formatTime(act.createdAt)}</span>
                  </div>
                </div>

                {/* Primary Narrative Box */}
                <div className="p-3.5 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--sf-text-primary)]">
                    {getHumanTitle(act)}
                  </p>
                  <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed">
                    {act.reason}
                  </p>

                  {/* Clean Product / Amount summary */}
                  {act.outputSnapshot && typeof act.outputSnapshot === 'object' && act.outputSnapshot.cartTotalMinor && (
                    <div className="pt-2 flex items-center gap-3 border-t border-[var(--sf-border-light)] text-[11px]">
                      <span className="text-[var(--sf-text-muted)]">Calculated Total:</span>
                      <span className="font-bold text-[var(--sf-text-primary)] tabular-nums">
                        ₹{(act.outputSnapshot.cartTotalMinor / 100).toLocaleString('en-IN')}
                      </span>
                      {act.outputSnapshot.razorpayOrderId && (
                        <span className="text-[var(--sf-text-muted)] font-mono text-[10px]">
                          Razorpay Order: {act.outputSnapshot.razorpayOrderId}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Structured "Why did the AI do this?" Explanation Panel */}
                <div className="p-3.5 rounded-sf bg-[var(--sf-surface)] border border-[var(--sf-border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--sf-text-primary)] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-brand-600 dark:text-rose-400" />
                      <span>{why.title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--sf-text-muted)] uppercase tracking-wider">
                      {why.badge}
                    </span>
                  </div>

                  <ul className="space-y-1 text-[11px] text-[var(--sf-text-secondary)] pl-1">
                    {why.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-brand-600 dark:text-rose-400 font-bold shrink-0">·</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Collapsible Technical Details / JSON */}
                {(act.inputSnapshot || act.outputSnapshot) && (
                  <div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : act.id)}
                      className="text-[11px] text-[var(--sf-text-muted)] hover:text-brand-600 dark:hover:text-rose-400 sf-transition select-none font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Raw Technical Data' : 'View Technical Details & Data Proof'}</span>
                      <ArrowRight className={`w-3 h-3 sf-transition ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-[var(--sf-border-light)] animate-fade-in">
                        {act.inputSnapshot && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">
                              Input Context Snapshot (JSON)
                            </span>
                            <pre className="p-2.5 rounded bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] font-mono text-[10px] text-[var(--sf-text-secondary)] overflow-x-auto">
                              {JSON.stringify(act.inputSnapshot, null, 2)}
                            </pre>
                          </div>
                        )}
                        {act.outputSnapshot && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--sf-text-muted)] block mb-1">
                              Execution Result Snapshot (JSON)
                            </span>
                            <pre className="p-2.5 rounded bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] font-mono text-[10px] text-[var(--sf-text-secondary)] overflow-x-auto">
                              {JSON.stringify(act.outputSnapshot, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

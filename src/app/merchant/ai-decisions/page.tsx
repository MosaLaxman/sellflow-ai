import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { AgentDecisionsManager } from '@/components/merchant/AgentDecisionsManager';
import { MerchantCapabilityCard } from '@/components/merchant/MerchantCapabilityCard';

export const dynamic = 'force-dynamic';

export default async function AIDecisionsPage() {
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
    include: { policy: true },
  });

  if (!merchant) return null;

  const actions = await prisma.aIAction.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const totalActions = actions.length;
  const allowedCount = actions.filter((a) => a.policyResult === 'ALLOWED').length;
  const blockedCount = actions.filter((a) => a.policyResult === 'BLOCKED').length;
  const upsellsCount = actions.filter((a) => a.actionType === 'UPSELL').length;
  const aiBuyerCount = actions.filter(
    (a) => a.reason.toLowerCase().includes('ai buyer') || (a.inputSnapshot && (a.inputSnapshot as any).agentName)
  ).length;

  const serializedActions = actions.map((a) => ({
    id: a.id,
    actionType: a.actionType,
    requestedBy: a.requestedBy,
    reason: a.reason,
    confidence: a.confidence,
    policyResult: a.policyResult,
    executionStatus: a.executionStatus,
    inputSnapshot: a.inputSnapshot,
    outputSnapshot: a.outputSnapshot,
    createdAt: a.createdAt.toISOString(),
  }));

  const policy = merchant.policy;

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={merchant.slug} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-rose-950/40 border border-brand-200/60 dark:border-rose-900/40 text-brand-600 dark:text-rose-400 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            AI Transaction Center · Zero Black-Box Money Movement
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--sf-text-primary)] tracking-tight">
            AI Transaction & Decision Center
          </h1>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)] max-w-2xl">
            Audit every autonomous recommendation, AI buyer cart creation, and policy-gated Razorpay checkout transaction in full chronological detail.
          </p>
        </div>

        {/* Merchant Agent Capability Card with Interactive Edit Ceiling Button */}
        <MerchantCapabilityCard initialPolicy={policy} merchantSlug={merchant.slug} />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)]">
            <p className="sf-label mb-1">Total Actions</p>
            <p className="sf-metric-default">{totalActions}</p>
            <p className="text-[11px] text-[var(--sf-text-muted)] mt-0.5">Audit-grounded ledger</p>
          </div>

          <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)]">
            <p className="sf-label mb-1">AI Shopper Transactions</p>
            <p className="sf-metric-default text-brand-600 dark:text-rose-400">{aiBuyerCount}</p>
            <p className="text-[11px] text-[var(--sf-text-muted)] mt-0.5">External machine buyers</p>
          </div>

          <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)]">
            <p className="sf-label mb-1">Within Store Rules</p>
            <p className="sf-metric-default text-emerald-600 dark:text-emerald-400">{allowedCount}</p>
            <p className="text-[11px] text-[var(--sf-text-muted)] mt-0.5">
              {totalActions > 0 ? ((allowedCount / totalActions) * 100).toFixed(0) : 100}% compliance rate
            </p>
          </div>

          <div className="p-4 rounded-sf-lg border border-[var(--sf-border)] bg-[var(--sf-surface)]">
            <p className="sf-label mb-1">Protected by Policy</p>
            <p className="sf-metric-default text-red-600 dark:text-red-400">{blockedCount}</p>
            <p className="text-[11px] text-[var(--sf-text-muted)] mt-0.5">Over-limit transactions stopped</p>
          </div>
        </div>

        {/* Action Decision Feed with Interactive Filters */}
        <AgentDecisionsManager initialActions={serializedActions} merchantSlug={merchant.slug} />
      </main>
    </div>
  );
}

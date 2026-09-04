import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function RazorpaySettingsPage() {
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
  });

  if (!merchant) return null;

  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_sellflow';
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const hasWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  const webhookUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/webhooks/razorpay`;

  const credentials = [
    { label: 'Key ID', value: keyId, status: 'Configured', statusVariant: 'success' as const },
    { label: 'Key Secret', value: '••••••••••••••••', status: hasSecret ? 'Protected' : 'Missing', statusVariant: hasSecret ? 'success' as const : 'error' as const },
    { label: 'Webhook URL', value: webhookUrl, status: 'POST endpoint', statusVariant: 'neutral' as const },
    { label: 'Webhook Secret', value: '••••••••••••••••', status: hasWebhookSecret ? 'Active' : 'Default', statusVariant: hasWebhookSecret ? 'success' as const : 'warning' as const },
  ];

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={merchant.slug} />

      <main className="max-w-screen-sm mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Razorpay</h1>
            <StatusBadge variant="warning">Test Mode</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
            Payment gateway credentials and webhook configuration.
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-4 border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] mb-6">
          <div className="w-2 h-2 rounded-full bg-[var(--sf-success)]" />
          <div>
            <p className="text-sm font-medium text-[var(--sf-text-primary)]">Orders & Checkout Ready</p>
            <p className="text-[12px] text-[var(--sf-text-muted)]">
              Test mode credentials configured via environment variables.
            </p>
          </div>
        </div>

        {/* Credentials */}
        <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] divide-y divide-[var(--sf-border-light)]">
          {credentials.map((cred) => (
            <div key={cred.label} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-label">{cred.label}</span>
                <StatusBadge variant={cred.statusVariant}>{cred.status}</StatusBadge>
              </div>
              <p className="font-mono text-sm text-[var(--sf-text-primary)] truncate">{cred.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

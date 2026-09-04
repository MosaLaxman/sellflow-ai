import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { MerchantNav } from '@/components/merchant/MerchantNav';
import { EmptyState } from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const merchant = await prisma.merchant.findFirst({
    where: { slug: 'apex-sports' },
  });

  if (!merchant) return null;

  const logs = await prisma.auditLog.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <MerchantNav merchantSlug={merchant.slug} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] tracking-tight">Audit Trail</h1>
          <p className="mt-1 text-sm text-[var(--sf-text-muted)]">
            Immutable compliance log · {logs.length} events
          </p>
        </div>

        <div className="border border-[var(--sf-border)] rounded-sf-lg overflow-hidden bg-[var(--sf-surface)]">
          {logs.length === 0 ? (
            <EmptyState
              title="Audit trail is empty."
              description="Operational events and policy decisions will be recorded here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--sf-border)]">
                    <th className="py-3 px-4 text-label font-medium">Time</th>
                    <th className="py-3 px-4 text-label font-medium">Actor</th>
                    <th className="py-3 px-4 text-label font-medium">Event</th>
                    <th className="py-3 px-4 text-label font-medium">Entity</th>
                    <th className="py-3 px-4 text-label font-medium">Action & Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sf-border-light)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--sf-surface-hover)] sf-transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--sf-text-muted)] whitespace-nowrap" suppressHydrationWarning>
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--sf-text-secondary)]">
                        {log.actorType}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--sf-text-primary)] whitespace-nowrap">
                        {log.eventType}
                      </td>
                      <td className="py-3 px-4 text-[var(--sf-text-muted)] font-mono text-[11px] whitespace-nowrap">
                        {log.entityType}: {log.entityId.substring(0, 8)}…
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--sf-text-primary)] block">{log.action}</span>
                        <span className="text-[var(--sf-text-secondary)] block mt-0.5">{log.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

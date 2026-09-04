import React from 'react';
import { TopNav } from '@/components/merchant/TopNav';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--sf-bg)]">
      <TopNav merchantSlug="apex-sports" />
      {children}
    </div>
  );
}

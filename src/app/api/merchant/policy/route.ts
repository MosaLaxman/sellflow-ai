import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      maxAutomaticUpsellPercentage,
      maxAutonomousOrderAmountRupees,
      allowUpsell,
      allowCrossSell,
      requireCustomerConfirmation,
      maxProductsPerRecommendation,
    } = body;

    const merchant = await prisma.merchant.findFirst({
      where: { slug: 'apex-sports' },
    });

    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const maxAutonomousOrderAmount =
      typeof maxAutonomousOrderAmountRupees === 'number'
        ? Math.round(maxAutonomousOrderAmountRupees * 100)
        : undefined;

    const updated = await prisma.merchantPolicy.upsert({
      where: { merchantId: merchant.id },
      update: {
        maxAutomaticUpsellPercentage:
          typeof maxAutomaticUpsellPercentage === 'number' ? maxAutomaticUpsellPercentage : undefined,
        maxAutonomousOrderAmount,
        allowUpsell: typeof allowUpsell === 'boolean' ? allowUpsell : undefined,
        allowCrossSell: typeof allowCrossSell === 'boolean' ? allowCrossSell : undefined,
        requireCustomerConfirmation:
          typeof requireCustomerConfirmation === 'boolean' ? requireCustomerConfirmation : undefined,
        maxProductsPerRecommendation:
          typeof maxProductsPerRecommendation === 'number' ? maxProductsPerRecommendation : undefined,
      },
      create: {
        merchantId: merchant.id,
        maxAutomaticUpsellPercentage: maxAutomaticUpsellPercentage || 50.0,
        maxAutonomousOrderAmount: maxAutonomousOrderAmount || 1000000,
        allowUpsell: allowUpsell ?? true,
        allowCrossSell: allowCrossSell ?? true,
        requireCustomerConfirmation: requireCustomerConfirmation ?? true,
        maxProductsPerRecommendation: maxProductsPerRecommendation || 3,
      },
    });

    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'MERCHANT',
      eventType: 'POLICY_UPDATED',
      entityType: 'Policy',
      entityId: updated.id,
      action: 'Updated merchant AI and risk policy',
      reason: 'Merchant modified policy parameters via dashboard settings',
      metadata: {
        maxAutomaticUpsellPercentage: updated.maxAutomaticUpsellPercentage,
        maxAutonomousOrderAmount: updated.maxAutonomousOrderAmount,
        requireCustomerConfirmation: updated.requireCustomerConfirmation,
      },
    });

    return NextResponse.json({ success: true, policy: updated });
  } catch (error) {
    console.error('[API merchant policy POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

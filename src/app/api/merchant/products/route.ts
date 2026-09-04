import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AuditLogger } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      category,
      priceRupees,
      mrpRupees,
      stockQuantity,
      imageUrl,
      tags,
      useCases,
      relatedProductId,
      attributes = {},
    } = body;

    if (!name || !description || !category || typeof priceRupees !== 'number') {
      return NextResponse.json({ error: 'Missing required product fields' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug: 'apex-sports' },
    });

    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const priceMinor = Math.round(priceRupees * 100);
    const parsedMrp = mrpRupees ? Math.round(Number(mrpRupees)) : undefined;

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string'
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const parsedUseCases = Array.isArray(useCases)
      ? useCases
      : typeof useCases === 'string'
      ? useCases.split(',').map((u: string) => u.trim()).filter(Boolean)
      : [];

    const productAttributes = {
      ...(typeof attributes === 'object' && attributes !== null ? attributes : {}),
      ...(parsedMrp ? { mrpRupees: parsedMrp, originalPriceRupees: parsedMrp } : {}),
    };

    const product = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        priceMinor,
        currency: 'INR',
        stockQuantity: Number(stockQuantity) || 0,
        imageUrl: imageUrl?.trim() || null,
        tags: parsedTags,
        useCases: parsedUseCases,
        attributes: productAttributes,
        status: 'ACTIVE',
      },
    });

    // Create relation if specified
    if (relatedProductId) {
      await prisma.productRelation.create({
        data: {
          merchantId: merchant.id,
          productId: product.id,
          relatedProductId,
          relationType: 'COMPATIBLE_ACCESSORY',
          confidence: 0.95,
        },
      });
    }

    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'MERCHANT',
      eventType: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      action: 'Merchant created new product',
      reason: `Created "${product.name}" in category "${product.category}" at ₹${priceRupees}`,
      metadata: { priceMinor, stockQuantity: product.stockQuantity },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('[API merchant products POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      category,
      priceRupees,
      mrpRupees,
      stockQuantity,
      imageUrl,
      tags,
      useCases,
      status,
      attributes = {},
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required for update' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug: 'apex-sports' },
    });

    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const existing = await prisma.product.findFirst({
      where: { id, merchantId: merchant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const priceMinor = typeof priceRupees === 'number' ? Math.round(priceRupees * 100) : existing.priceMinor;
    const parsedMrp = mrpRupees ? Math.round(Number(mrpRupees)) : undefined;

    const parsedTags = tags !== undefined
      ? Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []
      : existing.tags;

    const parsedUseCases = useCases !== undefined
      ? Array.isArray(useCases)
        ? useCases
        : typeof useCases === 'string'
        ? useCases.split(',').map((u: string) => u.trim()).filter(Boolean)
        : []
      : existing.useCases;

    const existingAttributes = (existing.attributes as Record<string, any>) || {};
    const productAttributes = {
      ...existingAttributes,
      ...(typeof attributes === 'object' && attributes !== null ? attributes : {}),
      ...(parsedMrp !== undefined ? { mrpRupees: parsedMrp, originalPriceRupees: parsedMrp } : {}),
    };

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description.trim() : existing.description,
        category: category !== undefined ? category.trim() : existing.category,
        priceMinor,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
        imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : existing.imageUrl,
        tags: parsedTags,
        useCases: parsedUseCases,
        attributes: productAttributes,
        status: status || existing.status,
      },
    });

    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'MERCHANT',
      eventType: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: updated.id,
      action: 'Merchant updated product catalog record',
      reason: `Updated "${updated.name}" — Price: ₹${updated.priceMinor / 100}, Stock: ${updated.stockQuantity}, Category: ${updated.category}`,
      metadata: { previousPriceMinor: existing.priceMinor, newPriceMinor: updated.priceMinor, stock: updated.stockQuantity },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error('[API merchant products PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { slug: 'apex-sports' },
    });

    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

    const existing = await prisma.product.findFirst({
      where: { id, merchantId: merchant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found or does not belong to merchant' }, { status: 404 });
    }

    // Delete product (cascades relations and cart items)
    await prisma.product.delete({
      where: { id: existing.id },
    });

    await AuditLogger.log({
      merchantId: merchant.id,
      actorType: 'MERCHANT',
      eventType: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: existing.id,
      action: 'Merchant deleted product',
      reason: `Deleted "${existing.name}" (ID: ${existing.id}) from catalog`,
      metadata: { deletedName: existing.name, deletedPriceMinor: existing.priceMinor },
    });

    return NextResponse.json({ success: true, deletedId: existing.id });
  } catch (error) {
    console.error('[API merchant products DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface AuditEventParams {
  merchantId: string;
  actorType: 'MERCHANT' | 'CUSTOMER' | 'AI' | 'SYSTEM';
  actorId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface AIActionParams {
  merchantId: string;
  conversationId?: string;
  orderId?: string;
  actionType: 'RECOMMEND' | 'UPSELL' | 'CART_UPDATE' | 'CHECKOUT_REQUEST' | 'DISCOUNT';
  requestedBy: 'AI' | 'USER' | 'SYSTEM';
  reason: string;
  confidence?: number;
  policyResult: 'ALLOWED' | 'BLOCKED' | 'APPROVAL_REQUIRED';
  executionStatus: 'EXECUTED' | 'REJECTED' | 'FAILED';
  inputSnapshot?: Record<string, unknown>;
  outputSnapshot?: Record<string, unknown>;
}

export class AuditLogger {
  /**
   * Writes an immutable audit trail entry.
   */
  static async log(params: AuditEventParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          merchantId: params.merchantId,
          actorType: params.actorType,
          actorId: params.actorId,
          eventType: params.eventType,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          reason: params.reason,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (error) {
      console.error('[AuditLogger] Failed to persist audit log:', error);
      return null;
    }
  }

  /**
   * Records a structured AI decision/action with policy evaluation context.
   */
  static async recordAIAction(params: AIActionParams) {
    try {
      return await prisma.aIAction.create({
        data: {
          merchantId: params.merchantId,
          conversationId: params.conversationId,
          orderId: params.orderId,
          actionType: params.actionType,
          requestedBy: params.requestedBy,
          reason: params.reason,
          confidence: params.confidence,
          policyResult: params.policyResult,
          executionStatus: params.executionStatus,
          inputSnapshot: params.inputSnapshot ? (params.inputSnapshot as Prisma.InputJsonValue) : undefined,
          outputSnapshot: params.outputSnapshot ? (params.outputSnapshot as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (error) {
      console.error('[AuditLogger] Failed to persist AI action:', error);
      return null;
    }
  }
}

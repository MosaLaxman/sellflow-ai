# SellFlow AI — External AI Buyer Developer Integration Guide

This directory provides a ready-to-run developer example of how an external, independent AI Agent (e.g. *TravelPlanner AI*, *GiftFinder AI*, *MarathonCoach AI*) programmatically discovers, negotiates, and transacts with a SellFlow-enabled merchant.

---

## The 10-Step Agentic Commerce Protocol

```
1. Authenticate Agent (Bearer Token)
        ↓
2. Discover Merchant & Policy Boundaries (`GET /api/agent/catalog?merchant=apex-sports`)
        ↓
3. Natural Language Search (`GET /api/agent/catalog?query=running+shoes&priceMax=4000`)
        ↓
4. Select Best Match Product
        ↓
5. Evaluate Policy-Controlled Add-on Upsell
        ↓
6. Check Merchant Autonomous Ceiling & Confirmation Gating
        ↓
7. Build Authoritative Server Cart (`POST /api/agent/buyer`)
        ↓
8. Receive Authoritative Razorpay Test Order
        ↓
9. Launch Razorpay Checkout Modal
        ↓
10. Webhook Verification & Immutable Settlement in PostgreSQL
```

---

## Quickstart: Running the Sample Agent

### 1. Make a Discovery Call
```bash
curl -X GET "http://localhost:3000/api/agent/catalog?merchant=apex-sports&query=shoes&priceMax=5000" \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

### 2. Request a Gated AI Transaction
```bash
curl -X POST "http://localhost:3000/api/agent/buyer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d @sample_request.json
```

### 3. Run the TypeScript Client
```bash
npx tsx examples/external-ai-buyer/agent_buyer_client.ts
```

---

## Protocol Security & Guardrails

1. **Zero Black-Box Transactions**: Every transaction is bounded by the merchant's spending ceiling and requires explicit customer confirmation.
2. **Server-Authoritative Pricing**: Minor-unit pricing in paise is computed by PostgreSQL; client amounts are untrusted.
3. **Immutable Audit Ledger**: All decisions, steps, and outcomes are permanently logged in the PostgreSQL `AIAction` and `AuditLog` tables.

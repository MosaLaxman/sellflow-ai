# SellFlow AI — Coding Agent Policy & Guardrails

## 1. Core Operating Directive
Every AI coding agent modifying this repository must treat `/PROJECT.md` as the single source of truth. Do not innovate outside the bounds of the product constitution or weaken existing safety, payment, security, or data guarantees.

---

## 2. Before Every Meaningful Change
1. **Read `/PROJECT.md` completely** and identify all relevant sections pertaining to the change.
2. **Review forbidden implementations** to ensure no antipatterns are introduced.
3. **Make the smallest, production-sensible change** that cleanly advances the phase.
4. **Test and verify** the change using automated tests, database checks, or route verification.
5. **Update `/PROJECT.md` status** only when the phase or feature has been empirically validated.

---

## 3. Strict Prohibitions & Anti-Shortcuts
Under no circumstances may any agent:
- ❌ Create fake transactions, mock revenue, or synthetic business history.
- ❌ Hard-code dashboard KPIs, conversion percentages, order counts, or revenue metrics.
- ❌ Use fake payment gateway mocks in production runtime paths.
- ❌ Expose sensitive secrets (`RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, `SESSION_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) to client-side code or browser bundles.
- ❌ Trust prices, cart subtotals, or order amounts sent by the browser client.
- ❌ Execute free-form LLM text as authoritative database or financial commands.
- ❌ Bypass the merchant policy engine for discounts, upsells, or order limits.
- ❌ Claim payment success without server-side cryptographic signature verification or direct gateway verification.
- ❌ Silently remove, downgrade, or skip mandatory requirements from `/PROJECT.md`.
- ❌ Leave critical TODOs or placeholder buttons in place of core functionality.

---

## 4. Architectural Rules
- **Database Authority**: The PostgreSQL database (via Prisma) is the ultimate source of truth for inventory, stock, prices, carts, orders, and payments.
- **Minor Currency Units**: All currency amounts must be stored and computed in integer minor units (paise for INR).
- **Controlled Tools**: Gemini must interact exclusively through typed, schema-validated tool definitions.
- **Idempotent Webhooks**: All external webhooks must be verified by HMAC SHA-256 signature and deduplicated via `WebhookEvent` records before applying business state updates.
- **Explainability**: Every recommendation, upsell, and policy intervention must produce a structured, human-readable rationale without revealing raw chain-of-thought tokens.

---

## 5. Verification Gate
No phase is considered complete without:
1. Typecheck passing (`npm run typecheck` or `tsc --noEmit`).
2. Lint check passing.
3. Unit or integration test execution.
4. Live verification against the real database and API endpoints.

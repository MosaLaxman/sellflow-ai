# SellFlow AI — Feature Specification

> **Track 01: AI Growth & Agentic Commerce**  
> *Complete inventory of production-ready features implemented in SellFlow AI.*

---

## 1. Conversational AI Storefront (`/store/[merchantSlug]`)
- **Natural-Language Understanding**: Accepts complex, nuanced multi-attribute shopper queries (e.g. *"I need running shoes under ₹4,000 for daily road training"*).
- **Zero Hallucination Retrieval**: Directly matches customer intent against PostgreSQL inventory using weighted token relevance, synonyms, and use cases. The AI cannot invent products.
- **Explainability Badges**: Visual indicators demonstrating why each product was selected (e.g., *"Matched Budget < ₹4,000"*, *"Road Training Specialized"*).
- **Dual Shopping Views**: Seamlessly toggle between natural conversational chat and visual product grid catalog browsing.
- **Cart Drawer**: Real-time server-synchronized slide-out cart with authoritative price recalculation.

---

## 2. Machine-Readable Catalog API
- **Endpoint**: `GET /api/agent/catalog?merchant=apex-sports`
- **Protocol**: `SellFlow-Agentic-Commerce/1.0`
- **Machine Discovery**: Enables external AI buying bots and aggregators to discover merchant capabilities, policy boundaries, stock levels, attributes, and compatible accessories without fragile web scraping.
- **Granular Search**: `POST /api/agent/search` for programmatic search with semantic and budget filters.
- **Product Specification**: `GET /api/agent/products/:id` returning deep relational edges and accessory compatibility graphs.

---

## 3. Autonomous AI Buyer Protocol (`/ai-buyer`)
- **Interactive Simulation Studio**: Built-in visual laboratory simulating autonomous buying agents interacting with the merchant catalog.
- **Pre-Configured Personas**:
  - `TravelPlanner AI` (Corporate booking & running gear procurement)
  - `GiftFinder AI` (Curated athletic accessories)
  - `MarathonCoach AI` (Elite performance marathon gear)
  - `BudgetShopper AI` (Strict budget constraint shopping)
- **Execution Lifecycle**: Real-time visual timeline showing:
  `MERCHANT_DISCOVERY` → `CATALOG_SEARCH` → `PRODUCT_SELECTION` → `UPSELL_CHECK` → `POLICY_EVALUATION` → `CUSTOMER_AUTHORIZATION` → `RAZORPAY_ORDER` → `PAYMENT_EXECUTION`.

---

## 4. Bounded Upsell & Revenue Growth Engine
- **Algorithmic Cross-Sell**: Evaluates high-intent product selections and identifies compatible catalog accessories (e.g. Pro Cushion Anti-Blister Running Socks when buying Runner Pro 2).
- **Policy Ratio Ceilings**: Prevents aggressive or unreasonable recommendations by enforcing `maxAutomaticUpsellPercentage` (e.g., maximum 50% of the base item's price).
- **Basket Expansion (AOV)**: Drives merchant top-line revenue growth safely within policy guardrails.
- **Explainable Rationale**: Every upsell proposal includes an explicit, human-readable justification stored in the audit ledger.

---

## 5. Merchant Policy Engine & Risk Governance
- **Autonomous Order Ceilings**: Configurable spending cap (e.g., ₹10,000) beyond which autonomous transactions are strictly blocked.
- **Mandatory Customer Confirmation**: Flag (`requireCustomerConfirmation`) requiring explicit shopper authorization before generating real payment orders.
- **Discount Ceilings**: Strictly limits maximum allowed discounts.
- **Administrative Configuration**: Backoffice management interface at `/merchant/settings/ai-policy`.

---

## 6. Native Razorpay Test Mode Integration
- **Server Orders API**: Server creates cryptographically secured Razorpay Orders (`POST https://api.razorpay.com/v1/orders`) with exact server-calculated minor amounts.
- **Razorpay Standard Checkout**: Client launches the official Razorpay Checkout modal with prefilled customer contact details and authenticated order IDs.
- **Double Verification**: Post-checkout server-side signature verification (`crypto.createHmac('sha256', secret)`) confirms payment authenticity before order state transitions.

---

## 7. Webhook Engine & Cryptographic Deduplication
- **Endpoint**: `POST /api/webhooks/razorpay`
- **HMAC-SHA256 Validation**: Validates `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`.
- **Idempotency Store**: Logs every webhook event in the `WebhookEvent` table; duplicate deliveries are detected and skipped with zero double-settlement risk.
- **Asynchronous Settlement**: Updates order and payment records upon `payment.captured` or `order.paid`.

---

## 8. In-App Payment Recovery Workflow
- **Graceful Failure Detection**: Handles card declines, user cancellations, and simulated network interruptions without abandoning active carts.
- **Customer-Initiated Retry**: Launches an in-app recovery modal (`"Almost there..."`) with failure reason diagnostics and a safe one-click **"Retry Payment"** action.
- **State Preservation**: Retains the exact server cart and reserved items so the shopper never has to repeat conversational discovery.

---

## 9. Merchant Test Center (`/merchant/test-center`)
- **Live Diagnostics**:
  - Gemini AI connectivity and latency check.
  - Razorpay API credentials and test key validation.
  - Webhook secret and endpoint status.
- **Interactive Failure Simulation**:
  - Test payment failure triggers to verify recovery flows.
  - Test simulated webhook delivery to verify idempotency.
  - Verify HMAC signature validation in real time.

---

## 10. Real-Time Zero-Synthetic Merchant Dashboard (`/merchant/dashboard`)
- **Zero Mock Metrics**: 100% of revenue, order counts, conversion rates, and Average Order Value (AOV) are computed from real PostgreSQL records.
- **AI Decision Explorer**: Inspect past conversational tool executions, recommendations, and policy checks at `/merchant/ai-decisions`.
- **Audit Log**: Immutable, chronological operational ledger at `/merchant/audit-log`.
- **Order Management**: Detailed order inspection with transaction IDs, line items, and payment methods at `/merchant/orders`.

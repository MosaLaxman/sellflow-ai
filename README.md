# SellFlow AI

### Make any merchant ready for AI-native commerce.

SellFlow AI turns a traditional merchant into an **AI-discoverable**, **policy-controlled**, and **Razorpay-transactable** business.

```text
Razorpay Buildathon
Track 01 — AI Growth & Agentic Commerce
```

> **🎥 5-Minute Demo Video**:  
> `VIDEO_URL = [PASTE_YOUR_VIDEO_LINK_HERE]`

> **🔗 GitHub Repository**:  
> `GITHUB_REPO_URL = https://github.com/YOUR_USERNAME/sellflow-ai`

---

## 📖 Table of Contents
1. [Why this fits Razorpay Track 01](#why-this-fits-razorpay-track-01)
2. [The Core Problem](#the-core-problem)
3. [What is SellFlow AI?](#what-is-sellflow-ai)
4. [Why SellFlow is Different](#why-sellflow-is-different)
5. [The Three Pillars: Explainable, Bounded, Gated](#the-three-pillars-explainable-bounded-gated)
6. [End-to-End Transaction Flow](#end-to-end-transaction-flow)
7. [Autonomous AI Buyer Protocol](#autonomous-ai-buyer-protocol)
8. [Machine-Readable Catalog API](#machine-readable-catalog-api)
9. [Revenue Growth & Bounded Upsell Engine](#revenue-growth--bounded-upsell-engine)
10. [Merchant Risk Policies](#merchant-risk-policies)
11. [Recommended Demo Walkthrough](#recommended-demo-walkthrough)
12. [Razorpay Payment Lifecycle](#razorpay-payment-lifecycle)
13. [Graceful Payment Recovery](#graceful-payment-recovery)
14. [Audit Trail & Zero Synthetic Data](#audit-trail--zero-synthetic-data)
15. [System Architecture](#system-architecture)
16. [Quick Start & Local Setup](#quick-start--local-setup)
17. [Database Setup](#database-setup)
18. [Environment Variables](#environment-variables)
19. [Razorpay Test Mode Setup](#razorpay-test-mode-setup)
20. [Webhook Verification & Idempotency](#webhook-verification--idempotency)
21. [API Testing & Postman Collection](#api-testing--postman-collection)
22. [Automated Verification & Test Suites](#automated-verification--test-suites)
23. [Security & Governance](#security--governance)
24. [License](#license)

---

## Why this fits Razorpay Track 01

**Track 01 Objective**: *"Grow the merchant’s revenue, and make them sellable to AI buyers."*

SellFlow AI addresses both sides of AI commerce natively:

1. **Make Merchants Sellable to AI Buyers**: Traditional storefronts require fragile HTML web scraping. SellFlow AI exposes structured, authenticated, machine-readable catalog and transaction APIs (`GET /api/agent/catalog` and `POST /api/agent/buyer`) that enable external AI agents to discover, verify stock, evaluate specs, and negotiate purchases within merchant policies.
2. **Grow Merchant Revenue Through Bounded Upsells**: Increases Average Order Value (AOV) by algorithmically analyzing customer intent and recommending compatible accessories from the merchant catalog at the exact point of highest purchase intent, strictly bounded by merchant-defined percentage ceilings.

```text
AI Buyer
   ↓
Merchant Discovery
   ↓
Agent-Readable Catalog
   ↓
Natural-Language Search
   ↓
Product Selection
   ↓
Upsell / Cross-Sell
   ↓
Merchant Policy
   ↓
Customer Authorization
   ↓
Razorpay Order
   ↓
Razorpay Checkout
   ↓
Payment Verification
   ↓
Webhook
   ↓
Audit Trail
```

---

## The Core Problem

- **Static Search Drop-Off**: Traditional catalog filters fail on conversational, multi-attribute customer requests (e.g. *"running shoes under ₹4,000 for daily road training"*).
- **Chatbot Hallucination Liability**: Unconstrained LLMs invent non-existent products, promise unauthorized discounts, or misquote inventory.
- **Incompatible with Autonomous AI Agents**: External buying bots cannot interact with traditional human-oriented web forms or JavaScript-rendered DOMs.
- **Detached Checkout Funnels**: Conversational interfaces typically dump users into disconnected checkout wizards, causing high cart abandonment.
- **Lack of Governance & Auditability**: Merchants lack visibility into why an AI suggested an item, whether upsells were accepted, or how automated decisions impact revenue.

---

## What is SellFlow AI?

SellFlow AI is an autonomous, agentic sales platform that operates as a bounded digital sales employee. Operating directly over an authoritative PostgreSQL database:
- It understands customer intent in plain language.
- Queries real inventory using typed server-side tools.
- Generates transparent, explainable recommendations.
- Formulates rule-compliant upsell proposals.
- Computes strict, server-side prices and totals.
- Creates authenticated Razorpay Test Mode orders.
- Records an immutable cryptographic audit ledger of every financial and conversational state.

---

## Why SellFlow is Different

Traditional ecommerce architectures treat AI as an ornamental chatbot widget. SellFlow AI treats AI as a transacting commerce protocol:

```text
Traditional Storefront:
Human → Browser → Click Filters → Add to Cart → Manual Form → Checkout

SellFlow AI-Native Commerce:
AI Buyer → Authenticated Agent API → Machine Catalog → Policy Engine → Server Cart → Razorpay
```

- **Not just a chatbot**: It is an authenticated, machine-readable commerce protocol for external AI agents.
- **No client-side price trust**: The LLM and the browser client are treated as untrusted. All prices, discounts, and order totals are computed server-side in integer minor units (paise).
- **Real transactions**: Integrates directly with the Razorpay Orders API, standard Razorpay Checkout modal, and HMAC-SHA256 verified webhooks.

---

## The Three Pillars: Explainable, Bounded, Gated

| Pillar | Implementation in SellFlow AI | Architectural Guarantee |
|---|---|---|
| **Explainable** | Structured metadata and plain-English rationales recorded for every recommendation, upsell proposal, and policy evaluation. | The merchant dashboard shows the exact reasoning behind every item proposed and purchased. Zero black-box decisions. |
| **Bounded** | Hard mathematical ceilings configured in `MerchantPolicy`: maximum autonomous order amount (`maxAutonomousOrderAmount`) and maximum upsell percentage (`maxAutomaticUpsellPercentage`). | The AI cannot exceed merchant-configured spending boundaries. Orders above limits are rejected at the business engine level. |
| **Gated** | Mandatory customer confirmation flag (`requireCustomerConfirmation`) enforced before payment order generation. | The AI prepares the transaction and verifies policy compliance, but payment execution requires explicit human confirmation. |

---

## End-to-End Transaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor Shopper as Customer / AI Buyer
    participant API as SellFlow API & Policy Engine
    participant DB as PostgreSQL Database
    participant RZP as Razorpay Payment Gateway

    Shopper->>API: Query: "running shoes under ₹4,000 for daily road training"
    API->>DB: Query indexed catalog (Stock > 0, Price <= ₹4,000)
    DB-->>API: Runner Pro 2 (₹3,499)
    API->>DB: Fetch compatible accessories
    DB-->>API: Running Socks (₹499)
    API->>API: Evaluate Policy (Upsell 14% <= 50% cap, Total ₹3,998 <= ₹10,000 ceiling)
    API-->>Shopper: Propose Base + Upsell (Total: ₹3,998)
    Shopper->>API: Explicit Customer Confirmation
    API->>RZP: POST /v1/orders (amount: 399800 paise)
    RZP-->>API: Razorpay Order ID (order_TY...)
    API-->>Shopper: Launch Razorpay Standard Checkout
    Shopper->>RZP: Submit Test Payment
    RZP-->>Shopper: Payment Successful (pay_..., signature)
    Shopper->>API: POST /api/verify-payment
    API->>API: Cryptographic HMAC-SHA256 signature verification
    API->>DB: Mark Order PAID, create Payment record
    RZP--)API: POST /api/webhooks/razorpay (payment.captured)
    API->>DB: Deduplicate in WebhookEvent ledger & settle
    API->>DB: Append immutable entry to AuditLog
```

---

## Autonomous AI Buyer Protocol

SellFlow AI provides a dedicated protocol and interactive testing studio at `/ai-buyer` demonstrating how external AI agents transact autonomously:

- **Interactive UI**: `/ai-buyer`
- **Execution Endpoint**: `POST /api/agent/buyer`
- **Pre-Configured Personas**:
  - `TravelPlanner AI`: Corporate gear procurement agent.
  - `GiftFinder AI`: Athletic gift selection assistant.
  - `MarathonCoach AI`: Performance marathon gear procurement bot.
  - `BudgetShopper AI`: Strict budget optimization agent.

### Request Format
```http
POST /api/agent/buyer
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer sfai_demo_buyer_key_2026
```

```json
{
  "query": "I need running shoes under ₹4,000 for daily road training",
  "merchantSlug": "apex-sports",
  "agentId": "agent_travel_planner",
  "agentName": "TravelPlanner AI",
  "includeUpsell": true,
  "customerConfirmed": true,
  "initiateRazorpayOrder": true
}
```

### Response Structure
- **`selectedProduct`**: Product matched by catalog search (`Runner Pro 2` at ₹3,499).
- **`upsellProduct`**: Compatible accessory (`Pro Cushion Anti-Blister Running Socks` at ₹499).
- **`cart`**: Authoritative server cart assembly.
- **`totalRupees`**: Server-calculated total (`₹3,998`).
- **`policy`**: Policy compliance status (`APPROVED`).
- **`razorpayOrder`**: Generated Razorpay Order ID (`order_...`).
- **`steps`**: Audit sequence detailing each transition state.

---

## Machine-Readable Catalog API

External AI buyers can query what a merchant sells without scraping HTML:

```http
GET /api/agent/catalog?merchant=apex-sports&query=running&priceMax=4000
Host: localhost:3000
Authorization: Bearer sfai_demo_buyer_key_2026
```

### Response Example
```json
{
  "protocol": "SellFlow-Agentic-Commerce/1.0",
  "authenticated": true,
  "merchant": {
    "name": "Apex Performance Gear",
    "slug": "apex-sports",
    "currency": "INR",
    "capabilities": {
      "aiDiscovery": true,
      "aiUpsell": true,
      "customerConfirmationRequired": true,
      "maxAutonomousOrderRupees": 10000,
      "maxUpsellPercentage": 50
    }
  },
  "catalog": {
    "totalProducts": 2,
    "products": [
      {
        "id": "cmtfs8szh0004yumjdl1ad2ry",
        "name": "Runner Pro 2",
        "category": "Footwear",
        "priceRupees": 3499,
        "inStock": true,
        "stockQuantity": 15,
        "compatibleAccessories": [
          {
            "id": "cmtfs8t05000ayumjj87nfksw",
            "name": "Pro Cushion Anti-Blister Running Socks (3-Pack)",
            "priceRupees": 499
          }
        ]
      }
    ]
  }
}
```

---

## Revenue Growth & Bounded Upsell Engine

SellFlow AI drives merchant revenue growth through intelligent, bounded basket expansion:

1. **Relational Accessory Graph**: Catalog items are linked via `ProductRelation` edges (e.g., shoes → socks, rackets → grip tape).
2. **Contextual Evaluation**: Proposes complementary accessories at high-intent checkout moments.
3. **Mathematical Guardrail**: Strictly bounded by `maxAutomaticUpsellPercentage` (e.g., maximum 50% of the base item's price).
   - *Allowed*: ₹499 socks with ₹3,499 shoes (14.3% ratio ≤ 50% cap).
   - *Blocked*: ₹2,500 jacket with ₹3,499 shoes (71.4% ratio > 50% cap).
4. **Higher Average Order Value (AOV)**: Grows merchant top-line revenue safely without aggressive or irrelevant cross-sells.

---

## Merchant Risk Policies

Configured via the Merchant Admin console at `/merchant/settings/ai-policy`:

| Policy Parameter | Demo Configured Value | Enforcement Mechanism |
|---|---|---|
| **Autonomous Order Ceiling** | `₹10,000` | Backend check rejects any autonomous order exceeding ₹10,000. |
| **Maximum Upsell Ratio** | `50%` | Server rejects upsell proposals where accessory price > 50% of base item. |
| **Customer Confirmation Gate** | `Required (true)` | Blocks Razorpay order creation until shopper grants explicit confirmation. |

*Note: These policies are enforced deterministically in backend business logic (`PolicyEngine`), not merely in the frontend display.*

---

## Recommended Demo Walkthrough

Reviewers can reproduce the complete 5-minute demo scenario using:

**Query**:
```text
"I need running shoes under ₹4,000 for daily road training"
```

**Expected Flow**:
```text
Runner Pro 2                   ₹3,499
+ Pro Cushion Running Socks    + ₹499
-------------------------------------
Authoritative Server Total     ₹3,998
```

**Execution Checklist**:
1. **Policy Evaluation**: ₹3,998 is within ₹10,000 ceiling. ₹499 is 14% of base price (≤ 50% cap) → **Allowed**.
2. **Customer Confirmation**: Shopper clicks confirmation → **Gated authorization granted**.
3. **Razorpay Order Creation**: Server calls Razorpay Orders API → **Order ID created**.
4. **Razorpay Checkout**: Official Checkout modal launches → **Payment completed**.
5. **Double Verification**: Server verifies HMAC-SHA256 signature → **Order marked PAID**.
6. **Audit Ledger**: Immutable transaction record appears in **Merchant Decision Center**.

---

## Razorpay Payment Lifecycle

1. **Cart Calculation**: Server computes subtotal and line items in integer minor units (paise).
2. **Policy Evaluation**: Policy engine confirms spending limits and upsell ratios.
3. **Customer Authorization**: Shopper explicitly confirms calculated total.
4. **Order Creation**: Backend calls Razorpay Orders API (`POST https://api.razorpay.com/v1/orders`).
5. **Checkout Launch**: Official Razorpay Checkout modal launches with authoritative `order_id`.
6. **Payment Execution**: Customer completes test card or UPI transaction.
7. **Server Verification**: Backend verifies HMAC-SHA256 signature (`POST /api/verify-payment`).
8. **Webhook Settlement**: Inbound Razorpay webhook (`POST /api/webhooks/razorpay`) deduplicates event and settles payment.
9. **Audit Trail**: Action and state transition logged in `AIAction` and `AuditLog` tables.

---

## Graceful Payment Recovery

SellFlow AI provides customer-initiated in-app payment recovery:

```text
Payment Failure / Card Decline
           ↓
In-App Recovery Modal ("Almost there...")
           ↓
Diagnostic Failure Reason Displayed
           ↓
Customer Clicks "Retry Payment"
           ↓
Razorpay Checkout Re-launches (Cart Intact)
           ↓
Successful Payment & Verification
```

- **Cart Preservation**: The customer never loses their selected items or conversational context upon failure.
- **Customer-Initiated**: Recovery is initiated cleanly by the shopper rather than falsely claiming automatic background retries.

---

## Audit Trail & Zero Synthetic Data

SellFlow AI guarantees **zero synthetic business metrics**:
- **100% Real PostgreSQL Data**: Every KPI on the merchant dashboard (Revenue, Total Orders, Conversion Rate, AOV) is calculated live from persisted database records.
- **AI Decision Explorer (`/merchant/ai-decisions`)**: Complete visibility into every tool call, input prompt, relevance score, and upsell justification.
- **Audit Log (`/merchant/audit-log`)**: Immutable chronological operational log recording security events, order state changes, and webhook deduplication.

---

## System Architecture

```text
Customer Storefront (/store/:slug)         External AI Buyer (/ai-buyer)
             │                                           │
             ▼                                           ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 14 App Router Fullstack Engine               │
│                                                                        │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │ Agent Executor       │  │ Policy Engine   │  │ Pricing Engine    │  │
│  │ (Gemini 2.5 Flash)   │  │ (Ceilings/Caps) │  │ (Integer Paise)   │  │
│  └──────────────────────┘  └─────────────────┘  └───────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Razorpay Integration Layer                                        │  │
│  │ - Orders API (v1/orders)       - Checkout Modal Config           │  │
│  │ - HMAC-SHA256 Signature Verify - Idempotent Webhook Engine       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Authoritative PostgreSQL Database                    │
│                                                                        │
│  • merchants          • products         • product_relations           │
│  • merchant_policies  • customer_sessions• carts & cart_items          │
│  • orders & payments  • ai_actions       • audit_logs & webhooks       │
└────────────────────────────────────────────────────────────────────────┘
```

Detailed architectural diagrams and dual transaction pathways are documented in [docs/architecture.md](docs/architecture.md).

---

## Quick Start & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/sellflow-ai.git
cd sellflow-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` with your PostgreSQL database URL, Gemini API key, and Razorpay Test Mode credentials.

### 4. Database Setup & Migrations
Ensure PostgreSQL is running, then apply the Prisma schema:
```bash
npx prisma db push
```

### 5. Seed the Demo Merchant & Catalog
Populate the database with the reference merchant (`Apex Performance Gear`), product catalog, compatible accessories, and baseline policies:
```bash
npm run seed
```

### 6. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Storefront**: [http://localhost:3000/store/apex-sports](http://localhost:3000/store/apex-sports)
- **AI Buyer Studio**: [http://localhost:3000/ai-buyer](http://localhost:3000/ai-buyer)
- **Merchant Console**: [http://localhost:3000/merchant/dashboard](http://localhost:3000/merchant/dashboard)
- **Test Center**: [http://localhost:3000/merchant/test-center](http://localhost:3000/merchant/test-center)

---

## Database Setup

SellFlow AI utilizes PostgreSQL 14+ via Prisma ORM:

- **Connection URL Format**:
  ```text
  postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
  ```
- **Prisma Schema**: Located at `prisma/schema.prisma`.
- **Generate Client**: `npx prisma generate`
- **Push Schema**: `npx prisma db push`
- **Seed Script**: `npm run seed` (executes `prisma/seed.ts`)
- **Default Demo Merchant**: `Apex Performance Gear` (`slug: apex-sports`, `currency: INR`).

---

## Environment Variables

| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/sellflow?schema=public` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API Key | Get from [Google AI Studio](https://aistudio.google.com/) |
| `RAZORPAY_KEY_ID` | **Yes** | Razorpay Test Mode Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | **Yes** | Razorpay Test Mode Key Secret | `unwp...` |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes** | Secret for HMAC webhook verification | `test_webhook_secret_sellflow` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | **Yes** | Public Key ID for Checkout modal | Must match `RAZORPAY_KEY_ID` |
| `APP_URL` | **Yes** | Base application URL | `http://localhost:3000` |
| `SESSION_SECRET` | **Yes** | Secret for signing JWT session cookies | Minimum 32-character random string |
| `SELLFLOW_BUYER_KEY` | Optional | API key for AI Buyer protocol | Defaults to `sfai_demo_buyer_key_2026` |

*Note: Real secrets must NEVER be committed to version control. Refer to `.env.example`.*

---

## Razorpay Test Mode Setup

SellFlow AI operates entirely in **Razorpay Test Mode**. No real money is required:

1. Obtain a free Test Mode Key ID and Secret from the [Razorpay Dashboard](https://dashboard.razorpay.com/) (under **Settings → API Keys**).
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
3. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` to match `RAZORPAY_KEY_ID`.
4. When testing checkout, use Razorpay's [Standard Test Card Numbers & OTPs](https://razorpay.com/docs/payments/payments/test-card-details/).

---

## Webhook Verification & Idempotency

- **Endpoint**: `POST /api/webhooks/razorpay`
- **Signature Verification**: Every incoming webhook calculates `crypto.createHmac('sha256', secret).update(body).digest('hex')` and validates against the `x-razorpay-signature` header.
- **Idempotency Guard**: Events are registered in the `WebhookEvent` table by their Razorpay Event ID (`x-razorpay-event-id` or payload ID). Duplicate deliveries are immediately recognized and acknowledged without double-settlement.
- **Local Testing**: Reviewers can test webhooks using the built-in simulator in the **Merchant Test Center** (`/merchant/test-center`) or via local tunneling tools (such as ngrok or local-tunnel).

---

## API Testing & Postman Collection

Comprehensive API documentation and copy-pasteable cURL examples are available in [docs/postman.md](docs/postman.md).

An importable Postman collection is provided at:
```text
docs/SellFlow-AI.postman_collection.json
```

It includes:
1. `GET /api/agent/catalog` (Discover Full Catalog)
2. `GET /api/agent/catalog?merchant=apex-sports&query=running&priceMax=4000` (Search Shoes Under Budget)
3. `POST /api/agent/buyer` (Autonomous Buyer Transaction - Confirmed)
4. `POST /api/agent/buyer` (Autonomous Buyer Gating Test - Unconfirmed)

---

## Automated Verification & Test Suites

The project includes 5 comprehensive automated test suites covering 52 discrete verification checkpoints:

```bash
# Run all test suites
npm test

# Run individual test suites
npm run test:tools       # Agent tools registry, schema validation & server totals
npm run test:buyer       # AI Buyer protocol, policy checks & webhook idempotency
npm run test:discovery   # Gemini intent extraction & zero-hallucination search
npm run test:security    # HMAC-SHA256 signatures, deduplication & multi-tenancy
npm run test:system      # Full end-to-end integration lifecycle
```

### TypeScript Verification
```bash
npm run typecheck
```
*Current Status: 0 errors.*

### Production Build Verification
```bash
npm run build
```
*Current Status: 24/24 static and dynamic routes compiled successfully.*

---

## Security & Governance

- **API Key Authentication**: Machine-readable endpoints require authenticated Bearer tokens.
- **Server Price Authority**: The client browser is untrusted; prices and subtotals are always queried directly from PostgreSQL.
- **Policy Enforcement**: Hard boundaries on order ceilings and upsell percentages prevent financial overreach.
- **Customer Confirmation Gate**: Mandatory explicit human authorization required before payment order creation.
- **Secret Protection**: `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, and `SESSION_SECRET` are never exposed to browser bundles.
- **Cryptographic Signatures**: Webhook payloads and checkout callbacks are verified via HMAC-SHA256.
- **State Machine Protection**: Orders in `PAID` status can never be downgraded or overwritten by out-of-order failed events.
- **Strict Multi-Tenancy**: All database queries are strictly isolated by `merchantId`.

---

## License

This project does not yet include an open-source license file. Reviewers and users should consult the repository owner before redistribution or commercial use.

---

### Razorpay Buildathon Links
- **Demo Video**: `VIDEO_URL = [PASTE_YOUR_VIDEO_LINK_HERE]`
- **Repository**: `GITHUB_REPO_URL = https://github.com/YOUR_USERNAME/sellflow-ai`

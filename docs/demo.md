# SellFlow AI — 5-Minute Razorpay Buildathon Demo Script

> **Track 01: AI Growth & Agentic Commerce**  
> *Deterministic step-by-step demonstration walkthrough for reviewers and video presenters.*

---

## ⏱️ Video Demo Timeline Overview (5:00 Total)

| Time | Phase | Target Screen / URL | Key Message |
|---|---|---|---|
| **0:00 - 0:35** | **The Hook & Problem** | Homepage (`/`) | Traditional chatbots hallucinate and are detached from checkouts. AI buyers have no way to transact with merchants. |
| **0:35 - 1:15** | **The Solution & Track 01** | Architecture / Storefront (`/store/apex-sports`) | SellFlow AI makes merchants AI-discoverable, bounded, gated, and Razorpay-transactable. |
| **1:15 - 2:00** | **Machine Catalog & Policy** | API (`/api/agent/catalog`) & Policy Settings (`/merchant/settings/ai-policy`) | Explainable, bounded ceilings (₹10,000 max order, 50% max upsell). Zero hallucination. |
| **2:00 - 3:00** | **The Live Transaction Loop** | AI Buyer Studio (`/ai-buyer`) | Runner Pro 2 (₹3,499) + Running Socks (₹499) = ₹3,998. Policy approved. Customer gate confirmed. |
| **3:00 - 3:45** | **Razorpay Checkout & Verify** | Razorpay Modal & Settlement | Native Razorpay Order ID created. Standard Checkout opens. Real payment verification & webhook deduplication. |
| **3:45 - 4:25** | **Payment Recovery & Test Center** | `/merchant/test-center` | Customer-initiated retry modal preserves cart state. Live health checks for Gemini & Razorpay. |
| **4:25 - 5:00** | **Merchant Console & Conclusion** | Dashboard (`/merchant/dashboard`) | Zero synthetic data. 100% real PostgreSQL metrics, audit logs, and AI action transparency. |

---

## 🎬 Detailed Presenter Script

### Phase 1: The Hook (0:00 - 0:35)
> *"Hello judges! When online stores add AI chatbots today, they run into two major problems: First, generic chatbots hallucinate fake products, make up unauthorized discounts, and can't actually complete purchases. Second, as autonomous AI buyers emerge, merchants have no machine-readable way to sell to them.*
>
> *We built **SellFlow AI** to solve both sides of this equation for Razorpay Buildathon Track 01: AI Growth and Agentic Commerce."*

### Phase 2: Solution & AI-Readable Catalog (0:35 - 1:15)
*(Action: Switch to browser at `/api/agent/catalog?merchant=apex-sports`)*
> *"Here is the first differentiator: SellFlow AI exposes an authenticated, machine-readable catalog API for external AI buyers. Notice the structured response: verified stock, detailed attributes, accessory relations, and merchant policy limits.*
>
> *The AI never invents inventory. Everything is queried directly from our PostgreSQL database."*

### Phase 3: Merchant Policy Engine (1:15 - 2:00)
*(Action: Navigate to `/merchant/settings/ai-policy`)*
> *"Next is financial safety. Autonomous commerce cannot mean unchecked commerce. In our merchant policy engine, the merchant sets strict mathematical boundaries:*
> - *An Autonomous Order Ceiling of ₹10,000.*
> - *A Maximum Upsell Ratio of 50%.*
> - *And a mandatory Customer Confirmation gate before any payment order can be generated.*
>
> *These rules are enforced deterministically on the server, not left to LLM discretion."*

### Phase 4: Live AI Buyer Transaction (2:00 - 3:00)
*(Action: Navigate to `/ai-buyer` and select TravelPlanner AI)*
> *"Now let's see an autonomous transaction in action in our AI Buyer Studio. We have TravelPlanner AI, an external procurement bot looking for running gear. Its query is:*
>
> **'I need running shoes under ₹4,000 for daily road training'**
>
> *(Click 'Simulate AI Purchase Request')*
>
> *Watch the live execution timeline:*
> 1. *It discovers the merchant.*
> 2. *It searches the authoritative catalog and selects **Runner Pro 2** at **₹3,499**.*
> 3. *Then, our upsell engine identifies compatible accessories from the relational graph and proposes **Pro Cushion Running Socks** at **₹499**.*
> 4. *The Policy Engine validates that ₹499 is only 14% of the shoe price — well below the 50% ceiling.*
> 5. *Total server-calculated price: **₹3,998** — perfectly within the ₹4,000 budget!*
> 6. *Finally, the customer confirmation gate authorizes the order."*

### Phase 5: Razorpay Checkout & Webhook Settlement (3:00 - 3:45)
*(Action: Click 'Authorize & Pay with Razorpay')*
> *"Because customer authorization is granted, SellFlow AI calls the Razorpay Orders API server-side and launches the official Razorpay Checkout modal with the authoritative Order ID.*
>
> *(Complete the test payment using test card credentials)*
>
> *Upon completion, our backend cryptographically verifies the payment signature using HMAC SHA-256 and records the payment. Meanwhile, our Razorpay webhook handler deduplicates the incoming event in our idempotent ledger."*

### Phase 6: Graceful Payment Recovery (3:45 - 4:25)
*(Action: Demonstrate Test Center at `/merchant/test-center` or simulated failure)*
> *"What happens if a payment fails? SellFlow AI handles failures gracefully. Instead of dumping the user back to an empty cart, our in-app Payment Recovery modal appears with the exact diagnostic reason and an immediate 'Retry Payment' action. The customer's cart and selections remain 100% intact."*

### Phase 7: Zero-Synthetic Merchant Dashboard (4:25 - 5:00)
*(Action: Navigate to `/merchant/dashboard`)*
> *"Finally, look at our Merchant Dashboard. Unlike typical hackathon projects, there is **zero synthetic data** here. Every rupee of revenue, every converted order, and our Average Order Value derives directly from real PostgreSQL records created during this session.*
>
> *Under AI Decisions, the merchant has complete transparency into every prompt, tool execution, and policy evaluation.*
>
> *SellFlow AI proves that agentic commerce can be explainable, bounded, gated, and auditable — turning everyday merchants into AI-ready businesses powered by Razorpay. Thank you!"*

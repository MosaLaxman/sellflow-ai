# SellFlow AI — API Reference & Postman Guide

> **Track 01: AI Growth & Agentic Commerce**  
> *Complete guide for testing SellFlow AI's machine-readable catalog and autonomous buyer APIs.*

---

## 🔐 Authentication

All machine-readable agent endpoints support authentication via standard HTTP Bearer token headers:

```http
Authorization: Bearer <YOUR_API_KEY>
```

> **Demo Key**: For local review and evaluation, use the pre-configured demo key:
> ```text
> sfai_demo_buyer_key_2026
> ```
> This can also be configured via the `SELLFLOW_BUYER_KEY` environment variable.

---

## 📡 Endpoint 1: Discover Machine-Readable Catalog

Fetches merchant capabilities, policy boundaries, and available catalog inventory with relational compatibility links.

### Request
```http
GET /api/agent/catalog?merchant=apex-sports
Host: localhost:3000
Authorization: Bearer sfai_demo_buyer_key_2026
Accept: application/json
```

### Supported Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `merchant` | string | Optional | `apex-sports` | Merchant slug |
| `query` | string | Optional | `null` | Keyword filter across name, description, and tags |
| `category` | string | Optional | `null` | Filter by category (e.g. `Footwear`, `Accessories`) |
| `priceMax` | number | Optional | `null` | Maximum price in INR rupees (e.g. `4000`) |
| `inStock` | boolean | Optional | `true` | Filter for in-stock items (`stockQuantity > 0`) |

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/agent/catalog?merchant=apex-sports" \
  -H "Authorization: Bearer sfai_demo_buyer_key_2026"
```

### Expected Response (200 OK)
```json
{
  "protocol": "SellFlow-Agentic-Commerce/1.0",
  "authenticated": true,
  "merchant": {
    "id": "cmtf...",
    "name": "Apex Performance Gear",
    "slug": "apex-sports",
    "currency": "INR",
    "capabilities": {
      "aiDiscovery": true,
      "aiRecommendations": true,
      "aiUpsell": true,
      "aiCheckout": true,
      "razorpayPayment": true,
      "customerConfirmationRequired": true,
      "maxAutonomousOrderRupees": 10000,
      "maxUpsellPercentage": 50
    }
  },
  "catalog": {
    "totalProducts": 6,
    "categories": [
      "Footwear",
      "Apparel",
      "Accessories"
    ],
    "products": [
      {
        "id": "cmtfs8szh0004yumjdl1ad2ry",
        "name": "Runner Pro 2",
        "category": "Footwear",
        "description": "High-performance daily road running shoes...",
        "priceMinor": 349900,
        "priceRupees": 3499,
        "inStock": true,
        "stockQuantity": 15,
        "tags": ["running", "shoes", "road", "road training"],
        "useCases": ["daily running", "road training", "jogging"],
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

## 🔍 Endpoint 2: Filtered Catalog Search

Demonstrates natural language keyword and budget filtering on the agent catalog.

### Request
```http
GET /api/agent/catalog?merchant=apex-sports&query=running&priceMax=4000
Host: localhost:3000
Authorization: Bearer sfai_demo_buyer_key_2026
```

### cURL Example
```bash
curl -X GET "http://localhost:3000/api/agent/catalog?merchant=apex-sports&query=running&priceMax=4000" \
  -H "Authorization: Bearer sfai_demo_buyer_key_2026"
```

---

## 🛒 Endpoint 3: Autonomous AI Buyer Purchase Loop

Executes a full agentic purchase simulation: catalog matching, upsell proposal, merchant policy evaluation, and optional Razorpay test order generation.

### Request
```http
POST /api/agent/buyer
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer sfai_demo_buyer_key_2026
```

### Request Body Schema
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

### Field Definitions
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | string | **Yes** | — | Natural language request with optional budget constraint |
| `merchantSlug` | string | Optional | `apex-sports` | Merchant slug |
| `agentId` | string | Optional | `agent_travel_planner` | External agent identifier for audit trail |
| `agentName` | string | Optional | `TravelPlanner AI` | Human-readable external agent name |
| `includeUpsell` | boolean | Optional | `true` | Whether to propose complementary accessories |
| `customerConfirmed` | boolean | Optional | `false` | Explicit human confirmation gate |
| `initiateRazorpayOrder` | boolean | Optional | `false` | Whether to create live Razorpay Test Order |

### cURL Example
```bash
curl -X POST "http://localhost:3000/api/agent/buyer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sfai_demo_buyer_key_2026" \
  -d '{
    "query": "I need running shoes under ₹4,000 for daily road training",
    "merchantSlug": "apex-sports",
    "agentId": "agent_travel_planner",
    "agentName": "TravelPlanner AI",
    "includeUpsell": true,
    "customerConfirmed": true,
    "initiateRazorpayOrder": true
  }'
```

### Expected Response (200 OK)
```json
{
  "protocol": "SellFlow-Agentic-Commerce/1.0",
  "timestamp": "2026-09-04T21:30:00.000Z",
  "agent": {
    "id": "agent_travel_planner",
    "name": "TravelPlanner AI"
  },
  "query": "I need running shoes under ₹4,000 for daily road training",
  "selectedProduct": {
    "id": "cmtfs8szh0004yumjdl1ad2ry",
    "name": "Runner Pro 2",
    "priceMinor": 349900,
    "priceRupees": 3499
  },
  "upsellProduct": {
    "id": "cmtfs8t05000ayumjj87nfksw",
    "name": "Pro Cushion Anti-Blister Running Socks (3-Pack)",
    "priceMinor": 49900,
    "priceRupees": 499,
    "reason": "Complementary accessory for Runner Pro 2 (14% of base price <= 50% cap)"
  },
  "cart": [
    { "name": "Runner Pro 2", "quantity": 1, "priceRupees": 3499 },
    { "name": "Pro Cushion Anti-Blister Running Socks (3-Pack)", "quantity": 1, "priceRupees": 499 }
  ],
  "totalMinor": 399800,
  "totalRupees": 3998,
  "policy": {
    "status": "APPROVED",
    "checks": [
      { "rule": "MAX_AUTONOMOUS_CEILING", "passed": true, "details": "₹3,998 <= ₹10,000" },
      { "rule": "MAX_UPSELL_PERCENTAGE", "passed": true, "details": "14.3% <= 50%" },
      { "rule": "CUSTOMER_CONFIRMATION", "passed": true, "details": "Explicitly confirmed by shopper" }
    ]
  },
  "outcome": "ORDER_CREATED",
  "razorpayOrder": {
    "razorpayOrderId": "order_TY...",
    "amount": 399800,
    "currency": "INR",
    "keyId": "rzp_test_..."
  },
  "steps": [
    { "step": "MERCHANT_DISCOVERY", "action": "TravelPlanner AI connected to Apex Performance Gear" },
    { "step": "CATALOG_SEARCH", "action": "Found matching items under ₹4,000" },
    { "step": "PRODUCT_SELECTION", "action": "Selected Runner Pro 2 (₹3,499)" },
    { "step": "UPSELL_CHECK", "action": "Identified compatible running socks (₹499)" },
    { "step": "POLICY_EVALUATION", "action": "Validated against merchant spending boundaries" },
    { "step": "CUSTOMER_AUTHORIZATION", "action": "Verified customer confirmation" },
    { "step": "RAZORPAY_ORDER", "action": "Generated authenticated Razorpay Order" }
  ]
}
```

---

## ⚠️ Common Error Codes
| Status Code | Error Message | Solution |
|---|---|---|
| `401 Unauthorized` | Invalid or missing API key | Include `Authorization: Bearer sfai_demo_buyer_key_2026` header |
| `400 Bad Request` | Missing required field: query | Provide a valid string query in request body |
| `404 Not Found` | Merchant not found | Verify `merchantSlug` exists in database (default: `apex-sports`) |

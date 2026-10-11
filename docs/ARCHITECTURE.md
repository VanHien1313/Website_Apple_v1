# SYSTEM ARCHITECTURE — APPLE STORE E-COMMERCE

## 1. High-Level Architecture Overview
This application is designed with a **Frontend-First, Integration-Ready** architecture.
The UI layer is decoupled from data sources using typed service interfaces, allowing seamless transition from mock datasets to production REST APIs, authentication services, payment gateways, and transactional mailers.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               React 19 + TypeScript (SPA)             │  │
│  │   Pages: Home, /iphone, /ipad, /mac, /watch, PDP,     │  │
│  │          /cart, /checkout, /login, /register, Account  │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │                State & Context Layer                  │  │
│  │    • CartContext (localStorage + sync)                │  │
│  │    • AuthContext (session token + user state)         │  │
│  │    • Filter/UI State                                  │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │                   Service Boundary                    │  │
│  │    • productService   • orderService                  │  │
│  │    • authService      • paymentService                │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼ (Phase 1-8: Mock)                   ▼ (Phase 9+: Backend REST API)
    ┌───────────────┐                     ┌───────────────────────────────┐
    │   Mock Data   │                     │      Node.js / Express        │
    │  Normalized   │                     │      or Fastify Backend       │
    │  TypeScript   │                     └───────────────┬───────────────┘
    └───────────────┘                                     │
                                          ┌───────────────┴───────────────┐
                                          ▼                               ▼
                                  ┌───────────────┐               ┌───────────────┐
                                  │ PostgreSQL /  │               │   External    │
                                  │ SQLite / Prisma               │   Services    │
                                  └───────────────┘               │ • Google OAuth│
                                                                  │ • Payment GW  │
                                                                  │ • Resend/SMTP │
                                                                  └───────────────┘
```

---

## 2. Frontend Layer Structure
* **Core:** React 19 + TypeScript + Vite.
* **Routing:** React Router v7 (`/`, `/:category`, `/product/:slug`, `/cart`, `/checkout`, `/auth/*`).
* **Design System (Tokens):** CSS Custom Properties mapped into Tailwind CSS tokens following **Direction C: Modern Apple Commerce**.
* **Design Hierarchy:** 90% white/soft gray surfaces (`#FFFFFF`, `#F5F5F7`), 8% black/dark neutral (`#111827`), 2% royal cobalt accent (`#0062D2`).
* **State Management:**
  * `CartContext` with `useReducer`: Local storage persistence with automatic schema normalization, ready for server sync.
  * `AuthContext`: Manages current customer profile, token persistence, and role guards.
  * Local UI State: For filter drawers, configuration selectors (storage/color), and modals.

---

## 3. Data Flow & Service Boundary Contract
Components never import raw mock data or raw `fetch()` directly. They invoke abstract service interfaces:
1. `getProducts(filter?: ProductFilter): Promise<Product[]>`
2. `getProductBySlug(slug: string): Promise<Product | null>`
3. `getProductsByCategory(category: ProductCategory): Promise<Product[]>`
4. `createOrder(orderInput: CreateOrderInput): Promise<Order>`
5. `verifyPayment(orderId: string, payload: any): Promise<PaymentResult>`

In Phase 1–8, these methods resolve normalized mock objects with latency simulation. In Phase 9+, they route through `fetch('/api/...')` with zero changes required in UI components.

---

## 4. Security & Environment Configuration
* No secrets (API keys, client secrets, database URIs, payment private keys) in frontend source code.
* Frontend `.env` only exposes `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`.
* Strict input validation using standard schema validators before dispatching mutations.
* Server-side signature validation for payment callbacks and webhooks.

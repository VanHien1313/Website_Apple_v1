# EXTERNAL INTEGRATION PLAN

## 1. Authentication Integration Plan

### Local Authentication
* **Flow:** Email + Password.
* **Frontend:** Registration form, Login form, form validation, error banners, JWT / Session cookie storage.
* **Backend (Phase 10):**
  * Password hashing via `bcrypt` / `argon2`.
  * Stateless JWT access token + HTTP-only refresh token, or secure server sessions.
  * Endpoint: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.

### Third-Party OAuth (Google OAuth 2.0)
* **Frontend:** Google Identity Services (`@react-oauth/google` or official redirect flow).
* **Backend (Phase 11):**
  * Token verification via Google OAuth2 client library (`google-auth-library`).
  * Account linking: Match existing user by email or create a linked account in `auth_accounts`.
  * Return application session token upon successful verification.
  * No Google Client Secret in client-side code.

---

## 2. Online Payment Gateway Integration Plan

### Candidate Selection for Vietnam Market (University Sandbox)
1. **VNPay Sandbox / MoMo Sandbox:**
   * VNPay provides a robust QR Code and ATM/Visa testing environment with clear documentation and test cards.
   * MoMo Sandbox provides easy QR simulation.
2. **Selection Strategy:**
   * Evaluate sandbox availability and HMAC-SHA512 checksum implementation simplicity.
   * Final selection will be documented and implemented in Phase 13.

### Flow Architecture
```
[User Clicks "Place Order & Pay"]
           │
           ▼
[Client: POST /api/orders & POST /api/payments/create-url]
           │
           ▼
[Backend: Generates unique txnRef, calculates HMAC signature, saves PENDING payment]
           │
           ▼
[Returns Gateway Payment URL to Client]
           │
           ▼
[User Completes Payment on Sandbox Gateway UI]
           │
           ▼
[Gateway redirects to /api/payments/callback AND calls IPN Webhook]
           │
           ▼
[Backend verifies checksum signature, updates Order = PAID, triggers Email Service]
           │
           ▼
[Client lands on /order/:id/success with verified status]
```

---

## 3. Transactional Email Service Plan

### Service Selection
* **Candidates:** Resend API, SendGrid, or Nodemailer with secure SMTP (Gmail / Mailtrap sandbox).
* **Selection:** Resend or Nodemailer SMTP sandbox for zero-cost university testing without spam blocking.

### Core Trigger: Order Confirmation
* Sent immediately after Order status transitions to `CONFIRMED` or `PAID`.
* Payload contains:
  * Customer Name & Order Reference ID (e.g. `APL-2026-9812`).
  * Itemized table: Product name, variant (color, storage), quantity, unit price.
  * Pricing breakdown: Subtotal, Shipping fee, Discount, Grand Total.
  * Shipping address & estimated delivery date.
* Resilience: Non-blocking execution. If email fails to send, log error to server monitoring and keep the order record intact.

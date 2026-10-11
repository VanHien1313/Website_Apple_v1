# API CONTRACT & DATA SPECIFICATION

## 1. Catalog & Product Endpoints

### `GET /api/products`
* **Query Parameters:**
  * `category?: 'iphone' | 'ipad' | 'mac' | 'watch'`
  * `subCategory?: string`
  * `minPrice?: number`
  * `maxPrice?: number`
  * `sort?: 'price_asc' | 'price_desc' | 'featured' | 'newest'`
  * `q?: string`
* **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "prod_ip16pm",
        "slug": "iphone-16-pro-max",
        "name": "iPhone 16 Pro Max",
        "category": "iphone",
        "subCategory": "Pro Series",
        "tagline": "Titanium hoàn mỹ. Hiệu năng đỉnh cao.",
        "badge": "Mới",
        "basePrice": 34990000,
        "originalPrice": 36990000,
        "thumbnail": "/images/products/iphone-16-pro-max-desert.png",
        "colors": [
          { "id": "c1", "name": "Titan Sa Mạc", "hex": "#C5A880", "image": "/images/products/iphone-16-pro-max-desert.png" },
          { "id": "c2", "name": "Titan Tự Nhiên", "hex": "#9E9A94", "image": "/images/products/iphone-16-pro-max-natural.png" }
        ],
        "variants": [
          { "id": "v1", "sku": "IP16PM-256-DESERT", "storage": "256GB", "price": 34990000, "originalPrice": 36990000, "inStock": true }
        ],
        "keySpecs": [
          { "label": "Chip", "value": "A18 Pro" },
          { "label": "Màn hình", "value": "6.9\" Super Retina XDR" }
        ]
      }
    ],
    "total": 1
  }
  ```

### `GET /api/products/:slug`
* **Response (200 OK):** Detailed product record including complete gallery, specifications table, and all variants.
* **Response (404 Not Found):** `{ "error": "Product not found" }`

---

## 2. Authentication Endpoints

### `POST /api/auth/register`
* **Request:** `{ "name": "Nguyen Van A", "email": "a@example.com", "password": "secure_password" }`
* **Response (201 Created):** `{ "token": "jwt_token_here", "user": { "id": "usr_1", "name": "Nguyen Van A", "email": "a@example.com" } }`

### `POST /api/auth/login`
* **Request:** `{ "email": "a@example.com", "password": "secure_password" }`
* **Response (200 OK):** `{ "token": "jwt_token_here", "user": { ... } }`

### `POST /api/auth/google`
* **Request:** `{ "idToken": "google_credential_jwt" }`
* **Response (200 OK):** `{ "token": "jwt_token_here", "user": { ... } }`

### `GET /api/auth/me`
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `{ "user": { ... } }`

---

## 3. Order & Checkout Endpoints

### `POST /api/orders`
* **Request:**
  ```json
  {
    "customer": {
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "phone": "0912345678"
    },
    "shippingAddress": {
      "address": "123 Pho Hue",
      "ward": "Phường Ngô Thì Nhậm",
      "district": "Quận Hai Bà Trưng",
      "province": "Hà Nội"
    },
    "shippingMethod": "standard" | "express",
    "paymentMethod": "cod" | "vnpay" | "momo",
    "items": [
      {
        "productId": "prod_ip16pm",
        "variantId": "v1",
        "colorId": "c1",
        "quantity": 1,
        "price": 34990000
      }
    ]
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "order": {
      "id": "ord_9872",
      "orderCode": "APL-2026-9872",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "subtotal": 34990000,
      "shippingFee": 0,
      "total": 34990000,
      "createdAt": "2026-10-08T15:45:00Z"
    },
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..." // if online payment
  }
  ```

### `GET /api/orders/:orderCode`
* **Response (200 OK):** Full order summary with tracking status.

> Cập nhật 02/11/2026: query sort/filter cho danh sách products/categories/customers/users/orders tại [B5.2](BACKEND_B5_LISTS.md). API owner-only GET/POST/PUT /admin/users tại [B4.4.1](BACKEND_B4_ADMIN_USERS.md); GET /admin/customers và /admin/customers/:id dành cho owner/editor tại [B4.4.2](BACKEND_B4_CUSTOMERS.md).

> Cập nhật29/10/2026: API sản phẩm/cấu hình/màu/SKU tại [B4.3.1](BACKEND_B4_PRODUCTS_API.md) và [UI B4.3.2](BACKEND_B4_PRODUCTS_UI.md), CRUD danh mục/rowversion tại [B4.2](BACKEND_B4_CATEGORIES.md), báo cáo tại [B4.1](BACKEND_B4_REPORTS.md). POST/GET orders tại [B3.2](BACKEND_B3_ORDERS.md), retry/receipt tại [B3.3](BACKEND_B3_CHECKOUT.md), account/admin orders tại [B3.4](BACKEND_B3_MANAGEMENT.md). Các đề xuất API phía dưới giữ làm lịch sử khi khác hợp đồng hiện hành.

> Cập nhật25/10/2026: frontend đã có chế độ API cho catalog và phiên khách/admin trên SQL Server. Trạng thái, kiểm thử và phần còn lại: [B2 frontend](BACKEND_B2_FRONTEND.md). Nội dung tiến độ cũ phía dưới giữ làm lịch sử.

> Cập nhật24/10: đã chuyển nền backend sang **SQL Server** theo quyết định của người dùng. [Trạng thái và hướng dẫn hiện hành](SQL_SERVER_MIGRATION.md). Các mô tả PostgreSQL trong lịch sử B1 đã được thay thế.

# API contract — bàn giao frontend, 17/10/2026

Ngày24/10: catalog GET /categories, /products, /products/by-slug/:slug và các endpoint /auth, /admin/auth đã có implementation SQL Server. Các endpoint nghiệp vụ khác vẫn là dự thảo. DTO server variant.id là SKU theo cặp cấu hình/màu, bổ sung colorId/configurationId; cần cập nhật adapter/lựa chọn màu frontend trước tích hợp. Backend dùng page vượt cuối trả items=[]; frontend mock có clamp page, nên adapter cần thống nhất hành vi.

Các đường dẫn nghiệp vụ HTTP dưới đây là **đề xuất**, chưa triển khai. Cập nhật B1 ngày23/10/2026: đã có server Express với GET /health/live và /health/ready, migration PostgreSQL; xem BACKEND_B1.md. Nguồn kiểu dữ liệu UI hiện hành: `frontend/src/services/contracts.ts`, `types/{product,cart,order,admin,customer}.ts`, `domain/{catalog,orders}.ts`. Tài liệu này thay thế dự thảo token/OAuth/payload cũ.

## 1. Ranh giới adapter

UI gọi ProductService, OrderService, AdminService, AdminOrderService, CustomerService. Adapter HTTP phải ánh xạ JSON sang các kiểu này, giữ AbortSignal, báo lỗi có thể hiển thị và không trả thành công nếu server chưa ghi nhận.

Điểm phải refactor khi tích hợp: `CustomerService.current()` hiện đồng bộ, `getAdminSession/loginDemo/logoutDemo` nằm ngoài interface; thay bằng provider tải phiên server trước route guard. `AdminService.read()` và `adminCustomers()` hiện tải toàn bộ dữ liệu; chuyển sang truy vấn phân trang server và cập nhật AdminList. Không tải toàn catalog/customer database về client production.

## 2. Quy ước HTTP đề xuất

Base `/api/v1`; ID opaque string, tiền số nguyên VND, timestamp ISO 8601 UTC; hiển thị và lọc ngày theo Asia/Ho_Chi_Minh. Server quyết định role, chủ sở hữu, giá, tồn kho, phí và trạng thái. Chọn cookie phiên HttpOnly/Secure cùng chính sách CSRF phù hợp khi triển khai; chưa có cơ chế này trong demo.

Danh sách trả `{ items, total, page, pageSize }`, page bắt đầu 1, giới hạn pageSize tối đa 100, sort theo whitelist và ID làm tie-breaker. Catalog thêm `categoryTotal, subCategories`. HTTP adapter giải nén envelope nếu server chọn envelope; không đổi tên `items` thành `data` trong UI.

Lỗi đề xuất:

```json
{ "error": { "code": "PRICE_CHANGED", "message": "Giá đã thay đổi. Hãy kiểm tra lại tổng tiền.", "fieldErrors": {}, "requestId": "trace-id" } }
```

400 query sai; 401 cần đăng nhập; 403 không đủ quyền; 404 không tồn tại/không thuộc khách; 409 trùng email/SKU, revision hoặc giá thay đổi; 422 lỗi trường; 429 giới hạn request; 5xx giữ biểu mẫu và cho thử lại. Mock hiện ném Error thông thường, chưa dùng mã HTTP. Không ánh xạ mọi lỗi thành mảng rỗng hoặc thành công.

## 3. Danh mục và sản phẩm

| HTTP dự kiến | Interface / dữ liệu |
| --- | --- |
| GET `/categories` | getCategories → `{id,name}[]`; admin list dùng phân trang riêng |
| GET `/products` | getCatalog → CatalogResult; query q→searchQuery, category, subCategory, minPrice, maxPrice, storage, sort, page, pageSize |
| GET `/products/by-slug/:slug` | getProductBySlug → Product hoặc 404→null |
| GET `/products?category=...&limit=4` | Truy vấn giới hạn cho section; adapter trả Product[] |
| GET `/admin/products` | Query phân trang tương lai thay read().products |
| POST/PUT/DELETE `/admin/products[/:id]` | saveProduct/deleteProduct |
| GET/POST/PUT/DELETE `/admin/categories[/:id]` | Danh mục; không xóa khi còn sản phẩm |

Product gồm id, slug, name, category, subCategory?, tagline, badge?, rating, reviewCount, basePrice, originalPrice, colors[], variants[], thumbnail, gallery[], keySpecs[], detailedSpecs?, description[], warrantyInfo. Trường review chỉ là fixture, chưa có hệ thống review thật.

Color `{id,name,hex,image}`; Variant `{id,sku,storage?,screenSize?,connectivity?,chip?,price,originalPrice,inStock}`. Hiện màu và cấu hình độc lập; backend cần chốt SKU theo tổ hợp màu/cấu hình trước migration. Không ngầm coi variant hiện tại là SKU tồn kho theo màu.

Giá nhỏ nhất của biến thể làm basePrice; giá gốc không thấp hơn giá bán. Slug/SKU duy nhất, SKU so sánh trim không phân biệt hoa thường. `sort=newest` sắp xếp theo `createdAt` giảm dần, hòa thì theo `id` (backend: `products.created_at DESC, id`; demo: `Product.createdAt` cùng quy tắc, thiếu ngày xếp cuối, rồi nhãn “Mới”). `createdAt` do server đặt, không nhận từ payload tạo/sửa sản phẩm. Danh mục mở rộng là string; bốn liên kết header là merchandising cố định.

## 4. Giỏ hàng và đặt đơn

POST `/cart/quote`: gửi `{items:[{productId,variantId,colorId,quantity}],shippingMethod}`. Adapter hiện quoteCart nhận CartItem[] (snapshot UI), cần chuyển sang ID khi gửi. Trả CartQuote `{items,issues,subtotal,totalDiscount,shippingFee,grandTotal}` với các cấu hình và giá canonical.

POST `/orders`: CreateOrderInput:

```json
{
  "requestId": "client-uuid",
  "expectedTotal": 10050000,
  "items": [{"productId":"product-id","variantId":"variant-id","colorId":"color-id","quantity":1}],
  "customer": {"fullName":"Khách mẫu","phone":"0901234567"},
  "shippingAddress": {"address":"12 đường mẫu","province":"Thành phố mẫu","ward":"Phường mẫu","district":""},
  "shippingMethod":"standard",
  "paymentMethod":"cod"
}
```

Email và notes không bắt buộc; district giữ cho tương thích, UI không yêu cầu. customerId tùy chọn trong mock để phát hiện đổi phiên, **server suy ra từ phiên**, không tin ID client. Guest không tự gắn vào tài khoản chỉ vì email giống nhau. quantity nguyên 1–999. Chỉ COD đang hoạt động; kiểu vnpay/momo dành chỗ, không đồng nghĩa đã tích hợp.

Server đọc lại giá/tồn kho và ghi đơn/items/reservation/idempotency trong một transaction. requestId phải được yêu cầu ở HTTP, ràng buộc với chủ thể/guest session và fingerprint canonical: cùng nội dung trả lại đơn, khác nội dung trả409. expectedTotal là điều kiện đồng ý giá, không là giá server tin dùng. Hết hàng/giá đổi không xóa giỏ. Client chỉ xóa giỏ sau thành công.

Order trả id, orderCode, customerId?, customer/address snapshot, shippingMethod, paymentMethod, status, paymentStatus, items[], subtotal, discount, shippingFee, total, createdAt, revision?, completedAt?, history?. OrderItem gồm productId, productName, productImage, variantId, colorName, storage?, quantity, unitPrice, totalPrice. Giữ snapshot khi catalog đổi/xóa. HTTP mới nên luôn trả revision=0+, history=[]; optional chỉ để đọc dữ liệu demo cũ.

GET `/orders/:id`: không cho guest tra chỉ bằng ID/mã đoán được; triển khai guest receipt session hoặc opaque capability có thời hạn. Backend đã bảo vệ bằng header `X-Aura-Receipt` (server chỉ lưu hash). Khách mở lại đơn sau khi đóng tab bằng *liên kết khôi phục* `/order-confirmation/:id#receipt=<token>` (xem BACKEND_B3_CHECKOUT.md); chưa có email hoặc OTP.

## 5. Vận hành đơn và báo cáo

GET `/admin/orders` hoặc `/me/orders`: query q (mã/tên/điện thoại), status, from/to ngày tạo inclusive, sort=newest|oldest|total_desc, page. Mock pageSize8. GET `/admin/orders/:id`, `/me/orders/:id` trả Order.

PATCH `/admin/orders/:id`: `{revision,kind:"status"|"payment",target,note}`; POST `/me/orders/:id/cancel`: `{revision,note}`. Trả Order mới; stale revision409, không ghi đè âm thầm. Actor/thời gian/lịch sử do server xác định.

- PENDING hoặc CONFIRMED → PROCESSING hoặc CANCELLED.
- PROCESSING → SHIPPED hoặc CANCELLED; SHIPPED → DELIVERED.
- DELIVERED → COMPLETED chỉ khi paymentStatus=PAID; COMPLETED/CANCELLED kết thúc.
- PENDING/FAILED payment → PAID sau DELIVERED; PAID → REFUNDED. Chưa có hoàn một phần hoặc trả hàng.

GET `/admin/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD&period=day|week|month` → `{rows:[{label,count,amount}],count,total}`. Chỉ COMPLETED+PAID, ghi nhận theo completedAt tại Việt Nam, gồm phí ship; tuần bắt đầu thứ Hai, kỳ rỗng bằng0, tối đa367 ngày. Hoàn tiền loại đơn khỏi kỳ gốc; đây là quy tắc demo đề xuất, chưa là sổ kế toán. PDF chưa chốt công thức; cần xác nhận nghiệp vụ trước backend production.

## 6. Tài khoản

| HTTP dự kiến | Payload / kết quả |
| --- | --- |
| POST `/auth/register` | `{fullName,email,phone,password}` → CustomerProfile công khai |
| POST `/auth/login` | `{email,password}` → profile + cookie phiên |
| GET `/auth/me` | profile hoặc401; thay current() đồng bộ |
| POST `/auth/logout` | Hủy phiên server |
| PUT `/auth/password` | `{oldPassword,newPassword}`; hủy phiên cũ sau commit |
| POST `/admin/auth/login` | Đăng nhập thật; thay chọn hồ sơ demo |
| GET/POST/PUT/DELETE `/admin/users[/:id]` | Owner; hồ sơ `{id,name,email,role,active}` |
| PUT `/admin/users/:id/password` | Chức năng server mới thay simulatePasswordChange |
| GET `/admin/customers`, `/admin/customers/:id` | Chỉ xem; không CRUD khách |

CustomerProfile hiện `{id,fullName,email,phone,createdAt,credentialVersion}`. credentialVersion nội bộ có thể bỏ khỏi DTO public khi có server. Không gửi hash/verifier/salt hoặc token trong dữ liệu danh sách. Mật khẩu demo khách 12–128 ký tự, email chuẩn hóa, SĐT dạng 0/+84 +9 số; backend cần validation độc lập. Các quy tắc demo không thay thế chính sách auth production.

Owner quản lý admin; owner/editor quản lý catalog, đơn, báo cáo và xem khách. Không tự xóa/khóa/hạ quyền hồ sơ đang dùng. Kiểm tra quyền mọi request, không dựa route guard. Reset catalog là tiện ích demo, không tạo endpoint reset production.

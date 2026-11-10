> Trạng thái 10/11/2026: bản Docker dùng React API + Express + **SQL Server**, xác thực server và checkout COD thật trong database local. Sơ đồ kiến trúc/ERD hiện hành tại [REPORT_DRAFT.md](REPORT_DRAFT.md), quyền và giới hạn tại [ACCEPTANCE_SCOPE.md](ACCEPTANCE_SCOPE.md), tiến độ tại [REMAINING_WORK_PLAN.md](REMAINING_WORK_PLAN.md). Phần dưới giữ lịch sử thiết kế frontend; các câu “backend chưa triển khai” hoặc “dữ liệu demo” không mô tả bản Docker hiện tại.

# Kiến trúc Aura Apple Store

> Cập nhật 23/10/2026: có thêm backend/ với Express, pool pg, migration PostgreSQL và healthcheck. Xem [BACKEND_B1.md](BACKEND_B1.md). Frontend vẫn dùng mock; phần mô tả giai đoạn 5/6 dưới đây giữ lại làm bối cảnh frontend.

Cập nhật giai đoạn 5 ngày 17/10/2026. Tài liệu này mô tả mã đang có; kế hoạch frontend nằm trong `FRONTEND_COMPLETION_PLAN.md`.

## Trạng thái hiện tại

Ứng dụng React 19 + TypeScript + Vite + Tailwind. Các trang: trang chủ, bốn danh mục, `/search`, `/product/:slug`, `/cart`, `/checkout`. Các trang được lazy-load qua React Router; layout có Suspense và ErrorBoundary, ứng dụng có ErrorBoundary ngoài cùng.

Backend, xác thực và thanh toán thật chưa được triển khai. Product, Order và Admin service dùng dữ liệu demo. Đơn lưu localStorage, đọc lại tại `/order-confirmation/:id`; catalog dùng repository chung `aura_catalog_v1`. `/admin/login` chọn hồ sơ demo, phiên 60 phút; `/admin` có CRUD catalog/tài khoản và kiểm tra vai trò mô phỏng. Xem `ADMIN_PHASE_3.md` về phạm vi và giới hạn.

## Phân lớp và chiều phụ thuộc

```text
pages / components
    -> hooks (vòng đời tải dữ liệu)
    -> services (hợp đồng và adapter dữ liệu)
    -> domain (quy tắc thuần TypeScript)
    -> types (mô hình dữ liệu)

store/CartContext -> domain/cart + store/cartStorage
services/mock/catalogRepository -> data/mockProducts (seed)
ProductService / OrderService / AdminService -> catalogRepository
```

- `types/`: mô hình Product, Cart, Order và dữ liệu gửi tạo đơn.
- `domain/`: lọc/sắp xếp/phân trang, reducer giỏ, tính tiền và validation checkout. Không import React, trình duyệt hoặc nguồn mock.
- `services/contracts.ts`: ProductService, OrderService, RequestOptions. Mỗi thao tác bất đồng bộ có thể nhận AbortSignal.
- `services/mock/`: cách lấy dữ liệu demo và tạo kết quả đơn mô phỏng.
- `services/productService.ts`, `services/orderService.ts`: điểm chọn adapter đang dùng. UI không import `data/mockProducts`.
- `hooks/useAsyncResource.ts`: loading, error, retry, hủy request khi unmount/thay loader và bỏ kết quả cũ. Loader phải ổn định bằng hàm cấp module hoặc useCallback.
- `store/`: trạng thái dùng chung và cơ chế lưu giỏ hàng.
- `pages/`: phối hợp service, state và component; không tự tạo mã đơn hoặc viết lại quy tắc tính giá.
- `components/`: giao diện tái sử dụng; ProductImage xử lý ảnh lỗi, OrderTotals trình bày tổng tiền dùng chung. Đã bỏ đồng hồ sale tự lặp.

Giữ cấu trúc phân lớp hiện tại để tránh di chuyển file không cần thiết. Khi có các module lớn như admin hoặc account, tạo thư mục tính năng riêng, chỉ đưa thành phần dùng chung thực sự vào `components/` và `domain/`.

## Danh mục và tìm kiếm

`getCatalog(CatalogFilter, RequestOptions)` trả `CatalogResult`: items, total, page, pageSize, categoryTotal, subCategories. Mặc định 12 sản phẩm/trang; tối đa 100 khi gọi service. Filter/sort áp dụng trước phân trang; metadata dòng máy lấy theo danh mục để không mất lựa chọn khi lọc.

URL là nguồn trạng thái cho `q`, `category`, `subCategory`, `priceRange`, `sort`, `page`. UI dùng 6 sản phẩm/trang, tự đưa trang vượt phạm vi về trang cuối hợp lệ. Đổi filter/sort đưa về trang đầu, Back/Forward khôi phục query. Header submit đến `/search?q=...`, tìm trên toàn danh mục. URL cũ như `/iphone?q=...` vẫn lọc từ khóa trong danh mục đó.

Mock adapter đang lọc toàn bộ dữ liệu trong bộ nhớ. Khi dữ liệu lớn, adapter HTTP phải chuyển query sang server và nhận đúng metadata, không tải toàn bộ catalog để phân trang trong UI. Trang chủ hiện còn tải toàn bộ mock catalog; khi mở rộng cần API danh sách giới hạn cho từng section. Sorting `newest` hiện dựa trên badge Mới, cần ngày phát hành thực khi backend có dữ liệu đó.

## Giỏ hàng và tiền

- Reducer thuần xử lý thêm, xóa, cập nhật, xóa toàn bộ. Số lượng phải là số nguyên 1-999; cập nhật 0 xóa dòng. Giới hạn này là giới hạn kỹ thuật demo, chưa thay thế kiểm tra tồn kho.
- ID dòng là JSON tuple product/variant/color, tránh trùng khi ID có dấu phân cách.
- State Context và Actions Context tách riêng. ProductCard/PDP chỉ dùng `useCartActions`, không đăng ký thay đổi toàn bộ giỏ.
- `useReducer` khởi tạo từ storage một lần, trước effect ghi. Không còn effect ghi giỏ rỗng trước khi tải dữ liệu cũ.
- Storage v2 lưu snapshot tối thiểu gồm thông tin hiển thị sản phẩm, biến thể, màu, số lượng. Không lưu gallery, thông số hoặc mô tả dài.
- Đọc v1 nếu chưa có v2; lọc dữ liệu sai kiểu; gộp dòng trùng; storage bị khóa/hết dung lượng vẫn dùng được giỏ trong bộ nhớ. v2 rỗng không khôi phục lại giỏ v1 cũ. Đồng bộ đa tab chưa được triển khai.
- `calculateTotals` dùng chung cho giỏ, checkout và mock order: tiêu chuẩn miễn phí khi tạm tính > 10 triệu; còn lại 50.000đ; hỏa tốc 50.000đ; giỏ rỗng phí 0. Hỏa tốc không cộng chồng hai lần phí.

Giá lưu trên trình duyệt chỉ là giá hiển thị. Production backend phải kiểm tra giá, tồn kho, chiết khấu, phí vận chuyển và tổng tiền.

## Checkout và đơn hàng

Giai đoạn 4 thêm `AdminOrderService` list/get/update/report trên cùng orderRepository. `domain/orders.ts` giữ quy tắc chuyển trạng thái, query và tổng hợp doanh thu theo giờ Việt Nam. Fulfillment có COMPLETED, không dùng PAID; PAID thuộc payment status. Repository cập nhật revision/history/completedAt, giữ metadata idempotency và snapshot; đọc tương thích đơn cũ. Chi tiết mô hình và giới hạn tại `ORDERS_PHASE_4.md`.

CreateOrderInput chứa customer, shippingAddress, shippingMethod, paymentMethod và items gồm productId, variantId, colorId, quantity. UI không gửi giá làm nguồn quyết định số tiền.

Mock order adapter tra lại sản phẩm/biến thể/màu, kiểm tra số lượng/tồn hàng demo, tính tổng và trả Order đầy đủ. Mã đơn dùng năm hiện tại và UUID. `quoteCart` trả giá hiện tại và issues; UI chặn cấu hình không hợp lệ và yêu cầu chấp nhận giá đổi. `expectedTotal` chặn tạo đơn khi tổng thay đổi sau báo giá. Email guest tùy chọn; checkout chỉ bật COD.

`orderRepository` lưu snapshot đơn vào `aura_demo_orders_v1`, kiểm tra dữ liệu khi đọc và báo lỗi nếu storage hỏng/không ghi được. `getOrder` đọc lại sau reload. `requestId` chống gửi lặp cùng payload trong demo; chưa đảm bảo giao dịch nguyên tử đa tab. Không gọi cổng thanh toán, không giữ tồn kho, không gửi email. Chỉ nhập dữ liệu giả khi thử.

Checkout validation tách khỏi view; chặn submit đồng thời, xử lý lỗi và chỉ xóa giỏ sau service thành công. Rời trang hủy request và bỏ cập nhật kết quả. Khi có backend, AbortSignal chỉ hủy chờ phía client: cần idempotency key và cơ chế truy vấn đơn để xử lý tình huống server đã ghi đơn nhưng client mất kết nối.

## Thêm adapter backend

Giai đoạn 5 có CustomerService và hồ sơ demo, session tab, verifier mật khẩu mẫu, liên kết Order.customerId và kiểm tra sở hữu/hủy đơn tại service. Không ghép đơn guest theo email. Backend phải thay xác thực trình duyệt bằng session thật, lấy customerId từ phiên server và kiểm tra quyền ở mọi endpoint. `current()` hiện đồng bộ từ storage; adapter HTTP cần bước khởi tạo session/cache trước khi render route được bảo vệ, không chỉ đổi URL. Chi tiết dữ liệu, quyền và giới hạn tại `CUSTOMER_PHASE_5.md`.

1. Thực thi ProductService/OrderService trong `services/http/`; thêm HTTP client dùng chung khi bắt đầu có endpoint thật.
2. Chuyển AbortSignal vào fetch; xử lý non-2xx, lỗi mạng, JSON sai schema và mapping DTO tại adapter.
3. Chọn adapter tại hai file service cấp trên. Không đổi UI sang import mock hoặc fetch rải rác.
4. Hoàn thiện API_CONTRACT theo shape đang dùng; API_CONTRACT hiện là dự thảo và chưa phải API chạy thật.
5. Nếu backend trả payment URL hoặc cần nhiều bước checkout, mở rộng hợp đồng có chủ đích và cập nhật UI tương ứng. Không coi việc tích hợp mọi nghiệp vụ là chỉ thay URL.
6. Thêm authentication/authorization phía server, cơ sở dữ liệu, giao dịch tồn kho và idempotency trước vận hành thật; thay session demo và cơ chế mô phỏng mật khẩu.

Không thêm HTTP client giả, global cache hoặc state library khi chưa có nhu cầu cụ thể. Khi request dùng chung và invalidation trở nên phức tạp, đánh giá thư viện quản lý server state.

## Kiểm tra và mở rộng

Tại gốc repository:

```sh
npm run typecheck
npm test
npm run build
```

Test dùng Node test runner; esbuild biên dịch test TypeScript vào thư mục tạm và dọn sau khi chạy. `tsconfig.test.json` kiểm tra kiểu cả test và src. Có 33 test về catalog CRUD, role demo, reducer, migration/storage lỗi, tính phí, validation, báo giá, tồn hàng, lưu/đọc đơn, idempotency, reset, chuyển trạng thái, báo cáo theo múi giờ, revision, khách hàng/mật khẩu mẫu/sở hữu đơn và hủy request.

Build sau tái cấu trúc đã thành công. Entry JS giảm từ 468,52 KB xuống 361,82 KB trước gzip; mã trang được tải riêng. Đây là thay đổi cách chia bundle, không phải đo tốc độ người dùng thực tế hay tổng bytes của mọi trang.

Smoke test Chrome chạy qua `scripts/ui-smoke.mjs` và `scripts/storefront-smoke.mjs` với Playwright có sẵn. Bằng chứng tại `docs/qa/phase-1` và `docs/qa/phase-2`; phạm vi và giới hạn xem `STOREFRONT_PHASE_2.md`. Việc này chưa thay thế nghiệm thu đa trình duyệt, accessibility đầy đủ hoặc backend thực.

## Bàn giao giai đoạn 6 (17/10/2026)

Xem [FRONTEND_ACCEPTANCE.md](FRONTEND_ACCEPTANCE.md) và [BACKEND_HANDOFF.md](BACKEND_HANDOFF.md). API_CONTRACT.md đã thống nhất theo interface hiện tại, chỉ rõ auth đồng bộ và admin list client cần refactor khi nối HTTP. Chưa có server/database. Kết quả build cũ phía trên là lịch sử; dùng báo cáo nghiệm thu mới nhất.

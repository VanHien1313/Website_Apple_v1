# B3.1 — Giỏ hàng và báo giá SQL Server

> Cập nhật28/10: [B3.2 API tạo đơn COD](BACKEND_B3_ORDERS.md) đã có transaction/idempotency/giữ tồn/receipt và worker hết hạn; [B3.3 checkout](BACKEND_B3_CHECKOUT.md) đã nối frontend và kiểm thử browser. Các ghi chú khóa checkout/kế hoạch B3.2 phía dưới giữ làm lịch sử.

Cập nhật28/10/2026. Hoàn thành bước báo giá; chưa hoàn thành B3 tạo đơn/giữ tồn.

## Sử dụng

Chạy backend và `npm run dev:api`. Chọn cấu hình còn hàng ở trang sản phẩm, bấm **Thêm vào giỏ**, mở `/cart`. Có thể đổi số lượng, xóa dòng, chọn giao tiêu chuẩn/nhanh hoặc cập nhật báo giá. Giỏ API lưu riêng tại `aura_api_cart_v1`, tối đa50 cấu hình, không đọc/ghi giỏ demo. Khi lưu trữ trình duyệt bị chặn, giỏ còn dùng được trong bộ nhớ nhưng không bảo đảm giữ lại sau reload.

## Contract

`POST /api/v1/cart/quote`, JSON:

```json
{"items":[{"skuId":"00000000-0000-4000-8000-000000000004","quantity":1}],"shippingMethod":"standard"}
```

Khách chưa đăng nhập vẫn gọi được. Cần Origin đúng APP_ORIGIN và X-Aura-Request:1, Content-Type application/json. Giới hạn120 yêu cầu/phút/IP trong một process; body16KB, tối đa50 SKU duy nhất (không phân biệt hoa/thường), số lượng nguyên1–999. UUID và shippingMethod được kiểm tra trước SQL. Sai input trả422, nguồn không hợp lệ403, body quá lớn413, quá số lần429.

Response có `lines`, `issues`, `subtotal`, `totalDiscount`, `shippingFee`, `grandTotal`, `canCheckout`. Mỗi line trả SKU, tên sản phẩm/màu/cấu hình, đơn giá gốc/hiện tại, số lượng, thành tiền và `availableQuantity = on_hand - reserved`. Variant ID frontend chính là inventory SKU ID, không phải configurationId.

Server truy vấn một batch tham số hóa qua OPENJSON trong transaction. Không nhận giá từ trình duyệt để tính tiền; trường giá/tổng tiền thừa bị bỏ qua. Tính tiền bằng bigint rồi kiểm tra giới hạn safe integer trước JSON. Discount là khoản tiết kiệm so với giá gốc, không trừ hai lần. Tiêu chuẩn miễn phí khi subtotal trên10 triệu; còn lại50.000đ; giao nhanh50.000đ; giỏ rỗng phí0.

SKU không tồn tại/sản phẩm inactive trả issue UNAVAILABLE. Số lượng vượt tồn khả dụng trả INSUFFICIENT_STOCK. Các vấn đề này làm canCheckout=false; frontend yêu cầu sửa/xóa dòng và không hiển thị tổng tiền của một giỏ chưa hợp lệ. Dữ liệu cache local không được dùng thay báo giá khi lỗi API. Giá thay đổi được hiển thị rõ. Request cũ bị hủy khi đổi giỏ/giao hàng.

`canCheckout` chỉ cho biết giỏ hợp lệ tại thời điểm đọc, không phải xác nhận đặt hàng hay token báo giá. Endpoint không tạo order, không giữ hàng, không thay đổi stock và không bảo đảm giá/tồn sẽ giữ nguyên sau response. Nút đặt hàng/Mua ngay API tiếp tục khóa cho đến B3.2.

## Kiểm tra và phần tiếp theo

Kết quả28/10: **23/23 test backend**, **41/41 test frontend**, **9/9 nhóm smoke browser** đạt; typecheck/build backend và build API đạt. Sau khi siết validation shippingMethod, bộ4 test quote được chạy lại và đạt. Browser dùng bản build API với SQL Server riêng, không có page error; database test được dọn sau khi chạy. Đã xem ảnh giỏ desktop.

Test backend trong `backend/tests/quote.test.ts`: validation/duplicate/giới hạn, giá SQL thay giá client, phí giao hàng, discount, giỏ rỗng, reserved stock, inactive/missing SKU, guest+origin, giá thay đổi và overflow. Smoke browser bổ sung reload giỏ API, đổi số lượng, cập nhật giá SQL và thiếu tồn sau khi có reservation. Bằng chứng browser: [results.json](qa/api-frontend/results.json), [giỏ hàng](qa/api-frontend/cart-quote.png).

Bước B3.2: tạo đơn COD idempotent trong transaction; kiểm tra lại giá và tồn, lưu snapshot, giữ hàng nguyên tử, rollback khi lỗi, guest receipt được bảo vệ và gắn đơn với phiên khách phía server. Sau đó mới mở checkout; tiếp theo là hủy đơn/trả tồn, revision và vận hành. Không cần migration mới cho bước quote này.

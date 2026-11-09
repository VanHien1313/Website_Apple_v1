# Bàn giao giai đoạn 2 — Storefront

Ngày 16/10/2026. Hoàn thành C01-C05 và L01 phía khách ở mức frontend demo theo kế hoạch; giai đoạn tiếp theo là quản trị sản phẩm, danh mục và tài khoản admin.

## Chức năng đã triển khai

| Yêu cầu | Kết quả |
| --- | --- |
| C01, L01 | Search dùng chung desktop/mobile; tìm tên kết hợp danh mục, khoảng giá, dòng máy; sort, phân trang và Back/Forward theo URL; khôi phục khi trang vượt phạm vi hoặc không có kết quả. |
| C02 | Trang chủ có preview và liên kết danh sách đầy đủ; card hiển thị ảnh, tên, giá biến thể, giảm giá từ dữ liệu và khả dụng. |
| C03 | Chọn màu/cấu hình, giá tương ứng, chặn hết hàng, gallery/modal, thông số từ fixture; ảnh lỗi có fallback. |
| C04 | Sửa số lượng, xác nhận xóa, kiểm tra cấu hình/giá mới, chấp nhận giá đổi trước checkout. |
| C05 | Guest checkout: tên/SĐT/địa chỉ bắt buộc, email tùy chọn; phí giao hàng thống nhất; COD; lưu đơn rồi mới xóa giỏ; xác nhận tải lại được. |

Trang chủ bỏ countdown tự lặp. Không suy diễn số bán hoặc thông số từ tên sản phẩm. VNPay/MoMo hiển thị chưa tích hợp và bị vô hiệu hóa.

## Kiểm chứng

- `npm test`: 17 test nghiệp vụ, bao gồm email tùy chọn, báo giá, cấu hình hết hàng, giá thay đổi, dòng trùng, idempotency, storage lỗi/hỏng và request bị hủy.
- `npm run typecheck` và `npm run build`: kiểm tra kiểu và đóng gói.
- `scripts/storefront-smoke.mjs`: hành trình tìm Mac → lọc/sort → chọn cấu hình → giỏ → đặt nhanh → tải lại xác nhận; lỗi lưu giữ form/giỏ, gửi lặp, giá cũ, cấu hình sai, phân trang/rỗng, ảnh lỗi. Kiểm tra không tràn ngang 6 route × 3 chiều rộng (360/768/1440) × 2 theme.
- `scripts/ui-smoke.mjs`: hồi quy component, bàn phím modal/drawer, điều hướng và form của giai đoạn 1.
- Kết quả máy và ảnh: `qa/phase-2/`; smoke test không có lỗi JavaScript runtime. Không coi đây là chứng nhận WCAG hoặc nghiệm thu mọi thiết bị.

## Hợp đồng tích hợp và giới hạn

`OrderService` cung cấp `quoteCart`, `createOrder`, `getOrder`. Adapter tự tra giá theo ID; `expectedTotal` là tổng khách đã đồng ý, không phải giá quyết định. `requestId` phục vụ retry cùng nội dung. Repository lưu `aura_demo_orders_v1` tại trình duyệt; đơn chưa thanh toán, không gửi email. Xóa dữ liệu trình duyệt sẽ mất đơn. Chỉ dùng thông tin mẫu.

Backend phải cung cấp lưu đơn/giữ tồn kho nguyên tử, idempotency có ràng buộc database và quyền đọc đơn. localStorage không bảo đảm giao dịch đa tab, xác thực hoặc phân quyền. Tồn kho hiện là boolean theo biến thể; giới hạn 999 là giới hạn nhập liệu, chưa phải tồn kho SKU/màu thực.

Ảnh sử dụng nguồn fixture hiện có; quyền dùng và mức khớp model/màu chưa được xác minh để xuất bản. Cần duyệt hoặc thay bằng asset được phép trước production. Sort mới nhất vẫn dựa trên badge trong mock; backend cần timestamp thực. Trang chủ hiện lấy toàn bộ mock catalog, cần truy vấn giới hạn khi mở rộng.

Admin CRUD, liên thông sản phẩm/đơn với admin, báo cáo doanh thu và tài khoản khách chưa thuộc đầu ra giai đoạn này. Mô hình trạng thái đơn sẽ được chuẩn hóa ở giai đoạn 4, bao gồm COMPLETED và tách khỏi payment status.

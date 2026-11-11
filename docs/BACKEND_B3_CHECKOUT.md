# B3.3 — Checkout COD kết nối SQL Server

> Cập nhật29/10: lịch sử đơn và vận hành admin đã triển khai tại [B3.4](BACKEND_B3_MANAGEMENT.md). Các ghi chú phần tiếp theo bên dưới mô tả thời điểm hoàn thành B3.3.

Ngày 28/10/2026. Chế độ API đã mở Mua ngay → checkout và Giỏ hàng → Tiến hành đặt hàng. Các trang demo vẫn dùng luồng riêng.

## Luồng đã triển khai

- Form người nhận, địa chỉ, ghi chú, giao tiêu chuẩn/nhanh; COD. Giá từng SKU và tổng tiền lấy từ quote server. Khi giá hoặc tồn đổi trước lúc gửi, server từ chối, form cập nhật báo giá và yêu cầu người dùng xác nhận lại.
- Lưu nguyên payload, requestId và receiptToken trong sessionStorage **trước khi POST**. Không lưu được thì không gửi. Chỉ giữ dữ liệu phục hồi trong phiên tab; không đưa địa chỉ hay receipt vào URL/localStorage.
- Khi kết quả không chắc chắn (mất mạng, timeout 30 giây, lỗi server), khóa chỉnh sửa payload; retry gửi nguyên yêu cầu đã lưu. Tải lại hoặc quay lại checkout trong cùng tab vẫn phục hồi. Không cấp key mới khi chưa biết kết quả.
- Server khóa requestId xuyên các scope. Cùng key nhưng đổi tài khoản hoặc chuyển khách đăng nhập sang guest sau khi đã tạo đơn trả `IDEMPOTENCY_SCOPE_CHANGED`; không tạo thêm đơn và không lộ nội dung đơn khác. Migration 004 thêm index tra requestId để tránh quét toàn bộ lịch sử.
- Khi thành công, lưu receipt theo ID rồi xóa pending. Chỉ xóa giỏ khi khớp snapshot đã gửi và đơn chưa bị hủy. Nếu lưu receipt thất bại, giữ pending để retry cùng đơn.
- Trang xác nhận đọc lại snapshot từ server. Đơn tài khoản dùng cookie HttpOnly; đơn guest dùng header X-Aura-Receipt. Tải lại trong cùng tab vẫn đọc được. Biết URL đơn guest không đủ quyền xem.

## Giới hạn hiện tại

Đóng tab/xóa dữ liệu phiên có thể mất quyền đọc guest và yêu cầu phục hồi; UI có thông báo giữ tab mở đến khi biết kết quả. Trang xác nhận có *liên kết khôi phục* `/order-confirmation/:id#receipt=<token>`: token nằm trong fragment nên không gửi tới server và không vào Referer; trang lưu token vào phiên tab rồi xóa fragment khỏi thanh địa chỉ. Khi không tải được đơn, khách dán liên kết hoặc mã 64 hex vào form để mở lại. Ai có liên kết đều xem được đơn nên phải coi như bí mật. Chưa có email gửi biên nhận hoặc khôi phục receipt qua OTP. SessionStorage vẫn có thể được đọc bởi script cùng origin, nên receipt cần được coi là bí mật. Không lưu session đăng nhập vào storage.

Không tự bỏ yêu cầu đang chờ khi gặp lỗi không xác định, đổi phiên hoặc xung đột idempotency. Người dùng cần trở về tài khoản gốc để retry. Chưa có màn hình hỗ trợ đối soát các trường hợp mất toàn bộ dữ liệu trình duyệt.

Luồng vận hành admin trên SQL Server (xác nhận/giao hàng/thanh toán/hủy/hoàn tồn), danh sách đơn tài khoản và báo cáo là bước tiếp theo. Không xem B3.3 là hoàn thành toàn bộ backend hoặc sẵn sàng bán hàng production.

## Kiểm chứng

- Build API và typecheck; kiểm tra ranh giới bundle không nhập repository demo.
- 41 test frontend hiện có; 31 test backend SQL Server, bổ sung assertion đổi scope retry không tạo thêm đơn.
- 12/12 nhóm browser smoke đạt, chạy Chrome trên bản build API với database SQL Server cô lập, tự dọn sau chạy: giỏ/quote, validation giá/tồn, storage bị chặn, mất phản hồi sau commit + reload + retry, đúng một order/hold, receipt guest, đơn đăng nhập, xóa giỏ sau thành công, mobile không tràn ngang; các luồng tài khoản/upload cũ vẫn chạy. Đã kiểm tra trực quan ảnh checkout mobile và xác nhận desktop.
- Kết quả máy chạy: [results.json](qa/api-frontend/results.json). Ảnh: [checkout desktop](qa/api-frontend/checkout-desktop.png), [checkout mobile](qa/api-frontend/checkout-mobile.png), [xác nhận đơn](qa/api-frontend/order-confirmation.png).

## Chạy bản mới

Migration `004_order_request_lookup.sql` đã áp dụng thành công vào AuraStore cục bộ ngày 28/10/2026. Với môi trường khác, chạy migration trước khi khởi động backend. Backend đang chạy bản cũ cần khởi động lại; frontend dùng `npm run dev:api` hoặc build API. Migration 004 chỉ thêm index; không sửa các migration đã áp dụng. Không tạo đơn thử trong AuraStore khi chạy smoke tests.

Hợp đồng tạo/đọc đơn: [B3.2](BACKEND_B3_ORDERS.md).

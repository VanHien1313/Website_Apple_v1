# Bàn giao giai đoạn 5 — Tài khoản khách hàng

Ngày 17/10/2026. Nhóm nâng cao O01-O03 và màn hình admin chỉ xem khách hàng O04. Đây là frontend demo trong cùng trình duyệt, chưa phải xác thực hoặc quyền truy cập production.

## Luồng sử dụng

1. Mở `/register`, đăng ký bằng tên/email/điện thoại và **mật khẩu mẫu riêng** (12–128 ký tự). Không dùng thông tin hoặc mật khẩu thật. Email được trim/lowercase và chặn trùng. Đăng ký thành công không tự đăng nhập.
2. `/login` kiểm tra email/mật khẩu mẫu, tạo phiên tab 60 phút; `/account/orders` hiển thị đơn thuộc ID hồ sơ đó.
3. Checkout tự điền tên, điện thoại, email; địa chỉ nhập theo đơn. Thông tin người nhận có thể khác hồ sơ, không sửa hồ sơ gốc. Adapter kiểm tra ID yêu cầu khớp phiên hiện tại rồi ghi customerId; phiên hết hạn/đổi tài khoản giữa chừng làm tạo đơn thất bại và giữ form/giỏ.
4. `/account/orders/:id` xem snapshot sản phẩm, tiền, địa chỉ và trạng thái. Hủy cần xác nhận/lý do, kiểm tra lại quyền sở hữu và revision khi lưu; admin đọc được thay đổi/lịch sử từ cùng repository.
5. `/account/security` kiểm tra mật khẩu cũ, mật khẩu mới khác cũ và nhập lại khớp. Thành công tăng phiên bản credential, vô hiệu mọi phiên cũ và chuyển về đăng nhập.
6. Admin có `/admin/customers` tìm tên/email/điện thoại, sort tên và phân trang; `/admin/customers/:id` chỉ xem hồ sơ. Không có sửa/xóa tài khoản khách.

Header có lối vào tài khoản ở desktop/mobile. Các route account yêu cầu phiên, có kiểm tra hết hạn định kỳ và khi gọi service. Đơn không tồn tại hoặc không thuộc tài khoản trả trạng thái không tìm thấy, không hiển thị snapshot. Trang xác nhận công khai cũng chặn đơn đã gắn với tài khoản khác.

## Chính sách liên kết và hủy đơn

- `customerId` tùy chọn, đơn guest cũ vẫn đọc tương thích. Không nhận lại đơn guest bằng cách trùng email hoặc điện thoại.
- Đơn chỉ gắn hồ sơ lúc tạo. Thay mật khẩu không thay đổi ID hay lịch sử đơn.
- Hủy từ PENDING, CONFIRMED, PROCESSING; không cho hủy SHIPPED, DELIVERED, COMPLETED hoặc CANCELLED. Quy tắc thống nhất với giai đoạn 4, giao diện giải thích khi không đủ điều kiện.
- Hủy chỉ thay fulfillment, không tự hoàn tiền. Refund/payment vẫn do luồng quản trị demo giai đoạn 4 xử lý.
- Dữ liệu đọc trước khi mở modal có thể đã cũ; repository kiểm tra revision rồi mới ghi. Lỗi lưu không báo hủy thành công.

## Lưu trữ demo và hợp đồng

`CustomerService` trong `services/contracts.ts` gồm current/logout/register/login/changePassword/listOrders/getOrder/cancelOrder/adminCustomers. Factory nhận storage và order repository để test độc lập; `types/customer.ts` giữ mô hình hồ sơ. `CreateOrderInput` và `Order` thêm customerId tùy chọn.

`aura_customers_demo_v1` trong localStorage lưu hồ sơ và salt/verifier PBKDF2-SHA256 (100.000 vòng, salt ngẫu nhiên 16 byte). Không lưu mật khẩu dạng rõ. Verifier chỉ phục vụ kiểm tra mật khẩu **mẫu** ở frontend; không phải cơ chế bảo mật server. `aura_customer_session_v1` trong sessionStorage lưu ID, phiên bản credential và thời hạn, không chứa mật khẩu. Admin list chỉ nhận hồ sơ, không trả salt/verifier.

Người có quyền sửa storage có thể sửa hồ sơ, verifier, phiên và đơn; localStorage không bảo đảm phân quyền, bảo mật dữ liệu hoặc transaction đa tab. Không có rate limit server, email verification, quên mật khẩu, OAuth hoặc khôi phục tài khoản. Đây là giới hạn demo, không coi test chặn giao diện là bằng chứng bảo mật production. Backend phải xác thực/kiểm tra sở hữu mọi request, băm mật khẩu ở server và quản lý phiên thật; không dùng verifier demo làm credential backend.

Đóng tab mất phiên, có thể đăng nhập lại từ hồ sơ cùng origin. Xóa dữ liệu website mất hồ sơ/đơn. Khôi phục catalog mẫu trong admin không xóa hồ sơ khách hoặc đơn. Không có seed khách hàng hay tài khoản/mật khẩu cố định.

## Kiểm chứng

- 33 test Node gồm 5 test mới: registration/duplicate/validation, không lưu plaintext, login/expiry/đổi mật khẩu, vô hiệu phiên cũ, liên kết ID và không nhận guest theo email, chặn đọc/hủy chéo tài khoản, trạng thái/revision, storage lỗi và dữ liệu hỏng.
- `scripts/customer-smoke.mjs`: đăng ký → login → checkout autofill/liên kết → lịch sử sau reload → hủy → admin; đơn đang giao không hủy; đăng nhập hồ sơ khác không đọc được đơn; đổi mật khẩu và admin chỉ xem khách; kiểm tra 6 route × 3 chiều rộng × 2 theme.
- Ảnh/kết quả tại `qa/phase-5/`. Typecheck/test/build và smoke trình duyệt không thay thế nghiệm thu đa trình duyệt/accessibility hay kiểm thử bảo mật backend.
- Kết quả: 45 kiểm tra trình duyệt tài khoản đạt, không có lỗi JavaScript runtime trong luồng kiểm tra; hồi quy storefront 45 và quản trị đơn 25 kiểm tra đạt. Đã rà ảnh đăng ký mobile hai theme và lịch sử đơn desktop/mobile.

Giai đoạn tiếp theo: nghiệm thu toàn bộ frontend, sửa điểm còn thiếu và chốt tài liệu tích hợp backend/database.
